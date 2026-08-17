import java.util.function.DoubleSupplier;
import java.util.function.LongConsumer;
import java.util.function.LongSupplier;

public final class RetryPolicy<T> {
  @FunctionalInterface public interface Operation<T> { T run(); }
  public static class RetryableFailure extends RuntimeException { public RetryableFailure(String message) { super(message); } }
  public static class PermanentFailure extends RuntimeException { public PermanentFailure(String message) { super(message); } }
  public record Result<T>(boolean success, T value, RuntimeException failure, int attempts) {}
  private final int maxAttempts; private final long maxElapsed; private final long baseDelay; private final long maxDelay; private final LongSupplier clock; private final LongConsumer sleeper; private final DoubleSupplier random;
  public RetryPolicy(int maxAttempts, long maxElapsed, long baseDelay, long maxDelay, LongSupplier clock, LongConsumer sleeper, DoubleSupplier random) { this.maxAttempts = maxAttempts; this.maxElapsed = maxElapsed; this.baseDelay = baseDelay; this.maxDelay = maxDelay; this.clock = clock; this.sleeper = sleeper; this.random = random; }
  public Result<T> execute(Operation<T> operation) {
    long started = clock.getAsLong(); RuntimeException last = null; int attempts = 0;
    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
      attempts = attempt;
      try { return new Result<>(true, operation.run(), null, attempt); }
      catch (PermanentFailure failure) { return new Result<>(false, null, failure, attempt); }
      catch (RetryableFailure failure) { last = failure; if (attempt == maxAttempts) break; long cap = Math.min(maxDelay, baseDelay * (1L << Math.min(attempt - 1, 30))); long delay = (long) Math.floor(cap * random.getAsDouble()); if (clock.getAsLong() - started + delay > maxElapsed) break; sleeper.accept(delay); }
    }
    return new Result<>(false, null, last, attempts);
  }
}
