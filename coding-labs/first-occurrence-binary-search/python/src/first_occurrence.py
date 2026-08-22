from collections.abc import Sequence


def find_first(values: Sequence[int], key: int) -> int:
    """Return the lowest index containing key, or -1 when key is absent."""
    if values is None:
        raise ValueError("values are required")

    low, high, result = 0, len(values) - 1, -1
    while low <= high:
        middle = low + (high - low) // 2
        if values[middle] >= key:
            if values[middle] == key:
                result = middle
            high = middle - 1
        else:
            low = middle + 1
    return result
