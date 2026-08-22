import sys
import unittest
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, "src")

from idempotent_command_handler import Command, IdempotentCommandHandler, Status


class IdempotentCommandHandlerTest(unittest.TestCase):
    def test_creates_then_replays_same_normalized_command(self):
        created = []
        handler = IdempotentCommandHandler(lambda payload: created.append(payload) or "resource-1")
        first = handler.handle(Command("request-1", "payload"))
        replay = handler.handle(Command(" request-1 ", " payload "))
        self.assertEqual(first.status, Status.CREATED)
        self.assertEqual(replay.status, Status.REPLAYED)
        self.assertEqual(first.resource_id, replay.resource_id)
        self.assertEqual(created, ["payload"])

    def test_rejects_invalid_and_conflicting_commands(self):
        handler = IdempotentCommandHandler(lambda payload: "resource-1")
        with self.assertRaises(ValueError):
            handler.handle(None)
        with self.assertRaises(ValueError):
            handler.handle(Command(" ", "payload"))
        with self.assertRaises(ValueError):
            handler.handle(Command("request", " "))
        handler.handle(Command("request", "first"))
        with self.assertRaises(RuntimeError):
            handler.handle(Command("request", "second"))

    def test_failed_repository_call_is_not_cached(self):
        attempts = 0

        def repository(payload: str) -> str:
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise RuntimeError("dependency unavailable")
            return "resource-ok"

        handler = IdempotentCommandHandler(repository)
        with self.assertRaises(RuntimeError):
            handler.handle(Command("retry", "payload"))
        self.assertEqual(handler.handle(Command("retry", "payload")).status, Status.CREATED)
        self.assertEqual(attempts, 2)

    def test_concurrent_duplicates_persist_once(self):
        creates = 0

        def repository(payload: str) -> str:
            nonlocal creates
            creates += 1
            return "shared-resource"

        handler = IdempotentCommandHandler(repository)
        with ThreadPoolExecutor(max_workers=6) as executor:
            results = list(executor.map(lambda _: handler.handle(Command("same", "payload")), range(6)))
        self.assertEqual(sum(result.status == Status.CREATED for result in results), 1)
        self.assertEqual(sum(result.status == Status.REPLAYED for result in results), 5)
        self.assertEqual(creates, 1)


if __name__ == "__main__":
    unittest.main()
