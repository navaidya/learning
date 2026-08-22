import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class MergeKSortedListsTest {
  public static void main(String[] args) {
    MergeKSortedLists.ListNode first = list(1, 4, 5);
    MergeKSortedLists.ListNode second = list(1, 3, 4);
    MergeKSortedLists.ListNode third = list(2, 6);
    MergeKSortedLists.ListNode firstNext = first.next;

    check(values(MergeKSortedLists.merge(List.of(first, second, third)))
        .equals(List.of(1, 1, 2, 3, 4, 4, 5, 6)), "merges the sample");
    check(first.next == firstNext && values(first).equals(List.of(1, 4, 5)), "does not mutate inputs");
    check(MergeKSortedLists.merge(List.of()) == null, "handles no lists");
    check(MergeKSortedLists.merge(Arrays.asList(null, null)) == null, "handles empty lists");
    check(values(MergeKSortedLists.merge(Arrays.asList(list(-3, 2), null, list(-3, 2))))
        .equals(List.of(-3, -3, 2, 2)), "handles null entries and duplicate values");
    check(values(MergeKSortedLists.merge(List.of(list(8, 9)))).equals(List.of(8, 9)), "copies one list");
    expectIllegal(() -> MergeKSortedLists.merge(null));
  }

  private static MergeKSortedLists.ListNode list(int... values) {
    MergeKSortedLists.ListNode head = null;
    MergeKSortedLists.ListNode tail = null;
    for (int value : values) {
      MergeKSortedLists.ListNode node = new MergeKSortedLists.ListNode(value);
      if (head == null) head = node;
      else tail.next = node;
      tail = node;
    }
    return head;
  }

  private static List<Integer> values(MergeKSortedLists.ListNode node) {
    List<Integer> result = new ArrayList<>();
    while (node != null) {
      result.add(node.value);
      node = node.next;
    }
    return result;
  }

  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void expectIllegal(Runnable action) {
    try {
      action.run();
      throw new AssertionError("expected IllegalArgumentException");
    } catch (IllegalArgumentException expected) {
      // Expected boundary behavior.
    }
  }
}
