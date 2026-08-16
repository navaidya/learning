# Bounded Producer–Consumer Queue

Goal: learn FIFO backpressure, bounded waits, and drain-on-close semantics. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; the tests use short bounded waits and leave no workers running. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.
