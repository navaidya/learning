# AI learning review — 8 September 2026

## Recommendation

Specialize in production agent engineering: reliable execution, evaluation, observability, security enforcement, and the infrastructure that runs it. This connects your existing Kubernetes, telemetry, SRE, system-design and security material instead of creating another unrelated learning silo.

## What the portal needs

- **More practice connecting the notes.** The AIOps overview and troubleshooting notes are much shorter than the dedicated security chapters. Add reproducible agent experiments with saved inputs, traces and explicit success criteria. A bigger reading list alone will not close this gap.
- **Less progress accounting.** The dashboard already emphasizes knowledge, but the Skill Map still led to metrics-heavy pages. Replace that entry point with AI Watch; preserve old domain bookmarks as resource-only pages.
- **A focused change feed.** The existing Engineering Radar already refreshes four times daily. Reuse that workflow, but keep a separate snapshot for agents, security and observability so general infrastructure releases cannot crowd them out.
- **Evidence of learning rather than percentages.** For each experiment, save a failing case, your explanation, the implementation change and a measured result. Distinguish a proposed lab from one you actually completed.

This is a structural review and targeted source check, not a line-by-line technical audit of every existing chapter.

## Six-week learning sequence

| Week | Focus | Deliverable |
| --- | --- | --- |
| 1 | Single-agent execution and tool contracts | Read-only incident-triage agent with bounded steps, retries, timeouts, cancellation and idempotency tests |
| 2 | Evaluation and regression control | Versioned 20-case dataset, expected outcomes, failure taxonomy and automated regression report |
| 3 | Agent observability | Correlated task/model/tool traces, latency and cost per successful task, loop detection and redaction policy |
| 4 | Agent security | Prompt-injection and malicious-tool-output tests; scoped credentials and approval enforcement outside the model |
| 5 | AI infrastructure and data-center security | Trust-boundary diagram covering management networks/BMC, firmware, hosts, GPUs, workloads, storage and egress; tested workload isolation |
| 6 | Upgrade decision | Compare two versions on the same dataset; document security, correctness, latency and cost changes; adopt or defer |

Keep the same agent across all six weeks. Multi-agent coordination comes after you can explain and measure one agent's failure modes.

## Technologies to follow, and why

These are a focused shortlist, not a popularity ranking or a claim that one product is universally best.

- **LangGraph or Pydantic AI:** study execution state and typed tool contracts. Choose one for your lab; do not spend the six weeks learning both APIs.
- **MCP:** study interoperable tool connections alongside authorization, consent and untrusted tool content. Follow the project's [security guidance](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices).
- **OpenTelemetry plus Langfuse or Phoenix:** distinguish infrastructure availability from task correctness, tool behavior and model usage. Pin the conventions you instrument against; consult [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) for current stability details.
- **OWASP agent security:** turn threat descriptions into executable negative tests and ordinary-code policy enforcement. Start with the [Agentic Security Initiative](https://genai.owasp.org/initiatives/agentic-security-initiative/).
- **Falco and workload identity/isolation:** connect process/network evidence to agent task IDs. Runtime detection complements application tracing; it cannot judge answer correctness.
- **GPU tenancy, confidential computing and attestation:** learn the hardware and management-plane trust model, not just Kubernetes manifests. NVIDIA's [confidential computing overview](https://developer.nvidia.com/blog/protecting-sensitive-data-and-ai-models-with-confidential-computing/) is foundational background, not a current hardware compatibility matrix.

## Sustainable update routine

**Daily, 15 minutes:** scan AI Watch; pick one relevant development. Record its source, publication date, affected version, maturity and implication for your work. Most items can be deferred.

**Weekly, two hours:** reproduce one claim or failure mode. Save the trace, test, result and a short explanation in your own words. Explain it again without reading the note before you move on.

**Monthly:** run your unchanged evaluation set after an SDK, model, prompt or tool change. Compare task success, unauthorized actions, latency and cost. Write an adopt/experiment/defer decision.

The agent engineering field guide includes a reusable capture template. AI Watch links each area to notes and a concrete exercise; it does not mark anything learned automatically.

## Refresh operation and limitations

AI Watch collects 10 verified publisher-owned feeds: LangGraph, Pydantic AI, Langfuse, Phoenix, Falco, OWASP GenAI, NVIDIA Technical Blog, Practical AI, CNCF YouTube, and OpenTelemetry. Broad feeds use topic keywords. The first collection succeeded for all 10 and saved 60 items; this is an initial snapshot, not a guarantee of later availability.

The existing GitHub Actions schedule runs four times daily. After these changes reach the default branch, it collects both the Radar and AI Watch, commits snapshots and dispatches Pages deployment. GitHub schedules are best-effort and depend on Actions remaining enabled. Source health and original publication dates are visible; retained links are not relabeled as freshly published when a feed fails.

The page displays at most six items per section, two per publisher, from the preceding 30 days at build time. YouTube channel feeds expose only recent uploads, so this is not an exhaustive archive. Keyword matching can miss relevant items or include tangential ones. The permanent library remains available when a recent section is empty. No LLM summarization, paid API or new runtime service was introduced.

Publisher claims are inputs to learning, not validated findings. Existing incident notes should retain attribution and dates as investigations evolve. The linked Hugging Face disclosures and METR investigation were reachable during this review; their existence does not constitute verification of every interpretation in the local chapter.
