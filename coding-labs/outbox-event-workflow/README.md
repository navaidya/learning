# Transactional Outbox Event Workflow

Goal: model one local order/outbox commit, safe publisher retry, and consumer deduplication. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; this is a deterministic in-memory teaching model, not a broker replacement. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.

Run Java: `cd java && rm -rf out && javac -d out $(find src -name '*.java') && java -ea -cp out OutboxWorkflowTest`. Run Python: `cd python && python3 -m unittest discover -s tests -v`. Expected result: Java exits 0 with no output; Python reports all tests passing.
