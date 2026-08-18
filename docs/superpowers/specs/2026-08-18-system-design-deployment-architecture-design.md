# System Design Deployment Architecture Library Design

## Purpose

Extend every entry in the System Design library with two complementary learning views:

1. The existing case-study page will state its functional and non-functional requirements explicitly and make its system-context and container diagrams self-explanatory.
2. A dedicated child page will explain how that logical design is deployed as a production system.

The material is for general senior system-design interview preparation. Architectures must remain cloud-neutral, original, readable in Markdown, and honest about which infrastructure is managed, clustered, regional, zonal, or outside Kubernetes.

## Scope

The catalog currently contains 24 entries in `content/system-design`, including the reusable system-design template. Every entry receives exactly one deployment child page at:

`/system-design/<system-design-slug>/deployment`

The template receives a reusable deployment worksheet rather than a product-specific topology. The other 23 pages receive case-specific deployment analyses.

No existing system-design URL changes. No backend, runtime API, database, hosted service, or new runtime dependency is introduced.

## Content architecture

### Main case-study pages

Each existing Markdown case study keeps its present interview contract and gains:

- A prominent base-path-safe link to the corresponding deployment child page.
- A functional-requirements table under `Requirements and scope` with these columns:
  - `ID`
  - `Requirement`
  - `Priority`
  - `Interview significance`
- A non-functional-requirements table under the same heading with these columns:
  - `Quality`
  - `Measurable target`
  - `Why it matters`
  - `Architecture consequence`
- Explicit scope exclusions and assumptions below the tables.
- A system-context Mermaid diagram whose visible node labels pair each component name with a short role phrase.
- A `Context component roles` table immediately after that diagram for readable one-line explanations.
- A container Mermaid diagram whose visible node labels pair each component name with a short role phrase.
- A `Container component roles` table immediately after that diagram for readable one-line explanations.

Short role text belongs in the diagram so it can be understood at a glance. The accompanying role tables provide complete wording without overcrowding the diagram. Mermaid diagrams retain `accTitle` and `accDescr` directives.

### Deployment content collection

Create `content/system-design-deployments` as a typed Astro content collection. Each document uses the same slug as its parent system design and contains:

- `title`: deployment page title
- `summary`: one-sentence deployment summary
- `systemDesign`: exact parent system-design slug
- `order`: same catalog order as the parent
- `deploymentStyle`: short topology classification, such as regional active-active or globally distributed edge
- `availabilityTarget`: the stated availability objective or service-specific durability objective
- `regions`: single-region, multi-region, or global placement model
- `tags`: deployment topics

The collection must be one-to-one with `system-design`: no missing pages, extra pages, duplicate `systemDesign` values, or order mismatches.

## Routing and navigation

Add a static route at `src/pages/system-design/[slug]/deployment.astro`. Its static paths come from the deployment collection and resolve the matching parent entry.

The main case-study route displays a clearly labeled `View deployment architecture` link near its interview summary. The child page displays:

- A breadcrumb/back link to the parent design.
- The deployment title, summary, topology metadata, and originality/cloud-neutral note.
- The rendered deployment Markdown.
- Previous and next deployment links in catalog order.
- The existing system-design sidebar, with the parent design marked active.

All internal links use `withBase()`. Markdown must not contain root-relative internal links because GitHub Pages serves the site under the repository base path.

## Deployment page contract

Every deployment page contains these sections:

1. `Deployment goals and assumptions`
2. `Traffic classes and critical paths`
3. `Deployment architecture`
4. `Edge, ingress, and API tier`
5. `Kubernetes and compute layout`
6. `Stateful data and messaging`
7. `Network zones and security boundaries`
8. `Availability and failure-domain placement`
9. `Scaling and capacity mapping`
10. `Configuration, secrets, and service discovery`
11. `Observability and operations`
12. `Release, rollback, and data migration`
13. `Disaster recovery and multi-region evolution`
14. `Failure scenarios and graceful degradation`
15. `Cost and architecture trade-offs`
16. `Interview walkthrough`
17. `Cloud capability mapping`

Each page includes:

- A primary Mermaid deployment diagram with accessible title and description.
- A request-path or data-path Mermaid diagram.
- A deployment inventory table identifying component, runtime/placement, scaling unit, statefulness, and failure behavior.
- A minimum of three concrete failure scenarios.
- Explicit recovery point objective (RPO) and recovery time objective (RTO) assumptions where persistent data exists.
- An explanation of what remains available when AI inference is slow, unavailable, over budget, or disallowed.
- A concise interview narration that explains the architecture from edge to state and then through failure handling.

## Diagram semantics

The deployment diagram is a physical/runtime view, not a duplicate of the logical container diagram.

When applicable it shows:

- Clients, DNS, CDN, DDoS protection, web application firewall, global or regional traffic management.
- Public load balancers, API gateways, Kubernetes ingress/gateway, and realtime gateways.
- Regions and availability/failure zones.
- Kubernetes clusters, namespaces, node pools, deployments, pods, jobs, and autoscaling boundaries.
- Managed control plane separately from workload data plane.
- Databases, caches, logs, queues, search indexes, object storage, vector stores, feature stores, and model-serving infrastructure.
- Public, private application, and restricted data/security zones.
- Synchronous request paths, asynchronous event paths, replication, backups, and disaster-recovery paths using a small consistent legend.
- Observability collectors and control loops without placing telemetry in the customer request path.

The Kubernetes API server is shown only as a management/control-plane relationship. It must never appear in the end-user request path. Stateful managed services normally remain outside the Kubernetes workload boundary unless the case study explicitly justifies self-hosting.

Not every design must use Kubernetes for every workload. Edge networks, managed databases, data warehouses, object stores, and globally distributed storage should be placed according to their operational and consistency needs.

## Case-specific deployment emphasis

- **System-design template:** reusable topology worksheet, placement questions, and failure-domain checklist.
- **Mobility marketplace:** city/regional cells, realtime location ingestion, geospatial state, dispatch isolation, payment boundary, regional fallback.
- **URL shortener:** global edge redirect path, regional link creation, distributed key-value replication, abuse analysis separated from redirect availability.
- **Cloud knowledge workspace:** resumable upload edge, metadata services, chunk/object storage, change-event pipeline, tenant-aware search and model-serving boundary.
- **Private messaging:** regional connection gateways, durable offline mailboxes, encryption/key boundaries, multi-device fan-out, metadata-minimizing abuse controls.
- **Public conversation:** regional write path, hybrid fan-out workers, global feed/read caches, search/index pipeline, moderation and ranking isolation.
- **Social network:** graph and feed cells, media edge, privacy-policy enforcement, recommendation serving, bounded personal-agent data access.
- **Delivery marketplace:** market cells, courier location ingestion, dispatch and ETA serving, order/payment state, operations exception path.
- **Rate limiter:** edge/local enforcement, regional quota state, configuration distribution, fail-open/fail-closed policy boundaries.
- **Distributed cache:** client routing, shard placement, replication, membership/control plane, hot-key protection, persistence optionality.
- **Distributed message queue:** broker racks/zones, controller quorum, partition replicas, tiered storage, producer/consumer network path.
- **Observability platform:** regional collectors and buffers, ingestion isolation, hot/warm/cold stores, query plane, tenant and cardinality controls.
- **Video streaming:** upload region, transcoding pools, origin/object storage, global CDN, playback control plane, recommendation path isolation.
- **Web crawler:** frontier partitions, politeness schedulers, fetcher egress pools, parser/index pipeline, deduplication and checkpoint recovery.
- **Search autocomplete:** edge caches, regional serving replicas, offline/streaming index builders, atomic index publication, personalization boundary.
- **Notification system:** API ingress, durable scheduling, channel queues and workers, provider isolation, preference and suppression stores.
- **E-commerce platform:** storefront edge, catalog/search read path, cart/checkout boundary, inventory reservations, payment and fulfillment events.
- **Payments ledger:** isolated payment ingress, idempotency and ledger services, strongly consistent database, outbox, reconciliation, restricted network zone.
- **Event ticketing:** waiting room, admission control, seat inventory partitions, reservation leases, checkout/payment, oversell prevention.
- **Travel booking:** search fan-out and caches, supplier adapters, saga orchestration, booking system of record, reconciliation and manual recovery.
- **Collaborative editor:** regional session gateways, document affinity, operation log, snapshots, presence, durable catch-up and region evacuation.
- **Multi-agent orchestration:** request/API plane, workflow scheduler, isolated workers, tool egress gateway, state/checkpoints, model routing and safety policy.
- **ML feature store:** streaming/batch ingestion, offline store, online serving tiers, registry, materialization, training/serving consistency controls.
- **LLM search and RAG:** ingestion/indexing plane, query plane, ACL enforcement, hybrid retrieval, model gateway, prompt-injection isolation, evaluation telemetry.

## Cloud neutrality

Primary diagrams use capability names rather than a particular cloud vendor. The final mapping table explains categories such as managed Kubernetes, global traffic manager, relational database, distributed key-value store, event stream, object storage, secrets manager, and telemetry backend. Product examples may appear only as illustrative alternatives, never as required dependencies.

## Accessibility and readability

- Every Mermaid diagram includes one `accTitle` and one `accDescr` immediately after the diagram declaration.
- Visible node labels use concise role phrases and quoted labels when punctuation or line breaks are present.
- Large deployment diagrams use subgraphs for region, zone, cluster, and data boundaries.
- Color is supplementary; labels and line styles carry meaning.
- Tables remain readable on narrow screens with the existing article overflow behavior or a focused responsive style.
- Markdown remains useful when Mermaid does not render.

## Tests and verification

Add or extend focused tests before content implementation to verify:

- Exactly 24 deployment files exist and map one-to-one to the parent catalog.
- Deployment schema metadata is present, valid, ordered, and slug-safe.
- Every deployment page contains all required headings, at least two accessible Mermaid diagrams, a deployment inventory table, an interview walkthrough, and failure/RPO/RTO analysis where applicable.
- Every main case study contains functional and non-functional requirement tables, scope/assumption prose, context/container role tables, and a deployment link marker.
- The first system-context and container diagrams include visible role phrases as well as accessible descriptions.
- Static route generation uses the deployment collection and base-path-safe links.
- The catalog, parent pages, deployment pages, sidebar, breadcrumbs, and previous/next links work under the GitHub Pages repository base.
- Mermaid source satisfies the repository’s safe syntax contract; representative diagrams are rendered and visually inspected on desktop and narrow viewports.

Final verification runs `npm test` and `GITHUB_REPOSITORY=navaidya/learning npm run build`. No registry, certificate, or corporate dependency-control bypass is permitted. If the configured dependency environment is unavailable, report the environmental blocker and preserve the configured security controls.

## Completion criteria

- All 24 parent pages expose explicit requirements and self-explaining logical diagrams.
- All 24 deployment child routes build successfully and contain system-specific, cloud-neutral analysis.
- Deployment diagrams distinguish edge, workload, state, control plane, security, availability, and recovery paths as relevant.
- Existing system-design URLs, content collections, and unrelated pages continue to work.
- Automated contracts and the production static build pass.
