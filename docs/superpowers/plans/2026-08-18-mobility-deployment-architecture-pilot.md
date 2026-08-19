# Mobility Deployment Architecture Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver one review-ready deployment child page for the AI-Native Mobility Marketplace and upgrade its parent case study with explicit requirements and self-explaining diagrams.

**Architecture:** Add a typed system-design-deployments Astro collection and generic child route that initially contains the mobility pilot only. Reuse the existing system-design navigation and Markdown rendering model, with a focused deployment layout and base-safe links. Keep all mobility-specific architecture analysis in Markdown so it remains useful outside the site.

**Tech Stack:** Astro content collections, TypeScript, Markdown, Mermaid 11, Vitest, existing CSS design system

**Spec:** docs/superpowers/specs/2026-08-18-system-design-deployment-architecture-design.md

## Global Constraints

- This pilot implements only 01-ai-native-mobility-marketplace; the remaining 23 deployment pages are deferred until user review.
- The primary architecture is cloud-neutral and designed for general senior system-design interviews.
- No backend, runtime API, database, hosted service, or new dependency is introduced.
- Every internal route is constructed with withBase().
- Mermaid diagrams include accTitle and accDescr, quoted labels containing punctuation, and visible role phrases.
- The Kubernetes API server is a management relationship, never part of the customer request path.
- Stateful managed services stay outside the workload cluster unless explicitly justified.
- Corporate registry, certificate, and dependency security controls must not be bypassed.

---

### Task 1: Define the pilot content and route contracts

**Files:**
- Create: tests/system-design/deployment-content-contract.test.ts
- Create: tests/system-design/deployment-routes-contract.test.ts
- Modify: tests/system-design/content-contract.test.ts

**Interfaces:**
- Consumes: existing Markdown files in content/system-design and Astro source files as text.
- Produces: executable contracts for the deployment collection, route, mobility requirements, and explanatory diagrams.

- [ ] **Step 1: Write the failing deployment content contract**

Create a test with the pilot slug and exact required headings:

~~~ts
const pilotSlug = '01-ai-native-mobility-marketplace';
const deploymentHeadings = [
  'Deployment goals and assumptions',
  'Traffic classes and critical paths',
  'Deployment architecture',
  'Edge, ingress, and API tier',
  'Kubernetes and compute layout',
  'Stateful data and messaging',
  'Network zones and security boundaries',
  'Availability and failure-domain placement',
  'Scaling and capacity mapping',
  'Configuration, secrets, and service discovery',
  'Observability and operations',
  'Release, rollback, and data migration',
  'Disaster recovery and multi-region evolution',
  'Failure scenarios and graceful degradation',
  'Cost and architecture trade-offs',
  'Interview walkthrough',
  'Cloud capability mapping',
];
~~~

Parse frontmatter with the existing YAML helper pattern. Assert that the pilot file exists, maps systemDesign to the same slug, uses order 2, provides all metadata, contains every numbered heading and at least two accessible Mermaid diagrams, and includes:

~~~ts
expect(body).toContain('| Component | Runtime and placement | Scaling unit | Stateful | Failure behavior |');
expect(body).toMatch(/\bRPO\b/);
expect(body).toMatch(/\bRTO\b/);
expect((body.match(/^\| Failure:/gm) ?? []).length).toBeGreaterThanOrEqual(3);
expect(body).toMatch(/deterministic.*fallback/is);
~~~

- [ ] **Step 2: Write the failing route contract**

Read the route and layouts as text and assert:

~~~ts
expect(route).toContain("getCollection('system-design-deployments')");
expect(route).toContain("getCollection('system-design')");
expect(route).toContain('withBase');
expect(parentRoute).toContain('deploymentHref');
expect(layout).toContain('View deployment architecture');
expect(deploymentLayout).toContain('Cloud-neutral deployment architecture');
~~~

Also assert the child layout exposes a parent link, deployment metadata, sidebar, content, and pagination slots.

- [ ] **Step 3: Extend the parent content contract for the mobility pilot**

Extract the mobility body and assert:

~~~ts
expect(body).toContain('### Functional requirements');
expect(body).toContain('| ID | Requirement | Priority | Interview significance |');
expect(body).toContain('### Non-functional requirements');
expect(body).toContain('| Quality | Measurable target | Why it matters | Architecture consequence |');
expect(body).toContain('### Context component roles');
expect(body).toContain('### Container component roles');
~~~

Extract the Mermaid blocks following sections 5 and 6. Require visible line-break role text plus the existing accessible title and description.

- [ ] **Step 4: Run the focused tests and verify RED**

~~~bash
npx vitest run tests/system-design/deployment-content-contract.test.ts tests/system-design/deployment-routes-contract.test.ts tests/system-design/content-contract.test.ts
~~~

Expected: failures identify the missing collection directory, child route/layout, requirements tables, and diagram role text.

- [ ] **Step 5: Commit the red contracts**

~~~bash
git add tests/system-design
git commit -m "test: define mobility deployment architecture contract"
~~~

### Task 2: Add the typed collection and reusable deployment route

**Files:**
- Modify: src/content.config.ts
- Create: src/layouts/DeploymentArchitectureLayout.astro
- Create: src/pages/system-design/[slug]/deployment.astro
- Modify: src/pages/system-design/[slug].astro
- Modify: src/layouts/SystemDesignLayout.astro

**Interfaces:**
- Consumes: deployment entries with systemDesign, order, and deployment metadata.
- Produces: static child paths, an optional deploymentHref layout property, and generic navigation ready for later rollout.

- [ ] **Step 1: Add the deployment collection schema**

~~~ts
'system-design-deployments': defineCollection(content('./content/system-design-deployments', z.object({
  title: z.string(),
  summary: z.string(),
  systemDesign: z.string().regex(/^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  order: z.number().int().min(1),
  deploymentStyle: z.string(),
  availabilityTarget: z.string(),
  regions: z.enum(['single-region', 'multi-region', 'global']),
  tags: z.array(z.string()).min(1),
}))),
~~~

- [ ] **Step 2: Add the generic child layout**

Create a layout that receives parent metadata, parentHref, deployment metadata, and slots. Its core header is:

~~~astro
<a class="deployment-back-link" href={parentHref}>← Back to {parent.title}</a>
<p class="eyebrow">Cloud-neutral deployment architecture</p>
<h1>{title}</h1>
<dl class="deployment-summary">...</dl>
<aside class="originality-note">...</aside>
<slot />
~~~

- [ ] **Step 3: Add the static deployment route**

Load both collections in getStaticPaths(), fail with a descriptive error for an orphaned deployment, sort by order, and pass previous/next deployment entries. Render Markdown and build every internal link with withBase().

- [ ] **Step 4: Add the parent-page call to action**

Extend SystemDesignLayout with optional deploymentHref and render:

~~~astro
{deploymentHref && (
  <a class="deployment-cta" href={deploymentHref}>
    <span>Deployment view</span>
    <strong>View deployment architecture →</strong>
  </a>
)}
~~~

The parent route loads deployment entries and passes a URL only when the current entry has a match, preventing dead links during the pilot.

- [ ] **Step 5: Run the route contract**

~~~bash
npx vitest run tests/system-design/deployment-routes-contract.test.ts
~~~

Expected: PASS.

- [ ] **Step 6: Commit the collection and routes**

~~~bash
git add src/content.config.ts src/layouts/DeploymentArchitectureLayout.astro src/layouts/SystemDesignLayout.astro src/pages/system-design
git commit -m "feat: add system design deployment routes"
~~~

### Task 3: Upgrade the mobility parent case study

**Files:**
- Modify: content/system-design/01-ai-native-mobility-marketplace.md

**Interfaces:**
- Consumes: existing mobility prompt, capacity estimates, logical components, and decisions.
- Produces: explicit requirements and self-explaining context/container diagrams while preserving every existing section.

- [ ] **Step 1: Replace compressed requirements prose with explicit tables**

Add at least five functional rows covering quote/request, matching, live trip state, payment, and safety. Add measurable non-functional rows for quote latency, match latency, location freshness, availability/regional isolation, payment correctness, durability, privacy, and peak scale. Each row names the architecture decision it drives. Retain scope exclusions and assumptions below the tables.

- [ ] **Step 2: Make the context diagram self-explaining**

Use concise visible roles:

~~~mermaid
Rider["Rider<br/>Requests, tracks, and pays for trips"]
Platform["Mobility platform<br/>Quotes, matches, tracks, and settles rides"]
PSP["Payment provider<br/>Authorizes and captures regulated payments"]
~~~

Add a one-line role table for Rider, Driver, Mobility platform, Routing provider, Payment provider, and Emergency services.

- [ ] **Step 3: Make the container diagram self-explaining**

Give every node a short role phrase, including edge, trip, location, dispatch, geo index, model gateway, regional SQL, event log, payment ledger, and safety workflow. Add a table explaining each component’s latency, state, or consistency responsibility.

- [ ] **Step 4: Run the parent content contract**

~~~bash
npx vitest run tests/system-design/content-contract.test.ts
~~~

Expected: PASS.

- [ ] **Step 5: Commit the parent improvements**

~~~bash
git add content/system-design/01-ai-native-mobility-marketplace.md tests/system-design/content-contract.test.ts
git commit -m "content: clarify mobility requirements and diagrams"
~~~

### Task 4: Author the mobility deployment architecture

**Files:**
- Create: content/system-design-deployments/01-ai-native-mobility-marketplace.md

**Interfaces:**
- Consumes: the mobility logical design and deployment page contract.
- Produces: a cloud-neutral, Markdown-native deployment reference architecture.

- [ ] **Step 1: Add typed frontmatter and goals**

~~~yaml
title: AI-Native Mobility Marketplace Deployment Architecture
summary: A cloud-neutral regional-cell deployment for low-latency dispatch, realtime location, safe payments, and graceful AI degradation.
systemDesign: 01-ai-native-mobility-marketplace
order: 2
deploymentStyle: Regional cells with active-active zonal workloads and controlled cross-region failover
availabilityTarget: 99.99% trip-state availability with no double charge
regions: multi-region
tags: [kubernetes, regional-cells, realtime, geospatial, disaster-recovery]
~~~

State city affinity, three zones per serving region, managed stateful services, and second-region recovery assumptions.

- [ ] **Step 2: Build the primary deployment diagram**

Visibly separate global edge, regional routing, public ingress, private workloads, managed Kubernetes control plane, three workload zones, CPU/accelerator pools, managed SQL, geo/cache state, event stream, object storage, secrets/KMS, model serving, payment provider, observability, and secondary-region recovery. Use the customer path apps → edge/WAF → traffic manager → regional load balancer → Kubernetes gateway → services. Show the Kubernetes API server only by a dotted management edge.

- [ ] **Step 3: Add deployment inventory and capacity analysis**

The inventory identifies placement, scaling unit, statefulness, and failure behavior. Explain independent scaling signals, topology spread, disruption budgets, reserved headroom, managed state outside Kubernetes, and a transparent mapping from 250k location events/s to partitions and worker replicas.

- [ ] **Step 4: Add security, operations, delivery, and recovery**

Cover private subnets, workload identity, mTLS, secret rotation, payment tokenization, egress controls, network policies, audit trails, configuration promotion, feature flags, OpenTelemetry signals, SLO alerts, canaries, rollback, backward-compatible events, expand/contract migrations, backups, RPO/RTO, regional evacuation, and reconciliation.

- [ ] **Step 5: Add failure and AI-degradation analysis**

Include Failure: rows for zone loss, model outage, event lag, geo-state degradation, SQL failover, payment-provider outage, and regional loss. State deterministic scoring, cached features, circuit breakers, queueing, and safety fallbacks.

- [ ] **Step 6: Add interview narration and capability mapping**

Explain the request path, state ownership, async boundary, zonal survival, AI fallback, and multi-region trade-off. Keep the mapping generic, with optional illustrative technologies in a clearly labeled example column.

- [ ] **Step 7: Run the deployment content contract**

~~~bash
npx vitest run tests/system-design/deployment-content-contract.test.ts
~~~

Expected: PASS.

- [ ] **Step 8: Commit the deployment content**

~~~bash
git add content/system-design-deployments/01-ai-native-mobility-marketplace.md tests/system-design/deployment-content-contract.test.ts
git commit -m "content: add mobility deployment architecture"
~~~

### Task 5: Polish and verify the pilot

**Files:**
- Modify: src/styles/system-design.css
- Modify if required by verified defects: files changed in Tasks 1–4

**Interfaces:**
- Consumes: rendered parent and deployment pages.
- Produces: accessible, responsive pages ready for local review.

- [ ] **Step 1: Add focused responsive styles**

Style deployment-cta, deployment-back-link, deployment-summary, and deployment-article. Keep tables intentionally scrollable, metadata single-column on narrow screens, focus visible, and minimum widths capped to avoid 320px overflow.

- [ ] **Step 2: Run all focused contracts**

~~~bash
npx vitest run tests/system-design
~~~

Expected: all system-design tests pass.

- [ ] **Step 3: Run the full suite**

~~~bash
npm test
~~~

Expected: all tests pass with zero failures.

- [ ] **Step 4: Run the GitHub Pages production build**

~~~bash
GITHUB_REPOSITORY=navaidya/learning npm run build
~~~

Expected: Astro check and build succeed and output both the parent and deployment index.html files.

- [ ] **Step 5: Inspect desktop and mobile rendering**

Preview the built site and inspect both pages at desktop and 320px widths. Confirm Mermaid rendering, readable labels, usable tables, working navigation, control-plane separation, and no unintended page overflow.

- [ ] **Step 6: Run repository checks**

~~~bash
git diff --check
git status --short
~~~

Expected: no whitespace errors and no generated artifacts staged.

- [ ] **Step 7: Commit styling and verified corrections**

~~~bash
git add src/styles/system-design.css
git commit -m "style: polish deployment architecture pages"
~~~

Include other pilot files only when visual verification requires a correction, and keep generated output untracked.
