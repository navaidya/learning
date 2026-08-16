import sys
import unittest
sys.path.insert(0, "src")
from pipeline import RequestPipeline, DependencyResult, Outcome

class PipelineTest(unittest.TestCase):
    def test_success_exception_timeout_metrics_and_recovery(self):
        now, events, metrics = [10], [], []
        def dependency(request): now[0] += 5; return DependencyResult.success("ok")
        pipeline = RequestPipeline(dependency, events.append, metrics.append, lambda: now[0], "catalog")
        self.assertEqual(pipeline.handle("r-1", 20).outcome, Outcome.SUCCESS)
        self.assertEqual(len(events), 3); self.assertTrue(all(event.outcome for event in events)); self.assertEqual(events[-1].duration_ms, 5)
        self.assertTrue(any(metric.name == "request_latency_ms" for metric in metrics)); self.assertTrue(any(metric.name == "request_outcome_total" and metric.outcome == "success" for metric in metrics))
        failure = RequestPipeline(lambda _: (_ for _ in ()).throw(RuntimeError("down")), events.append, metrics.append, lambda: now[0], "catalog")
        self.assertEqual(failure.handle("r-2", 20).outcome, Outcome.DEPENDENCY_FAILURE)
        timeout = RequestPipeline(lambda _: (now.__setitem__(0, now[0] + 50), DependencyResult.success("late"))[1], lambda _: (_ for _ in ()).throw(RuntimeError("sink")), lambda _: (_ for _ in ()).throw(RuntimeError("sink")), lambda: now[0], "catalog")
        self.assertEqual(timeout.handle("r-3", 20).outcome, Outcome.TIMEOUT)
        self.assertEqual(pipeline.handle("r-4", 20).outcome, Outcome.SUCCESS)
        self.assertEqual(len({event.request_id for event in events}), 3)
        pipeline.handle("  r-trim  ", 20)
        self.assertTrue(any(event.request_id == "r-trim" for event in events))
        with self.assertRaises(ValueError): pipeline.handle("", 20)

if __name__ == "__main__": unittest.main()
