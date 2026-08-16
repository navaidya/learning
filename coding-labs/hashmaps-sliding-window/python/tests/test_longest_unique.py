import sys
import unittest
sys.path.insert(0, "src")
from longest_unique import longest_unique_length

class LongestUniqueTest(unittest.TestCase):
    def test_empty_and_normal_windows(self):
        self.assertEqual(longest_unique_length(""), 0)
        self.assertEqual(longest_unique_length("abba"), 2)
        self.assertEqual(longest_unique_length("pwwkew"), 3)

    def test_unicode_and_invalid_input(self):
        self.assertEqual(longest_unique_length("åßå"), 2)
        with self.assertRaises(ValueError): longest_unique_length(None)

if __name__ == "__main__": unittest.main()
