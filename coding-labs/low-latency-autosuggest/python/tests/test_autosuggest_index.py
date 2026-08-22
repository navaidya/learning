import sys
import unittest

sys.path.insert(0, "src")

from autosuggest_index import AutosuggestIndex, Suggestion


class AutosuggestIndexTest(unittest.TestCase):
    def test_ranks_by_score_then_term(self):
        index = AutosuggestIndex([
            Suggestion("apple", 90),
            Suggestion("apricot", 70),
            Suggestion("application", 70),
            Suggestion("banana", 80),
        ])
        self.assertEqual(
            [item.term for item in index.suggest("AP", 3)],
            ["apple", "application", "apricot"],
        )

    def test_normalizes_deduplicates_and_supports_unicode(self):
        index = AutosuggestIndex([
            Suggestion(" Apple ", 60),
            Suggestion("apple", 95),
            Suggestion("Ångström", 50),
            Suggestion(" ", 100),
        ])
        self.assertEqual(index.suggest(" APP ", 10), (Suggestion("apple", 95),))
        self.assertEqual([item.term for item in index.suggest("å", 10)], ["ångström"])

    def test_empty_missing_and_bounded_immutable_results(self):
        index = AutosuggestIndex([Suggestion(f"a{i}", 100 - i) for i in range(12)] + [Suggestion("beta", 200)])
        self.assertEqual(index.suggest("missing", 10), ())
        self.assertEqual(index.suggest("", 1), (Suggestion("beta", 200),))
        results = index.suggest("a", 10)
        self.assertIsInstance(results, tuple)
        self.assertEqual(len(results), 10)

    def test_rejects_invalid_inputs(self):
        with self.assertRaises(ValueError):
            AutosuggestIndex(None)
        with self.assertRaises(ValueError):
            AutosuggestIndex([Suggestion("bad", -1)])
        index = AutosuggestIndex([])
        with self.assertRaises(ValueError):
            index.suggest(None, 1)
        with self.assertRaises(ValueError):
            index.suggest("a", 0)
        with self.assertRaises(ValueError):
            index.suggest("a", 11)


if __name__ == "__main__":
    unittest.main()
