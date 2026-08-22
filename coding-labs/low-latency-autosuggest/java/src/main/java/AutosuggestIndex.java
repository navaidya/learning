import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class AutosuggestIndex {
  private static final int MAX_RESULTS = 10;

  public record Suggestion(String term, long score) {}

  private final Map<String, List<Suggestion>> byPrefix;

  public AutosuggestIndex(List<Suggestion> suggestions) {
    if (suggestions == null) throw new IllegalArgumentException("suggestions are required");

    Map<String, Long> bestScoreByTerm = new HashMap<>();
    for (Suggestion suggestion : suggestions) {
      if (suggestion == null) throw new IllegalArgumentException("suggestion is required");
      if (suggestion.score() < 0) throw new IllegalArgumentException("score cannot be negative");
      String term = normalize(suggestion.term());
      if (!term.isEmpty()) bestScoreByTerm.merge(term, suggestion.score(), Math::max);
    }

    List<Suggestion> ranked = bestScoreByTerm.entrySet().stream()
        .map(entry -> new Suggestion(entry.getKey(), entry.getValue()))
        .sorted(Comparator.comparingLong(Suggestion::score).reversed().thenComparing(Suggestion::term))
        .toList();

    Map<String, List<Suggestion>> building = new HashMap<>();
    for (Suggestion suggestion : ranked) {
      add(building, "", suggestion);
      String term = suggestion.term();
      int end = 0;
      while (end < term.length()) {
        end += Character.charCount(term.codePointAt(end));
        add(building, term.substring(0, end), suggestion);
      }
    }

    Map<String, List<Suggestion>> immutable = new HashMap<>();
    building.forEach((prefix, values) -> immutable.put(prefix, List.copyOf(values)));
    byPrefix = Map.copyOf(immutable);
  }

  public List<Suggestion> suggest(String prefix, int limit) {
    if (prefix == null) throw new IllegalArgumentException("prefix is required");
    if (limit < 1 || limit > MAX_RESULTS) throw new IllegalArgumentException("limit must be between 1 and 10");
    List<Suggestion> matches = byPrefix.getOrDefault(normalize(prefix), List.of());
    return List.copyOf(matches.subList(0, Math.min(limit, matches.size())));
  }

  private static void add(Map<String, List<Suggestion>> index, String prefix, Suggestion suggestion) {
    List<Suggestion> values = index.computeIfAbsent(prefix, ignored -> new ArrayList<>());
    if (values.size() < MAX_RESULTS) values.add(suggestion);
  }

  private static String normalize(String value) {
    if (value == null) throw new IllegalArgumentException("term is required");
    return value.strip().toLowerCase(Locale.ROOT);
  }
}
