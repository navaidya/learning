import java.util.HashMap;
import java.util.Map;

public final class LongestUniqueSubstring {
  private LongestUniqueSubstring() {}
  public static int longestUniqueLength(String text) {
    if (text == null) throw new IllegalArgumentException("text is required");
    Map<Character, Integer> lastSeen = new HashMap<>();
    int left = 0, best = 0;
    for (int right = 0; right < text.length(); right++) {
      Integer previous = lastSeen.put(text.charAt(right), right);
      if (previous != null && previous >= left) left = previous + 1;
      best = Math.max(best, right - left + 1);
    }
    return best;
  }
}
