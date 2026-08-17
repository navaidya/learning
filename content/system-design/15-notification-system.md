---
title: AI-Native Notification System
summary: A multi-channel notification fan-out platform with at-least-once delivery, per-user rate limiting, and provider failover, with AI-optimized send time as an advisory layer.
order: 16
difficulty: advanced
interviewMinutes: 45
scaleChallenge: At-least-once multi-channel fan-out with per-user rate limits and provider failover
aiFocus: [send-time optimization, channel selection]
tags: [notifications, messaging, reliability, fan-out]
---

_Follows the [System Design Template](/system-design/00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a notification platform that fans events out across push, SMS, and email, respects per-user rate limits, quiet hours, and preferences, guarantees at-least-once delivery with dedup, and fails over between providers — with an ML layer that predicts optimal send time and channel but never blocks or drops a notification if it is unavailable.

## 2. Requirements and scope

**Functional:** accept notification requests from upstream services, render templated content, apply preference/quiet-hour/frequency rules, select channel(s), deliver via push/SMS/email providers, track delivery status, support scheduled sends. **Non-functional:** at-least-once delivery with user-visible dedup, p99 enqueue-to-dispatch under a few seconds for transactional notifications, automatic provider failover, 100M+ users. Exclude in-app real-time chat delivery and marketing-audience-building tooling.

## 3. Capacity estimate

At 100M users averaging 5 notifications/user/day, volume is 500M/day: ~5,800/s average, ~58,000/s peak during major events. Each notification is roughly 1 KB of payload and metadata, so raw event volume is ~500 GB/day; the delivery ledger (attempts plus retries) roughly doubles that to ~1 TB/day. Provider throughput differs sharply by channel — push (APNs/FCM) tolerates very high sustained rates, while SMS gateways are typically rate-capped per number pool — so SMS needs its own admission control separate from push.

## 4. API and event contracts

- `POST /v1/notifications {userId, template, data, channelsHint?, dedupKey}` → `{notificationId, status: queued}`.
- Events carry `eventId`, `occurredAt`, `schemaVersion`: `NotificationRequested`, `ChannelSelected`, `DeliveryAttempted{provider, status}`, `DeliveryConfirmed`/`DeliveryFailed`, `UserEngaged{open|click}`.
- `dedupKey` plus an idempotency key on ingest guarantee a retried producer request never results in a duplicate send.

## 5. System context

```mermaid
flowchart LR
  accTitle: Notification system context
  accDescr: Upstream producer services send requests to the notification platform, which delivers through push, SMS, and email providers to user devices.
  Producer[Upstream services] --> Platform[Notification platform]
  Platform --> APNs[APNs]
  Platform --> FCM[FCM]
  Platform --> SMS[SMS gateway]
  Platform --> Email[Email provider]
  APNs --> User
  FCM --> User
  SMS --> User
  Email --> User
```

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Notification system container architecture
  accDescr: Ingest applies preference filtering and dedup, an orchestrator schedules send time, and per-channel dispatch workers deliver through provider adapters with failover, updating a delivery ledger.
  Producer --> Ingest[Ingest API]
  Ingest --> Dedup[(Dedup store)]
  Ingest --> Filter[Preference and rate-limit filter]
  Filter --> Orchestrator[Send-time orchestrator]
  Orchestrator --> Router[Channel router]
  Router --> PushWorker[Push dispatch] --> APNs
  Router --> SMSWorker[SMS dispatch] --> SMSGW[SMS gateway]
  Router --> EmailWorker[Email dispatch] --> EmailP[Email provider]
  PushWorker --> Ledger[(Delivery ledger)]
  SMSWorker --> Ledger
  EmailWorker --> Ledger
  Ledger --> Engagement[Engagement tracking]
```

## 7. Component deep dive

The preference and rate-limit filter checks per-user frequency caps, timezone-aware quiet hours, opt-outs, and topic subscriptions before a notification is scheduled at all. The orchestrator holds notifications in a durable delay queue until send time, then hands off to channel-specific dispatch workers that apply provider-specific batching and backoff independently per channel.

```mermaid
flowchart LR
  accTitle: Notification dispatch pipeline
  accDescr: A request passes through a dedup check, preference filter, and scheduler before channel selection, provider dispatch, ledger update, and engagement tracking.
  Request --> DedupCheck{duplicate dedupKey?}
  DedupCheck -->|yes| ReturnExisting[Return existing notificationId]
  DedupCheck -->|no| PrefFilter[Preference and quiet-hour filter]
  PrefFilter --> Schedule[Schedule at send time]
  Schedule --> ChannelSelect[Channel selection]
  ChannelSelect --> Dispatch[Provider dispatch]
  Dispatch --> LedgerUpdate[Ledger update]
  LedgerUpdate --> EngagementTrack[Engagement tracking]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Notification dispatch sequence with channel scoring fallback
  accDescr: A request is deduplicated and filtered, optionally scored for the best channel and time, and dispatched with a deterministic default when scoring is unavailable.
  Producer->>Ingest: POST notification(dedupKey)
  Ingest->>Dedup: check dedupKey
  alt duplicate
    Ingest-->>Producer: existing notificationId
  else new
    Ingest->>Filter: eligibility and quiet hours
    Filter->>Orchestrator: enqueue at sendTime
    Orchestrator->>Router: dispatch at sendTime
    Router->>Models: score best channel and time
    alt model healthy
      Models-->>Router: ranked channel
    else timeout or unhealthy
      Router->>Router: deterministic default channel priority
    end
    Router->>Provider: send
    Provider-->>Router: ack or nack
    Router->>Ledger: record delivery status
  end
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Notification system data model
  accDescr: Users have preferences and receive notifications, each of which produces one or more delivery attempts across channels.
  USER ||--o{ NOTIFICATION : receives
  USER ||--|| PREFERENCE : configures
  NOTIFICATION ||--o{ DELIVERY_ATTEMPT : has
  NOTIFICATION { uuid id string user_id string template string dedup_key string status timestamp scheduled_at }
  DELIVERY_ATTEMPT { uuid id uuid notification_id string channel string provider string status timestamp attempted_at }
  PREFERENCE { string user_id json quiet_hours json channels_enabled int frequency_cap }
```

## 10. Storage, partitioning, consistency, and caching

Partition notifications and the delivery ledger by `user_id` hash so per-user rate-limit and dedup checks stay local and never require cross-shard coordination. Dedup keys live in a fast KV with a bounded TTL (e.g. 24h) and conditional-write/compare-and-set semantics, giving effectively-once enqueue on top of an at-least-once producer. Preference data is cached at the edge with a short TTL, invalidated on write; delivery status is eventually consistent across channels, but the dedup and rate-limit check must be strongly consistent per user.

## 11. Reliability and failure handling

Each provider sits behind its own circuit breaker with automatic failover — e.g. a primary SMS gateway outage shifts traffic to a secondary gateway pool. Retries use bounded exponential backoff with jitter; permanently failing sends move to a dead-letter queue with alerting. Producer-to-ingest delivery uses an outbox pattern for at-least-once semantics, and downstream dedup absorbs producer retries so a user never receives a duplicate push for the same event.

## 12. Security, privacy, moderation, and abuse prevention

PII (phone numbers, email addresses) is encrypted at rest and in transit, and sensitive payload content is redacted from general logs. Unsubscribe/opt-out compliance (CAN-SPAM, TCPA) is enforced as a hard block that bypasses even override flags. Producer services are rate-limited to prevent notification storms, and consent scopes are tracked per channel (marketing vs. transactional) so a transactional integration can never silently escalate into marketing sends.

## 13. AI architecture

A send-time and channel-selection model predicts, per user, the engagement-maximizing delivery time and channel using historical open/click/response features; the orchestrator queries it as an advisory scoring step under a strict timeout before falling back to defaults. A separate lightweight model may personalize notification copy or subject lines, but it never alters the timing or content of transactional or security-critical notifications.

## 14. Model lifecycle, evaluation, and observability

Train the send-time/channel model on delayed engagement labels within a bounded attribution window; evaluate via offline replay plus online A/B on engagement rate and unsubscribe rate. Shadow-score before serving, canary by user segment, and track prediction-vs-default agreement rate, latency-budget adherence, fairness across channel-availability segments (e.g. users without a smartphone), and drift. Trace scoring calls with OpenTelemetry, correlated to notification IDs.

## 15. Cost controls and deterministic fallbacks

Batch-score send-time predictions offline where latency allows rather than per-notification online inference; cache per-user channel-preference scores with periodic refresh. Reserve SMS — the highest per-message cost channel — as a fallback rather than a default. If the send-time/channel model is unavailable or times out, dispatch immediately via the user's deterministic default-channel priority list (push, then email, then SMS) and default schedule, keeping core delivery fully operational.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Dedup | KV with conditional write, bounded TTL | in-memory dedup only for small scale before durability matters |
| Scheduling | durable delay queue | synchronous immediate send for MVP with no scheduling need |
| Channel selection | learned model over deterministic default | fixed priority list only, until engagement data justifies a model |
| Provider strategy | circuit breaker + secondary pool per channel | single provider per channel until outage frequency demands failover |

## 17. Phased evolution

MVP supports a single channel (push), synchronous send, and static preferences. Phase 2 adds SMS/email, provider failover, dedup, and rate limiting. Phase 3 adds the durable scheduling orchestrator and delivery ledger. Phase 4 adds the send-time/channel optimization model with shadow and canary rollout.

## 18. 45-minute interview walkthrough

Spend 5 minutes on scope, 5 on capacity estimate, 10 on ingest/dedup/preference filtering and the container diagram, 10 on the dispatch sequence and provider failover, 5 on reliability, 5 on privacy/compliance, and 5 on send-time optimization and its fallback.

## 19. Follow-up questions and key takeaways

How do you guarantee exactly-once user-visible delivery on top of at-least-once infrastructure? How would you handle a provider-wide outage like APNs going down at 2am? How do quiet hours interact with urgent security alerts? The key insight is that delivery guarantees, rate limiting, and provider failover form the deterministic backbone, while AI is purely an optional scoring layer bounded by a strict timeout.

## 20. References

- [Uber Engineering: How Uber Optimizes the Timing of Push Notifications using ML and Linear Programming](https://www.uber.com/en-US/blog/how-uber-optimizes-push-notifications-using-ml/)
- [Apple Developer Documentation: Sending notification requests to APNs](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)
- [Firebase Cloud Messaging documentation](https://firebase.google.com/docs/cloud-messaging)
