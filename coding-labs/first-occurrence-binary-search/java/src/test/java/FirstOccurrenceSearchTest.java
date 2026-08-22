public final class FirstOccurrenceSearchTest {
  public static void main(String[] args) {
    int[] sample = {-40, -10, 20, 108, 108, 243, 285, 285, 285, 401};
    check(FirstOccurrenceSearch.find(sample, 108) == 3, "returns the first 108");
    check(FirstOccurrenceSearch.find(sample, 285) == 6, "returns the first 285");
    check(FirstOccurrenceSearch.find(new int[] {7, 7, 7, 7}, 7) == 0, "handles all-equal input");
    check(FirstOccurrenceSearch.find(new int[] {}, 7) == -1, "handles empty input");
    check(FirstOccurrenceSearch.find(new int[] {1, 3, 5}, 4) == -1, "returns absent sentinel");
    check(FirstOccurrenceSearch.find(sample, -40) == 0, "finds the first endpoint");
    check(FirstOccurrenceSearch.find(sample, 401) == 9, "finds the last endpoint");
    expectIllegal(() -> FirstOccurrenceSearch.find(null, 1));
  }

  private static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }

  private static void expectIllegal(Runnable action) {
    try {
      action.run();
      throw new AssertionError("expected IllegalArgumentException");
    } catch (IllegalArgumentException expected) {
      // Expected boundary behavior.
    }
  }
}
