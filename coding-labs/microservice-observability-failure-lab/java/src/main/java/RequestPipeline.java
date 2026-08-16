import java.util.function.Consumer;
import java.util.function.LongSupplier;

public final class RequestPipeline {
  public enum Outcome { SUCCESS, TIMEOUT, DEPENDENCY_FAILURE }
  @FunctionalInterface public interface Dependency { DependencyResult call(String requestId); }
  public record DependencyResult(Outcome outcome, String value) { public static DependencyResult success(String value) { return new DependencyResult(Outcome.SUCCESS, value); } public static DependencyResult timeout() { return new DependencyResult(Outcome.TIMEOUT, null); } public static DependencyResult failure() { return new DependencyResult(Outcome.DEPENDENCY_FAILURE, null); } }
  public record Response(Outcome outcome, String value) {}
  public record Event(String name, String requestId, String outcome, long durationMs, String dependency) {}
  public record Metric(String name, String outcome, long value) {}
  private final Dependency dependency; private final Consumer<Event> eventSink; private final Consumer<Metric> metricSink; private final LongSupplier clock; private final String dependencyName;
  public RequestPipeline(Dependency dependency, Consumer<Event> eventSink, Consumer<Metric> metricSink, LongSupplier clock, String dependencyName) { this.dependency = dependency; this.eventSink = eventSink; this.metricSink = metricSink; this.clock = clock; this.dependencyName = dependencyName; }
  public Response handle(String requestId, long deadlineMs) {
    requestId = requestId == null ? null : requestId.trim();
    if (requestId == null || requestId.isBlank() || deadlineMs < 0) throw new IllegalArgumentException("request id and deadline required");
    long started = clock.getAsLong(); emit(new Event("request_started", requestId, "IN_PROGRESS", 0, dependencyName)); DependencyResult result;
    try { result = dependency.call(requestId); } catch (RuntimeException failure) { result = DependencyResult.failure(); }
    long elapsed = clock.getAsLong() - started; if (elapsed > deadlineMs) result = DependencyResult.timeout();
    String outcome = result.outcome().name(); emit(new Event("dependency_result", requestId, outcome, elapsed, dependencyName)); emit(new Event("request_finished", requestId, outcome, elapsed, dependencyName)); metric(new Metric("request_latency_ms", outcome, elapsed)); metric(new Metric("request_outcome_total", outcome, 1)); return new Response(result.outcome(), result.value());
  }
  private void emit(Event event) { try { eventSink.accept(event); } catch (RuntimeException ignored) { } }
  private void metric(Metric value) { try { metricSink.accept(value); } catch (RuntimeException ignored) { } }
}
