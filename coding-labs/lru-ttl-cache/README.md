# LRU Cache with TTL

Goal: build bounded LRU eviction and deterministic expiration with an injected clock. Prerequisites: JDK 17+ and Python 3.10+. Run either language from its own directory; all tests use fake time, never real sleep. Java cleanup: `find . -name '*.class' -delete && rm -rf out`. Python has no virtual environment or generated files required.

Run Java: `cd java && rm -rf out && javac -d out $(find src -name '*.java') && java -ea -cp out LruTtlCacheTest`. Run Python: `cd python && python3 -m unittest discover -s tests -v`. Expected result: Java exits 0 with no output; Python reports all tests passing.
