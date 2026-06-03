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

## Non-goals

- Fetching from Discord — Phase 1.
- Converting JSON to Markdown — Phase 2.
- Automatic commits or edits to `docs/` without human review.
- Findings that duplicate content already on the target page.

---

## Workflow design

```
data/threads/               Phase 2 output
      ↓
[Fan-out: one agent per thread]
      ↓
raw findings (FINDING objects, or null for irrelevant threads)
      ↓
[Per-thread: one drafting agent per finding group]
      ↓
doc additions (DOC_ADDITION objects)
      ↓
data/findings/staging.md    Human-review staging file (with duplicate markers)
```

The entire flow uses `pipeline()` — each thread progresses from extraction to drafting independently, without waiting for other threads to complete. There is no cross-thread deduplication barrier; instead, the staging file groups additions by target page, and findings that appear in multiple threads are flagged with `[DUPLICATE?]` markers for human review. This trades some redundancy in the staging output for significantly faster wall-clock time.

---

## Schemas

```js
// extract/schemas.mjs

export const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    package:        { type: 'string' },
    // e.g. "WebView2", "VBA", "CEF", "VB", "WinNativeCommonCtls"
    symbol:         { type: ['string', 'null'] },
    // Qualified name, e.g. "WebView2.Navigate", "Strings.Split". null = package-level.
    kind: {
      enum: ['gotcha', 'workaround', 'example', 'clarification', 'deprecation']
    },
    summary:        { type: 'string' },
    // One sentence. Written in plain English; can be used as a NOTE callout heading.
    detail:         { type: 'string' },
    // Expanded prose. May include a fenced code block using ```tb.
    confidence:     { enum: ['high', 'medium', 'low'] },
    // high   = confirmed by multiple users or by a twinBASIC maintainer
    // medium = one clear, plausible explanation from a knowledgeable user
    // low    = single user, untested suggestion, or hedged claim
    source_thread:  { type: 'string' },
    // Thread ID for traceability back to the original Discord conversation.
    date_earliest:  { type: 'string' },
    // YYYY-MM-DD of the earliest message informing this finding.
    date_latest:    { type: 'string' },
    // YYYY-MM-DD of the latest message informing this finding.
  },
  required: ['package', 'kind', 'summary', 'confidence', 'source_thread',
             'date_earliest', 'date_latest'],
}

export const DOC_ADDITION_SCHEMA = {
  type: 'object',
  properties: {
    target_page:    { type: 'string' },
    // Repo-relative path, e.g. "docs/Reference/WebView2/WebView2/index.md"
    // Set to "UNMAPPED" when no existing page fits.
    section:        { type: 'string' },
    // Where to insert: "after-remarks" | "example" | "see-also" | "new-section"
    draft:          { type: 'string' },
    // The Markdown prose to insert, ready to copy into the target file.
    finding_ids:    { type: 'array', items: { type: 'string' } },
    // Source thread IDs that contributed to this addition.
    date_earliest:  { type: 'string' },
    // YYYY-MM-DD — earliest across all contributing findings.
    date_latest:    { type: 'string' },
    // YYYY-MM-DD — latest across all contributing findings.
    reviewer_note:  { type: ['string', 'null'] },
    // Optional guidance for the human reviewer, e.g. "verify against the .twin source".
  },
  required: ['target_page', 'section', 'draft', 'finding_ids',
             'date_earliest', 'date_latest'],
}
```

---

## Agent prompts

### Per-thread extraction agent

The agent receives the full thread `.md` (frontmatter + body) and the documentation site map (a list of packages and their public symbols).

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

The agent receives the findings extracted from a single thread, the current content of each target documentation page, and the site's formatting conventions (from WIP.md's page template section).

Instructions:
- Produce one `DOC_ADDITION` object per logical insertion point.
- `draft` must conform to the site's Markdown conventions: `> [!NOTE]` for non-obvious behavioral clarifications, ` ```tb ` for code blocks, `--` not `—` for dashes.
- Do not reproduce the entire finding verbatim — write in the site's voice (plain English, third-person, active).
- If the finding maps to an example, produce a full code block with a one-line lead-in.
- For See Also additions, produce a `- [Symbol](relative-url) -- short description` line.
- Set `reviewer_note` when the draft requires verification against the `.twin` source or when it conflicts with anything currently on the page.
- When a finding has no `resolved_page` and no existing page fits, set `target_page` to `"UNMAPPED"` — do not skip the finding. Include the package and symbol in `reviewer_note` so the reviewer can triage placement (create a new page, attach to a package index, etc.).

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

The file is overwritten on each full run. Individual run outputs (the raw `FINDING` arrays) are preserved as `data/findings/{run-timestamp}.json` for diffing across runs.

---

## Incremental runs

Passing `--since <date>` limits the thread scan to threads newer than the given date. This is the normal mode for keeping findings current after a fresh `export` + `process` pass — no need to re-analyse threads already reviewed.

---

## CLI

```
node wisdom/wisdom.mjs extract [options]

  --threads <dir>   Input directory of processed .md files  [default: wisdom/data/threads]
  --out <dir>       Output directory for findings  [default: wisdom/data/findings]
  --since <date>    Only analyse threads created after this date (ISO 8601)
  --channel <name>  Restrict to threads from this channel name (repeatable)
  --min-confidence  Skip findings below this level: high | medium | low  [default: low]
  --dry-run         Run extraction agents but do not write staging.md (still invokes Claude agents and incurs API costs — useful for testing prompts, not a free preview)
```

This command spawns Claude agents via the Workflow tool and must be invoked from within a Claude Code session. Standalone execution via the Anthropic SDK directly is a future option — Phase 3 implements the Workflow path first.

---

## File layout (Phase 3 additions)

```
wisdom/
  PLAN-3.md
  extract/
    workflow.mjs    Workflow script (agent orchestration via Claude Code's Workflow tool)
    schemas.mjs     FINDING_SCHEMA and DOC_ADDITION_SCHEMA (plain ES module, no agent dep)
    staging.mjs     renders data/findings/staging.md from a DOC_ADDITION array
    sitemap.mjs     globs docs/Reference/**/*.md, parses YAML frontmatter (title, permalink, parent) with a minimal built-in parser — no dependency on builder/
  data/
    findings/       gitignored
      staging.md
      {timestamp}.json
```
