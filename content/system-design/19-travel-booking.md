---
title: AI-Native Travel Booking Platform (Airbnb/Booking.com-like)
summary: A date-range inventory marketplace with overlap-safe booking transactions, policy-driven cancellation, and AI pricing/ranking behind deterministic fallbacks.
order: 20
difficulty: advanced
interviewMinutes: 45
scaleChallenge: Guaranteeing no double-booking across overlapping date ranges while search stays fast across geo, date, and price filters
aiFocus: [dynamic pricing suggestions, search ranking and personalization]
tags: [marketplace, booking, geospatial, concurrency, machine-learning]
---

_Follows the [System Design Template](/system-design/00-system-design-template) — the reusable method behind every design in this library._

## 1. Interview prompt

Design a travel booking platform where hosts list properties with calendars, guests search by location/dates/price and book a date range, and cancellation follows a policy state machine. Models suggest pricing and personalize ranking; the booking transaction itself must never allow two overlapping reservations on the same listing.

## 2. Requirements and scope

**Functional:** list a property with a calendar and base price, search by geo/date-range/price/amenities, book a date range, cancel/refund per policy, host accepts/instant-books. **Non-functional:** zero double-booking for overlapping date ranges, p99 search under 400 ms, booking confirmation under 2 seconds, regional data residency. Exclude in-house payment processing internals and dynamic multi-night pricing negotiation chat.

## 3. Capacity estimate

At 5M nightly stays booked/month, average booking creation is roughly 2/s with weekend/holiday peaks around 20-30/s — far lower volume than the search path. Search traffic dominates: at 200M searches/day, average QPS is ~2.3k with evening peaks near 10x, each search filtering millions of listings by geo cell, date-range availability, and price. Availability data per listing (365 days x small per-night record) is small per listing but must support fast overlap checks across tens of millions of listings.

## 4. API and event contracts

- `GET /v1/search?geo,checkin,checkout,priceRange` returns listings with availability already filtered, not just static listing data.
- `POST /v1/bookings {listingId, checkin, checkout, idempotencyKey}` performs an overlap-checked reservation; success requires no existing confirmed or held booking overlaps `[checkin, checkout)` for that listing.
- Events carry `eventId`, `occurredAt`, `schemaVersion`: `BookingHeld`, `BookingConfirmed`, `BookingCancelled`, `CalendarUpdated`, `RefundIssued`.

## 5. System context

```mermaid
flowchart LR
  accTitle: Travel booking platform system context
  accDescr: Guests and hosts use the platform, which integrates with payment and geocoding/mapping providers.
  Guest --> Platform[Travel booking platform]
  Host --> Platform
  Platform --> PSP[Payment provider]
  Platform --> Geocoding[Geocoding and maps provider]
```

## 6. Container architecture

```mermaid
flowchart TB
  accTitle: Travel booking platform container architecture
  accDescr: Search, calendar/availability, booking transaction, pricing model, and payment components are separated by consistency and latency needs.
  Apps[Guest and host apps] --> Edge[API edge]
  Edge --> Search[Search service] --> Idx[(Geo + date search index)]
  Edge --> Calendar[Calendar/availability service] --> Cal[(Per-listing calendar store)]
  Edge --> Booking[Booking transaction service]
  Booking --> Cal
  Booking --> Bus[(Event log)]
  Bus --> Payment[Payment service]
  Bus --> Idx
  Search --> Pricing[Pricing suggestion model]
```

## 7. Component deep dive

Each listing's calendar is modeled as a set of non-overlapping date-range rows; the booking transaction inserts a new range only if a range-exclusion constraint (or equivalent conditional check) confirms no existing held/confirmed range overlaps it, all within a single database transaction scoped to that listing. Search runs against a denormalized, eventually-consistent geo+date index refreshed from calendar events, so search results can show a listing as available that a concurrent booking just took — the booking transaction is what actually enforces correctness, and search failures on that edge case surface as a "no longer available" retry.

```mermaid
flowchart LR
  accTitle: Booking transaction pipeline
  accDescr: A booking request checks calendar overlap inside a transaction, holds the range briefly, and confirms after payment or fails on conflict.
  Request --> Overlap[Overlap check in listing-scoped transaction]
  Overlap -- no conflict --> Hold[Insert held range]
  Overlap -- conflict --> Reject[Dates unavailable]
  Hold --> Payment[Authorize payment]
  Payment -- success --> Confirm[Confirm range]
  Payment -- failure --> Release[Release held range]
```

## 8. Critical flow

```mermaid
sequenceDiagram
  accTitle: Search and booking sequence
  accDescr: A guest searches ranked listings, then books a date range through an overlap-checked transaction before payment confirms the reservation.
  Guest->>Search: search(geo, dates, priceRange)
  Search->>Idx: query available listings
  Search->>Pricing: rank/personalize
  Pricing-->>Search: ranked results
  Search-->>Guest: listings
  Guest->>Booking: book(listingId, checkin, checkout, idempotencyKey)
  Booking->>Cal: begin transaction, check overlap
  alt no overlap
    Cal-->>Booking: range held
    Booking->>Payment: authorize
    Payment-->>Booking: authorized
    Booking->>Cal: confirm range
    Booking-->>Guest: booking confirmed
  else overlap
    Cal-->>Booking: conflict
    Booking-->>Guest: dates unavailable, re-search
  end
```

## 9. Data model

```mermaid
erDiagram
  accTitle: Travel booking platform data model
  accDescr: Hosts list properties with calendar ranges, guests place bookings against a listing, and each booking settles through a payment.
  HOST ||--o{ LISTING : owns
  LISTING ||--o{ CALENDAR_RANGE : has
  GUEST ||--o{ BOOKING : places
  LISTING ||--o{ BOOKING : receives
  BOOKING ||--|| PAYMENT : settles
  LISTING { uuid id uuid host_id string geo_cell decimal base_price }
  CALENDAR_RANGE { uuid id uuid listing_id date checkin date checkout string status }
  BOOKING { uuid id uuid listing_id uuid guest_id string status int version }
```

## 10. Storage, partitioning, consistency, and caching

Partition calendar/booking data by listing ID so every overlap check and booking transaction is scoped to a single partition and can use a native range-exclusion constraint or equivalent conditional insert without cross-partition coordination. The search index is partitioned by geo cell and is intentionally eventually consistent (seconds of lag) since it's a discovery aid, not the correctness boundary. Listing metadata and photos cache with long TTLs; per-night availability and price are always read live at booking time.

## 11. Reliability and failure handling

Booking holds have a short TTL during payment authorization; a sweeper releases abandoned holds back to available. Idempotency keys make retried booking requests safe against network failures without risking a duplicate reservation. If the search index falls behind or fails, guests can still fail-fast at the booking transaction (overlap detected, "dates unavailable") rather than silently double-booking — the index is a hint, the transaction is authoritative. Regional outages isolate to affected geo cells rather than blocking global search.

## 12. Security, privacy, moderation, and abuse prevention

Mask exact addresses until booking is confirmed, encrypt payment and identity data, and restrict host access to their own listings and bookings. Detect fake listings, review manipulation, and price-gouging/collusion with rules plus reviewed models. Cancellation-policy enforcement, refund overrides, and account suspension remain human-reviewed with an audit trail, since they carry direct financial and trust impact.

## 13. AI architecture

A pricing-suggestion model recommends nightly rates to hosts based on comparable listings, seasonality, and demand signals, but hosts retain final say over their listed price — the model never auto-changes a live price without host opt-in. A separate ranking model personalizes search order using quality, popularity, and price-competitiveness signals. Neither model has write access to the calendar or booking transaction.

## 14. Model lifecycle, evaluation, and observability

Backtest pricing suggestions against realized occupancy and revenue by market and season before shadowing; evaluate ranking with NDCG/conversion against historical search logs before online experiments. Track booking conversion, host adoption of suggested prices, occupancy lift, ranking click-through, and override rates. Trace search and pricing requests with OpenTelemetry so a ranking or pricing regression can be isolated by market.

## 15. Cost controls and deterministic fallbacks

Precompute and cache pricing suggestions and ranking features on a batch cadence (hourly/daily) rather than per-request inference for every search. If the pricing model is unavailable, fall back to the host's last-set price with no suggestion shown; if ranking degrades, fall back to a deterministic order (recency of listing activity plus review score). Search, calendar, and booking remain fully functional with zero AI dependency.

## 16. Trade-offs and alternatives

| Decision | Choice | Alternative and trigger |
|---|---|---|
| Overlap correctness | listing-scoped transaction with range-exclusion | global distributed lock per listing if the datastore lacks native range constraints |
| Search consistency | eventually consistent geo+date index | synchronous index update if guests require zero stale-availability results |
| Pricing control | host sets price, model suggests | fully automated dynamic pricing only for hosts who explicitly opt in |
| Ranking | learned personalization with deterministic fallback | pure recency/review-score ranking for MVP or new markets |

## 17. Phased evolution

MVP uses a single-region relational store with per-listing locking for bookings and simple date/geo filtering for search. Phase 2 adds a dedicated search index, calendar holds with TTL, and idempotent booking transactions. Phase 3 adds learned ranking and pricing suggestions. Phase 4 adds geo-partitioned search, shadow-evaluated pricing/ranking rollouts, and abuse-detection models.

## 18. 45-minute interview walkthrough

Spend 5 minutes on scope, 5 on capacity (search-heavy vs. booking-light), 10 on the calendar/overlap data model, 10 on the booking transaction sequence and container diagram, 5 on reliability/security, and 10 on pricing/ranking AI and fallbacks.

## 19. Follow-up questions and key takeaways

How do you prevent two guests from booking overlapping dates when search showed both listings as available? What happens if payment authorization fails after the calendar hold succeeds? How would you support instant-book vs. host-approval flows differently? The key insight is that search is a fast, approximate discovery layer while the listing-scoped booking transaction is the sole source of overlap correctness, and pricing/ranking models stay advisory with host and deterministic-fallback control preserved.

## 20. References

- [PostgreSQL range types and exclusion constraints](https://www.postgresql.org/docs/current/rangetypes.html)
- [Learning Market Dynamics for Optimal Pricing (Airbnb Tech Blog)](https://medium.com/airbnb-engineering/learning-market-dynamics-for-optimal-pricing-97cffbcc53e3)
- [Personalizing Airbnb search by learning from the guest journey (Airbnb Tech Blog)](https://medium.com/airbnb-engineering/personalizing-airbnb-search-by-learning-from-the-guest-journey-bcefd1915624)
