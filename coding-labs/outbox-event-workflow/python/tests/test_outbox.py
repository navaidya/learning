import sys
import unittest
sys.path.insert(0, "src")
from outbox import OutboxWorkflow, Event

class OutboxWorkflowTest(unittest.TestCase):
    def test_retry_and_consumer_deduplication(self):
        workflow = OutboxWorkflow(); workflow.create_order("o-1")
        self.assertEqual(len(workflow.pending()), 1)
        workflow.publish_pending(lambda event: (_ for _ in ()).throw(RuntimeError("down")))
        self.assertEqual(len(workflow.pending()), 1)
        workflow.publish_pending(lambda event: None)
        self.assertEqual(len(workflow.pending()), 0)
        event = workflow.events()[0]
        self.assertTrue(workflow.consume(event)); self.assertFalse(workflow.consume(event))
        self.assertFalse(workflow.consume(Event("", "", 0)))

if __name__ == "__main__": unittest.main()
