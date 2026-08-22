import java.util.ArrayList;
import java.util.List;

public final class AutosuggestIndexTest {
  public static void main(String[] args) {
    ranksByScoreThenTerm();
    normalizesAndDeduplicatesTerms();
    supportsEmptyAndMissingPrefixes();
    returnsImmutableBoundedResults();
    rejectsInvalidInputs();
  }

  private static void ranksByScoreThenTerm() {
    AutosuggestIndex index = new AutosuggestIndex(List.of(
        new AutosuggestIndex.Suggestion("apple", 90),
        new AutosuggestIndex.Suggestion("apricot", 70),
        new AutosuggestIndex.Suggestion("application", 70),
        new AutosuggestIndex.Suggestion("banana", 80)));
    check(terms(index.suggest("AP", 3)).equals(List.of("apple", "application", "apricot")),
        "ranks by score and alphabetical tie-break");
  }

  private static void normalizesAndDeduplicatesTerms() {
    AutosuggestIndex index = new AutosuggestIndex(List.of(
        new AutosuggestIndex.Suggestion(" Apple ", 60),
        new AutosuggestIndex.Suggestion("apple", 95),
        new AutosuggestIndex.Suggestion("Ångström", 50),
        new AutosuggestIndex.Suggestion(" ", 100)));
    check(index.suggest(" APP ", 10).equals(List.of(new AutosuggestIndex.Suggestion("apple", 95))),
        "normalizes and keeps the highest duplicate score");
    check(terms(index.suggest("å", 10)).equals(List.of("ångström")), "supports Unicode prefixes");
  }

  private static void supportsEmptyAndMissingPrefixes() {
    AutosuggestIndex index = new AutosuggestIndex(List.of(
        new AutosuggestIndex.Suggestion("alpha", 10),
        new AutosuggestIndex.Suggestion("beta", 30)));
    check(terms(index.suggest("", 10)).equals(List.of("beta", "alpha")), "empty prefix returns global top terms");
    check(index.suggest("missing", 10).isEmpty(), "missing prefix returns empty results");
  }

  private static void returnsImmutableBoundedResults() {
    List<AutosuggestIndex.Suggestion> suggestions = new ArrayList<>();
    for (int index = 0; index < 12; index++) {
      suggestions.add(new AutosuggestIndex.Suggestion("a" + index, 100 - index));
    }
    AutosuggestIndex index = new AutosuggestIndex(suggestions);
    List<AutosuggestIndex.Suggestion> results = index.suggest("a", 10);
    check(results.size() == 10, "caps results at ten");
    try {
      results.add(new AutosuggestIndex.Suggestion("attack", 999));
      throw new AssertionError("results must be immutable");
    } catch (UnsupportedOperationException expected) {
      // Expected immutable view.
    }
  }

  private static void rejectsInvalidInputs() {
    expectIllegal(() -> new AutosuggestIndex(null));
    expectIllegal(() -> new AutosuggestIndex(List.of(new AutosuggestIndex.Suggestion("bad", -1))));
    AutosuggestIndex index = new AutosuggestIndex(List.of());
    expectIllegal(() -> index.suggest(null, 1));
    expectIllegal(() -> index.suggest("a", 0));
    expectIllegal(() -> index.suggest("a", 11));
  }

  private static List<String> terms(List<AutosuggestIndex.Suggestion> suggestions) {
    return suggestions.stream().map(AutosuggestIndex.Suggestion::term).toList();
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
