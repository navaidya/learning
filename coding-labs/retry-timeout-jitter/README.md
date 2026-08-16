# Retry, Timeout, and Jitter Policy

Goal: keep retryable failures bounded by attempt and elapsed-time budgets using injected clock, sleeper, and random seams. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; no test sleeps for real. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.

Run Java: `cd java && rm -rf out && javac -d out $(find src -name '*.java') && java -ea -cp out RetryPolicyTest`. Run Python: `cd python && python3 -m unittest discover -s tests -v`. Expected result: Java exits 0 with no output; Python reports all tests passing.
