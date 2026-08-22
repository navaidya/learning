# Merge K Sorted Lists

Merge `k` sorted linked lists containing `N` total nodes in `O(N log k)` time. The heap holds at most one node per input list (`O(k)`); this teaching implementation allocates an `O(N)` output so caller-owned nodes remain unchanged. Prerequisites: JDK 17+ and Python 3.10+.

Run Java: `cd java && javac -d out src/main/java/MergeKSortedLists.java src/test/java/MergeKSortedListsTest.java && java -ea -cp out MergeKSortedListsTest`.

Run Python: `cd python && python3 -m unittest discover -s tests -v`.

Java exits silently with status 0 when its assertions pass. Python reports three passing tests. Java cleanup: `rm -rf out`. Python requires no virtual environment or generated files.
