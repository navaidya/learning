import java.util.HashMap;
import java.util.Map;
import java.util.PrimitiveIterator;

public final class LongestUniqueSubstring {
  private LongestUniqueSubstring() {}
  /** Indexes code points so emoji are one logical character, not two UTF-16 units. */
  public static int longestUniqueLength(String text) {
    if (text == null) throw new IllegalArgumentException("text is required");
    Map<Integer, Integer> lastSeen = new HashMap<>(); int left = 0, best = 0, right = 0;
    PrimitiveIterator.OfInt codePoints = text.codePoints().iterator();
    while (codePoints.hasNext()) {
      int codePoint = codePoints.nextInt();
      Integer previous = lastSeen.put(codePoint, right);
      if (previous != null && previous >= left) left = previous + 1;
      best = Math.max(best, right - left + 1); right++;
    }
    return best;
  }
}
