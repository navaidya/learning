---
title: AI-Native Delivery Marketplace (DoorDash-like)
summary: A local-commerce marketplace with durable order workflows, geospatial dispatch, predictive demand and ETA, and human-governed exception agents.
order: 8
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Coordinating merchant, courier, customer, inventory, and payment state under real-world uncertainty
aiFocus: [demand forecasting, constrained dispatch, exception-resolution agents]
tags: [marketplace, delivery, workflow, optimization]
---

_Follows the [System Design Template](/system-design/00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design local delivery from merchant discovery through order, preparation, courier dispatch, tracking, settlement, and support. Models improve search, preparation time, ETA, and batching; durable workflows and people retain authority over money and safety.

## 2. Requirements and scope

Browse menus, place/cancel orders, merchant acceptance, courier assignment, pickup/drop-off, live tracking, refunds, payouts, substitutions, and support. Target exactly-once financial effects, five-second dispatch decisions, graceful store/device outages, and regional isolation. Exclude warehouse fulfillment and autonomous delivery.

## 3. Capacity estimate

At 20M orders/day, average creation is 230/s and meal peaks reach 2.3k/s. If 2M active couriers send 150-byte positions every five seconds, ingestion peaks at 400k/s or 60 MB/s. With ten candidate merchants and couriers evaluated per request, prediction QPS reaches tens of thousands; batch demand forecasts separately.

## 4. API and event contracts

- `POST /v1/orders` includes cart version, quote, payment token, and idempotency key.
- Commands transition a versioned state machine: `accept`, `substitute`, `assign`, `pickup`, `deliver`, `cancel`, `refund`.
- Events include `OrderPlaced`, `MerchantAccepted`, `CourierAssigned`, `ItemSubstituted`, `Delivered`, `RefundApproved`; money events reference a ledger transaction.

## 5. System context

```mermaid
flowchart LR
  accTitle: Delivery marketplace system context
  accDescr: Customers, merchants, couriers, and support coordinate delivery through payment and mapping providers.
  Customer --> Market[Delivery marketplace]
  Merchant --> Market
  Courier --> Market
  Support --> Market
  Market --> PSP[Payment provider]
  Market --> Maps[Maps and traffic]
```

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Delivery marketplace container architecture
  accDescr: Catalog, durable order workflow, event log, geospatial supply, dispatch models, ledger, and approved exception handling are separated.
  Apps --> Edge[API and realtime edge]
  Edge --> Catalog[Catalog/search]
  Edge --> Order[Order workflow] --> SQL[(Order DB)]
  Order --> Bus[(Event log)]
  Bus --> Dispatch[Dispatch optimizer]
  Courier --> Location[Location ingestion] --> Geo[(H3 supply index)]
  Dispatch --> Geo
  Dispatch --> Models[ETA, prep, demand models]
  Order --> Ledger[Payment ledger]
  Bus --> Agent[Exception agent] --> Approval[Human approval queue]
```

## 7. Component deep dive

The order service is a durable state machine with command deduplication, optimistic versioning, timers, and saga compensation. Dispatch generates H3 candidates, predicts pickup/delivery times, and solves a constrained assignment/batching problem. Hard constraints cover capacity, vehicle, food safety, promised time, and courier breaks; a greedy scorer is always available.

```mermaid
flowchart LR
  accTitle: Delivery dispatch component pipeline
  accDescr: Geospatial candidates and live features feed ETA models and a constrained solver, with validation and deterministic fallback.
  Events --> Candidates[Geo candidates]
  Candidates --> Features[Live and forecast features]
  Features --> ETA[Prep and travel predictions]
  ETA --> Solver[Constrained assignment solver]
  Solver --> Validate[Hard-policy validator]
  Validate --> Offer[Leased courier offer]
  Validate -. invalid/timeout .-> Greedy[Deterministic greedy fallback]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Order placement and courier assignment sequence
  accDescr: Payment authorization and merchant acceptance precede model-assisted dispatch, courier acceptance, and customer tracking.
  Customer->>Order: place(cartVersion, quote, idempotencyKey)
  Order->>Ledger: authorize payment
  Order->>Merchant: request acceptance
  Merchant-->>Order: accepted + prep estimate
  Order-->>Bus: MerchantAccepted
  Bus->>Dispatch: assign courier
  Dispatch->>Models: predict + optimize
  Dispatch->>Courier: leased offer
  Courier-->>Dispatch: accept
  Dispatch-->>Order: CourierAssigned
  Order-->>Customer: tracking state
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Delivery marketplace data model
  accDescr: Customers place merchant orders containing items, couriers perform deliveries, and ledger entries settle each order.
  CUSTOMER ||--o{ ORDER : places
  MERCHANT ||--o{ ORDER : fulfills
  ORDER ||--o{ ORDER_ITEM : contains
  COURIER ||--o{ DELIVERY : performs
  ORDER ||--|| DELIVERY : requires
  ORDER ||--o{ LEDGER_ENTRY : settles
  ORDER { uuid id uuid merchant_id string status int version }
  DELIVERY { uuid id uuid order_id uuid courier_id string status }
  LEDGER_ENTRY { uuid id uuid order_id decimal amount string type }
```

## 10. Storage, partitioning, consistency, and caching

Partition operational services by delivery region; keep an order and its workflow home together. Use relational transactions/outbox for order and ledger references, append-only double-entry records for money, H3/TTL storage for live courier locations, and object storage for history. Catalog/menu caches are versioned; availability is short-lived and revalidated at checkout.

## 11. Reliability and failure handling

Durable timers escalate unaccepted orders and expired offers. Sagas void authorization or issue compensating refunds. Idempotency covers every partner retry. If dispatch inference/solver fails, use capacity-checked greedy assignment. If merchant connectivity fails, pause confirmation rather than fabricate acceptance. Regional overload sheds recommendations before ordering/tracking.

## 12. Security, privacy, moderation, and abuse prevention

Tokenize cards, mask addresses until assignment, restrict location retention, verify courier/merchant identity, and audit support actions. Detect account takeover, collusion, fake delivery, promotion abuse, and unsafe substitutions. Models produce evidence/recommendations; adverse account, refund, and safety decisions support human review and appeals.

## 13. AI architecture

Models rank search, forecast demand, estimate prep/travel time, and optimize dispatch. A bounded exception agent summarizes timeline evidence and proposes actions through scoped tools. Refunds over threshold, substitutions, customer contact, and account actions require policy validation and human/customer confirmation. The order state machine is authoritative.

## 14. Model lifecycle, evaluation, and observability

Backtest by region, weather, cuisine, accessibility, and demand regime. Track ETA calibration, late orders, cancellations, courier earnings/fairness, batching detour, solver timeout, overrides, refund accuracy, and agent action acceptance. Shadow then canary by region; trace features, versions, decisions, and workflow state.

## 15. Cost controls and deterministic fallbacks

Forecast in batches, cache stable merchant features, cascade rankers, cap solver time/candidates, and summarize exceptions once per state transition. Rules and greedy assignment cover model outages; manual support covers agent outages; ordering, tracking, and settlement remain deterministic.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Workflow | durable state machine/saga | distributed transaction where one database owns all effects |
| Dispatch | constrained optimization | greedy nearest for MVP and overload |
| Region | city-local cells | global pool only for cross-region inventory |
| Exceptions | propose + approve agent | automatic action for low-value reversible cases after evaluation |

## 17. Phased evolution

MVP uses catalog, order workflow, payment, manual dispatch, and support. Phase 2 adds live geo/ETA and greedy dispatch. Phase 3 adds forecasting, constrained batching, and experimentation. Phase 4 adds evidence-grounded exception agents with approval and continuous safety evaluation.

## 18. 45-minute interview walkthrough

Use 5 minutes on actors/scope, 5 on scale, 10 on state machine and ledger, 10 on dispatch/location, 5 on critical sequence, 5 on exceptions/security, and 5 on AI fallbacks and trade-offs.

## 19. Follow-up questions and key takeaways

How are duplicate merchant callbacks handled? What happens after pickup cancellation? How are multi-order batches constrained? Model the real world as an explicit durable workflow; predictions advise transitions but never become the source of truth.

## 20. References

- [Model Context Protocol 2026 updates](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [OpenTelemetry generative AI semantic conventions](https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/)
- [H3 documentation](https://h3geo.org/docs/)
