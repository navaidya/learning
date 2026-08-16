import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class OutboxWorkflow {
  @FunctionalInterface public interface Publisher { void publish(Event event); }
  public record Event(String id, String aggregateId, int sequence) {}
  private final List<Event> events = new ArrayList<>(); private final Set<String> published = new HashSet<>(); private final Set<String> consumed = new HashSet<>();
  public synchronized void createOrder(String orderId) { if (orderId == null || orderId.isBlank()) throw new IllegalArgumentException("order id required"); events.add(new Event("event-" + orderId, orderId, 1)); }
  public synchronized List<Event> pending() { return events.stream().filter(event -> !published.contains(event.id())).toList(); }
  public void publishPending(Publisher publisher) { for (Event event : pending()) { try { publisher.publish(event); synchronized (this) { published.add(event.id()); } } catch (RuntimeException ignored) { } } }
  public synchronized boolean consume(Event event) { return event != null && !event.id().isBlank() && !event.aggregateId().isBlank() && event.sequence() > 0 && consumed.add(event.id()); }
  public synchronized List<Event> events() { return List.copyOf(events); }
}
