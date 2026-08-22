---
title: Low-Latency Autosuggest
summary: Design an autosuggest system faster than a user types, then implement the immutable top-results-per-prefix index at the heart of its deterministic fallback path.
order: 12
difficulty: advanced
estimatedMinutes: 120
categories: [system-design, coding, performance]
languages: [java, python]
skills: [latency-budgeting, prefix-indexing, caching, ranking, capacity-estimation, observability]
labPath: coding-labs/low-latency-autosuggest
status: ready
tags: [autocomplete, trie, edge-cache, personalization, interview-system-design]
---

The detail page provides the canonical link to this lab’s runnable Java and Python code.

## Interview prompt

Design autosuggest so useful suggestions arrive before the user types the next character. Draw the high-level architecture, quantify latency and scale, and discuss server, client, and network choices. Then implement a bounded in-memory suggestion index.

Clarify:

- active users, searches per user, characters per query, and peak factor;
- supported languages, normalization, spell correction, and rich results;
- global, regional, tenant-specific, or personalized suggestions;
- freshness target and whether deletes/moderation must propagate faster;
- result count, ranking inputs, privacy policy, and safety requirements;
- latency objective by geography and acceptable stale behavior;
- availability target and deterministic behavior if ML ranking is unavailable.

## What you will build

Build an immutable top-results-per-prefix index. Normalize and deduplicate terms, rank by descending popularity with an alphabetical tie-breaker, retain at most ten results per prefix, and answer reads without mutating shared state.

Then place that component inside a production design with two paths:

```text
Request path: client cache → edge/CDN → regional API → prefix shard → optional bounded reranker
Build path: query events → validation/privacy → aggregation → moderation → index builder → versioned publish
```

The deterministic prefix ranking remains the fallback when personalization or model inference is unavailable, too slow, too costly, low-confidence, or disallowed by policy.

## Requirements and constraints

### Illustrative capacity estimate

Assume 10 million daily users, 8 searches per user, and 6 suggestion requests per search:

- `10M × 8 × 6 = 480M` requests/day;
- average is about `5,600` requests/second;
- a 10× peak is about `56,000` requests/second;
- at 1.5 KB per response, peak egress is roughly `84 MB/second` before protocol overhead and cache hits.

State that these are assumptions and update them when the interviewer supplies numbers.

### Example 100 ms latency budget

| Segment | Budget |
| --- | ---: |
| Client debounce and rendering | 10 ms |
| User-to-edge network | 30 ms |
| Edge lookup/routing | 10 ms |
| Regional service | 20 ms |
| Index lookup/ranking | 10 ms |
| Jitter and safety margin | 20 ms |

Functional requirements include prefix matching, top-k ranking, supported-locale normalization, moderation, and optional context-aware ranking. Non-functional requirements include tail latency, availability, freshness, privacy, bounded cost, explainability, and safe degradation.

## Suggested API or interface

A network API might accept `prefix`, `limit`, `locale`, and an opaque session context, then return suggestions plus index version and cache metadata. Cancel older requests when a newer prefix exists; a slow response for `ap` must not overwrite a fast response for `app`.

The Java lab exposes:

```java
public List<Suggestion> suggest(String prefix, int limit) {
  if (prefix == null) throw new IllegalArgumentException("prefix is required");
  if (limit < 1 || limit > 10) throw new IllegalArgumentException("limit must be between 1 and 10");
  List<Suggestion> matches = byPrefix.getOrDefault(normalize(prefix), List.of());
  return List.copyOf(matches.subList(0, Math.min(limit, matches.size())));
}
```

Python returns an immutable tuple:

```python
def suggest(self, prefix: str, limit: int) -> tuple[Suggestion, ...]:
    if prefix is None:
        raise ValueError("prefix is required")
    if limit < 1 or limit > 10:
        raise ValueError("limit must be between 1 and 10")
    return self._by_prefix.get(self._normalize(prefix), ())[:limit]
```

## Starter-to-solution checkpoints

1. Establish scale, result semantics, freshness, personalization, and latency targets.
2. Calculate average/peak QPS, response bandwidth, and index memory order of magnitude.
3. Start with a sorted term scan as a correctness oracle.
4. Normalize, deduplicate, and deterministically rank terms.
5. Materialize bounded top results for each prefix and keep reads immutable.
6. Separate online serving from offline/streaming index construction.
7. Add client cancellation, caching, stale policy, moderation, and observability.
8. Add optional ML reranking behind a deadline and deterministic fallback.

## Java and/or Python implementation notes

The lab precomputes every character prefix. Java advances by Unicode code point boundaries so it never creates a prefix in the middle of a surrogate pair. Python strings iterate Unicode code points. Both examples use lowercase normalization; a production multilingual search system needs an explicit locale and Unicode normalization policy tested with native-language datasets.

A trie can share prefix storage, but it is not automatically the best answer. A compact finite-state representation, sorted term blocks, or a key-value mapping from hot prefixes to top results may use less memory or deploy more simply. Measure representative data.

## Test cases and edge cases

- popularity order and alphabetical tie-breaking;
- uppercase and surrounding whitespace;
- duplicate normalized terms retaining the highest score;
- non-ASCII prefixes;
- blank terms excluded from the index;
- empty prefix returning global top results;
- no-match prefix returning an empty result;
- result limits of 1 and 10, with 0 and 11 rejected;
- immutable returned collections;
- index version swap while reads continue.

For ranking evaluation, add offline relevance judgments and online guardrail metrics; clicks alone are biased by position and prior ranking.

## Complexity and resource analysis

For `T` unique normalized terms with lengths `Lᵢ`, the lab sorts in `O(T log T)` and visits `O(ΣLᵢ)` prefix positions. Because these straightforward Java substrings and Python slices copy prefix text, materialization can require `O(ΣLᵢ²)` character work and key space; each prefix retains at most ten suggestions. Lookup is `O(p + limit)` for prefix length `p`, including normalization. A trie or compact finite-state representation can share prefix storage, while hot-prefix materialization avoids building the cold tail.

Network and rendering often dominate an in-memory lookup. Optimize the end-to-end latency distribution rather than celebrating a microsecond data structure while ignoring a 100 ms round trip.

## Concurrency and failure behavior

Build an index version off the request path, validate it, then atomically swap an immutable reference. Keep the previous version for rollback. If a shard is unavailable, serve a regional or edge snapshot; if the reranker misses its deadline, return deterministic prefix results. Apply load shedding, bounded queues, per-tenant quotas, and request cancellation.

Client techniques include debouncing without making the UI sluggish, canceling obsolete requests, caching recent prefixes for backspace, preconnecting, and optionally prefetching a small popular set. Edge caching works best for shared suggestions; personalization reduces cache reuse, so combine a cacheable global candidate set with a small privacy-bounded reranking step.

Observe p50/p95/p99 latency by stage, cache hit rate, empty-result rate, cancellation, stale-version age, shard load, fallback rate, model deadline misses, moderation blocks, relevance metrics, and cost per thousand requests.

## Production extension questions

- How are query events aggregated without retaining unnecessary personal data?
- How quickly must a dangerous suggestion be removed from every cache?
- How do you shard hot prefixes such as one-letter queries?
- How do spelling correction and multilingual tokenization change candidate generation?
- Where does personalization run, and what user controls or consent are required?
- How do you evaluate an ML reranker without reinforcing position bias?
- How do agents or bots change abuse detection and rate limits?
- What deterministic result is served when every learned component is disabled?

## Interview explanation checklist

- Ask about scale, geography, freshness, result type, locality, personalization, and safety.
- Show the arithmetic for peak QPS, bandwidth, and latency budget.
- Separate request serving from index construction and publishing.
- Explain the server, client, and network contributions to latency.
- Discuss the cache-versus-freshness and personalization-versus-cache trade-offs.
- Bound ML ranking with privacy policy, deadline, evaluation, cost, and fallback.
- Name overload, stale data, shard failure, cancellation, moderation, and rollback behavior.

## References

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [Java Collections Framework](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/package-summary.html)
- [Python sorting HOWTO](https://docs.python.org/3/howto/sorting.html)
