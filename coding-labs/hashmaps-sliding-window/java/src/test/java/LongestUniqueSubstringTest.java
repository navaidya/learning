public final class LongestUniqueSubstringTest {
  public static void main(String[] args) {
    check(LongestUniqueSubstring.longestUniqueLength("") == 0, "empty");
    check(LongestUniqueSubstring.longestUniqueLength("abba") == 2, "repeat moves left forward");
    check(LongestUniqueSubstring.longestUniqueLength("pwwkew") == 3, "normal window");
    check(LongestUniqueSubstring.longestUniqueLength("åßå") == 2, "unicode chars");
    expectIllegal(() -> LongestUniqueSubstring.longestUniqueLength(null));
  }
  private static void check(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
  private static void expectIllegal(Runnable action) { try { action.run(); throw new AssertionError("expected IllegalArgumentException"); } catch (IllegalArgumentException expected) {} }
}
