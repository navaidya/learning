def longest_unique_length(text: str) -> int:
    """Return the length of the longest contiguous substring without repeats."""
    if text is None:
        raise ValueError("text is required")
    last_seen: dict[str, int] = {}
    left = best = 0
    for right, char in enumerate(text):
        previous = last_seen.get(char)
        if previous is not None and previous >= left:
            left = previous + 1
        last_seen[char] = right
        best = max(best, right - left + 1)
    return best
