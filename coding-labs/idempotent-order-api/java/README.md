# Java

From this directory, run `rm -rf out && javac -d out $(find src -name '*.java') && java -ea -cp out IdempotentOrderServiceTest`. Expected result: no output and exit code 0. Cleanup after running: `find . -name '*.class' -delete && rm -rf out`.
