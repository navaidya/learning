from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from threading import Lock


class Status(Enum):
    CREATED = "created"
    REPLAYED = "replayed"


@dataclass(frozen=True)
class Command:
    request_id: str
    payload: str


@dataclass(frozen=True)
class Result:
    resource_id: str
    status: Status


class IdempotentCommandHandler:
    """Serializes local duplicates; production needs durable uniqueness."""

    def __init__(self, repository: Callable[[str], str]):
        if repository is None:
            raise ValueError("repository is required")
        self._repository = repository
        self._completed: dict[str, tuple[str, str]] = {}
        self._lock = Lock()

    def handle(self, command: Command) -> Result:
        if command is None:
            raise ValueError("command is required")
        request_id = self._normalize(command.request_id, "request_id")
        payload = self._normalize(command.payload, "payload")

        with self._lock:
            existing = self._completed.get(request_id)
            if existing is not None:
                stored_payload, resource_id = existing
                if stored_payload != payload:
                    raise RuntimeError("request ID already used with different content")
                return Result(resource_id, Status.REPLAYED)

            resource_id = self._repository(payload)
            if resource_id is None or not resource_id.strip():
                raise RuntimeError("repository returned an invalid result")
            self._completed[request_id] = (payload, resource_id)
            return Result(resource_id, Status.CREATED)

    @staticmethod
    def _normalize(value: str, field: str) -> str:
        if value is None or not value.strip():
            raise ValueError(f"{field} is required")
        return value.strip()
