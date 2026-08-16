import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

public final class RequestPipelineTest {
  public static void main(String[] args) {
    AtomicLong now = new AtomicLong(10); List<RequestPipeline.Event> events = new ArrayList<>();
    RequestPipeline pipeline = new RequestPipeline(request -> { now.addAndGet(5); return RequestPipeline.DependencyResult.success("ok"); }, events::add, now::get, "catalog");
    check(pipeline.handle("r-1", 20).outcome() == RequestPipeline.Outcome.SUCCESS, "success");
    check(events.size() == 3 && events.get(2).durationMs() == 5, "correlated events");
    RequestPipeline timeout = new RequestPipeline(request -> RequestPipeline.DependencyResult.timeout(), event -> { throw new RuntimeException("sink down"); }, now::get, "catalog");
    check(timeout.handle("r-2", 20).outcome() == RequestPipeline.Outcome.TIMEOUT, "timeout isolated from telemetry failure");
    expectIllegal(() -> pipeline.handle("", 10));
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
  private static void expectIllegal(Runnable a) { try { a.run(); throw new AssertionError("expected IllegalArgumentException"); } catch (IllegalArgumentException expected) {} }
}
