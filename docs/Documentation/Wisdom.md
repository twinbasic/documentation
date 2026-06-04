---
title: Wisdom
parent: Documentation Development
nav_order: 7
permalink: /Documentation/Development/Wisdom
---

# Wisdom --- Discord Knowledge Harvester
{: .no_toc }

Three-phase tool that extracts technical knowledge from the twinBASIC Discord server and drafts documentation additions for human review. Source under [`wisdom/`](https://github.com/twinbasic/documentation/tree/main/wisdom).

**Phase 1 --- Export:** fetch Discord messages to `data/raw/`.
**Phase 2 --- Process:** convert raw JSON to structured Markdown in `data/threads/`.
**Phase 3 --- Extract:** run Claude agents over the threads, draft documentation additions, produce a staging file for review.

* TOC goes here
{:toc}

## Prerequisites

- **Node.js 18+** (uses native `fetch` and ES modules).
- **No external dependencies** --- the tool uses only Node.js built-in APIs. No `npm install` needed.
- **Discord token** --- for Phases 1 and 2.
- **Claude Code session** --- for Phase 3 (the extract workflow runs Claude agents).

## Setup

### Discord token

Create a `wisdom/.token` file with your Discord token on one line:

```
xMTEz...your-token-here
```

Lines starting with `#` are ignored. Alternatively, set the `DISCORD_TOKEN` environment variable.

The tool auto-detects whether the token is a bot token or a user token and applies the appropriate rate limits (bot: 5 req/s, 200/session; user: 2 req/s, 100/session).

### Configuration

`wisdom/config.jsonc` controls which channels to include, concurrency, and rate limits. The defaults target the twinBASIC Discord server. Override per-run via CLI flags:

- `--guild <id>` overrides `guild_id` (or set `DISCORD_GUILD_ID`).
- `--concurrency <n>`, `--rate-limit <n>`, `--cap <n>` override the limits block.

## Typical run

The default flow is **incremental**: each phase tracks its own watermark so only content that has changed since the last successful run is processed.

```
node wisdom/wisdom.mjs export
node wisdom/wisdom.mjs process
node wisdom/wisdom.mjs extract
```

Then tell Claude: "Run the wisdom extract workflow." Claude invokes the workflow, writes the results, and runs the merge step, which grafts additions into `staging.md` and advances the watermark in `extract-state.json`.

If the workflow completes but the merge step was not run (e.g. the session was interrupted), merge manually --- no agents run and no API costs are incurred:

```
node wisdom/wisdom.mjs extract --merge
```

**First run (no watermark yet):** when `extract-state.json` does not exist, the incremental filter has no baseline and treats every thread as new. For a large corpus this produces thousands of agent calls. Use `--since` to scope the first run to a manageable date range, or bootstrap the state file by running the extract workflow once with `--all` and then merging.

**Date-scoped run** (bypass the watermark, filter by thread creation date instead):

```
node wisdom/wisdom.mjs export --since 2025-06-01
node wisdom/wisdom.mjs process --since 2025-06-01
node wisdom/wisdom.mjs extract --since 2025-06-01
```

The `--since` mode writes to a sideband file (`staging-since-<date>.md`) and does not touch the canonical `staging.md` or the watermark.

The extract step automatically partitions large thread sets into batches of 200, so filtering is optional --- but `--since` and `--channel` reduce the number of threads analysed (and therefore agent invocations and API costs).

## Reviewing staging.md

`staging.md` is the long-lived review file. Each `## ` section is one proposed documentation addition, with structured metadata at the bottom (source thread IDs, confidence level, date range, optional reviewer note). Sections are grouped by target page and delimited by `---` lines.

**Removing sections.** Delete any section that is not useful --- the removal is stable. If the source thread is unchanged on the next run, the watermark filter skips it entirely and the section stays gone. If the thread later receives new messages, the thread re-enters the pipeline and the agent may produce a fresh finding that accounts for the new context; it reappears with a `[REFINED?]` marker so the reviewer knows it is a revision of something already triaged.

**Locking sections.** Append `[LOCKED]` to any section heading (e.g. `## docs/Reference/VB/Form/index.md · after-remarks [LOCKED]`) to freeze it. The merger skips locked sections on every future run, even if a new extraction produces a matching key.

**Markers.** The merger may tag section headings with bracketed markers:

- `[DUPLICATE?]` --- multiple threads produced overlapping findings for the same page and section.
- `[REFINED?]` --- this finding was previously emitted and removed from staging (presumably reviewed and integrated); the source thread has since changed and the agent produced a new version.
- `[LOCKED]` --- reviewer-applied; the merger will not touch this section.

## CLI reference

All commands run from the repository root via `node wisdom/wisdom.mjs <command> [options]`.

### Phase 1 --- Export

Fetches messages from Discord channels and forum threads.

```
node wisdom/wisdom.mjs export
```

Outputs raw JSON under `wisdom/data/raw/`. Supports incremental runs --- a manifest tracks the highest message ID per channel, so re-running fetches only new messages. Use `--force` to re-fetch everything.

| Flag | Effect |
|------|--------|
| `--since <date>` | Only fetch messages after this ISO 8601 date |
| `--channel <id>` | Restrict to one channel (repeatable) |
| `--dry-run` | Discover channels/threads; do not fetch messages |
| `--force` | Ignore manifest; re-fetch all history |

When the session request cap is reached, the tool exits with code 2 --- re-run to continue where it left off.

### Phase 2 --- Process

Converts raw JSON into structured Markdown with YAML frontmatter.

```
node wisdom/wisdom.mjs process
```

Outputs one `.md` file per forum thread under `wisdom/data/threads/<channel-name>/`, plus one per text channel. Each file has frontmatter (thread ID, channel, tags, reaction counts, `has_answer` flag) and a rendered message body with timestamps and author names.

| Flag | Effect |
|------|--------|
| `--since <date>` | Only process threads created after this date |
| `--channel <id>` | Restrict to threads from this channel ID (repeatable) |
| `--force` | Regenerate all files (skip modification-time check) |

### Phase 3 --- Extract

Two steps: a CLI prep step, then a Claude Code workflow.

#### Prepare

```
node wisdom/wisdom.mjs extract
```

Scans the processed thread files and the `docs/Reference/` directory, builds a sitemap of all documented symbols, and writes prep data to `wisdom/data/findings/`. No Claude agents run yet.

- **200 threads or fewer:** writes a single `extract-prep.json`.
- **More than 200 threads:** partitions into batch files (`extract-batch-0.json`, `extract-batch-1.json`, ...) and writes an `extract-manifest.json` describing the batches.

The prep step also writes two shared reference files that workflow agents read from disk: `package-summary.txt` (the documented-symbols list) and `page-index.json` (a compact lookup from package/symbol to documentation file path).

| Flag | Effect |
|------|--------|
| `--since <date>` | Only analyse threads created after this date |
| `--channel <name>` | Restrict to threads from this channel **name** (repeatable) |
| `--min-confidence <level>` | Skip findings below `high`, `medium`, or `low` (default: `low`) |
| `--all` | Bootstrap: process all threads, ignoring state and channel filter |
| `--force` | Re-process threads even if their watermark matches state |
| `--dry-run` | Write the prep file but do not invoke the workflow |
| `--merge` | Graft extract-results-\*.json into staging.md and advance state (no agents) |

#### Run the extraction workflow

After the prep step finishes, tell Claude (in the same session or a new one):

> Run the wisdom extract workflow.

Claude detects whether a manifest or a single prep file was produced and handles either case:

- **Single batch:** reads the prep file, invokes the workflow, writes the result file, runs the merge.
- **Multi-batch:** reads the manifest, runs one workflow per batch, saves each result to `extract-results-{i}.json`, then merges all results into `staging.md`. If interrupted, re-running picks up from the last incomplete batch.

## Implementation

### File layout

```
wisdom/
  wisdom.mjs              Entry point --- CLI parser, runExport(), dispatch
  config.mjs              Load config.jsonc, apply CLI overrides
  config.jsonc             Server/channel/rate-limit configuration

  discord/                 Phase 1 --- Discord API layer
    api.mjs                HTTP client, auth, rate-limiter, snowflake utilities
    discover.mjs           Channel + thread discovery, member fetch
    messages.mjs           Paginated message fetch, manifest (watermark) I/O

  process/                 Phase 2 --- raw JSON to structured Markdown
    thread.mjs             Orchestrator: iterate raw files, apply filters, write .md
    filter.mjs             Keep only user-content message types (default + reply)
    frontmatter.mjs        Build YAML frontmatter from thread/channel metadata
    render.mjs             Render messages to Markdown (timestamps, replies, reactions)
    slugify.mjs            Thread-name-to-filename slug

  extract/                 Phase 3 --- Claude-agent knowledge extraction
    prep.mjs               runExtract() (prep + batch partitioning) and runMerge()
    state.mjs              extract-state.json I/O, watermark comparison, emission log
    sitemap.mjs            Walk docs/Reference/, build package-summary + page-index
    merger.mjs             Parse/merge/serialise staging.md
    schemas.mjs            JSON Schema definitions for findings and additions
    workflow.mjs            Claude Code Workflow script (runs inside the Workflow tool)
```

### Entry point --- `wisdom.mjs`

Parses `process.argv` into `{ command, flags }` and dispatches to one of three functions: `runExport()` (defined inline), `runProcess()` (imported from `process/thread.mjs`), or `runExtract()`/`runMerge()` (imported from `extract/prep.mjs`).

Also defines `runConcurrent(items, concurrency, fn)` --- a simple worker-pool: spawns `min(concurrency, items.length)` async workers that pull from a shared index counter. If any worker throws `CapReachedError`, the pool drains without starting new items.

### Discord API client --- `discord/api.mjs`

`createClient(config)` returns `{ request, queryCount, tier, sessionCap }`.

- **Auth detection.** Probes `/users/@me` with `Bot <token>` first; on failure, retries with the bare token (user-token auth). Sets `tier` to `'bot'` or `'user'`, which selects the rate-limit profile from config.
- **Rate limiter.** Enforces `requests_per_second` via a minimum inter-request delay. User-tier adds +/-20% jitter. Also reads Discord's `X-RateLimit-Remaining` / `X-RateLimit-Reset-After` headers and sleeps when a route bucket is exhausted.
- **Session cap.** Throws `CapReachedError` when `queryCount` reaches the configured cap. The caller catches this and exits with code 2; re-running resumes via the export manifest.
- **429 handling.** On HTTP 429, reads `retry_after` from the response body and recursively retries.
- **Snowflake utilities.** `snowflakeToTimestamp()` and `timestampToSnowflake()` convert between Discord snowflake IDs and Unix-millis timestamps using BigInt arithmetic (shift by 22 bits + the Discord epoch).

### Phase 1 control flow

1. **Discover** (`discord/discover.mjs`): fetch the full channel list from `/guilds/{id}/channels`, filter by type (text/forum) and exclude patterns. For forums, paginate `/channels/{id}/threads/archived/public` and (bot-only) `/guilds/{id}/threads/active`, deduplicate, and filter by `min_message_count`.
2. **Fetch members** (`discord/discover.mjs`): paginate `/guilds/{id}/members` (bot-only; user tokens get an empty map). Write `guild.json` and `members.json`.
3. **Build target list**: merge text channels and forum threads into a single list. Targets that previously returned 403 (tracked in `denied.json`) sort to the end.
4. **Fetch messages** (`discord/messages.mjs`): run targets through `runConcurrent`. For each target:
   - Check manifest: if the target's highest-seen snowflake is recorded and the output file exists, skip (up-to-date).
   - Call `fetchMessages(client, channelId, afterSnowflake)`:
     - **Incremental** (afterSnowflake set): page forward with `?after=`, collecting new messages.
     - **Full** (afterSnowflake null): page backward with `?before=`, collecting all history.
     - Sort chronologically (ascending snowflake).
   - Write `{ channel | thread, messages }` to `raw/channels/{id}.json` or `raw/threads/{id}.json`.
   - Update manifest with `highestSnowflake(messages)` and flush to disk after each target.

The export manifest (`raw/manifest.json`) is a flat `{ channelOrThreadId: highestSnowflake }` object. It governs incremental fetches --- on the next run, only messages newer than the stored snowflake are requested.

### Phase 2 control flow

1. Load `guild.json` to build `channelMap` (id to channel object) and `tagMap` (forum tag id to tag name).
2. Load `members.json` for author display-name lookup.
3. Iterate `raw/threads/*.json`:
   - Skip if `--channel` filter does not match `thread.parent_id`.
   - Skip if `--since` and thread creation date is before the cutoff.
   - Skip if output `.md` exists and its mtime >= input mtime (unless `--force`).
   - `filterMessages()` (`filter.mjs`): keep only type 0 (DEFAULT) and type 19 (REPLY).
   - `shouldSkipThread()`: drop threads with one or fewer messages or all-bot authors.
   - `buildFrontmatter()` (`frontmatter.mjs`): extract thread_id, title, channel, tags, created/archived timestamps, message_count, last_message_id (highest snowflake --- the Phase 3 watermark), reply_count, reaction aggregates, has_answer flag.
   - `renderMessages()` (`render.mjs`): format each message as `**Author** _timestamp_` + content + attachments + reactions. Reply messages get a reply-to header with a truncated quote of the parent.
   - Write `threads/<channel-name>/<thread_id>--<slug>.md`.
4. Iterate `raw/channels/*.json` --- same pipeline but simpler frontmatter (channel_id, title, message_count). One output file per text channel.

### Phase 3 control flow

Phase 3 has three stages: prep (Node.js), workflow (Claude agents), merge (Node.js).

#### Prep

`runExtract()` in `extract/prep.mjs`:

1. **Build sitemap** (`extract/sitemap.mjs`): walk `docs/Reference/`, parse frontmatter to collect `{ path, title, permalink, parent }` for every documented page. From this build two reference files:
   - `package-summary.txt`: a compact `- Package > Module: Symbol1, Symbol2, ...` text listing. Read by Extract agents to know what symbols exist.
   - `page-index.json`: a flat `{ "Package/Title": repoPath }` JSON object with bare-title shortcuts for unambiguous names. Read by Draft agents to resolve findings to file paths.

2. **Load state** (`extract/state.mjs`): read `extract-state.json` --- a `{ processedThreads: { threadId: { last_message_id, message_count, emitted } } }` map. If absent, returns empty state (all threads appear new).

3. **Filter threads**: scan every `.md` file under `data/threads/`, parse its frontmatter, and check `isThreadChanged(state, threadId, last_message_id, message_count)`. A thread passes the filter iff either field differs from the stored value, or the thread is not in state at all.

4. **Partition**: if 200 or fewer threads, write a single `extract-prep.json`. Otherwise, sort by (channel, created), chunk into batches of 200, and write `extract-batch-{i}.json` files plus an `extract-manifest.json`. Each batch file contains thread file paths, a parallel file-size array (for the workflow's byte-budget grouping), config, and mode metadata.

#### Workflow

`extract/workflow.mjs` is a Claude Code Workflow script --- it runs inside the Workflow tool engine, not as a standalone Node.js process. The engine provides `agent()`, `pipeline()`, `parallel()`, `phase()`, `log()`, and an `args` global.

1. **Parse args**: the batch file contents arrive as `args` (JSON). Extract thread paths, sizes, and config.

2. **Group threads by byte size**: threads above 15 KB get a solo group. The rest are packed into groups of ~25 KB cumulative size. This reduces agent count by batching small threads together.

3. **Two-stage pipeline** over the groups:

   **Stage 1 --- Extract.** One Sonnet agent per group. The agent reads the thread `.md` file(s) from disk, reads `package-summary.txt` to know the documented symbol surface, and returns `{ findings: [...] }` via structured output. Each finding has: `thread_path`, `package`, `symbol`, `kind` (gotcha/workaround/example/clarification/deprecation), `summary`, `detail`, `confidence` (high/medium/low), `date_earliest`, `date_latest`.

   **Stage 2 --- Draft.** One Sonnet agent per group (only if Stage 1 produced findings above the confidence threshold). The agent reads `page-index.json` to resolve each finding's package/symbol to a documentation file path, reads the resolved target page(s) to understand current content, and returns `{ additions: [...] }` via structured output. Each addition has: `thread_path`, `target_page` (repo-relative path or "UNMAPPED"), `section` (after-remarks/example/see-also/new-section), `draft` (exact Markdown to insert), `confidence`, `date_earliest`, `date_latest`, `reviewer_note`.

4. **Assemble**: flatten all additions, extract thread IDs from file paths, and return `{ additions: [...] }`.

The pipeline runs both stages without a barrier --- Stage 2 for group A starts as soon as group A's Stage 1 completes, while other groups may still be in Stage 1.

#### Merge

`runMerge()` in `extract/prep.mjs`, invoked by `node wisdom/wisdom.mjs extract --merge`.

1. **Collect results**: read all `extract-results-*.json` files and concatenate their additions arrays.

2. **Graft into staging.md** (`extract/merger.mjs` --- `graftAdditions`):
   - Parse existing `staging.md` into `{ preamble, sections[] }`. The parser splits on `---` delimiter lines, then parses each chunk into heading (target_page + section + optional marker), body lines, and trailing meta lines (source threads, confidence, date range, reviewer note).
   - For each addition, compute a match key: `(target_page, section, sorted finding_ids)`.
     - **Key exists in staging.md** (and section is not `[LOCKED]`): replace the section body and meta in place.
     - **Key not in staging, but in the emission log** (from `extract-state.json`): this was previously emitted, reviewed, and removed. Insert with a `[REFINED?]` marker.
     - **Key not in staging and never emitted**: insert at the end of the target_page's contiguous group (or create the group).
   - UNMAPPED sections sort before mapped sections.
   - Atomic write: backup existing `staging.md` as `staging.md.bak`, write to `.tmp`, rename.

3. **Advance state**: for each thread ID that contributed additions, call `recordEmission()` to store the current watermark values and the `(target_page, section, finding_ids)` tuples in the emission log. Then write `extract-state.json` atomically.

### staging.md format

```
## docs/Reference/VB/Form/index.md · after-remarks

> [!NOTE]
> Draft prose here...

_Source threads: 9876543210 · confidence: high_
_Date range: 2025-06-04_
_Reviewer note: Verify against current .twin source before publishing._

---
```

Each `## ` section is one addition. The heading encodes `target_page · section` plus an optional `[marker]` bracket (`DUPLICATE?`, `REFINED?`, `LOCKED`). Trailing italic lines are structured metadata the merger parses on re-read. Findings that do not map to any existing page use `UNMAPPED` as the target_page and are collected at the top of the file under an **Unmapped Findings** header.

### Incremental watermarks

Each phase has its own incrementality mechanism:

| Phase | Watermark | Storage | Granularity |
|-------|-----------|---------|-------------|
| Export | Highest message snowflake per channel/thread | `raw/manifest.json` | Per target |
| Process | Output file mtime vs. input file mtime | Filesystem | Per file |
| Extract | `(last_message_id, message_count)` per thread | `findings/extract-state.json` | Per thread |

The extract watermark uses two fields so it catches both new messages (snowflake advances) and message deletions (count decreases without snowflake change).

## Data directory

Almost everything under `wisdom/data/` is gitignored. The exception is `data/findings/staging.md`, which is tracked --- it is the long-lived review file and has value beyond any single session.

```
data/
  raw/                              Phase 1 output
    guild.json
    members.json
    manifest.json
    channels/*.json
    threads/*.json
  threads/                          Phase 2 output
    <channel-name>/
      <thread_id>--<slug>.md
    <channel-name>.md
  findings/                         Phase 3 output
    package-summary.txt               shared: symbol list for Extract agents
    page-index.json                   shared: symbol-to-doc-path lookup for Draft agents
    extract-state.json                per-thread watermark (advanced on merge)
    extract-prep.json                 single-batch prep (<=200 threads)
    extract-manifest.json             multi-batch manifest (>200 threads)
    extract-batch-{i}.json            per-batch thread-path lists
    extract-results-{i}.json          per-batch workflow results
    staging.md                        final review file (tracked in git)
```
