import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

public final class RequestPipelineTest {
  public static void main(String[] args) {
    AtomicLong now = new AtomicLong(10); List<RequestPipeline.Event> events = new ArrayList<>(); List<RequestPipeline.Metric> metrics = new ArrayList<>();
    RequestPipeline pipeline = new RequestPipeline(request -> { now.addAndGet(5); return RequestPipeline.DependencyResult.success("ok"); }, events::add, metrics::add, now::get, "catalog");
    check(pipeline.handle("r-1", 20).outcome() == RequestPipeline.Outcome.SUCCESS, "success");
    check(events.size() == 3 && events.stream().allMatch(event -> !event.outcome().isBlank()) && events.get(2).durationMs() == 5, "complete correlated events");
    check(metrics.stream().anyMatch(metric -> metric.name().equals("request_latency_ms")) && metrics.stream().anyMatch(metric -> metric.name().equals("request_outcome_total") && metric.outcome().equals("SUCCESS")), "latency and outcome metrics");
    RequestPipeline exception = new RequestPipeline(request -> { throw new RuntimeException("down"); }, events::add, metrics::add, now::get, "catalog");
    check(exception.handle("r-2", 20).outcome() == RequestPipeline.Outcome.DEPENDENCY_FAILURE, "dependency exception classified");
    RequestPipeline timeout = new RequestPipeline(request -> { now.addAndGet(50); return RequestPipeline.DependencyResult.success("late"); }, event -> { throw new RuntimeException("sink down"); }, metric -> { throw new RuntimeException("sink down"); }, now::get, "catalog");
    check(timeout.handle("r-3", 20).outcome() == RequestPipeline.Outcome.TIMEOUT, "deadline timeout isolated from telemetry failure");
    check(pipeline.handle("r-4", 20).outcome() == RequestPipeline.Outcome.SUCCESS && events.stream().map(RequestPipeline.Event::requestId).distinct().count() == 3, "recovery uses distinct request ids");
    expectIllegal(() -> pipeline.handle("", 10));
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
  private static void expectIllegal(Runnable a) { try { a.run(); throw new AssertionError("expected IllegalArgumentException"); } catch (IllegalArgumentException expected) {} }
}
