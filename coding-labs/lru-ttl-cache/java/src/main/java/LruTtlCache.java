import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.LongSupplier;

public final class LruTtlCache<K, V> {
  private record Entry<V>(V value, long expiresAt) {}
  private final int capacity; private final LongSupplier clock;
  private final LinkedHashMap<K, Entry<V>> entries = new LinkedHashMap<>(16, 0.75f, true);
  public LruTtlCache(int capacity, LongSupplier clock) { if (capacity <= 0) throw new IllegalArgumentException("capacity must be positive"); this.capacity = capacity; this.clock = clock; }
  public synchronized void put(K key, V value, long ttlMs) {
    if (ttlMs < 0) throw new IllegalArgumentException("ttl must be non-negative");
    entries.put(key, new Entry<>(value, clock.getAsLong() + ttlMs));
    while (entries.size() > capacity) entries.remove(entries.keySet().iterator().next());
  }
  public synchronized Optional<V> get(K key) {
    Entry<V> entry = entries.get(key);
    if (entry == null) return Optional.empty();
    if (clock.getAsLong() >= entry.expiresAt()) { entries.remove(key); return Optional.empty(); }
    return Optional.ofNullable(entry.value());
  }
  public synchronized int size() { return entries.size(); }
}
