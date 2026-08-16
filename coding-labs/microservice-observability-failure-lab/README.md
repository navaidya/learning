# Microservice Observability and Failure Lab

Goal: emit correlated, safe telemetry through success, timeout, dependency failure, and recovery-ready paths. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; the dependency and telemetry sink are deterministic in-memory seams. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.
