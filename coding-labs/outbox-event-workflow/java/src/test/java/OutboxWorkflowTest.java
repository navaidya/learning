import java.util.concurrent.atomic.AtomicBoolean;

public final class OutboxWorkflowTest {
  public static void main(String[] args) {
    OutboxWorkflow workflow = new OutboxWorkflow();
    check(workflow.createOrder("o-1"), "first aggregate creates one event");
    check(!workflow.createOrder("o-1"), "duplicate aggregate create is idempotent");
    check(workflow.createOrder("o-2") && workflow.pending().size() == 2, "two aggregates remain distinct");
    AtomicBoolean fail = new AtomicBoolean(true);
    var firstResults = workflow.publishPending(event -> { if (fail.get()) throw new RuntimeException("broker down"); });
    check(firstResults.stream().allMatch(result -> !result.published() && result.retries() == 1), "failure stays pending with retry count");
    fail.set(false); var secondResults = workflow.publishPending(event -> {});
    check(secondResults.stream().allMatch(OutboxWorkflow.PublishResult::published) && workflow.pending().isEmpty(), "successful retry marks published");
    OutboxWorkflow.Event event = workflow.events().get(0);
    check(event.status() == OutboxWorkflow.Status.PUBLISHED && event.retries() == 1, "event records final status");
    check(workflow.consume(event), "first delivery applies"); check(!workflow.consume(event), "duplicate delivery ignored");
    check(!workflow.consume(new OutboxWorkflow.Event("", "", 0)), "malformed event rejected");
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
}
