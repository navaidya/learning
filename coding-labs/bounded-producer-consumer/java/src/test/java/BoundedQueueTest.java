import java.time.Duration;

public final class BoundedQueueTest {
  public static void main(String[] args) throws Exception {
    BoundedQueue<String> queue = new BoundedQueue<>(1);
    check(queue.offer("first", Duration.ZERO), "offer");
    check(!queue.offer("second", Duration.ofMillis(5)), "full timeout");
    check(queue.poll(Duration.ZERO).item().equals("first"), "fifo");
    check(queue.poll(Duration.ofMillis(5)).status() == BoundedQueue.Status.TIMEOUT, "empty timeout");
    queue.offer("drain", Duration.ZERO); queue.close(); queue.close();
    check(queue.poll(Duration.ZERO).item().equals("drain"), "drains after close");
    check(queue.poll(Duration.ZERO).status() == BoundedQueue.Status.CLOSED, "closed when drained");
    check(!queue.offer("late", Duration.ZERO), "closed rejects producers");
    BoundedQueue<String> handoff = new BoundedQueue<>(1); String[] received = {null};
    Thread consumer = new Thread(() -> { try { received[0] = handoff.poll(Duration.ofMillis(100)).item(); } catch (InterruptedException exception) { throw new AssertionError(exception); } });
    consumer.start(); check(handoff.offer("handoff", Duration.ofMillis(100)), "producer hands off to waiting consumer"); consumer.join(); check("handoff".equals(received[0]), "consumer receives handoff");
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
}
