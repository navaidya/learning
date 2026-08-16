import sys
import unittest
sys.path.insert(0, "src")
from pipeline import RequestPipeline, DependencyResult, Outcome

class PipelineTest(unittest.TestCase):
    def test_success_timeout_validation_and_sink_isolation(self):
        now, events = [10], []
        def dependency(request): now[0] += 5; return DependencyResult.success("ok")
        pipeline = RequestPipeline(dependency, events.append, lambda: now[0], "catalog")
        self.assertEqual(pipeline.handle("r-1", 20).outcome, Outcome.SUCCESS)
        self.assertEqual(len(events), 3); self.assertEqual(events[-1].duration_ms, 5)
        timeout = RequestPipeline(lambda _: DependencyResult.timeout(), lambda _: (_ for _ in ()).throw(RuntimeError("sink")), lambda: 0, "catalog")
        self.assertEqual(timeout.handle("r-2", 20).outcome, Outcome.TIMEOUT)
        with self.assertRaises(ValueError): pipeline.handle("", 20)

if __name__ == "__main__": unittest.main()
