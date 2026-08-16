# Retry, Timeout, and Jitter Policy

Goal: keep retryable failures bounded by attempt and elapsed-time budgets using injected clock, sleeper, and random seams. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; no test sleeps for real. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.
