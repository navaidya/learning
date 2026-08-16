import java.util.concurrent.atomic.AtomicBoolean;

public final class OutboxWorkflowTest {
  public static void main(String[] args) {
    OutboxWorkflow workflow = new OutboxWorkflow(); workflow.createOrder("o-1");
    check(workflow.pending().size() == 1, "order and event committed together");
    AtomicBoolean fail = new AtomicBoolean(true);
    workflow.publishPending(event -> { if (fail.get()) throw new RuntimeException("broker down"); });
    check(workflow.pending().size() == 1, "failed publish stays pending");
    fail.set(false); workflow.publishPending(event -> {});
    check(workflow.pending().isEmpty(), "successful retry marks published");
    OutboxWorkflow.Event event = workflow.events().get(0);
    check(workflow.consume(event), "first delivery applies"); check(!workflow.consume(event), "duplicate delivery ignored");
    check(!workflow.consume(new OutboxWorkflow.Event("", "", 0)), "malformed event rejected");
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
}
