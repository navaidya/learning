public final class IdempotentOrderServiceTest {
  public static void main(String[] args) throws Exception {
    IdempotentOrderService service = new IdempotentOrderService();
    IdempotentOrderService.Result first = service.create("key-1", "book", 1200);
    IdempotentOrderService.Result replay = service.create("key-1", "book", 1200);
    check(first.status() == IdempotentOrderService.Status.CREATED, "created");
    check(replay.status() == IdempotentOrderService.Status.REPLAYED && replay.order().id().equals(first.order().id()), "same request replays");
    check(service.create("key-1", "pen", 1200).status() == IdempotentOrderService.Status.CONFLICT, "changed request conflicts");
    check(service.create("", "book", 1200).status() == IdempotentOrderService.Status.INVALID, "blank key invalid");
    IdempotentOrderService concurrent = new IdempotentOrderService(); Thread a = new Thread(() -> concurrent.create("same", "book", 1)); Thread b = new Thread(() -> concurrent.create("same", "book", 1)); a.start(); b.start(); a.join(); b.join();
    check(concurrent.orderCount() == 1, "one concurrent order");
  }
  private static void check(boolean c, String m) { if (!c) throw new AssertionError(m); }
}
