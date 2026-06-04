# Wisdom — Phase 3: Extract

## Overview

Phase 3 runs Claude agents over the processed `.md` files from Phase 2, extracts actionable technical knowledge, maps each finding to the appropriate page in `docs/Reference/`, and drafts the exact prose to insert. The output is a human-readable staging file for review — no automatic commits or edits to the documentation.

This phase is implemented as a **Workflow script** (`extract/workflow.mjs`) invoked through Claude Code's Workflow tool. It relies on agent orchestration infrastructure rather than being a standalone Node.js program. The schemas it uses (`extract/schemas.mjs`) are plain ES modules importable from Node.js as well, for any future standalone adaptation.

## Goals

- Read each thread `.md` and identify actionable technical findings: gotchas, workarounds, non-obvious behaviors, usage patterns, corrected misconceptions.
- Classify each finding by package and, where specific, by class, method, or property.
- Map each finding to the most appropriate page in `docs/Reference/`.
- Draft the exact Markdown prose to insert (a `> [!NOTE]` callout, a new example, a See Also entry, or a remarks paragraph).
- Produce a structured staging file for human review.
- Default to **incremental** operation: re-running after `export` + `process` only re-analyses threads whose Discord-side content has actually changed.
- Be **idempotent**: merging new findings into `staging.md` preserves pending review work, replaces stale findings whose source thread has grown, and does not duplicate findings the reviewer has already integrated into the docs.

## Non-goals

- Fetching from Discord — Phase 1.
- Converting JSON to Markdown — Phase 2.
- Automatic commits or edits to `docs/` without human review.
- Findings that duplicate content already on the target page.

---

## Workflow design

```
data/threads/                Phase 2 output (frontmatter carries last_message_id + message_count)
data/findings/
  extract-state.json           (watermark + emission log; advanced on successful merge)
  package-summary.txt          (read by Extract agents)
  page-index.json              (read by Draft agents)
      ↓
[prep: filter threads against extract-state.json; only changed threads survive]
      ↓
args: { threads, thread_sizes, config }    ~19 KB per batch (JSON string)
      ↓
[group: pack threads into groups by byte budget (~25 KB target); threads >15 KB solo]
      ↓
[pipeline: one Extract agent per group]
  reads: thread .md file(s) + package-summary.txt
  returns: findings with thread_path provenance
      ↓
raw findings (FINDING objects, or null for irrelevant threads)
      ↓
[pipeline: one Draft agent per group with findings]
  reads: page-index.json + target doc pages
  returns: additions with thread_path provenance
      ↓
doc additions (DOC_ADDITION objects)
      ↓
[merge: graft into data/findings/staging.md; replace matching sections in place;
        emit [REFINED?] markers for additions whose prior version was reviewed;
        update extract-state.json]
      ↓
data/findings/staging.md    Long-lived human-review file
```

The entire flow uses `pipeline()` — each group progresses from extraction to drafting independently, without waiting for other groups to complete. There is no cross-thread deduplication barrier; instead, the staging file groups additions by target page, and findings that appear in multiple threads are flagged with `[DUPLICATE?]` markers for human review. This trades some redundancy in the staging output for significantly faster wall-clock time.

The Workflow `args` contains thread file paths, per-thread file sizes, and config — about 19 KB per batch. All bulk reference data (package summary, page index) lives in standalone files that agents read from disk. This keeps the invoking session's output cost negligible regardless of sitemap size.

### Byte-budget grouping

The median Discord thread is ~1.4 KB. Giving each one its own agent call wastes most of the overhead on the system prompt, tool schemas, and the package-summary read (9 KB, identical every time). The prep step emits `thread_sizes` — a parallel array of file sizes in bytes. The workflow packs threads into groups whose cumulative size approaches `TARGET_GROUP_BYTES` (25 KB); threads above `MAX_SOLO_SIZE` (15 KB) run solo. Each finding carries a `thread_path` field so provenance is preserved through both pipeline stages.

Typical impact: 200 threads collapse to ~17 groups × 2 stages ≈ ~34 agents per batch (~3.5× fewer than the previous fixed-count grouping). Without `thread_sizes` (e.g. from older prep output), each thread is assumed to be 3 KB for grouping purposes.

### Args serialisation

The Workflow tool delivers `args` as a JSON string, not a parsed object. The script handles this with `JSON.parse(args)` on entry.

### Model and StructuredOutput compliance

Both agent calls use `model: 'sonnet'`. Opus is reliable but ~15× more expensive per call; the volume (~340 agent calls across 10 batches of 200 threads) makes that impractical.

Sonnet requires explicit reminders in the prompt to call the `StructuredOutput` tool. Without them, ~50% of agents respond with plain text instead of using the tool, causing the pipeline item to fail. Both prompts end with an `IMPORTANT:` block instructing the agent to call StructuredOutput with the correct schema shape.

---

## Schemas

Schemas are inlined in `workflow.mjs` (workflow scripts cannot import modules). The canonical shapes:

```js
EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thread_path:    { type: 'string' },
          // Exact file path of the source thread (verbatim from the agent's input list).
          package:        { type: 'string' },
          // e.g. "WebView2", "VBA", "CEF", "VB", "WinNativeCommonCtls"
          symbol:         { type: ['string', 'null'] },
          // Qualified name, e.g. "WebView2.Navigate", "Strings.Split". null = package-level.
          kind:           { enum: ['gotcha', 'workaround', 'example', 'clarification', 'deprecation'] },
          summary:        { type: 'string' },
          detail:         { type: 'string' },
          confidence:     { enum: ['high', 'medium', 'low'] },
          date_earliest:  { type: 'string' },
          date_latest:    { type: 'string' },
        },
        required: ['thread_path', 'package', 'kind', 'summary', 'detail', 'confidence',
                   'date_earliest', 'date_latest'],
      },
    },
  },
  required: ['findings'],
}

ADDITION_SCHEMA = {
  type: 'object',
  properties: {
    additions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thread_path:    { type: 'string' },
          // Carried from the finding; the result assembly extracts the thread ID from this.
          target_page:    { type: 'string' },
          // Repo-relative path, e.g. "docs/Reference/WebView2/WebView2/index.md"
          // Set to "UNMAPPED" when no existing page fits.
          section:        { enum: ['after-remarks', 'example', 'see-also', 'new-section'] },
          draft:          { type: 'string' },
          confidence:     { enum: ['high', 'medium', 'low'] },
          date_earliest:  { type: 'string' },
          date_latest:    { type: 'string' },
          reviewer_note:  { type: ['string', 'null'] },
        },
        required: ['thread_path', 'target_page', 'section', 'draft', 'confidence',
                   'date_earliest', 'date_latest'],
      },
    },
  },
  required: ['additions'],
}
```

`thread_path` is the provenance key: it flows from extraction through drafting into the result assembly, where the thread ID is extracted from the filename (`THREAD_ID--slug.md`). This replaced the original design's `source_thread` (which relied on pipeline index for provenance) when thread grouping was introduced — multiple threads per agent call means the pipeline index no longer maps 1:1 to a thread.

---

## Agent prompts

### Per-thread extraction agent

The agent reads two files from disk:
1. The thread `.md` file (path received from the pipeline). YAML frontmatter provides thread metadata (thread_id, channel, message_count, has_answer, tags); the body is the rendered conversation.
2. `wisdom/data/findings/package-summary.txt` — lists every documented package and its public symbols.

Instructions:
- Return `null` if the thread is off-topic, purely social, unanswered, or contains no actionable technical content.
- Extract one `FINDING` object per distinct technical point — do not bundle unrelated points into one finding.
- Set `confidence: high` only when a twinBASIC maintainer confirms the behavior, or when at least two independent users agree.
- Set `confidence: low` for untested suggestions or anything hedged with "I think" / "maybe".
- Set `symbol` to the most specific qualified name possible. Use `null` only for genuinely package-level findings.
- `detail` must be self-contained prose — the reader has no access to the original thread.
- Do not extract findings that describe already-documented behavior.
- Prefer findings that are *surprising* or *not obvious* from the API surface.

Very long threads (500+ messages) are passed to the agent in full — current models handle the context window comfortably. No chunking or truncation is applied.

### Per-thread drafting agent

The agent receives findings (from the extraction stage) as JSON in its prompt, then reads from disk:
1. `wisdom/data/findings/page-index.json` — a compact `{ "Package/Title": "docs/..." }` lookup for resolving findings to documentation pages.
2. Each resolved target documentation page — to understand current content and formatting.

Page resolution follows a fallback chain: try `Package/Symbol`, then `Package/ClassName` (for dotted symbols like `WebView2.Navigate`), then `Package/<Package> Package` for the package index. If none match, the agent sets `target_page` to `"UNMAPPED"`.

Instructions:
- Produce one `DOC_ADDITION` object per logical insertion point.
- `draft` must conform to the site's Markdown conventions: `> [!NOTE]` for non-obvious behavioral clarifications, ` ```tb ` for code blocks, `--` not `—` for dashes.
- Do not reproduce the entire finding verbatim — write in the site's voice (plain English, third-person, active).
- If the finding maps to an example, produce a full code block with a one-line lead-in.
- For See Also additions, produce a `- [Symbol](relative-url) -- short description` line.
- Set `reviewer_note` when the draft requires verification against the `.twin` source or when it conflicts with anything currently on the page.
- When no existing page fits, set `target_page` to `"UNMAPPED"` — do not skip the finding. Include the package and symbol in `reviewer_note` so the reviewer can triage placement (create a new page, attach to a package index, etc.).

---

## Quality signals used by agents

From the frontmatter produced by Phase 2:

| Signal | How used |
|--------|----------|
| `has_answer: true` | Increases confidence baseline for all findings in the thread |
| `starter_reactions` count | High reactions on the starter → the problem is common; worth documenting |
| `top_reactions` aggregate | High aggregate → thread content is broadly endorsed |
| `tags` includes "Bug" or "How-to" | Helps classify finding `kind` |
| `message_count` | Very short threads (≤ 3 messages) with no answer tag are treated with low confidence |

---

## Staging output

`data/findings/staging.md` is a human-readable review file.

### Unmapped findings

Not every finding maps to an existing documentation page. Cross-cutting gotchas, migration tips, IDE behavior, and general patterns may have no natural home in the current reference tree. These findings are drafted anyway and collected at the top of the staging file under an **Unmapped Findings** heading, tagged with their package and symbol for triage. The reviewer decides what to do with each: create a new page, attach to a package index, fold into an existing page the agent missed, or discard.

```markdown
# Unmapped Findings

## UNMAPPED · after-remarks

> [!NOTE]
> COM threading in twinBASIC defaults to STA. Long-running COM calls on the
> UI thread block message processing — move them to a background thread.

_Source threads: 1357924680135792468 · confidence: medium_
_Date range: 2024-03-12 to 2024-03-14_
_Reviewer note: Package: Core. Consider a new "Threading" guide page under docs/Reference/Core/._

---
```

### Mapped additions

Each proposed addition to an existing page renders as:

```markdown
## docs/Reference/WebView2/WebView2/index.md · after-remarks

> [!NOTE]
> Calling `Navigate` before the `EnvironmentReady` event fires silently drops the
> navigation request. Wait for `EnvironmentReady` before calling any navigation method.

_Source threads: 1234567890123456789 · confidence: high_
_Date range: 2024-06-01 to 2024-06-03_
_Reviewer note: verify with WebView2 .twin source that no queuing occurs internally._

---
```

When multiple threads produce findings for the same target page and section, the staging file groups them together and marks potential duplicates:

```markdown
## docs/Reference/WebView2/WebView2/index.md · after-remarks [DUPLICATE? — see also thread 9876543210987654321]
```

The `[DUPLICATE?]` marker is a hint for the reviewer, not a guarantee — two threads may describe the same behavior from different angles, and the reviewer decides which draft to keep, merge, or discard.

### Merge semantics

`staging.md` is a long-lived review file. The merge step **does not overwrite** it on each run; it grafts new findings into place and replaces stale ones, preserving manual review state.

**Match key.** For each new addition produced by the workflow, the merger computes `(target_page, section, sorted(finding_ids))` and looks for a section in `staging.md` with the same key.

- **Match found, replace in place.** The existing section's body and reviewer-note metadata are replaced with the new draft; the section's position in its per-page group is preserved.
- **No match, insert.** A new section is added at the end of the target page's contiguous group (creating the group if the page is new to the staging file).
- **No match, but previously emitted.** If `extract-state.json` records that an addition with this key was emitted in a prior run but the corresponding section is no longer present in `staging.md` (presumably reviewed and integrated, or rejected), the new addition is appended with a `[REFINED?]` marker. The reviewer decides whether the docs page needs the updated content.

**Reviewer escape hatch.** To prevent auto-replacement of a section mid-edit, the reviewer modifies its header — e.g., appending `[LOCKED]` or hand-editing the `finding_ids` list. The matcher then fails, the new finding inserts as a sibling, and the reviewer reconciles by hand.

**Atomic writes.** The merger writes to a temp file in the same directory and renames it over `staging.md` so an interrupted run cannot leave the file in a half-written state. The previous `staging.md` is retained as `staging.md.bak` for one generation.

**Per-run additions.** The per-batch `extract-results-{i}.json` files are preserved post-merge for diffing and post-hoc inspection.

Example of a `[REFINED?]` section:

```markdown
## docs/Reference/VB/Form/index.md · after-remarks [REFINED? -- previously processed; please diff against current docs page]

> [!NOTE]
> ...updated draft body...

_Source threads: 1512037273149898783 · confidence: high_
_Date range: 2026-06-04 to 2026-06-12_
_Reviewer note: This thread has gained new messages since the original finding was processed. Compare against the existing content on docs/Reference/VB/Form/index.md._

---
```

---

## Incremental extraction

The default behavior of `extract` is **incremental**: only threads whose Discord-side content has changed since the last successful merge are re-analysed. Combined with `export` and `process` (both already incremental — see PLAN-1 and PLAN-2), a routine update is just three commands with no flags:

```
node wisdom/wisdom.mjs export    # pulls new messages since the manifest watermark
node wisdom/wisdom.mjs process   # rewrites .md files whose raw input changed
node wisdom/wisdom.mjs extract   # extracts from changed threads, grafts into staging.md
```

New findings merge into the existing `staging.md` without disturbing pending review work; refined versions of previously-emitted findings replace their predecessors in place per the [merge semantics](#merge-semantics) above.

### State file

`data/findings/extract-state.json` (gitignored) holds the per-thread watermark and the emission log:

```json
{
  "version": 1,
  "lastRun": "2026-06-04T15:35:00Z",
  "processedThreads": {
    "1512037273149898783": {
      "last_message_id": "1512037273149898783",
      "message_count": 4,
      "emitted": [
        { "target_page": "docs/Reference/VB/Form/index.md", "section": "after-remarks" }
      ]
    }
  }
}
```

- `last_message_id` and `message_count` are read from each thread's frontmatter (emitted by Phase 2) and compared against the file's current values. A thread is **included** for re-extraction iff either field differs from the stored value, or the thread isn't in `processedThreads` at all.
- `emitted` records the `(target_page, section)` pairs this thread has previously contributed to `staging.md`. The merge step uses this to detect "previously-emitted finding that's no longer in `staging.md`" and emit the `[REFINED?]` marker described above.
- State is updated only on **successful merge**. A workflow failure mid-pipeline leaves state untouched, so the next run retries the same threads.

### Why `last_message_id`, not filesystem mtime

Snowflakes are monotonic, encode a timestamp, and do not change under operations that touch the filesystem without changing the underlying content — `git checkout`, `git stash`, cross-platform clones, Dropbox/OneDrive sync, line-ending conversion, manual file copies. The frontmatter values are stable across all of those; mtimes are not.

`last_message_id` alone catches additions (the snowflake advances). Pairing it with `message_count` catches deletions of the most recent message (where the snowflake regresses) and ordinary intra-thread deletions (where the count drops). Edits to non-last messages still slip through this check — an unavoidable tradeoff of watermark-vs-hash comparison; `--force` is the diagnostic escape.

### Diagnostic flags

| Form | Filter | State touched | Output |
|------|--------|---------------|--------|
| `extract` | watermark-driven (changed threads only) | yes, on merge | grafts into `staging.md` |
| `extract --since 2026-06-04` | by thread `created` date | no | sideband `staging-since-2026-06-04.md`, no merge |
| `extract --all` | all threads | yes, on merge | grafts into `staging.md` (refines existing; inserts new) |
| `extract --force` | watermark-driven plus the named channel(s) — pair with `--channel` | yes, on merge | grafts into `staging.md` |
| `extract --dry-run` | normal filter | no | prep file written, workflow not invoked |

`--since`, `--all`, and `--force` are mutually exclusive as primary modes (combining them is a CLI error). `--since` is the diagnostic peek tool — it writes a sideband file so the reviewer can inspect what would change without disturbing the canonical staging file.

---

## Data layout: shared files vs. batch files

The prep step writes two kinds of output: **shared reference files** that every workflow batch reads, and **per-batch files** that contain only the thread list for that batch.

### Shared files (written once)

- `package-summary.txt` — one-per-line package/symbol summary (~10 KB). Read by every Extract agent.
- `page-index.json` — pretty-printed `{ "Package/Title": "docs/Reference/.../file.md" }` lookup (~95 KB, ~1400 entries). Read by every Draft agent for page resolution. Pretty-printed so agents can scan entries line-by-line rather than parsing a single long line.

These files exist so that batch files stay small enough to pass as Workflow `args` without consuming excessive output tokens. Agents read them directly from disk.

### Batch files

- `extract-prep.json` — single-batch mode (≤200 threads): `{ threads: [path, ...], thread_sizes: [bytes, ...], config }`.
- `extract-batch-{i}.json` — multi-batch mode: same shape, one per batch.

Each batch file is ~19 KB (file paths, sizes, and config). The invoking session reads it and passes the parsed JSON as Workflow `args`. `thread_sizes` is a parallel array used by the workflow's grouping logic; see "Byte-budget grouping" above.

### Batch partitioning

When the thread count exceeds 200, the prep step partitions the work into multiple batches. Each batch contains up to 200 threads. With byte-budget grouping, 200 threads collapse to ~17 groups × 2 stages ≈ ~34 agents per batch, well under the 1000-agent workflow cap. Threads are sorted by channel then creation date before partitioning.

The invoking Claude session loops over batches sequentially, writing `extract-results-{i}.json` after each workflow completes. Batches whose result file already exists are skipped (resumability). After all batches complete, `node wisdom/wisdom.mjs extract --merge` reads the result files, grafts them into `staging.md` per the [merge semantics](#merge-semantics) above, and advances the watermark in `extract-state.json`.

Cross-batch grouping and duplicate detection are part of the merge step — additions from different batches that target the same `(target_page, section)` but carry different `finding_ids` are grouped together in their per-page group and flagged with `[DUPLICATE?]` markers. Additions that share a full match key (same `target_page`, same `section`, same `finding_ids`) collapse into a single replace operation regardless of which batch they came from.

---

## CLI

```
node wisdom/wisdom.mjs extract [options]

  --threads <dir>      Input directory of processed .md files  [default: wisdom/data/threads]
  --out <dir>          Output directory for findings  [default: wisdom/data/findings]
  --channel <name>     Restrict to threads from this channel name (repeatable)
  --min-confidence <l> Skip findings below this level: high | medium | low  [default: low]
  --since <date>       Diagnostic: filter by thread `created` date; do not touch state; write a sideband file instead of grafting
  --all                Bootstrap / re-baseline: process all threads, update state on merge
  --force              Re-process threads even if their watermark matches state (pair with --channel to scope)
  --dry-run            Write the prep file but do not invoke the workflow; state is not touched
  --merge              Graft extract-results-*.json into staging.md and advance state (no agents — pure Node.js)
```

The default mode (no `--since` / `--all` / `--force`) is **incremental**: the prep step filters threads against `extract-state.json` and only batches up those whose `last_message_id` or `message_count` has changed.

`--since`, `--all`, and `--force` are mutually exclusive primary modes (combining them is a CLI error).

`extract` spawns Claude agents via the Workflow tool and must be invoked from within a Claude Code session. `--merge` is the exception — it runs without agents, grafting batch results into the staging file and updating the state file. Standalone execution via the Anthropic SDK directly is a future option — Phase 3 implements the Workflow path first.

---

## File layout (Phase 3 additions)

```
wisdom/
  PLAN-3.md
  extract/
    workflow.mjs    Workflow script (agent orchestration via Claude Code's Workflow tool)
    merger.mjs      parses staging.md, graft-merges DOC_ADDITIONs in place, atomic write
    state.mjs       reads / writes data/findings/extract-state.json (watermark + emission log)
    sitemap.mjs     globs docs/Reference/**/*.md, parses YAML frontmatter (title, permalink, parent) with a minimal built-in parser — no dependency on builder/
    prep.mjs        CLI handler: applies state filter, scans threads, writes shared + batch files
  data/
    findings/       gitignored
      extract-state.json        watermark + emission log; advanced on successful merge
      package-summary.txt       shared — package/symbol list for Extract agents
      page-index.json           shared — Package/Title → path lookup for Draft agents
      staging.md                long-lived review file (grafted, not overwritten)
      staging.md.bak            previous staging.md, one generation back
      staging-since-{date}.md   diagnostic sideband (from `--since`); never grafted
      extract-prep.json         single-batch prep (<=200 threads)
      extract-manifest.json     multi-batch manifest (>200 threads)
      extract-batch-{i}.json    per-batch thread paths + sizes + config
      extract-results-{i}.json  per-batch workflow results (preserved post-merge)
```
