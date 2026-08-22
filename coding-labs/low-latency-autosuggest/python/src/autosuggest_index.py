from dataclasses import dataclass
from typing import Sequence


MAX_RESULTS = 10


@dataclass(frozen=True)
class Suggestion:
    term: str
    score: int


class AutosuggestIndex:
    """Immutable top-results-per-prefix index for a bounded teaching dataset."""

    def __init__(self, suggestions: Sequence[Suggestion]):
        if suggestions is None:
            raise ValueError("suggestions are required")

        best_score_by_term: dict[str, int] = {}
        for suggestion in suggestions:
            if suggestion is None:
                raise ValueError("suggestion is required")
            if suggestion.score < 0:
                raise ValueError("score cannot be negative")
            term = self._normalize(suggestion.term)
            if term:
                best_score_by_term[term] = max(suggestion.score, best_score_by_term.get(term, -1))

        ranked = sorted(
            (Suggestion(term, score) for term, score in best_score_by_term.items()),
            key=lambda suggestion: (-suggestion.score, suggestion.term),
        )
        building: dict[str, list[Suggestion]] = {}
        for suggestion in ranked:
            self._add(building, "", suggestion)
            for end in range(1, len(suggestion.term) + 1):
                self._add(building, suggestion.term[:end], suggestion)
        self._by_prefix = {prefix: tuple(values) for prefix, values in building.items()}

    def suggest(self, prefix: str, limit: int) -> tuple[Suggestion, ...]:
        if prefix is None:
            raise ValueError("prefix is required")
        if limit < 1 or limit > MAX_RESULTS:
            raise ValueError("limit must be between 1 and 10")
        return self._by_prefix.get(self._normalize(prefix), ())[:limit]

    @staticmethod
    def _add(index: dict[str, list[Suggestion]], prefix: str, suggestion: Suggestion) -> None:
        values = index.setdefault(prefix, [])
        if len(values) < MAX_RESULTS:
            values.append(suggestion)

    @staticmethod
    def _normalize(value: str) -> str:
        if value is None:
            raise ValueError("term is required")
        return value.strip().lower()
