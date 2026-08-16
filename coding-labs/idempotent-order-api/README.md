# Idempotent Order API

Goal: distinguish a duplicate replay from conflicting reuse of an idempotency key. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; the exercise is in-memory only and demonstrates the local locking boundary. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.
