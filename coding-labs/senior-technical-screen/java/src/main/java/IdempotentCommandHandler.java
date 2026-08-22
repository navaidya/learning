import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public final class IdempotentCommandHandler {
  public enum Status { CREATED, REPLAYED }

  public record Command(String requestId, String payload) {}

  public record Result(String resourceId, Status status) {}

  @FunctionalInterface
  public interface Repository {
    String create(String payload);
  }

  private record Stored(String payload, String resourceId) {}

  private final Repository repository;
  private final Map<String, Stored> completed = new HashMap<>();

  public IdempotentCommandHandler(Repository repository) {
    this.repository = Objects.requireNonNull(repository, "repository is required");
  }

  /** Serializes local duplicates; production requires a durable uniqueness boundary. */
  public synchronized Result handle(Command command) {
    if (command == null) throw new IllegalArgumentException("command is required");
    String requestId = normalize(command.requestId(), "requestId");
    String payload = normalize(command.payload(), "payload");

    Stored existing = completed.get(requestId);
    if (existing != null) {
      if (!existing.payload().equals(payload)) {
        throw new IllegalStateException("request ID already used with different content");
      }
      return new Result(existing.resourceId(), Status.REPLAYED);
    }

    String resourceId = repository.create(payload);
    if (resourceId == null || resourceId.isBlank()) {
      throw new IllegalStateException("repository returned an invalid result");
    }
    completed.put(requestId, new Stored(payload, resourceId));
    return new Result(resourceId, Status.CREATED);
  }

  private static String normalize(String value, String field) {
    if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " is required");
    return value.trim();
  }
}
