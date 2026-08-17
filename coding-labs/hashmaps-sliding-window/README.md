# Hashmaps and Sliding Windows

Goal: implement a linear-time longest-unique-substring routine and explain its window invariant. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; each runner reports no output when its assertions pass. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.

Run Java: `cd java && rm -rf out && javac -d out $(find src -name '*.java') && java -ea -cp out LongestUniqueSubstringTest`. Run Python: `cd python && python3 -m unittest discover -s tests -v`. Expected result: Java exits 0 with no output; Python reports all tests passing.
