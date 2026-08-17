import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class OutboxWorkflow {
  @FunctionalInterface public interface Publisher { void publish(Event event); }
  public enum Status { PENDING, PUBLISHED }
  public record Event(String id, String aggregateId, int sequence, Status status, int retries) {
    public Event(String id, String aggregateId, int sequence) { this(id, aggregateId, sequence, Status.PENDING, 0); }
  }
  public record PublishResult(String eventId, boolean published, int retries) {}
  private final List<Event> events = new ArrayList<>(); private final Set<String> orders = new HashSet<>(); private final Set<String> consumed = new HashSet<>();
  public synchronized boolean createOrder(String orderId) {
    if (orderId == null || orderId.isBlank()) throw new IllegalArgumentException("order id required");
    if (!orders.add(orderId)) return false;
    events.add(new Event("event-" + orderId, orderId, 1)); return true;
  }
  public synchronized List<Event> pending() { return events.stream().filter(event -> event.status() == Status.PENDING).toList(); }
  public List<PublishResult> publishPending(Publisher publisher) {
    List<PublishResult> results = new ArrayList<>();
    for (Event event : pending()) { try { publisher.publish(event); results.add(update(event, Status.PUBLISHED, event.retries())); } catch (RuntimeException ignored) { results.add(update(event, Status.PENDING, event.retries() + 1)); } }
    return results;
  }
  private synchronized PublishResult update(Event event, Status status, int retries) {
    for (int index = 0; index < events.size(); index++) if (events.get(index).id().equals(event.id())) { events.set(index, new Event(event.id(), event.aggregateId(), event.sequence(), status, retries)); break; }
    return new PublishResult(event.id(), status == Status.PUBLISHED, retries);
  }
  public synchronized boolean consume(Event event) { return event != null && !event.id().isBlank() && !event.aggregateId().isBlank() && event.sequence() > 0 && consumed.add(event.id()); }
  public synchronized List<Event> events() { return List.copyOf(events); }
}
