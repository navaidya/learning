# Java runner

From this directory run `javac -d out src/main/java/IdempotentCommandHandler.java src/test/java/IdempotentCommandHandlerTest.java && java -ea -cp out IdempotentCommandHandlerTest` with JDK 17 or newer. Success is a silent exit code 0. Cleanup: `rm -rf out`.
