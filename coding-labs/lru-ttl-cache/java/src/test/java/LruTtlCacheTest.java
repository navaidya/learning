import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

public final class LruTtlCacheTest {
  public static void main(String[] args) {
    AtomicLong now = new AtomicLong(100);
    LruTtlCache<String, String> cache = new LruTtlCache<>(2, now::get);
    cache.put("a", "A", 10); cache.put("b", "B", 100);
    check(cache.get("a").equals(Optional.of("A")), "hit");
    cache.put("c", "C", 100);
    check(cache.get("b").isEmpty(), "read promotes a, evicts b");
    check(cache.get("missing").isEmpty(), "missing key is explicit miss");
    cache.put("c", "C2", 100); check(cache.get("c").equals(Optional.of("C2")), "overwrite replaces value");
    now.set(110); check(cache.get("a").isEmpty(), "expires at boundary");
    check(cache.get("a").isEmpty(), "expired value cannot reappear");
    cache.put("z", "Z", 0); check(cache.get("z").isEmpty(), "zero ttl");
    expectIllegal(() -> cache.put(null, "x", 1)); expectIllegal(() -> cache.put("x", null, 1)); expectIllegal(() -> cache.get(null));
    expectIllegal(() -> new LruTtlCache<String, String>(0, now::get));
    AtomicLong evictionClock = new AtomicLong(0); LruTtlCache<String, String> expiredNewest = new LruTtlCache<>(2, evictionClock::get);
    expiredNewest.put("live", "L", 100); expiredNewest.put("expired", "E", 1); evictionClock.set(2); expiredNewest.put("new", "N", 100);
    check(expiredNewest.get("live").equals(Optional.of("L")) && expiredNewest.get("expired").isEmpty(), "purges expired entry before live LRU eviction");
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
  private static void expectIllegal(Runnable a) { try { a.run(); throw new AssertionError("expected IllegalArgumentException"); } catch (IllegalArgumentException expected) {} }
}
