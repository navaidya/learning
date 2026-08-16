from dataclasses import dataclass

class RetryableFailure(Exception): pass
class PermanentFailure(Exception): pass

@dataclass(frozen=True)
class Result:
    success: bool
    value: object
    failure: Exception | None
    attempts: int

class RetryPolicy:
    def __init__(self, max_attempts, max_elapsed_ms, base_delay_ms, max_delay_ms, now_ms, sleep, random_unit):
        self.max_attempts, self.max_elapsed_ms = max_attempts, max_elapsed_ms
        self.base_delay_ms, self.max_delay_ms = base_delay_ms, max_delay_ms
        self.now_ms, self.sleep, self.random_unit = now_ms, sleep, random_unit

    def execute(self, operation):
        started, last = self.now_ms(), None
        for attempt in range(1, self.max_attempts + 1):
            try: return Result(True, operation(), None, attempt)
            except PermanentFailure as failure: return Result(False, None, failure, attempt)
            except RetryableFailure as failure:
                last = failure
                if attempt == self.max_attempts: break
                cap = min(self.max_delay_ms, self.base_delay_ms * (2 ** (attempt - 1)))
                delay = int(cap * self.random_unit())
                if self.now_ms() - started + delay > self.max_elapsed_ms: break
                self.sleep(delay)
        return Result(False, None, last, attempt if last else 0)
