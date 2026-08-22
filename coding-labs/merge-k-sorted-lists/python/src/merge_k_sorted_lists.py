from __future__ import annotations

from dataclasses import dataclass
from heapq import heappop, heappush
from itertools import count
from typing import Sequence


@dataclass
class ListNode:
    value: int
    next: ListNode | None = None


def merge_k_lists(lists: Sequence[ListNode | None]) -> ListNode | None:
    """Return a new sorted list without mutating caller-owned nodes."""
    if lists is None:
        raise ValueError("lists are required")

    sequence = count()
    heap: list[tuple[int, int, ListNode]] = []
    for node in lists:
        if node is not None:
            heappush(heap, (node.value, next(sequence), node))

    sentinel = ListNode(0)
    tail = sentinel
    while heap:
        _, _, node = heappop(heap)
        tail.next = ListNode(node.value)
        tail = tail.next
        if node.next is not None:
            heappush(heap, (node.next.value, next(sequence), node.next))
    return sentinel.next
