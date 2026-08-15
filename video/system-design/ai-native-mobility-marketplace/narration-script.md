# AI-Native Mobility Marketplace — Narration Script

Warm, confident US-English narration for local review. Each section is an independently revisable slide/audio segment.

## Slide 1 — AI-Native Mobility Marketplace

Welcome to AI-Native Mobility Marketplace. For the next half hour, we will follow one rider, Aisha, as she asks for a ride home during a busy evening. Our goal is not to copy any company's internal system. We are designing an original marketplace that performs the same kind of job: connect a rider and a driver safely, quickly, and fairly. Along the way, we will build a reusable interview method. System design is the practice of choosing components and rules that let a product work reliably at scale. In plain English, it is the blueprint for how many moving parts cooperate when real people depend on them. A good blueprint starts with the user story, then asks what can fail, what must be fast, and which facts must never be wrong. Notice the order: we do not begin with fashionable tools. We begin with promises to people, then prove that our choices can keep those promises under ordinary load and stressful failure. By the end, you will be able to explain the ride flow to a beginner and defend the choices in an interview. Let’s follow one ride request from the first tap to the final receipt.

Visual: title-blueprint — A 30-minute blueprint for one dependable ride request.

## Slide 2 — Let’s Follow One Ride Request

Aisha opens the rider app outside a concert. She enters a pickup point, chooses a destination, and asks for a price. Marco is driving nearby and may receive an offer. The third participant is our marketplace platform, which coordinates the request without pretending it can control traffic or human decisions. An actor is a person or external system that participates in a product flow. Here, Aisha, Marco, the mapping provider, and the payment provider are all actors. Naming actors matters because each has different needs. Aisha wants a clear price and a safe pickup. Marco needs a useful offer before another driver takes it. The mapping provider supplies routes, while the payment provider handles regulated money movement. If we blur those responsibilities, our design becomes vague and failures become hard to explain. Keep Aisha’s story in mind: every box we add should solve a problem she or Marco can actually feel.

Visual: scenario-flow — A rider asks. A driver responds. The platform coordinates safely.

## Slide 3 — Why Matching Is Hard

At the moment Aisha requests, three drivers appear close on the map. One is turning away from the pickup. One is finishing a ride. Marco is slightly farther away but is free, facing the right direction, and has a fresh location update. Distance alone is not enough. A strong match balances pickup time, whether a driver can truly respond, rider safety, cancellation risk, and a fair distribution of opportunities. Prediction question: is the nearest map dot always the best driver for Aisha? Take a moment to decide. The answer is no. A stale dot may represent a driver who is already occupied, and a very close driver may be headed the wrong way. Without a matching process that considers live constraints, riders see failed offers, drivers get confusing work, and the marketplace loses trust. So we will first make the product promises clear, then build only the machinery needed to keep them.

Visual: moving-map — Nearby is changing. Fair, fast, and safe must all hold together.

## Slide 4 — What Must the Product Do?

Before naming storage or models, write down what the product must do. A functional requirement is a specific capability the product must provide to a user or another system. For Aisha, the platform must produce a quote, accept her ride request, find a driver, show the trip progressing, settle payment, and let either person report a safety concern. Those are observable outcomes, not implementation choices. The phrase ‘match a driver’ is a useful requirement; the phrase ‘use a queue’ is not, because it jumps ahead to a solution. This distinction keeps an interview answer grounded. If we skip functional requirements, we may optimize an impressive architecture that forgets a vital action, such as expiring an unanswered offer or preventing a second charge. In this lesson, we exclude pooled rides and autonomous vehicles. Narrow scope is a strength: it lets us make the normal ride dependable before adding harder variations.

Visual: capability-ladder — Quote, request, match, track, settle, and report safety concerns.

## Slide 5 — How Well Must It Work?

Now ask how well each capability must work. A non-functional requirement describes a quality target such as speed, reliability, or security. It turns ‘fast’ into a number and ‘reliable’ into a promise. For example, we want Aisha’s quote to return with p99 latency under five hundred milliseconds. P99 latency is the response time below which 99 percent of requests complete: if one hundred quote requests arrive, at least ninety-nine should finish within that limit. The consequence is that a slow dependency cannot sit on the critical path forever. Availability is the proportion of time a system can successfully serve intended requests. If availability is poor at commute time, a beautiful prediction model is irrelevant because Aisha cannot request a ride. We also set match completion under five seconds, location freshness under ten seconds, and no double charge. These targets will guide every trade-off that follows.

Visual: quality-targets — Fast quotes, dependable matching, fresh locations, and no double charge.

## Slide 6 — Consistency Is a Promise

Not every fact in a marketplace needs the same agreement rule. Strong consistency means a completed write is immediately reflected by later reads that require the same truth. Think of one shared ledger: after Aisha’s payment succeeds, a later payment check must not claim it is still unpaid. The consequence is that trip assignment and money movement need careful coordination, even if that costs a little latency. Eventual consistency means copies may briefly differ but converge when updates finish propagating. A driver’s moving map dot can tolerate a small delay because the next update will arrive seconds later. Prediction question: should every ride datum wait for one shared truth? Take a moment to decide. No. If every location update waited for global agreement, the map would lag and cost more. If payment used only eventual agreement, we could charge Aisha twice. Use the strongest promise only where an incorrect answer would be unacceptable.

Visual: consistency-analogy — Payment needs one shared truth. A map dot can catch up moments later.

## Slide 7 — Capacity Starts with Questions

A diagram without numbers is only a guess. A capacity estimate is a transparent approximation of expected requests, data, and storage needs. It is not a claim of perfect forecasting; it is a way to show your assumptions and test whether a design can survive them. We will assume two million trips per day, one million active drivers, and a commute peak ten times busier than average. We will calculate ride requests, location updates, and retained history separately because they have very different shapes. Aisha creates one important command when she requests a trip. Marco creates a steady stream of lightweight location updates while he is available. If we size the system only for trip requests, the location stream overwhelms it. If we size every record like a location sample, we waste effort on the few trip transitions that demand durable correctness. Start with questions: how many users, how often do they act, how big is each message, and what happens at the busiest hour?

Visual: question-ladder — How many rides? How many moving drivers? How large is a peak?

## Slide 8 — Ride Request Math

Let’s do the first piece of math slowly. Two million trips per day divided by eighty-six thousand four hundred seconds in a day is about twenty-three trip creations per second on average. Throughput is the amount of work a system completes in a fixed time, often requests per second. Average throughput is useful, but it is not what stresses the platform. Peak load is the highest expected demand period used to size a system safely. With a ten-times commute peak, we plan for about two hundred thirty trip creations per second. That is modest enough for a well-designed regional transactional path, but every trip creates related work: quotes, offers, state changes, notifications, and later payments. The interview move is to say the arithmetic aloud and label the assumption. If peak is actually twenty times average in a dense city, we can scale regional capacity or shed nonessential work. Hidden math produces hidden outages; transparent math creates a conversation.

Visual: calculation-build — 2 million trips per day → 23 per second average → 230 per second at peak.

## Slide 9 — Location Updates Change the Scale

The second calculation changes the scale. One million active drivers send one roughly one-hundred-byte location update every four seconds. That is two hundred fifty thousand updates per second at peak: one million divided by four. An event is an immutable record that something happened at a particular time. Marco’s position at a given time is an event; it is not the same as rewriting the entire trip record. At two hundred fifty thousand events per second, raw payload volume is about twenty-five megabytes per second before protocol overhead or copies. This is why a marketplace cannot treat moving positions like ordinary account edits. We need a path that accepts a burst, keeps the most recent location easy to find, and stores history more cheaply. Without that separation, the large location stream competes with Aisha’s small but critical ride request and turns the core record store into a bottleneck precisely when demand rises.

Visual: event-stream — 1 million active drivers, each reporting every four seconds.

## Slide 10 — Storage Follows the Data

Now let storage follow the meaning of the data. Live positions are hot: dispatch needs Marco’s current cell and a recent timestamp, not every point from last week. We keep that compact, indexed state with a short expiration. Raw historical telemetry can move to lower-cost object storage for approved analysis and retention. Seven days of raw locations is roughly fifteen terabytes under our assumptions; with three copies plus index and metadata overhead, budget around fifty terabytes. Replication keeps multiple copies of data so a failure of one copy does not make it unavailable. The practical consequence is different for different data: trip and payment state need durable replicated truth, while an old map dot can expire. Recap question: where would you store Marco’s last ten seconds of position versus a week of approved route history? Take a moment. Keep the fresh position close to dispatch; keep history durable and cheaper. Without these layers, either the hot path becomes slow or the storage bill grows without improving Aisha’s ride.

Visual: storage-layers — Live positions expire quickly. Raw history is cheaper in object storage.

## Slide 11 — System Context: Who Connects?

We have enough requirements and scale to draw the outside boundary. The rider app and driver app are on one side. On the other side are a routing provider, a licensed payment provider, and emergency or safety services governed by explicit policy. Our platform sits in the middle and decides which interactions it owns. It owns trip state, matching, location handling, and the audit trail around safety workflow. It does not pretend to own road maps or card networks. This context diagram is intentionally simple. It helps an interviewer see where data enters, where trust boundaries exist, and where a dependency might fail. For Aisha, routing gives an estimated path. For Marco, the app receives an offer. For both, payment and emergency actions have stricter external obligations. If we open the architecture before agreeing on these boundaries, we risk hiding a vendor dependency inside an unexplained box. Next, we build the inside one layer at a time.

Visual: context-diagram — Rider and driver apps connect to maps, payments, and safety services through the platform.

## Slide 12 — Regional Architecture: Start at the Edge

Aisha’s request enters through an API edge. An API edge is the controlled entry layer that authenticates, routes, and protects client requests. In everyday terms, it is the guarded front door: it checks who is calling, rejects obviously bad traffic, and sends valid calls to the right place. Behind it, a service is a focused deployable component responsible for one bounded business capability. We separate trip, location, dispatch, payment, and safety responsibilities so one change does not accidentally rewrite every rule. A regional shard is an isolated deployment and data partition that serves a geographic area independently. Imagine a city-sized neighborhood of the platform with its own capacity and recovery plan. Its consequence is containment: a failure in one region should not make another region stop matching rides. Without an edge, unsafe or malformed traffic reaches every component. Without focused services and regional shards, a small fault becomes a wide, confusing outage.

Visual: architecture-progressive-1 — Apps → API edge → focused services inside one regional shard.

## Slide 13 — Regional Architecture: Add Durable Truth

The next layer holds durable truth and shares changes safely. A database is a durable system for storing and querying authoritative application state. The trip database holds Aisha’s ride status, its version, and the confirmed driver assignment. It is where we insist that one transition follows the last one. An event log is a durable ordered record of changes that other components can consume independently. When the trip changes from requested to matched, the log lets notifications, payment preparation, safety workflows, and analytics learn about that fact without every component calling the trip service directly. The consequence is loose coupling: a delayed notification does not block a driver assignment. We partition both trip data and the log by region, then by trip identifier, so related work stays close together. Without a durable database, we cannot confidently answer who is assigned. Without an event log, every new downstream feature makes the synchronous request path slower and more fragile.

Visual: architecture-progressive-2 — Trips and payments use a database. Changes are shared through an event log.

## Slide 14 — Why Events Matter

Here is a subtle but important failure. Suppose the trip database records that Marco accepted, but the process crashes just before it tells the event log. Aisha might wait on a stale screen while payment and safety systems never learn the assignment. An outbox is a durable record written with business state so its event can be published reliably after the transaction. Think of it as a message placed in the same sealed envelope as the trip update. A separate publisher reads the envelope and delivers the event, retrying safely if necessary. The consequence is that a completed state change does not disappear between two unreliable network calls. This is more dependable than trying to update the database and send a message as unrelated steps. Without an outbox, we get the worst kind of bug: the core truth says one thing, while everything around it silently believes another. It is a small pattern with a large reliability payoff.

Visual: outbox-flow — Write the trip change and its outgoing record together; publish afterward.

## Slide 15 — Data Ownership Prevents Confusion

Look at our architecture as a set of owners, not a pile of boxes. The trip component owns the authoritative ride state. The location path owns fresh moving positions. Dispatch owns the process of proposing an assignment, and payment owns settlement records. Other components can react to published changes, but they do not casually rewrite another owner’s truth. Prediction question: should every component edit the same tables to save time? Take a moment. The answer is no. Shared writes create hidden coupling: a payment change can accidentally alter a trip, and an emergency repair becomes impossible to reason about. Clear ownership lets us test a state transition, audit it, and recover it in one place. It also makes each team or module smaller to understand. For Aisha, the effect is simple: one part of the platform can be late without allowing two parts to decide she has two different drivers. Now we can zoom into the hardest owner-to-owner handoff: dispatch.

Visual: ownership-map — The trip component owns trip truth. Location handles fresh positions. Payment owns settlement.

## Slide 16 — H3 Cells: a Map Made Searchable

Aisha taps request, and dispatch needs possible drivers before it can choose one. Searching every driver in the city would be wasteful. Instead, we divide the map into small hexagons. An H3 cell is an addressable hexagonal area used to group nearby geographic positions for efficient search. Think of it as a labeled tile on a honeycomb map. Marco’s latest position updates the tile where he is currently available. Aisha’s pickup identifies its own tile, and dispatch searches that tile, then expands outward in rings only if needed. Hexagons have convenient neighboring shapes, but the key idea is spatial bucketing, not the brand of index. The consequence is bounded work: a request looks at nearby candidates rather than a city-wide list. Without a geographic index, rush-hour matching becomes a repeated full scan and latency rises just when Aisha most needs an answer. Next we narrow the nearby list to drivers who can actually take her.

Visual: hex-grid — Split the map into small hexagons, then search outward in rings.

## Slide 17 — Dispatch: Find Viable Candidates

The H3 search returns possibilities, not promises. A candidate filter quickly removes options that cannot satisfy a request before expensive scoring. It might remove drivers whose last location is too old, who are already leased, whose vehicle does not fit the requested service, or who are outside a safety boundary. Eligibility is the set of non-negotiable rules an option must satisfy before it can be offered. In plain English, eligibility is the bouncer at the door; no amount of clever prediction lets an unavailable driver accept a ride. Marco passes because he is active, his location is fresh, and he is not finishing another trip. The consequence is efficiency and safety: our ranking model sees a manageable set of viable choices instead of trying to repair impossible ones later. Without this filter, the platform may offer Aisha a driver who cannot respond, causing timeouts and cancellations. Hard rules come first; preference comes after.

Visual: dispatch-funnel — Search map cells → filter hard rules → keep viable drivers.

## Slide 18 — Learned and Deterministic Scoring

Among viable drivers, we choose the most useful offer. An online feature is a fresh input, such as current traffic or driver state, used during a live decision. For Marco and the other candidates, features might include route time, recent acceptance behavior, rain, road closures, and how long each driver has waited. A learned ranker is a model that orders options by predicted usefulness using historical patterns and current inputs. It can estimate pickup time, acceptance chance, and cancellation risk better than distance alone. But no model gets to be the only path. A deterministic scorer ranks options with fixed, explainable rules that produce the same result for the same inputs. Ours combines map ETA, distance, and a fairness adjustment. The consequence is graceful operation: if inference is late, low-confidence, too costly, or disallowed by policy, dispatch still makes a transparent choice. Without a fallback, a model incident would turn into a marketplace outage. AI improves the choice; it never becomes permission to stop serving Aisha.

Visual: dual-scorer — Predict with fresh signals. Keep a transparent distance-and-fairness baseline.

## Slide 19 — Optimize, Then Reserve

Ranking one driver is not enough when many riders ask at once. An optimizer selects the best allowed assignment across options while respecting constraints such as fairness and detour limits. Rather than greedily give every nearby request the same attractive driver, it considers a small batch of offers and chooses a combination that gives the marketplace a better overall result. We keep the optimization bounded so it finishes inside the match target; under overload, we can fall back to a simpler greedy rule. After selecting Marco for Aisha, dispatch creates a lease. A lease is a time-limited reservation that grants one worker temporary ownership of a resource. It says, for example, that Marco is reserved for Aisha’s offer for a short window. The consequence is no double booking: another rider cannot win the same driver while Marco decides. Without a lease, two dispatch workers may race, both send offers, and create an impossible real-world conflict.

Visual: optimizer-lease — Choose a fair assignment, then reserve one driver briefly before offering the trip.

## Slide 20 — Prediction Checkpoint

Let’s pause at the decision point. The dispatch pipeline is map search, hard eligibility rules, scoring, bounded assignment, reservation, and offer. It is deliberately a sequence from cheap, certain checks to more sophisticated choices. Prediction question: where should a slow model stop Aisha’s ride? Take a moment to answer. It should stop nowhere. If the learned ranker exceeds its latency budget, returns low confidence, or cannot use a sensitive input, the deterministic fallback takes over. A deterministic fallback is a fixed safe path used when a model is slow, unavailable, low-confidence, or disallowed. Here it uses route time, distance, availability, and fairness rules to select a viable driver. The model result may improve efficiency, but the fixed path protects the product promise. This boundary is the core of an AI-native design: models are valuable advisors inside a dependable system, not fragile gatekeepers in front of it. Now we will trace exactly how Aisha’s request moves through that system.

Visual: dispatch-recap — Map search → hard rules → score → assign → reserve → offer.

## Slide 21 — One Ride Request, End to End

Aisha first asks for a quote, which returns a price range, an ETA, and an expiration time. When she confirms, the app sends a trip command with an idempotency key. Idempotency means repeating the same command has the same effect as performing it once. In plain language, if her train-station network drops just after the tap, the app can retry without accidentally creating two rides. The trip service stores the request, records an outbox item, and asks dispatch for a match. Dispatch searches H3 cells, filters candidates, scores them, reserves Marco with a lease, and sends his app an offer. If the model path is unhealthy, it uses the deterministic route instead. Marco accepts; the trip service confirms the assignment using a version check so a late duplicate acceptance cannot overwrite the truth. Aisha sees Marco’s car and ETA. Each transition creates an event for the rest of the platform. Without idempotency and version checks, ordinary mobile retries become double trips, duplicated offers, and support tickets.

Visual: sequence-diagram — Request → match → offer → accept → confirm → show rider the driver and ETA.

## Slide 22 — When Demand or Dependencies Misbehave

Real systems fail in uneven ways. During a concert exit, location updates may surge before trip requests do. Backpressure is a controlled slowdown that keeps a fast producer from overwhelming a slower consumer. For example, the platform can lower noncritical location sampling or coalesce repeated points before it rejects an important ride command. That preserves Aisha’s ability to request a trip even when the map is busy. A circuit breaker temporarily blocks calls to an unhealthy dependency to prevent repeated failures from spreading. If a routing provider starts timing out, the breaker opens after a small number of failures, returns a bounded estimate or cached route data, and probes later for recovery. We also use bounded retries, dead-letter review for events that cannot be processed, and regional isolation. If a region is unhealthy, we may finish active trips from replicated state but stop new matching until safety and payment dependencies are safe. Without these controls, retry storms turn one slow service into a full outage.

Visual: failure-path — Slow location sampling before rejecting ride commands; isolate a failing dependency quickly.

## Slide 23 — Protect People Before Optimizing

A map dot represents a person, so this system must protect people before it optimizes them. Privacy is the disciplined control of personal information so it is used only for legitimate, limited, and understandable purposes. Precise location should be encrypted, access should be restricted to carefully defined roles and workflows, and raw route history should expire under a documented retention policy. Payment details are tokenized so the marketplace avoids handling more sensitive data than necessary. Safety tools can detect suspicious GPS patterns or collusion signals, but a model should not silently punish someone. High-impact actions such as suspension, emergency escalation, cancellation, or refund require auditable policy and, where appropriate, human confirmation. The consequence is that AI assistants operate with scoped tools and minimized context, not broad access to every rider history. Without these boundaries, a technically clever platform can create surveillance, unfair enforcement, and irreversible harm. Trust is not an add-on feature; it is part of the architecture.

Visual: privacy-boundary — Encrypt precise location, restrict access, minimize retention, and keep safety decisions auditable.

## Slide 24 — Keep Models Useful, Never Required

A deployed model is not finished when it first looks accurate. Model drift is a decline or change in prediction quality because real-world patterns no longer match training data. A new road closure pattern or seasonal demand can make yesterday’s ETA model misleading. Shadow testing sends live-like inputs to a new model without letting it control outcomes, so results can be compared safely against the current path. A canary release exposes a new version to a small controlled share of traffic before wider rollout. Cost control is the use of budgets, caching, smaller models, and measurement to keep an operating path economically sustainable. Prediction question: when a model looks promising offline, should we turn it on for everyone? Take a moment. No. First measure ETA error, cancellation, acceptance, fairness slices, latency, overrides, drift, and cost using trace context across the request. Then expand only if it helps. If it does not, the deterministic path remains available and the product still works.

Visual: model-lifecycle — Observe quality, test quietly, release gradually, and preserve the non-model path.

## Slide 25 — Reconstruct the Design in an Interview

You can now reconstruct this system in an interview. Start with Aisha’s outcome: a quote, a safe match, live tracking, and exactly-once settlement. Clarify scope and quality targets. Estimate trip commands separately from the much larger location stream. Separate authoritative trip and payment truth from approximate telemetry. Use a regional boundary, a protected entry layer, focused owners, durable state, and published changes. For dispatch, explain spatial lookup, hard eligibility, learned advice, a transparent rules path, bounded optimization, and a temporary reservation. Then earn confidence by discussing overload, dependency failure, privacy, safety, model evaluation, and cost. Finally, ask yourself three follow-up questions. How do driver leases prevent double assignment? What happens when a GPS point is stale? How would scheduled rides change capacity and dispatch? The enduring lesson is not a list of technologies. It is a habit: make the product reliable first, make the AI helpful second, and always explain what happens when a component is missing or wrong. Practice this story aloud once, then redraw the flow from memory. That is how an architecture becomes an explanation you can confidently share. That is a design others can understand, critique, and improve.

Visual: interview-recap — Clarify → estimate → separate truth from telemetry → dispatch → failures → trade-offs.
