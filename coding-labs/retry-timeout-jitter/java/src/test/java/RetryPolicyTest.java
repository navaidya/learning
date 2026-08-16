import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.ArrayList;
import java.util.List;

public final class RetryPolicyTest {
  public static void main(String[] args) {
    AtomicLong clock = new AtomicLong(); List<Long> sleeps = new ArrayList<>(); AtomicInteger attempts = new AtomicInteger();
    RetryPolicy<String> policy = new RetryPolicy<>(3, 100, 10, 50, clock::get, delay -> { sleeps.add(delay); clock.addAndGet(delay); }, () -> 0.5);
    RetryPolicy.Result<String> success = policy.execute(() -> attempts.incrementAndGet() < 2 ? throwRetry() : "ok");
    check(success.success() && success.attempts() == 2 && sleeps.equals(List.of(5L)), "retries with jitter");
    RetryPolicy.Result<String> permanent = policy.execute(() -> { throw new RetryPolicy.PermanentFailure("bad request"); });
    check(!permanent.success() && permanent.attempts() == 1, "permanent failure is not retried");
    RetryPolicy<String> tiny = new RetryPolicy<>(3, 0, 10, 50, clock::get, delay -> {}, () -> 1.0);
    check(tiny.execute(RetryPolicyTest::throwRetry).attempts() == 1, "budget stops retry");
  }
  private static String throwRetry() { throw new RetryPolicy.RetryableFailure("temporary"); }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
}
