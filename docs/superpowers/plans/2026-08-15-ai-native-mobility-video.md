# AI-Native Mobility Marketplace Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a locally reviewable, beginner-friendly 30-minute video lesson for the AI-Native Mobility Marketplace system design, including an editable deck, warm US-English narration, captions, thumbnail, and YouTube metadata.

**Architecture:** Treat the lesson as 25 independently revisable slide/audio segments. Author the deck with `@oai/artifact-tool`, render each slide to PNG, synthesize one narration file per slide with macOS Samantha, derive timings from measured audio, and compose a 1080p H.264/AAC video with FFmpeg. Keep large media local and use deterministic validation scripts for structure, timing, codecs, captions, and required content.

**Tech Stack:** JavaScript ES modules, `@oai/artifact-tool`, bundled presentation runtime, PowerPoint, Graphviz, macOS `say`, FFmpeg/FFprobe, WebVTT, Markdown.

## Global Constraints

- Final video duration: 28–32 minutes; target 30 minutes.
- Audience: layered beginner-to-interview audience; every essential term is defined at first use.
- Visual direction: approved Technical Blueprint, 16:9, 1920×1080, dark navy with cyan/green/amber/red semantics.
- Narration: installed Samantha US-English voice, conversational pacing, deliberate pauses, and pronunciation-friendly wording.
- Deck typography: at least 50 pt deck title, 35 pt slide titles, 24 pt subheads/callouts, and 16 pt body text.
- One primary teaching idea per slide; use progressive architecture reveals and attention resets approximately every five minutes.
- No Oracle-internal, customer, confidential, or proprietary information.
- Do not upload to YouTube; final artifacts remain local for review.
- Do not commit MP4, rendered slides, generated audio, or temporary build assets to Git.
- All external claims and assets require `[Sources]` blocks in PowerPoint speaker notes and entries in `/private/tmp/ai-native-mobility-video/source-notes.txt`.

---

### Task 1: Build the lesson manifest and validation contract

**Files:**
- Create: `/private/tmp/ai-native-mobility-video/lesson-manifest.json`
- Create: `/private/tmp/ai-native-mobility-video/validate-lesson.mjs`
- Read: `content/system-design/01-ai-native-mobility-marketplace.md`
- Read: `docs/superpowers/specs/2026-08-15-ai-native-mobility-video-design.md`

**Interfaces:**
- Produces: `lesson-manifest.json` with `{ lessonTitle, slides: SlideSpec[] }`.
- `SlideSpec` fields: `number`, `slug`, `title`, `chapter`, `purpose`, `visibleCopy`, `visualKind`, `narration`, `sources`, `attentionReset`.
- Produces: validator exit code `0` only when the manifest has 24–26 sequential slides, every narration is non-empty, total narration is 4,000–4,800 words, all new terms are defined, required chapters exist, and at least five attention resets are present.

- [ ] **Step 1: Create a failing manifest validator**

```js
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const requiredChapters = ['hook', 'requirements', 'capacity', 'architecture', 'dispatch', 'sequence', 'production', 'interview'];
const words = manifest.slides.reduce((total, slide) => total + slide.narration.trim().split(/\s+/).length, 0);
const errors = [];
if (manifest.slides.length < 24 || manifest.slides.length > 26) errors.push('slide count must be 24–26');
if (manifest.slides.some((slide, index) => slide.number !== index + 1)) errors.push('slide numbers must be sequential');
if (requiredChapters.some((chapter) => !manifest.slides.some((slide) => slide.chapter === chapter))) errors.push('all chapters are required');
if (manifest.slides.some((slide) => !slide.title || !slide.purpose || !slide.narration)) errors.push('every slide needs title, purpose, and narration');
if (words < 4000 || words > 4800) errors.push(`narration word count ${words} must be 4000–4800`);
if (manifest.slides.filter((slide) => slide.attentionReset).length < 5) errors.push('at least five attention resets are required');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(JSON.stringify({ slides: manifest.slides.length, words }, null, 2));
```

- [ ] **Step 2: Run the validator against a missing manifest**

Run: `node /private/tmp/ai-native-mobility-video/validate-lesson.mjs /private/tmp/ai-native-mobility-video/lesson-manifest.json`

Expected: non-zero exit because the manifest does not exist.

- [ ] **Step 3: Create the 25-slide manifest skeleton**

Use these slide jobs in order: title; rider hook; why matching is hard; functional requirements; non-functional terms; consistency analogy; capacity setup; ride request math; location-event math; storage consequence; context diagram; regional architecture build 1; architecture build 2; why events; data ownership; H3 plain-English explanation; dispatch candidate flow; learned versus deterministic scoring; optimization and leases; prediction checkpoint; end-to-end sequence; failure/backpressure; privacy/security; model lifecycle/fallbacks; interview reconstruction and closing questions.

Set narration to a one-sentence stub initially so the validator fails only on word count.

- [ ] **Step 4: Run the validator and confirm the expected word-count failure**

Run: `node /private/tmp/ai-native-mobility-video/validate-lesson.mjs /private/tmp/ai-native-mobility-video/lesson-manifest.json`

Expected: FAIL with `narration word count ... must be 4000–4800`.

---

### Task 2: Write the complete storyboard and narration

**Files:**
- Modify: `/private/tmp/ai-native-mobility-video/lesson-manifest.json`
- Create: `video/system-design/ai-native-mobility-marketplace/narration-script.md`
- Create: `/private/tmp/ai-native-mobility-video/source-notes.txt`

**Interfaces:**
- Consumes: `SlideSpec[]` from Task 1.
- Produces: final manifest containing audience-facing slide copy and 4,000–4,800 narrated words.
- Produces: narration Markdown with one `## Slide N — Title` section per manifest entry.

- [ ] **Step 1: Write narration for slides 1–10**

Use the rider story to define system design, actor, functional requirement, non-functional requirement, latency, availability, consistency, throughput, peak load, event, and replication. Each definition must include a plain-language explanation and one concrete consequence.

- [ ] **Step 2: Write narration for slides 11–20**

Build the context/container architecture progressively. Define API edge, service, database, event log, regional shard, H3 cell, candidate filter, online feature, learned ranker, deterministic fallback, optimizer, and lease at first use. Explain what breaks without each major component.

- [ ] **Step 3: Write narration for slides 21–25**

Walk the critical sequence; then explain backpressure, idempotency, circuit breaker, privacy, model drift, shadow testing, canary release, cost control, and deterministic fallback. Close by reconstructing the design and posing the three canonical follow-up questions from the case study.

- [ ] **Step 4: Add engagement beats**

Mark slides 3, 6, 10, 15, 20, and 24 with `attentionReset: true`. Their narration must ask a prediction or recap question, pause, and then provide the answer.

- [ ] **Step 5: Generate the review script from the manifest**

Write each slide title and narration verbatim to `narration-script.md`, followed by a one-line `Visual:` description. Do not include timing until audio is measured.

- [ ] **Step 6: Validate the completed lesson**

Run: `node /private/tmp/ai-native-mobility-video/validate-lesson.mjs /private/tmp/ai-native-mobility-video/lesson-manifest.json`

Expected: PASS with `slides: 25` and narration between 4,000 and 4,800 words.

---

### Task 3: Author and export the PowerPoint deck

**Files:**
- Create: `/private/tmp/ai-native-mobility-video/build-deck.mjs`
- Create: `/private/tmp/ai-native-mobility-video/graphviz/*.dot`
- Create: `/private/tmp/ai-native-mobility-video/graphviz/*.svg`
- Create: `video/system-design/ai-native-mobility-marketplace/ai-native-mobility-marketplace.pptx`

**Interfaces:**
- Consumes: `lesson-manifest.json`.
- Produces: a 25-slide 16:9 PPTX with speaker notes and `[Sources]` blocks.
- Uses exact command-scoped runtime paths returned by `codex_app__load_workspace_dependencies`.

- [ ] **Step 1: Read the artifact-tool authoring documentation**

Read completely:

```text
/Users/navaidya/.codex/plugins/cache/openai-primary-runtime/presentations/26.813.12317/skills/presentations/artifact_tool_docs/API_QUICK_START.md
/Users/navaidya/.codex/plugins/cache/openai-primary-runtime/presentations/26.813.12317/skills/presentations/artifact_tool_docs/api/API_DOCS.md
```

- [ ] **Step 2: Prepare the temporary runtime**

Create `/private/tmp/ai-native-mobility-video/node_modules` as a symlink to `/Users/navaidya/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`. Do not modify the bundled dependency directory.

- [ ] **Step 3: Mark the artifact operation exactly once**

Run:

```bash
node /Users/navaidya/.codex/plugins/cache/openai-primary-runtime/presentations/26.813.12317/skills/presentations/container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pptx
```

Expected: exit `0`. Do not run this marker again during the build.

- [ ] **Step 4: Generate complex architecture visuals with Graphviz**

Create DOT sources for the regional container architecture, dispatch pipeline, and complete request sequence. Use short node labels, left-to-right flow where possible, cyan primary edges, amber fallback edges, and red failure edges. Export transparent SVGs sized for 16:9 placement.

- [ ] **Step 5: Implement the Technical Blueprint deck**

Use `@oai/artifact-tool` in `build-deck.mjs`. Define shared palette, typography, title/footer helpers, term-definition treatment, diagram placement, and page markers. Create connectors before diagram nodes for native-shape flows. Add speaker notes containing the slide narration followed by:

```text
[Sources]
- content/system-design/01-ai-native-mobility-marketplace.md
- https://h3geo.org/docs/ (slides that explain H3)
- https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/ (observability slide)
[/Sources]
```

- [ ] **Step 6: Export the PPTX**

Run `build-deck.mjs` with the bundled Node executable and exact runtime environment variables. Expected: the final PPTX exists and contains 25 slides.

---

### Task 4: Render and visually inspect every slide

**Files:**
- Create: `/private/tmp/ai-native-mobility-video/rendered/slide-1.png` through `slide-25.png`
- Create: `/private/tmp/ai-native-mobility-video/montage.png`
- Modify: `/private/tmp/ai-native-mobility-video/build-deck.mjs` when defects are found

**Interfaces:**
- Consumes: final PPTX from Task 3.
- Produces: verified 1920×1080 slide images with no unintended overlaps or clipping.

- [ ] **Step 1: Render every slide**

Run the bundled `render_slides.py` with the exact workspace runtime environment. Expected: 25 PNG files.

- [ ] **Step 2: Run overflow detection**

Run `slides_test.py` on the PPTX. Expected: no unintended out-of-bounds elements.

- [ ] **Step 3: Create and inspect a contact sheet**

Run `create_montage.py`, then inspect the montage for narrative rhythm, color consistency, density, and repeated silhouettes.

- [ ] **Step 4: Inspect all 25 slides individually**

Check each full-size PNG for title wrapping, body text below 16 pt, illegible diagram labels, connector crossings, low contrast, clipping, and excessive text. Record each issue in `/private/tmp/ai-native-mobility-video/qa-ledger.txt`.

- [ ] **Step 5: Fix and rerender until the QA ledger is empty**

Modify only affected slide builders, rerun export, rendering, overflow checks, and individual inspection. Expected: an empty unresolved-issues section in the QA ledger.

---

### Task 5: Generate narration and timed captions

**Files:**
- Create: `/private/tmp/ai-native-mobility-video/audio/slide-01.aiff` through `slide-25.aiff`
- Create: `/private/tmp/ai-native-mobility-video/audio-normalized/slide-01.m4a` through `slide-25.m4a`
- Create: `/private/tmp/ai-native-mobility-video/timings.json`
- Create: `video/system-design/ai-native-mobility-marketplace/ai-native-mobility-marketplace.vtt`

**Interfaces:**
- Consumes: final narration strings from the lesson manifest.
- Produces: `timings.json` entries `{ number, audioPath, durationSeconds, startSeconds, endSeconds }`.
- Produces: WebVTT cues aligned to narration segment boundaries.

- [ ] **Step 1: Generate one narration file per slide**

Invoke `/usr/bin/say -v Samantha -r 150` with each slide narration saved as a temporary plain-text input. Insert explicit paragraph breaks for questions and concept transitions. Expected: 25 non-empty AIFF files.

- [ ] **Step 2: Normalize narration audio**

Use FFmpeg loudness normalization targeting `-16 LUFS`, true peak `-1.5 dB`, and AAC output. Do not add background music.

- [ ] **Step 3: Measure segment durations**

Use FFprobe to read each normalized file’s exact duration. Build cumulative start/end timings in slide order.

- [ ] **Step 4: Validate total duration**

Expected: total narration plus transitions is 28–32 minutes. If shorter, deepen concrete explanations rather than adding filler. If longer, remove repetition before increasing speech rate above 155 words/minute.

- [ ] **Step 5: Generate WebVTT captions**

Create one or more readable cues per slide, splitting at sentence boundaries and keeping individual cues below roughly 12 seconds. Confirm the last cue ends at the final narration timestamp.

---

### Task 6: Compose the review video and publishing assets

**Files:**
- Create: `/private/tmp/ai-native-mobility-video/video-segments/segment-01.mp4` through `segment-25.mp4`
- Create: `video/system-design/ai-native-mobility-marketplace/ai-native-mobility-marketplace.mp4`
- Create: `video/system-design/ai-native-mobility-marketplace/thumbnail.png`
- Create: `video/system-design/ai-native-mobility-marketplace/youtube-metadata.md`

**Interfaces:**
- Consumes: verified slide PNGs, normalized narration, and `timings.json`.
- Produces: 1920×1080 H.264 video with AAC audio, `yuv420p`, and `+faststart`.

- [ ] **Step 1: Render one video segment per slide**

Use FFmpeg to loop the slide PNG for the audio duration, add a subtle 2–3% Ken Burns movement only on scenario/diagram slides, mux the matching narration, and encode H.264/AAC. Keep calculation slides static for readability.

- [ ] **Step 2: Concatenate segments**

Use an FFmpeg concat list in slide order. Add only short restrained fades at chapter boundaries; avoid transitions during equations or architecture explanation.

- [ ] **Step 3: Create the thumbnail**

Render a 1280×720 Technical Blueprint image using the title `Design an AI-Native Ride Marketplace` and the visual motif `1 request → 1 million moving drivers`. Keep all critical text inside a 5% safe margin.

- [ ] **Step 4: Write YouTube metadata**

Include a plain-language title, two-paragraph description, the originality disclaimer, references, playlist ID `PLQ7dOF2GYQkk`, and chapter timestamps derived from `timings.json`. Do not claim the architecture represents Uber’s internal implementation.

---

### Task 7: Verify and deliver the local review package

**Files:**
- Verify: all six deliverables under `video/system-design/ai-native-mobility-marketplace/`
- Create: `/private/tmp/ai-native-mobility-video/final-qa.txt`

**Interfaces:**
- Produces: a review-ready local package and objective verification evidence.

- [ ] **Step 1: Validate final media streams**

Run FFprobe and assert: duration 1,680–1,920 seconds, width 1920, height 1080, video codec H.264, audio codec AAC, and at least one video and one audio stream.

- [ ] **Step 2: Validate artifact completeness**

Confirm the PPTX, narration Markdown, MP4, VTT, thumbnail PNG, and YouTube metadata all exist and are non-empty. Confirm caption end time matches video duration within two seconds.

- [ ] **Step 3: Play representative sections locally**

Review opening, first term definition, capacity calculation, architecture build, H3 explanation, model fallback, failure handling, and closing synthesis. Confirm narration is intelligible and synchronized.

- [ ] **Step 4: Run the final slide checks again**

Rerun slide rendering and overflow checks against the delivered PPTX. Expected: 25 rendered slides and no unresolved unintended-overlap issues.

- [ ] **Step 5: Confirm Git safety**

Run `git status --short` and confirm no MP4, AIFF, M4A, rendered PNG sequence, or temporary build files are staged. The `.superpowers/` visual-companion directory also remains untracked.

- [ ] **Step 6: Deliver local review links**

Provide clickable local links to the MP4, PPTX, narration script, captions, thumbnail, and metadata. State the measured duration and verification results, and request timestamp-specific feedback for revisions.
