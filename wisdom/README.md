# Wisdom — Discord Knowledge Harvester

Three-phase tool that extracts technical knowledge from the twinBASIC Discord server and drafts documentation additions for human review.

**Phase 1 — Export:** fetch Discord messages to `data/raw/`.
**Phase 2 — Process:** convert raw JSON to structured Markdown in `data/threads/`.
**Phase 3 — Extract:** run Claude agents over the threads, draft documentation additions, produce a staging file for review.

## Prerequisites

- **Node.js 18+** (uses native `fetch` and ES modules).
- **No dependencies** — the tool uses only Node.js built-in APIs. No `npm install` needed.
- **Discord token** — for Phases 1 and 2.
- **Claude Code session** — for Phase 3 (the extract workflow runs Claude agents).

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

## Usage

All commands run from the repository root:

```
node wisdom/wisdom.mjs <command> [options]
```

### Phase 1 — Export

Fetches messages from Discord channels and forum threads.

```
node wisdom/wisdom.mjs export
```

Outputs raw JSON under `wisdom/data/raw/`. Supports incremental runs — a manifest tracks the highest message ID per channel, so re-running fetches only new messages. Use `--force` to re-fetch everything.

Common flags:

| Flag | Effect |
|------|--------|
| `--since <date>` | Only fetch messages after this ISO 8601 date |
| `--channel <id>` | Restrict to one channel (repeatable) |
| `--dry-run` | Discover channels/threads; don't fetch messages |
| `--force` | Ignore manifest; re-fetch all history |

When the session request cap is reached, the tool exits with code 2 — re-run to continue where it left off.

### Phase 2 — Process

Converts raw JSON into structured Markdown with YAML frontmatter.

```
node wisdom/wisdom.mjs process
```

Outputs one `.md` file per forum thread under `wisdom/data/threads/<channel-name>/`, plus one per text channel. Each file has frontmatter (thread ID, channel, tags, reaction counts, `has_answer` flag) and a rendered message body with timestamps and author names.

Common flags:

| Flag | Effect |
|------|--------|
| `--since <date>` | Only process threads created after this date |
| `--channel <id>` | Restrict to threads from this channel ID (repeatable) |
| `--force` | Regenerate all files (skip modification-time check) |

### Phase 3 — Extract

Two steps: a CLI prep step, then a Claude Code workflow.

#### Step 1: Prepare

```
node wisdom/wisdom.mjs extract
```

This scans the processed thread files and the `docs/Reference/` directory, builds a sitemap of all documented symbols, and writes prep data to `wisdom/data/findings/`. No Claude agents run yet.

- **200 threads or fewer:** writes a single `extract-prep.json`.
- **More than 200 threads:** partitions into batch files (`extract-batch-0.json`, `extract-batch-1.json`, ...) and writes an `extract-manifest.json` describing the batches. Each batch holds up to 200 threads, which keeps each workflow run within the engine's agent-count limits.

In both cases the prep step also writes two shared reference files that workflow agents read from disk: `package-summary.txt` (the documented-symbols list) and `page-index.json` (a compact lookup from package/symbol to documentation file path). Batch files contain only thread file paths and config — about 19 KB each — so the invoking session can pass them as Workflow `args` without excessive output cost.

Common flags:

| Flag | Effect |
|------|--------|
| `--since <date>` | Only analyse threads created after this date |
| `--channel <name>` | Restrict to threads from this channel **name** (repeatable) |
| `--min-confidence <level>` | Skip findings below `high`, `medium`, or `low` (default: `low`) |

#### Step 2: Run the extraction workflow

After the prep step finishes, tell Claude (in the same session or a new one):

> Run the wisdom extract workflow.

Claude detects whether a manifest or a single prep file was produced and handles either case:

- **Single batch:** reads the prep file, invokes the workflow, writes `staging.md`.
- **Multi-batch:** reads the manifest, runs one workflow per batch, saves each result to `extract-results-{i}.json`, then merges them into `staging.md`. If interrupted, re-running picks up from the last incomplete batch.

You don't need to know anything about the Workflow tool — Claude handles the mechanics.

If you need to re-merge batch results manually (e.g., after an interrupted session where all batches completed but `staging.md` wasn't written):

```
node wisdom/wisdom.mjs extract --merge
```

This reads all `extract-results-*.json` files and renders `staging.md`. No agents run and no API costs are incurred.

**What happens under the hood:**

The workflow fans out two pipeline stages per batch — one agent per thread, running in parallel:

1. **Extract** — each agent reads a thread `.md` file and identifies actionable findings (gotchas, workarounds, examples, clarifications, deprecations), each with a confidence level and date range.
2. **Draft** — each agent maps findings to documentation pages and drafts the exact Markdown prose to insert, following the site's formatting conventions.

The output is a `staging.md` file for human review. Findings that don't map to any existing page are collected under an **Unmapped Findings** section at the top — the reviewer decides whether to create a new page, attach to a package index, or discard. When multiple batches produce findings for the same page, they are grouped together and flagged with `[DUPLICATE?]` markers.

## Typical run

Full run from scratch:

```
node wisdom/wisdom.mjs export
node wisdom/wisdom.mjs process
node wisdom/wisdom.mjs extract
```

Then tell Claude: "Run the wisdom extract workflow."

Incremental update (only new content since a date):

```
node wisdom/wisdom.mjs export --since 2025-06-01
node wisdom/wisdom.mjs process --since 2025-06-01
node wisdom/wisdom.mjs extract --since 2025-06-01
```

Then tell Claude: "Run the wisdom extract workflow."

The extract step automatically partitions large thread sets into batches, so filtering is optional — but `--since` and `--channel` still reduce the total number of threads analysed (and therefore agent invocations and API costs).

## Data directory

Everything under `wisdom/data/` is gitignored.

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
    package-summary.txt               shared — symbol list for Extract agents
    page-index.json                   shared — symbol → doc-path lookup for Draft agents
    extract-prep.json                 single-batch prep (<=200 threads)
    extract-manifest.json             multi-batch manifest (>200 threads)
    extract-batch-{i}.json            per-batch thread-path lists (~19 KB each)
    extract-results-{i}.json          per-batch workflow results
    staging.md                        final review file
```

## Design documents

- [PLAN-1.md](PLAN-1.md) — Phase 1 (export) design
- [PLAN-2.md](PLAN-2.md) — Phase 2 (process) design
- [PLAN-3.md](PLAN-3.md) — Phase 3 (extract) design, schemas, staging format
