import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

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
    CountDownLatch producerWaiting = new CountDownLatch(1); BoundedQueue<String> blockedProducer = new BoundedQueue<>(1, producerWaiting::countDown); blockedProducer.offer("full", Duration.ZERO); AtomicBoolean offered = new AtomicBoolean(true);
    Thread producer = new Thread(() -> { try { offered.set(blockedProducer.offer("blocked", Duration.ofSeconds(1))); } catch (InterruptedException exception) { throw new AssertionError(exception); } });
    producer.start(); check(producerWaiting.await(1, TimeUnit.SECONDS), "producer reached condition wait"); blockedProducer.close(); producer.join(1_000); check(!producer.isAlive() && !offered.get(), "close wakes blocked producer");
    CountDownLatch consumerWaiting = new CountDownLatch(1); BoundedQueue<String> blockedConsumer = new BoundedQueue<>(1, consumerWaiting::countDown); AtomicReference<BoundedQueue.PollResult<String>> poll = new AtomicReference<>();
    Thread blocked = new Thread(() -> { try { poll.set(blockedConsumer.poll(Duration.ofSeconds(1))); } catch (InterruptedException exception) { throw new AssertionError(exception); } });
    blocked.start(); check(consumerWaiting.await(1, TimeUnit.SECONDS), "consumer reached condition wait"); blockedConsumer.close(); blocked.join(1_000); check(!blocked.isAlive() && poll.get().status() == BoundedQueue.Status.CLOSED, "close wakes blocked consumer");
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
}
