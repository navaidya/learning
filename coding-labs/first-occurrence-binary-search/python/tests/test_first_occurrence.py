import sys
import unittest

sys.path.insert(0, "src")

from first_occurrence import find_first


class FirstOccurrenceTest(unittest.TestCase):
    def test_returns_leftmost_duplicate(self):
        values = [-40, -10, 20, 108, 108, 243, 285, 285, 285, 401]
        self.assertEqual(find_first(values, 108), 3)
        self.assertEqual(find_first(values, 285), 6)
        self.assertEqual(find_first([7, 7, 7, 7], 7), 0)

    def test_handles_empty_absent_and_endpoints(self):
        values = [-40, -10, 20, 108, 108, 243, 285, 285, 285, 401]
        self.assertEqual(find_first([], 7), -1)
        self.assertEqual(find_first([1, 3, 5], 4), -1)
        self.assertEqual(find_first(values, -40), 0)
        self.assertEqual(find_first(values, 401), 9)

    def test_rejects_none(self):
        with self.assertRaises(ValueError):
            find_first(None, 1)


if __name__ == "__main__":
    unittest.main()
