---
title: Transactional Outbox Event Workflow
summary: Model an aggregate and its outbound event together, then make publisher and consumer retries safe.
order: 7
difficulty: advanced
estimatedMinutes: 120
categories: [microservices, reliability, concurrency]
languages: [java, python]
skills: [outbox, eventing, idempotency, consistency]
labPath: coding-labs/outbox-event-workflow
status: ready
tags: [events, transactions, backend]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Create an order and an `OrderCreated` outbox record in one local commit, publish pending records, and deduplicate at a consumer. The senior question is: how do you avoid the database/message-broker dual-write failure without claiming exactly-once delivery?

## What you will build

Build an in-memory aggregate store plus outbox, a publisher that can retry safely, and a consumer inbox that ignores duplicate event IDs. Production extension: database transaction, relay leasing, and broker delivery semantics.

## Requirements and constraints

Every created order gets a stable event ID and payload. A failed publish leaves the event pending. Publishing may happen more than once; the consumer must apply its business effect once. Ordering is per aggregate, not globally guaranteed.

## Suggested API or interface

`Order createOrder(command)`, `List<OutboxEvent> pending()`, `PublishResult publish(event)`, and `boolean consume(event)`. Use `eventId`, `aggregateId`, `sequence`, `status`, and a retry counter.

## Starter-to-solution checkpoints

1. Persist order and event through one repository operation.
2. Query pending events deterministically.
3. Mark published only after broker acknowledgement.
4. Redeliver one event and deduplicate it at the consumer.
5. Discuss leases and poison-event recovery.

## Java and/or Python implementation notes

The core uses in-memory collections to illustrate state transitions, not a fake transaction manager. Inject a publisher that can fail. Keep consumer deduplication durable in the production discussion, because memory resets are not safe.

### Framework adapter discussion

In Spring Boot, a controller accepts the command, an injected application service writes the aggregate and outbox row in one `@Transactional` boundary, and a separate relay publishes pending rows after commit. In FastAPI, use dependency injection for the repository and publisher, keep the transaction boundary in the service/database adapter, and return an accepted result before relay delivery. Instrument relay attempts and consumer deduplication with injected telemetry; the HTTP framework must not claim exactly-once delivery.

## Test cases and edge cases

Test order/event creation, failed publication remaining pending, successful retry, duplicate broker delivery, repeated consumer call, a malformed event rejection, and events for two aggregates. Assert no duplicate consumer side effect.

## Complexity and resource analysis

Creating an order and event is O(1); scanning all pending events is O(n) in the lab. Production indexes by state, lease deadline, and aggregate sequence. Outbox retention consumes storage until safely archived.

## Concurrency and failure behavior

Two relays must not publish the same leased record concurrently without an ownership rule. At-least-once delivery is expected; idempotent consumption supplies effectively-once business behavior. A poison event needs bounded retries and a repair path.

## Production extension questions

How do you select and renew relay leases? What transaction isolation is required? How do schema evolution, ordering, and GDPR deletion affect an immutable event log?

## Interview explanation checklist

- Name the dual-write gap.
- Draw order, outbox, relay, broker, consumer inbox.
- State at-least-once delivery explicitly.
- Explain producer retry and consumer deduplication.
- Identify indexing, leasing, and poison-event policies.

## References

- [AWS Prescriptive Guidance: Transactional Outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Apache Kafka delivery semantics](https://kafka.apache.org/documentation/#semantics)
