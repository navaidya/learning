import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

public final class IdempotentCommandHandlerTest {
  public static void main(String[] args) throws Exception {
    createsAndReplaysOneResult();
    rejectsInvalidAndConflictingCommands();
    retriesAfterRepositoryFailure();
    serializesConcurrentDuplicates();
  }

  private static void createsAndReplaysOneResult() {
    AtomicInteger creates = new AtomicInteger();
    IdempotentCommandHandler handler = new IdempotentCommandHandler(
        payload -> "resource-" + creates.incrementAndGet());

    IdempotentCommandHandler.Result first = handler.handle(
        new IdempotentCommandHandler.Command("request-1", "payload"));
    IdempotentCommandHandler.Result replay = handler.handle(
        new IdempotentCommandHandler.Command(" request-1 ", " payload "));

    check(first.status() == IdempotentCommandHandler.Status.CREATED, "first call creates");
    check(replay.status() == IdempotentCommandHandler.Status.REPLAYED, "duplicate replays");
    check(first.resourceId().equals(replay.resourceId()), "resource id is stable");
    check(creates.get() == 1, "repository called once");
  }

  private static void rejectsInvalidAndConflictingCommands() {
    IdempotentCommandHandler handler = new IdempotentCommandHandler(payload -> "resource-1");
    expectIllegal(() -> handler.handle(null));
    expectIllegal(() -> handler.handle(new IdempotentCommandHandler.Command(" ", "payload")));
    expectIllegal(() -> handler.handle(new IdempotentCommandHandler.Command("request", " ")));
    handler.handle(new IdempotentCommandHandler.Command("request", "first"));
    expectConflict(() -> handler.handle(new IdempotentCommandHandler.Command("request", "second")));
  }

  private static void retriesAfterRepositoryFailure() {
    AtomicInteger attempts = new AtomicInteger();
    IdempotentCommandHandler handler = new IdempotentCommandHandler(payload -> {
      if (attempts.incrementAndGet() == 1) throw new IllegalStateException("dependency unavailable");
      return "resource-ok";
    });
    expectConflict(() -> handler.handle(new IdempotentCommandHandler.Command("retry", "payload")));
    IdempotentCommandHandler.Result result = handler.handle(
        new IdempotentCommandHandler.Command("retry", "payload"));
    check(result.status() == IdempotentCommandHandler.Status.CREATED, "retry creates after failure");
    check(attempts.get() == 2, "failure was not cached");
  }

  private static void serializesConcurrentDuplicates() throws Exception {
    AtomicInteger creates = new AtomicInteger();
    IdempotentCommandHandler handler = new IdempotentCommandHandler(payload -> {
      creates.incrementAndGet();
      return "shared-resource";
    });
    ExecutorService executor = Executors.newFixedThreadPool(6);
    CountDownLatch start = new CountDownLatch(1);
    List<Future<IdempotentCommandHandler.Result>> futures = new ArrayList<>();
    for (int index = 0; index < 6; index++) {
      futures.add(executor.submit(() -> {
        start.await();
        return handler.handle(new IdempotentCommandHandler.Command("same", "payload"));
      }));
    }
    start.countDown();
    int created = 0;
    int replayed = 0;
    for (Future<IdempotentCommandHandler.Result> future : futures) {
      if (future.get().status() == IdempotentCommandHandler.Status.CREATED) created++;
      else replayed++;
    }
    executor.shutdownNow();
    check(created == 1 && replayed == 5, "one create and five replays");
    check(creates.get() == 1, "concurrent duplicates persist once");
  }

  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void expectIllegal(Runnable action) {
    try {
      action.run();
      throw new AssertionError("expected IllegalArgumentException");
    } catch (IllegalArgumentException expected) {
      // Expected validation failure.
    }
  }

  private static void expectConflict(Runnable action) {
    try {
      action.run();
      throw new AssertionError("expected IllegalStateException");
    } catch (IllegalStateException expected) {
      // Expected dependency or idempotency conflict.
    }
  }
}
