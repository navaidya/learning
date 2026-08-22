# Low-Latency Autosuggest

Build an immutable top-results-per-prefix index with normalized terms, deterministic score ranking, and bounded reads. This is the core data-structure exercise—not a production distributed service. Prerequisites: JDK 17+ and Python 3.10+.

Run Java: `cd java && javac -d out src/main/java/AutosuggestIndex.java src/test/java/AutosuggestIndexTest.java && java -ea -cp out AutosuggestIndexTest`.

Run Python: `cd python && python3 -m unittest discover -s tests -v`.

Java exits silently with status 0 when its assertions pass. Python reports four passing tests. Java cleanup: `rm -rf out`. Python requires no virtual environment or generated files.

For `T` normalized terms with lengths `Lᵢ`, construction sorts in `O(T log T)`. It visits `O(ΣLᵢ)` prefix positions, but these straightforward Java substring and Python slice implementations copy prefix text, so materialization can take `O(ΣLᵢ²)` character work and space. Each prefix retains at most ten results. A lookup is `O(p + limit)` for normalized prefix length `p`.
