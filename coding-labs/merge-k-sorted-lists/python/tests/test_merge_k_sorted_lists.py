import sys
import unittest

sys.path.insert(0, "src")

from merge_k_sorted_lists import ListNode, merge_k_lists


def linked(*values: int) -> ListNode | None:
    head = tail = None
    for value in values:
        node = ListNode(value)
        if head is None:
            head = node
        else:
            tail.next = node
        tail = node
    return head


def values(node: ListNode | None) -> list[int]:
    result = []
    while node is not None:
        result.append(node.value)
        node = node.next
    return result


class MergeKSortedListsTest(unittest.TestCase):
    def test_merges_sample_without_mutating_inputs(self):
        first = linked(1, 4, 5)
        first_next = first.next
        result = merge_k_lists([first, linked(1, 3, 4), linked(2, 6)])
        self.assertEqual(values(result), [1, 1, 2, 3, 4, 4, 5, 6])
        self.assertIs(first.next, first_next)
        self.assertEqual(values(first), [1, 4, 5])

    def test_handles_empty_null_entries_duplicates_and_negative_values(self):
        self.assertIsNone(merge_k_lists([]))
        self.assertIsNone(merge_k_lists([None, None]))
        self.assertEqual(values(merge_k_lists([linked(-3, 2), None, linked(-3, 2)])), [-3, -3, 2, 2])
        self.assertEqual(values(merge_k_lists([linked(8, 9)])), [8, 9])

    def test_rejects_none_collection(self):
        with self.assertRaises(ValueError):
            merge_k_lists(None)


if __name__ == "__main__":
    unittest.main()
