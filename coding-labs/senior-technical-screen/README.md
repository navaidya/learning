# Senior Engineering Technical Screen

Practice explaining production-grade principles through a small idempotent command handler. It demonstrates boundary validation, immutable results, deterministic replay, conflict detection, dependency failure recovery, and an explicit concurrency boundary. Prerequisites: JDK 17+ and Python 3.10+.

Run Java: `cd java && javac -d out src/main/java/IdempotentCommandHandler.java src/test/java/IdempotentCommandHandlerTest.java && java -ea -cp out IdempotentCommandHandlerTest`.

Run Python: `cd python && python3 -m unittest discover -s tests -v`.

Java exits silently with status 0 when its assertions pass. Python reports four passing tests. Java cleanup: `rm -rf out`. Python requires no virtual environment or generated files.

The in-process lock is intentionally small in scope. A real multi-instance service would enforce request-ID uniqueness in durable storage and return sanitized errors without exposing payloads or dependency internals.
