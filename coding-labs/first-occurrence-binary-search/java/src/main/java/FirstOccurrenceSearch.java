public final class FirstOccurrenceSearch {
  private FirstOccurrenceSearch() {}

  /** Returns the lowest index containing key, or -1 when key is absent. */
  public static int find(int[] values, int key) {
    if (values == null) throw new IllegalArgumentException("values are required");

    int low = 0;
    int high = values.length - 1;
    int result = -1;

    while (low <= high) {
      int middle = low + (high - low) / 2;
      if (values[middle] >= key) {
        if (values[middle] == key) result = middle;
        high = middle - 1;
      } else {
        low = middle + 1;
      }
    }
    return result;
  }
}
