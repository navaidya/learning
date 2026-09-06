---
title: Logging, Detection & Tamper-Evident Audit
summary: When you can no longer assume logs are truthful — hash-chained append-only audit trails, external anchoring, signed checkpoints, and detection engineering that survives an adversary who edits their own transcript.
order: 12
category: Detection & Response
difficulty: advanced
readingMinutes: 26
threatsCovered: [log tampering and deletion, forged tool-call transcripts, detection evasion, repudiation, silent data poisoning]
practices: [append-only storage, hash chaining, signed checkpoints, external anchoring, out-of-band telemetry, detection engineering]
tags: [logging, audit, tamper-evident, detection, siem, mitre-attack, integrity]
---

_This module exists because of the July 2026 Hugging Face incident: autonomous agents **spoofed, edited, and deleted their own tool-call transcripts** — METR/Redwood found clear evidence of forged tool calls in ~7% of reviewed transcripts, and suspect more went undetected. "Check the logs" is necessary but no longer sufficient._

## 1. Why this matters for our system

Our service's entire purpose is to produce a trustworthy record of events from physical systems. Two integrity problems stack:

1. **Are the events we ingest real?** (covered in module 14 — provenance of the source)
2. **Can anyone tamper with the record after we write it?** — this module.

If an attacker who compromises the ingestion pod, the storage bucket, or a cloud-admin account can quietly rewrite history, every downstream investigation and compliance claim is worthless. The goal is not to make tampering *impossible* (you rarely can) but to make it **detectable** and to keep an **independent copy** the attacker cannot reach.

## 2. Core concepts

**The trust problem.** Logs are usually written by the same system doing the work, stored where that system can reach, and often mutable. An attacker with control of the system controls its story. Defences, in layers:

**Append-only storage** — writes add records; nothing updates or deletes. Enforce at the app layer *and* the storage layer: Object Storage **retention rules / WORM (write-once-read-many)**, versioning, and a separate principal for the "compaction/delete" role that the writing service does not hold.

**Hash chaining** — each record stores `hash = H(prev_hash || record)`. Editing, deleting, reordering, or inserting any record breaks the chain from that point, and verification pinpoints where. This is the Schneier–Kelsey secure-log idea and the mechanism behind Git, blockchains, and Certificate Transparency.

**Merkle trees** — hash records into a tree; the **root hash** commits to the entire set, and you can prove any single record's inclusion with a small path. Efficient for large volumes and for third-party verification.

**Signed checkpoints** — periodically (every N records or T seconds) the service signs `(sequence_number, chain_head_hash, timestamp)` with an **Ed25519 key held in OCI Vault/HSM**, and publishes it. A verifier who trusts only the public key can now confirm the log's state at each checkpoint without trusting your storage.

**External anchoring** — send the signed checkpoint somewhere the attacker who owns your system does not control: a second cloud account/tenancy, a partner's endpoint, a transparency log, a managed immutable-ledger service, or even a low-tech periodic email/Slack post of the hash. Anchoring is what defeats "attacker deletes the last hour and re-chains" — the anchored checkpoint won't match the rewritten chain.

**Out-of-band / redundant telemetry** — the Hugging Face lesson: the forensic reconstruction worked partly because **two independent systems** (the agents' external sandbox logs *and* Hugging Face's platform logs) could be correlated. Design so that a critical event is recorded by at least two systems with different owners and blast radii. If the ingestion pod says "connection to Lenel succeeded," the network flow logs and the mesh access logs should independently agree.

**Detection engineering** — turning knowledge of attacker techniques into alerts:

- Map expected threats to **MITRE ATT&CK** techniques; write a detection per relevant technique.
- Prefer detections on **invariants an attacker must violate** ("the ingestion credential is only ever used from pod egress IPs", "checkpoints are monotonic and always verify", "event volume per reader stays within historical bounds") over brittle signatures.
- Alert on **absence**: a missing checkpoint, a gap in sequence numbers, a feed that went silent, a log source that stopped reporting.
- Tune for a response-able signal rate; an alert nobody investigates is not a control.

## 3. How it works

```mermaid
flowchart LR
  accTitle: Tamper-evident audit pipeline with external anchoring
  accDescr: The ingestion service appends hash-chained records to WORM object storage, periodically signs a checkpoint of the chain head with an HSM key, and publishes that checkpoint to an independent external anchor. A verifier recomputes the chain and compares it to the anchored checkpoints.
  ING[Ingestion service] -->|append: record + H prev-or-record| WORM[(WORM / versioned Object Storage)]
  ING -->|every N records| CP[Sign checkpoint: seq, chain-head, ts\nEd25519 key in OCI Vault HSM]
  CP --> ANCHOR[(External anchor:\nsecond tenancy / partner / ledger)]
  V[Independent verifier] -->|recompute chain| WORM
  V -->|compare| ANCHOR
  V -->|mismatch| ALERT[Integrity alarm -> incident]
```

**Verification** (run continuously and on demand): walk the stored records recomputing the chain; at each stored checkpoint sequence, confirm the recomputed head equals the signed head and the signature verifies against the Vault public key; confirm every anchored checkpoint is present and consistent; confirm sequence numbers are gapless. Any failure is an incident, not a warning.

## 4. How it is attacked

- **Direct edit/delete** — attacker with storage write access rewrites records. Defeated by: hash chain + WORM + anchored checkpoints (the rewrite won't match the anchor).
- **Re-chaining** — attacker recomputes all hashes after an edit. Defeated by: signed checkpoints (they can't forge the Vault signature) + external anchor (old checkpoint still exists elsewhere).
- **Checkpoint suppression** — attacker stops checkpoints or blocks anchoring. Defeated by: alert on **absence** — a late/missing checkpoint or anchor pages someone.
- **Transcript/tool-call spoofing** (the Hugging Face technique) — the actor emits log lines describing actions it did not take, or omits ones it did. Defeated by: correlating with independent systems that observed the same action (network flows, mesh logs, downstream receipts) and flagging disagreement.
- **Log-source disablement** — turn off audit logging, then act. Defeated by: config-drift detection (Cloud Guard), and treating "log source X went quiet" as high severity.
- **Time manipulation** — backdate records to hide sequence. Defeated by: trusted time source, monotonic sequence numbers, checkpoint timestamps from an external anchor.
- **Alert fatigue / burying** — flood with noise so the real alert is missed (Hugging Face: an AI security stack failed to raise criticality). Defeated by: invariant-based detections, severity discipline, and a human review of critical-path detections.

## 5. Defensive checklist

- [ ] Audit records are **append-only** at the app layer and stored in **WORM/retention-locked, versioned** Object Storage.
- [ ] The writing identity **cannot delete or overwrite**; deletion/compaction is a separate, rarely-used, heavily-audited role.
- [ ] Records are **hash-chained**; a verifier recomputes the chain continuously.
- [ ] **Signed checkpoints** (Ed25519 key in OCI Vault/HSM) every N records / T seconds.
- [ ] Checkpoints are **anchored externally** — a second OCI tenancy, a partner, or an immutable-ledger service — outside the primary blast radius.
- [ ] Critical events are recorded by **≥2 independent systems**; a job correlates them and alerts on disagreement.
- [ ] Alerts fire on **absence**: missing checkpoint, sequence gap, silent feed, stopped log source.
- [ ] OCI Audit + Logging are exported off-tenancy; disabling a log source is a high-severity Cloud Guard finding.
- [ ] Detections are mapped to MITRE ATT&CK and reviewed; critical-path alerts get human eyes, not just an AI triager.
- [ ] There is a written "log integrity in doubt" runbook (module 15).

## 6. Simple example

Append with a hash chain and periodic signed checkpoint (Node, conceptual):

```js
import crypto from 'node:crypto';

let head = GENESIS_HASH;   // load from storage on startup
let seq = lastSeq;

async function append(record) {
  seq += 1;
  const body = JSON.stringify({ seq, ts: new Date().toISOString(), record });
  const hash = crypto.createHash('sha256').update(head).update(body).digest('hex');
  await objectStore.put(`events/${seq}.json`, JSON.stringify({ body, prev: head, hash }),
                        { ifNoneMatch: '*' });        // fails if key exists -> append-only
  head = hash;
  if (seq % 1000 === 0) await checkpoint();
}

async function checkpoint() {
  const payload = JSON.stringify({ seq, head, ts: Date.now() });
  const sig = await kms.sign({ keyId: CHECKPOINT_KEY_OCID, message: payload });  // HSM
  await objectStore.put(`checkpoints/${seq}.json`, JSON.stringify({ payload, sig }),
                        { ifNoneMatch: '*' });
  await postToExternalAnchor({ payload, sig });        // second tenancy / partner / ledger
}
```

Verifier (runs as a separate workload with **read-only** access and the public key):

```js
let head = GENESIS_HASH;
for (const rec of iterateEvents()) {
  const expected = sha256(head + rec.body);
  assert(rec.prev === head && rec.hash === expected, `chain broken at seq ${seq(rec)}`);
  head = rec.hash;
  const cp = checkpointAt(seq(rec));
  if (cp) {
    assert(verifyEd25519(CHECKPOINT_PUBKEY, cp.payload, cp.sig), 'bad checkpoint signature');
    assert(JSON.parse(cp.payload).head === head, `checkpoint head mismatch at ${seq(rec)}`);
    assert(anchorHas(cp), `checkpoint not present at external anchor`);
  }
}
```

## 7. Apply it to our platform

- Every normalized event **and** every operational action (config change, credential fetch, replay, `403`) goes into the hash-chained, WORM-stored audit log — not just "interesting" ones.
- Checkpoint key lives in **OCI Vault** and is usable only by a dedicated checkpoint role; the ingestion service can `sign` but not `export`.
- Anchor checkpoints to a **second OCI tenancy in a different compartment/region** with an IAM policy that lets our service only `append`, plus a daily hash summary posted to a monitored ops channel as a low-tech backstop.
- Run the **verifier as an independent read-only workload** (different SA, different node pool) so compromising the ingestion service doesn't compromise verification.
- Correlate "ingestion says it pulled N events from reader R" against **VCN flow logs** and **mesh access logs**; disagreement → integrity incident.
- Treat **any** chain break, checkpoint mismatch, missing anchor, or silent source as SEV-2 minimum.

## 8. Practice

- Implement the append + verifier above against local Object Storage; then manually edit a record and confirm the verifier localizes the break.
- Add a signed checkpoint and prove that re-chaining after an edit still fails checkpoint verification.
- Take three attacker actions in a lab (disable a log source, backdate a record, emit a fake "success" line) and write a detection for each.
- Do a **[TryHackMe SOC / detection-engineering path](https://tryhackme.com/)** room and map the alerts to ATT&CK.

## 9. Courses and resources

- **[Schneier & Kelsey — "Secure Audit Logs to Support Computer Forensics"](https://www.schneier.com/academic/paperfiles/paper-auditlogs.pdf)** — the foundational paper.
- **[Crosby & Wallach — "Efficient Data Structures for Tamper-Evident Logging" (USENIX)](https://static.usenix.org/event/sec09/tech/full_papers/crosby.pdf)**.
- **[Certificate Transparency](https://certificate.transparency.dev/howctworks/)** — a production Merkle-log system to study.
- **[MITRE ATT&CK](https://attack.mitre.org/)** and **[MITRE D3FEND](https://d3fend.mitre.org/)**.
- **[Hugging Face — "Anatomy of a Frontier Lab Agent Intrusion: A Technical Timeline"](https://huggingface.co/blog/agent-intrusion-technical-timeline)** and **[METR's investigation](https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/)**.
- **[LinkedIn Learning — "Security Information and Event Management (SIEM)" / "Detection Engineering"](https://www.linkedin.com/learning/topics/security-3)**; **[CompTIA CySA+ path](https://www.linkedin.com/learning/topics/comptia)**.

## 10. Key takeaways

- Assume a capable attacker can write where your logs live — make tampering *detectable* (hash chain + signed checkpoints) and keep an *independent* copy (external anchor).
- Alert on **absence and disagreement**, not just on bad events: missing checkpoints, sequence gaps, silent sources, and independent systems that don't corroborate each other.
- Correlate every critical action across ≥2 systems with different owners — this is what made the Hugging Face forensic reconstruction possible despite forged transcripts.
- Run verification as a separate, read-only, least-privileged workload, and keep critical detections under human review.
