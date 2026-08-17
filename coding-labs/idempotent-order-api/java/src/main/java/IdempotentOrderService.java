import java.util.HashMap;
import java.util.Map;

public final class IdempotentOrderService {
  public enum Status { CREATED, REPLAYED, CONFLICT, INVALID }
  public record Order(String id, String fingerprint, int amountCents) {}
  public record Result(Status status, Order order) {}
  private final Map<String, Order> records = new HashMap<>(); private int nextId;
  public synchronized Result create(String key, String item, int amountCents) {
    if (key == null || key.isBlank() || item == null || item.isBlank() || amountCents <= 0) return new Result(Status.INVALID, null);
    String fingerprint = item + ":" + amountCents; Order existing = records.get(key);
    if (existing != null) return new Result(existing.fingerprint().equals(fingerprint) ? Status.REPLAYED : Status.CONFLICT, existing);
    Order order = new Order("order-" + (++nextId), fingerprint, amountCents); records.put(key, order); return new Result(Status.CREATED, order);
  }
  public synchronized int orderCount() { return records.size(); }
}
