# AI-Native Mobility Marketplace Video — Design Specification

## Purpose

Create one locally reviewable pilot lesson for the AI-Native System Design Interview Series. The video teaches the AI-Native Mobility Marketplace case study to a layered audience: beginners should understand every essential term, while engineers preparing for interviews should leave with a coherent design method and defensible trade-offs.

The pilot is a review artifact only. It will not be uploaded to YouTube until the user explicitly approves it.

## Success criteria

- The final video runs for 30 minutes, with an acceptable range of 28–32 minutes.
- A beginner can explain the rider-to-driver request flow, the purpose of each major component, and the difference between strong and eventual consistency.
- An interview candidate can reproduce the capacity estimate, high-level architecture, dispatch deep dive, failure strategy, AI evaluation approach, and deterministic fallbacks.
- The lesson introduces technical terms only when they become necessary and immediately defines each in plain English.
- The video remains engaging through scenario continuity, progressive diagram reveals, prediction questions, recaps, and varied slide composition.
- No Oracle-internal, customer, confidential, or proprietary information appears in the deck, script, audio, metadata, or video.

## Audience and voice

The primary audience includes motivated beginners and working engineers preparing for system-design interviews. The narration is warm, confident, conversational US English. Local narration uses the installed Samantha voice at a measured pace, with deliberate pauses and pronunciation-friendly wording for H3, p99, idempotency, OpenTelemetry, and related terms.

The narration speaks to the viewer directly and uses the recurring frame, “Let’s follow one ride request.” It avoids reading slide text verbatim.

## Narrative structure

The lesson uses one continuous rider story and approximately 24–26 slides:

1. **0–3 minutes — Hook and problem:** A rider requests a trip while nearby drivers are moving. Establish actors, desired outcome, and why matching is difficult.
2. **3–7 minutes — Requirements and vocabulary:** Explain functional versus non-functional requirements, latency, availability, strong consistency, eventual consistency, and regional isolation.
3. **7–11 minutes — Capacity:** Calculate ride requests, location updates, bandwidth, hot storage, and why different data needs different storage.
4. **11–17 minutes — Architecture:** Build the system progressively from clients and edge services through trip, location, dispatch, event, payment, and safety components.
5. **17–22 minutes — Dispatch deep dive:** Explain H3 cells, candidate expansion, eligibility filters, online features, learned ranking, deterministic scoring, constrained optimization, and driver leases.
6. **22–25 minutes — Critical sequence:** Walk one request from quote through assignment, including model timeout and fallback behavior.
7. **25–28 minutes — Production concerns:** Cover backpressure, retries, regional failure, privacy, fraud, model evaluation, observability, and cost controls.
8. **28–30 minutes — Interview synthesis:** Reconstruct the design, revisit major trade-offs, and give the viewer questions they should now be able to answer.

## Teaching and engagement model

Each concept follows the same learning loop:

1. Present a concrete problem in the rider story.
2. Introduce one technical term.
3. Define it in everyday language and give a short analogy.
4. Add or highlight the corresponding architecture element.
5. Explain why it exists and what breaks without it.
6. Ask a prediction question.
7. Reveal and summarize the answer.

Slides contain one primary teaching idea. Every five minutes, the lesson includes either a recap, a prediction prompt, or a visual transition to reset attention. Capacity calculations reveal one operation at a time. The complete architecture is not shown until the viewer has learned its parts.

## Visual direction

Use the approved **Technical Blueprint** direction:

- 16:9, 1920×1080 target.
- Dark navy background, high-contrast white text, cyan infrastructure accents, green healthy-path signals, amber fallbacks, and red failures.
- Minimum PowerPoint sizes: 50 pt deck title, 35 pt slide titles, 24 pt subheads/callouts, and 16 pt body text.
- Flat compositions rather than dashboard-like card grids.
- Progressive diagrams, restrained motion, readable labels, and consistent connector semantics.
- Blue request paths, green successful responses, amber fallback paths, and red failure paths.
- On-screen definitions are concise; narration provides the deeper explanation.
- Diagrams use native slide shapes for simple flows and Graphviz-generated visuals for dense topology. They must remain legible at normal 1080p playback size.

## Production architecture

Produce each slide and narration segment independently. The deck is authored as a local PowerPoint file with speaker notes containing narration and source records. Every slide is rendered to PNG and inspected at full size. Each narration segment is synthesized to audio separately, allowing isolated revisions.

The final video pipeline:

1. Render verified slides to 1920×1080 images.
2. Generate and normalize one narration audio segment per slide.
3. Measure audio durations and derive slide timings.
4. Compose slides, subtle pan/zoom where appropriate, and restrained transitions with FFmpeg.
5. Concatenate segments into a 1080p H.264/AAC MP4.
6. Generate WebVTT captions from the final timed narration.
7. Validate duration, stream codecs, resolution, audio presence, and playback integrity.

Motion must support explanation rather than decorate it. Architecture builds may use sequential slides or focused crop/highlight transitions so the visible state always matches the narration.

## Local deliverables

Final review artifacts live under `video/system-design/ai-native-mobility-marketplace/`:

- `ai-native-mobility-marketplace.pptx` — editable slide deck.
- `narration-script.md` — complete slide-by-slide narration.
- `ai-native-mobility-marketplace.mp4` — 1080p review video.
- `ai-native-mobility-marketplace.vtt` — timed captions.
- `thumbnail.png` — YouTube-ready thumbnail.
- `youtube-metadata.md` — proposed title, description, chapters, and playlist notes.

Large MP4 and audio intermediates are local review artifacts and must not be committed to ordinary Git history. The Markdown script, metadata, captions, and deck source can be considered separately after review.

## Quality assurance

- Render and inspect every slide individually and as a contact sheet.
- Resolve all unintended overlap, clipping, wrapping, unreadable labels, broken connectors, and inconsistent page markers.
- Confirm visible copy is audience-facing and contains no production notes.
- Review narration for natural pacing, pronunciation, repeated phrasing, abrupt transitions, and unexplained terminology.
- Confirm every non-trivial sourced claim and external asset has a source record in the slide notes and build source ledger.
- Verify diagrams against the canonical case study and capacity calculations.
- Verify captions cover the complete spoken narration and use the final audio timings.
- Use FFprobe to confirm duration, 1920×1080 video, H.264 video, AAC audio, and valid streams.
- Play representative opening, capacity, architecture, dispatch, failure, and closing sections locally before delivery.

## Revision model

Feedback is applied at slide/segment granularity. A revision may replace visible copy, diagram, narration, audio, or timing for one segment without regenerating unrelated content. The first review focuses on clarity, pace, visual legibility, narration quality, and sustained interest before the approach is reused for the remaining six system designs.
