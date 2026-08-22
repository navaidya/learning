import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;

public final class MergeKSortedLists {
  private MergeKSortedLists() {}

  public static final class ListNode {
    public final int value;
    public ListNode next;

    public ListNode(int value) {
      this.value = value;
    }
  }

  private record Entry(int value, long sequence, ListNode node) {}

  /** Returns a newly allocated sorted list without rewiring caller-owned nodes. */
  public static ListNode merge(List<ListNode> lists) {
    if (lists == null) throw new IllegalArgumentException("lists are required");

    PriorityQueue<Entry> heap = new PriorityQueue<>(
        Comparator.comparingInt(Entry::value).thenComparingLong(Entry::sequence));
    long sequence = 0;
    for (ListNode node : lists) {
      if (node != null) heap.add(new Entry(node.value, sequence++, node));
    }

    ListNode sentinel = new ListNode(0);
    ListNode tail = sentinel;
    while (!heap.isEmpty()) {
      Entry entry = heap.remove();
      tail.next = new ListNode(entry.node.value);
      tail = tail.next;
      if (entry.node.next != null) {
        heap.add(new Entry(entry.node.next.value, sequence++, entry.node.next));
      }
    }
    return sentinel.next;
  }
}
