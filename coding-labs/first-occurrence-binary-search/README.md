# First-Occurrence Binary Search

Find the leftmost matching key in a sorted sequence while preserving `O(log n)` time and `O(1)` auxiliary space. Prerequisites: JDK 17+ and Python 3.10+.

Run Java: `cd java && javac -d out src/main/java/FirstOccurrenceSearch.java src/test/java/FirstOccurrenceSearchTest.java && java -ea -cp out FirstOccurrenceSearchTest`.

Run Python: `cd python && python3 -m unittest discover -s tests -v`.

Java exits silently with status 0 when its assertions pass. Python reports three passing tests. Java cleanup: `rm -rf out`. Python requires no virtual environment or generated files.
