# Token Bucket Rate Limiter

Goal: make an atomic admission decision with capacity, refill, and retry-after semantics. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; fake clocks make refill deterministic and tests include parallel callers. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.
