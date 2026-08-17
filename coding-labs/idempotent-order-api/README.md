# Idempotent Order API

Goal: distinguish a duplicate replay from conflicting reuse of an idempotency key. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; the exercise is in-memory only and demonstrates the local locking boundary. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.

Run Java: `cd java && rm -rf out && javac -d out $(find src -name '*.java') && java -ea -cp out IdempotentOrderServiceTest`. Run Python: `cd python && python3 -m unittest discover -s tests -v`. Expected result: Java exits 0 with no output; Python reports all tests passing.
