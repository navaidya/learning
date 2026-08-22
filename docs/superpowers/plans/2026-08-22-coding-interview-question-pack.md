# Company-Neutral Coding Interview Question Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four original interview-preparation pages to the existing Coding Interviews catalog, each with embedded Java and Python examples and a dependency-free runnable lab in both languages.

**Architecture:** Reuse the typed `coding-interviews` Astro collection, catalog, detail route, and card components. Add four Markdown entries and four isolated lab directories; extend deterministic Vitest content/lab contracts so catalog order, guide completeness, embedded examples, and runnable assets are enforced without adding runtime dependencies.

**Tech Stack:** Astro, TypeScript, Markdown, Vitest, Java 17 standard library, Python 3.10+ standard library, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-08-22-coding-interview-question-pack-design.md`

## Global Constraints

- Rewrite all supplied material in original, company-neutral language; do not expose a source company, internal level mapping, hiring threshold, or scorecard.
- Keep the existing eight guides and labs unchanged and add the new entries at orders 9 through 12.
- Every guide must include both Java and Python sample code and all twelve existing contract headings.
- Every lab must be dependency-free, runnable with JDK 17 and Python 3.10+, and provide equivalent observable behavior in both languages.
- Add no runtime dependency, backend, database, authentication, hosted service, or online code runner.
- Do not change registry, certificate, or corporate development controls to make verification pass.
- Keep all site links base-path safe through the existing route components.

---

### Task 1: Expand the content and lab contracts first

**Files:**
- Modify: `tests/coding-interviews/content-contract.test.ts`
- Modify: `tests/coding-interviews/lab-contract.test.ts`

**Interfaces:**
- Consumes: Markdown frontmatter parsed by the existing `splitMarkdown()` and `guideFor()` helpers.
- Produces: `expectedSlugs` containing all twelve ordered entries and assertions that the four new guides contain fenced Java and Python examples.

- [ ] **Step 1: Extend the expected catalog in both contract files**

Append these exact slugs after `microservice-observability-failure-lab`:

```ts
'senior-technical-screen',
'first-occurrence-binary-search',
'merge-k-sorted-lists',
'low-latency-autosuggest',
```

Change the expected order assertion to:

```ts
expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
```

- [ ] **Step 2: Add the embedded-language contract**

Add a test restricted to the four new filenames:

```ts
it('includes Java and Python examples in every question-pack guide', async () => {
  const newFiles = expectedSlugs.slice(8).map((slug) => `${slug}.md`);
  for (const file of newFiles) {
    const { body } = splitMarkdown(await readFile(`${contentDirectory}/${file}`, 'utf8'));
    expect(body, `${file} needs a Java sample`).toMatch(/```java\n[\s\S]+?```/);
    expect(body, `${file} needs a Python sample`).toMatch(/```python\n[\s\S]+?```/);
  }
});
```

In the runnable-lab loop, also read the root lab README and require both exact language-directory entry points:

```ts
const rootReadme = await readFile(`${labDirectory}README.md`, 'utf8');
expect(rootReadme, `${guide.labPath} needs a Java entry command`).toContain('cd java');
expect(rootReadme, `${guide.labPath} needs a Python entry command`).toContain('cd python');
```

- [ ] **Step 3: Run the focused tests and confirm the intended red state**

Run: `npm test -- tests/coding-interviews/content-contract.test.ts tests/coding-interviews/lab-contract.test.ts`

Expected: FAIL because the four Markdown files and lab directories do not exist yet.

- [ ] **Step 4: Commit the red contracts**

```bash
git add tests/coding-interviews/content-contract.test.ts tests/coding-interviews/lab-contract.test.ts
git commit -m "test: define coding interview question pack"
```

---

### Task 2: Build the first-occurrence binary-search lab

**Files:**
- Create: `coding-labs/first-occurrence-binary-search/README.md`
- Create: `coding-labs/first-occurrence-binary-search/java/README.md`
- Create: `coding-labs/first-occurrence-binary-search/java/src/main/java/FirstOccurrenceSearch.java`
- Create: `coding-labs/first-occurrence-binary-search/java/src/test/java/FirstOccurrenceSearchTest.java`
- Create: `coding-labs/first-occurrence-binary-search/python/README.md`
- Create: `coding-labs/first-occurrence-binary-search/python/src/first_occurrence.py`
- Create: `coding-labs/first-occurrence-binary-search/python/tests/test_first_occurrence.py`

**Interfaces:**
- Produces: Java `FirstOccurrenceSearch.find(int[] values, int key): int` and Python `find_first(values: Sequence[int], key: int) -> int`.
- Contract: null/`None` input raises an argument error; empty or absent input returns `-1`; duplicates return the lowest matching index; input is not mutated.

- [ ] **Step 1: Write failing Java tests**

```java
check(FirstOccurrenceSearch.find(new int[] {-40, -10, 20, 108, 108, 243, 285, 285, 285, 401}, 108) == 3, "first 108");
check(FirstOccurrenceSearch.find(new int[] {-40, -10, 20, 108, 108, 243, 285, 285, 285, 401}, 285) == 6, "first 285");
check(FirstOccurrenceSearch.find(new int[] {7, 7, 7, 7}, 7) == 0, "all equal");
check(FirstOccurrenceSearch.find(new int[] {}, 7) == -1, "empty");
check(FirstOccurrenceSearch.find(new int[] {1, 3, 5}, 4) == -1, "absent");
expectIllegal(() -> FirstOccurrenceSearch.find(null, 1));
```

- [ ] **Step 2: Run Java and verify compilation fails**

Run from `coding-labs/first-occurrence-binary-search/java`:

`rm -rf out && javac -d out $(find src -name '*.java')`

Expected: FAIL because `FirstOccurrenceSearch` is missing.

- [ ] **Step 3: Implement the Java search**

```java
public static int find(int[] values, int key) {
  if (values == null) throw new IllegalArgumentException("values are required");
  int low = 0, high = values.length - 1, result = -1;
  while (low <= high) {
    int middle = low + (high - low) / 2;
    if (values[middle] >= key) {
      if (values[middle] == key) result = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return result;
}
```

- [ ] **Step 4: Write failing Python tests, implement parity, and run both suites**

```python
def find_first(values: Sequence[int], key: int) -> int:
    if values is None:
        raise ValueError("values are required")
    low, high, result = 0, len(values) - 1, -1
    while low <= high:
        middle = low + (high - low) // 2
        if values[middle] >= key:
            if values[middle] == key:
                result = middle
            high = middle - 1
        else:
            low = middle + 1
    return result
```

Assert the same examples, all-equal, empty, absent, endpoints, and `None`. Run Java with assertions and Python with `python3 -m unittest discover -s tests -v`.

- [ ] **Step 5: Add exact README commands and commit**

Document root and per-language commands, prerequisites, expected success, and cleanup (`rm -rf out` for Java; no generated Python artifacts required).

```bash
git add coding-labs/first-occurrence-binary-search
git commit -m "feat: add first occurrence binary search lab"
```

---

### Task 3: Build the Merge K sorted lists lab

**Files:**
- Create: `coding-labs/merge-k-sorted-lists/README.md`
- Create: `coding-labs/merge-k-sorted-lists/java/README.md`
- Create: `coding-labs/merge-k-sorted-lists/java/src/main/java/MergeKSortedLists.java`
- Create: `coding-labs/merge-k-sorted-lists/java/src/test/java/MergeKSortedListsTest.java`
- Create: `coding-labs/merge-k-sorted-lists/python/README.md`
- Create: `coding-labs/merge-k-sorted-lists/python/src/merge_k_sorted_lists.py`
- Create: `coding-labs/merge-k-sorted-lists/python/tests/test_merge_k_sorted_lists.py`

**Interfaces:**
- Produces: immutable-value node APIs and `merge(List<ListNode> lists): ListNode` / `merge_k_lists(lists: Sequence[ListNode | None]) -> ListNode | None`.
- Contract: output is newly allocated, inputs are not mutated, null list entries behave as empty lists, and equal values are ordered deterministically.

- [ ] **Step 1: Write failing Java tests**

Cover `[1,4,5] + [1,3,4] + [2,6]`, no lists, all empty lists, one list, duplicates, negative values, and an input snapshot proving nodes are not rewired.

```java
check(values(merge(List.of(list(1, 4, 5), list(1, 3, 4), list(2, 6))))
    .equals(List.of(1, 1, 2, 3, 4, 4, 5, 6)), "sample");
```

- [ ] **Step 2: Verify the Java red state, then implement a min-heap merge**

Use a queue entry with `value`, monotonic `sequence`, and `node` so equal values never depend on node comparability:

```java
PriorityQueue<Entry> heap = new PriorityQueue<>(
    Comparator.comparingInt(Entry::value).thenComparingLong(Entry::sequence));
while (!heap.isEmpty()) {
  Entry entry = heap.remove();
  tail.next = new ListNode(entry.node.value);
  tail = tail.next;
  if (entry.node.next != null) heap.add(new Entry(entry.node.next.value, sequence++, entry.node.next));
}
```

- [ ] **Step 3: Write failing Python tests and implement equivalent heap behavior**

```python
heap: list[tuple[int, int, ListNode]] = []
sequence = count()
for node in lists:
    if node is not None:
        heappush(heap, (node.value, next(sequence), node))
while heap:
    _, _, node = heappop(heap)
    tail.next = ListNode(node.value)
    tail = tail.next
    if node.next is not None:
        heappush(heap, (node.next.value, next(sequence), node.next))
```

- [ ] **Step 4: Run both suites and add README contracts**

Expected complexity stated in the README: `O(N log k)` time and `O(k)` heap space, excluding the newly allocated `O(N)` output.

- [ ] **Step 5: Commit the lab**

```bash
git add coding-labs/merge-k-sorted-lists
git commit -m "feat: add merge k sorted lists lab"
```

---

### Task 4: Build the senior technical-screen lab

**Files:**
- Create: `coding-labs/senior-technical-screen/README.md`
- Create: `coding-labs/senior-technical-screen/java/README.md`
- Create: `coding-labs/senior-technical-screen/java/src/main/java/IdempotentCommandHandler.java`
- Create: `coding-labs/senior-technical-screen/java/src/test/java/IdempotentCommandHandlerTest.java`
- Create: `coding-labs/senior-technical-screen/python/README.md`
- Create: `coding-labs/senior-technical-screen/python/src/idempotent_command_handler.py`
- Create: `coding-labs/senior-technical-screen/python/tests/test_idempotent_command_handler.py`

**Interfaces:**
- Produces: `handle(Command command): Result` with statuses `CREATED` and `REPLAYED` in Java and Python.
- Contract: trim and validate request ID and payload, store one immutable result per request ID, replay the same result for an identical command, reject reuse of an ID with different content, and do not record a failed persistence attempt.

- [ ] **Step 1: Write tests for the service contract before implementation**

Test creation, same-command replay, conflicting request-ID reuse, blank ID, blank payload, repository failure followed by successful retry, and concurrent duplicate calls returning one created result plus replayed results.

```java
Result first = handler.handle(new Command("request-1", "payload"));
Result replay = handler.handle(new Command(" request-1 ", "payload"));
check(first.status() == Status.CREATED, "first call creates");
check(replay.status() == Status.REPLAYED, "duplicate replays");
check(first.resourceId().equals(replay.resourceId()), "stable resource id");
```

- [ ] **Step 2: Implement the minimal synchronized Java handler**

Normalize at the boundary, use a private map, compare normalized payloads, call the injected repository before caching success, and return immutable records. Keep synchronization scope explicit and explain that a distributed service needs a durable uniqueness constraint rather than an in-process lock.

- [ ] **Step 3: Implement the Python parity version under a `threading.Lock`**

Use frozen dataclasses for `Command` and `Result`, an injected repository callable, and the same normalization and conflict policy. Never cache exceptions.

- [ ] **Step 4: Run both suites and document adaptation points**

The README must identify validation, secure failure messages, idempotency, immutable results, concurrency boundary, and production storage uniqueness as the interview principles demonstrated.

- [ ] **Step 5: Commit the lab**

```bash
git add coding-labs/senior-technical-screen
git commit -m "feat: add senior technical screen lab"
```

---

### Task 5: Build the low-latency autosuggest lab

**Files:**
- Create: `coding-labs/low-latency-autosuggest/README.md`
- Create: `coding-labs/low-latency-autosuggest/java/README.md`
- Create: `coding-labs/low-latency-autosuggest/java/src/main/java/AutosuggestIndex.java`
- Create: `coding-labs/low-latency-autosuggest/java/src/test/java/AutosuggestIndexTest.java`
- Create: `coding-labs/low-latency-autosuggest/python/README.md`
- Create: `coding-labs/low-latency-autosuggest/python/src/autosuggest_index.py`
- Create: `coding-labs/low-latency-autosuggest/python/tests/test_autosuggest_index.py`

**Interfaces:**
- Produces: immutable `Suggestion(term, score)` values and `suggest(String prefix, int limit)` / `suggest(prefix: str, limit: int)`.
- Contract: Unicode-aware trim plus lowercase normalization, blank terms excluded, duplicate normalized terms retain the highest score, ordering by descending score then normalized term, prefixes may be empty, and limits must be 1 through 10.

- [ ] **Step 1: Write failing tests for ranking and validation**

Cover matching, popularity order, alphabetical tie-breaks, case/whitespace normalization, duplicate consolidation, empty prefix top results, no matches, immutability, and invalid limits.

```python
index = AutosuggestIndex([
    Suggestion("apple", 90), Suggestion("application", 70), Suggestion("apricot", 70)
])
self.assertEqual([item.term for item in index.suggest("AP", 3)],
                 ["apple", "application", "apricot"])
```

- [ ] **Step 2: Implement a build-time top-results-per-prefix index in Java**

Normalize and deduplicate inputs, sort once, then populate a map for every prefix while retaining at most ten immutable results per prefix. Reads perform one normalized map lookup and a bounded slice.

- [ ] **Step 3: Implement the equivalent immutable Python index**

Build `dict[str, tuple[Suggestion, ...]]`, retain at most ten entries per prefix, and return a fresh list or immutable tuple so callers cannot mutate the index.

- [ ] **Step 4: Run both suites and document scope**

State lab complexity separately from the production design: index build proportional to total term characters plus sorting, lookup `O(p + limit)` for prefix length `p`, and bounded stored top results per prefix.

- [ ] **Step 5: Commit the lab**

```bash
git add coding-labs/low-latency-autosuggest
git commit -m "feat: add low latency autosuggest lab"
```

---

### Task 6: Publish the four interview guides

**Files:**
- Create: `content/coding-interviews/senior-technical-screen.md`
- Create: `content/coding-interviews/first-occurrence-binary-search.md`
- Create: `content/coding-interviews/merge-k-sorted-lists.md`
- Create: `content/coding-interviews/low-latency-autosuggest.md`

**Interfaces:**
- Consumes: existing `coding-interviews` collection schema and the four lab APIs from Tasks 2–5.
- Produces: four ordered collection entries at orders 9–12 using both `java` and `python`, `ready` status, safe direct lab paths, all twelve shared headings, and fenced samples matching the runnable implementations.

- [ ] **Step 1: Write valid frontmatter for all four pages**

Use these exact order/difficulty/time/path values:

```yaml
# senior-technical-screen.md
order: 9
difficulty: advanced
estimatedMinutes: 90
labPath: coding-labs/senior-technical-screen

# first-occurrence-binary-search.md
order: 10
difficulty: intermediate
estimatedMinutes: 60
labPath: coding-labs/first-occurrence-binary-search

# merge-k-sorted-lists.md
order: 11
difficulty: advanced
estimatedMinutes: 75
labPath: coding-labs/merge-k-sorted-lists

# low-latency-autosuggest.md
order: 12
difficulty: advanced
estimatedMinutes: 120
labPath: coding-labs/low-latency-autosuggest
```

Every entry also supplies non-empty `title`, `summary`, `categories`, `skills`, `tags`, `languages: [java, python]`, and `status: ready`.

- [ ] **Step 2: Write the technical-screen and binary-search guides**

Use original explanations, include a 5/5/5/5-minute screening answer framework, company-neutral depth signals, and Java/Python excerpts from the validated lab code. For binary search, state the invariant and give `O(log n)` time and `O(1)` auxiliary space for the iterative implementation; do not claim physical contiguity is a universal requirement.

- [ ] **Step 3: Write the merge and autosuggest guides**

For merge, define `N` and `k` before comparing complexities and distinguish heap space from copied output space. For autosuggest, include clarifying questions, capacity/latency reasoning, request and build paths, cache/freshness and personalization/privacy trade-offs, client/network optimizations, moderation, cancellation, fallbacks, and observability.

- [ ] **Step 4: Run focused content and lab contracts**

Run: `npm test -- tests/coding-interviews/content-contract.test.ts tests/coding-interviews/lab-contract.test.ts tests/coding-interviews/schema-contract.test.ts tests/coding-interviews/routes-contract.test.ts`

Expected: all coding-interview contract tests pass.

- [ ] **Step 5: Commit the content**

```bash
git add content/coding-interviews
git commit -m "content: add company neutral interview question pack"
```

---

### Task 7: Verify the complete feature and generated site

**Files:**
- Modify only if a test exposes a defect in files created or explicitly modified by Tasks 1–6.

**Interfaces:**
- Consumes: all four guides, all four labs, and the existing Astro catalog/detail routes.
- Produces: evidence that source contracts, executable examples, static routes, and GitHub Pages base paths work together.

- [ ] **Step 1: Run all eight language test commands**

Run each Java assertion runner from its `java` directory and each Python unittest runner from its `python` directory. Expected: all eight commands exit zero.

- [ ] **Step 2: Run repository checks**

Run:

```bash
npm test
npm run build
GITHUB_REPOSITORY=navaidya/learning npm run build
git diff --check
```

Expected: tests and both builds pass; if dependency resolution is environmentally blocked, preserve configured registry/certificate controls and record the exact failure.

- [ ] **Step 3: Inspect generated routes and content**

Verify `dist/coding-interviews/index.html` and all four new `dist/coding-interviews/<slug>/index.html` files exist. Confirm catalog links include `/learning/` in the GitHub Pages build, fenced examples render as code blocks, and no page introduces horizontal overflow at a 320-pixel viewport.

- [ ] **Step 4: Check repository hygiene**

Run `git status --short`, `git diff --check`, and `git ls-files 'coding-labs/**/out/**' 'coding-labs/**/*.class' 'coding-labs/**/__pycache__/**'`. Expected: no generated lab artifacts are tracked and only intended feature files are changed.

- [ ] **Step 5: Commit any verification-only fixes**

If verification required corrections, commit only those corrections:

```bash
git add content/coding-interviews coding-labs tests/coding-interviews
git commit -m "fix: finalize coding interview question pack"
```

If no corrections were necessary, do not create an empty commit.
