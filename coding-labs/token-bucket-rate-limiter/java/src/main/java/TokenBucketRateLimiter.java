import java.util.function.LongSupplier;

public final class TokenBucketRateLimiter {
  public record Decision(boolean allowed, int remainingTokens, long retryAfterMillis) {}
  private final int capacity; private final double perSecond; private final LongSupplier clock; private double tokens; private long updatedAt;
  public TokenBucketRateLimiter(int capacity, double perSecond, LongSupplier clock) {
    if (capacity <= 0 || perSecond < 0) throw new IllegalArgumentException("invalid capacity or rate");
    this.capacity = capacity; this.perSecond = perSecond; this.clock = clock; this.tokens = capacity; this.updatedAt = clock.getAsLong();
  }
  public synchronized Decision tryAcquire(int cost) {
    if (cost <= 0 || cost > capacity) throw new IllegalArgumentException("cost must be within capacity");
    long now = Math.max(clock.getAsLong(), updatedAt); long elapsed = now - updatedAt; updatedAt = now;
    tokens = Math.min(capacity, tokens + elapsed * perSecond / 1000.0);
    if (tokens >= cost) { tokens -= cost; return new Decision(true, (int) Math.floor(tokens), 0); }
    long retry = perSecond == 0 ? Long.MAX_VALUE : (long) Math.ceil((cost - tokens) * 1000 / perSecond);
    return new Decision(false, (int) Math.floor(tokens), retry);
  }
}
