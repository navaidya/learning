import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

public final class TokenBucketRateLimiterTest {
  public static void main(String[] args) throws Exception {
    AtomicLong now = new AtomicLong(0);
    TokenBucketRateLimiter limiter = new TokenBucketRateLimiter(2, 1.0, now::get);
    check(limiter.tryAcquire(1).allowed(), "first token");
    check(limiter.tryAcquire(1).allowed(), "burst token");
    check(!limiter.tryAcquire(1).allowed(), "empty denied");
    now.set(500); check(!limiter.tryAcquire(1).allowed(), "partial refill denied");
    now.set(1_000); check(limiter.tryAcquire(1).allowed(), "full token refilled");
    now.set(101_000); check(limiter.tryAcquire(1).allowed() && limiter.tryAcquire(1).allowed(), "refill clamps at capacity");
    TokenBucketRateLimiter retry = new TokenBucketRateLimiter(3, 2.0, now::get);
    retry.tryAcquire(3); check(retry.tryAcquire(1).retryAfterMillis() == 500, "exact retry after");
    check(!retry.tryAcquire(1).allowed() && retry.tryAcquire(1).retryAfterMillis() == 500, "repeated denials do not mutate bucket");
    now.set(100_500); retry.tryAcquire(1); now.set(100_000); check(!retry.tryAcquire(1).allowed(), "clock rollback does not mint tokens");
    expectIllegal(() -> limiter.tryAcquire(0));
    TokenBucketRateLimiter concurrent = new TokenBucketRateLimiter(2, 0, now::get);
    List<Thread> threads = new ArrayList<>(); int[] allowed = {0};
    for (int i = 0; i < 5; i++) { Thread thread = new Thread(() -> { if (concurrent.tryAcquire(1).allowed()) synchronized (allowed) { allowed[0]++; } }); threads.add(thread); thread.start(); }
    for (Thread thread : threads) thread.join();
    check(allowed[0] == 2, "atomic decision admits only capacity");
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
  private static void expectIllegal(Runnable a) { try { a.run(); throw new AssertionError("expected IllegalArgumentException"); } catch (IllegalArgumentException expected) {} }
}
