import java.util.function.Consumer;
import java.util.function.LongSupplier;

public final class RequestPipeline {
  public enum Outcome { SUCCESS, TIMEOUT, DEPENDENCY_FAILURE }
  @FunctionalInterface public interface Dependency { DependencyResult call(String requestId); }
  public record DependencyResult(Outcome outcome, String value) { public static DependencyResult success(String value) { return new DependencyResult(Outcome.SUCCESS, value); } public static DependencyResult timeout() { return new DependencyResult(Outcome.TIMEOUT, null); } public static DependencyResult failure() { return new DependencyResult(Outcome.DEPENDENCY_FAILURE, null); } }
  public record Response(Outcome outcome, String value) {}
  public record Event(String name, String requestId, String outcome, long durationMs, String dependency) {}
  private final Dependency dependency; private final Consumer<Event> sink; private final LongSupplier clock; private final String dependencyName;
  public RequestPipeline(Dependency dependency, Consumer<Event> sink, LongSupplier clock, String dependencyName) { this.dependency = dependency; this.sink = sink; this.clock = clock; this.dependencyName = dependencyName; }
  public Response handle(String requestId, long deadlineMs) {
    if (requestId == null || requestId.isBlank() || deadlineMs < 0) throw new IllegalArgumentException("request id and deadline required");
    long started = clock.getAsLong(); emit(new Event("request_started", requestId, "", 0, dependencyName)); DependencyResult result;
    try { result = dependency.call(requestId); } catch (RuntimeException failure) { result = DependencyResult.failure(); }
    long elapsed = clock.getAsLong() - started; if (elapsed > deadlineMs) result = DependencyResult.timeout();
    emit(new Event("dependency_result", requestId, result.outcome().name(), elapsed, dependencyName)); emit(new Event("request_finished", requestId, result.outcome().name(), elapsed, dependencyName)); return new Response(result.outcome(), result.value());
  }
  private void emit(Event event) { try { sink.accept(event); } catch (RuntimeException ignored) { } }
}
