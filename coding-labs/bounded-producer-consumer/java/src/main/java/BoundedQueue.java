import java.time.Duration;
import java.util.ArrayDeque;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

public final class BoundedQueue<T> {
  public enum Status { ITEM, TIMEOUT, CLOSED }
  public record PollResult<T>(Status status, T item) {}
  private final ArrayDeque<T> items = new ArrayDeque<>(); private final int capacity; private final ReentrantLock lock = new ReentrantLock(); private final Condition notEmpty = lock.newCondition(); private final Condition notFull = lock.newCondition(); private boolean closed;
  public BoundedQueue(int capacity) { if (capacity <= 0) throw new IllegalArgumentException("capacity must be positive"); this.capacity = capacity; }
  public boolean offer(T item, Duration timeout) throws InterruptedException {
    long remaining = timeout.toNanos(); lock.lockInterruptibly();
    try { while (!closed && items.size() == capacity) { if (remaining <= 0) return false; remaining = notFull.awaitNanos(remaining); } if (closed) return false; items.addLast(item); notEmpty.signal(); return true; } finally { lock.unlock(); }
  }
  public PollResult<T> poll(Duration timeout) throws InterruptedException {
    long remaining = timeout.toNanos(); lock.lockInterruptibly();
    try { while (items.isEmpty() && !closed) { if (remaining <= 0) return new PollResult<>(Status.TIMEOUT, null); remaining = notEmpty.awaitNanos(remaining); } if (!items.isEmpty()) { T item = items.removeFirst(); notFull.signal(); return new PollResult<>(Status.ITEM, item); } return new PollResult<>(Status.CLOSED, null); } finally { lock.unlock(); }
  }
  public void close() { lock.lock(); try { closed = true; notEmpty.signalAll(); notFull.signalAll(); } finally { lock.unlock(); } }
}
