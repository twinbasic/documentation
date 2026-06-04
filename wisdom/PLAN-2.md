# Wisdom — Phase 2: Process

## Overview

Phase 2 reads the raw JSON produced by Phase 1 and converts it into structured Markdown files — one per forum thread (or per channel for non-forum text channels). The output is what the Claude agents in Phase 3 read. It must preserve enough conversational context for a reader (human or agent) to understand the thread without access to the original JSON, and surface the quality signals (reactions, tags, reply depth) that the extraction agents use to weight findings.

## Goals

- Produce one `.md` file per forum thread, with YAML frontmatter carrying metadata.
- Preserve thread context: replies are rendered under their parent messages when a `message_reference` is present, not only in chronological order.
- Surface quality signals — reactions, tag set, reply count — in frontmatter so Phase 3 agents can weight confidence.
- Stable output: re-running Process on the same input produces byte-identical output.

## Non-goals

- Relevance filtering or topic classification — Phase 3.
- Generating documentation prose — Phase 3.
- Any network access — Phase 1.

---

## Input

`data/raw/threads/{thread_id}.json` — the thread object plus ordered message array written by Phase 1. Structure:

```json
{
  "thread": { "id": "...", "name": "...", "applied_tags": [...], ... },
  "messages": [{ "id": "...", "author": {...}, "content": "...", "reactions": [...], ... }]
}
```

`data/raw/channels/{channel_id}.json` — text channel messages, same shape but keyed by `channel`:

```json
{
  "channel": { "id": "...", "name": "...", ... },
  "messages": [{ "id": "...", "author": {...}, "content": "...", "reactions": [...], ... }]
}
```

**Tag resolution.** Thread objects carry `applied_tags` as an array of Snowflake IDs. The human-readable tag names ("Answered", "WebView2", etc.) come from the parent forum channel's `available_tags` array, stored in `data/raw/guild.json` by Phase 1. Process loads the channel definitions at startup and builds a tag-ID-to-name lookup map for frontmatter generation. Text channels have no tags.

**Display names.** Message author objects carry `username` and `global_name` but not the server-specific nickname. Phase 1 exports a separate `data/raw/members.json` mapping user IDs to `{ username, global_name, nick }`. Process resolves display names in priority order: `nick` (server nickname) > `global_name` > `username`. If members.json is empty (the bot lacked the Server Members Intent and got a 403), the resolver falls back to the `global_name` / `username` fields on each message's author object.

---

## Thread structure

A Discord forum thread has:

- A **starter message** — the first message chronologically; its content is the original post.
- **Replies** — subsequent messages in chronological order. Each may carry a `message_reference` pointing to a specific earlier message.
- **Tags** — forum channel tags applied to the thread (e.g. "Answered", "Bug", "How-to"). These come from the thread object's `applied_tags` array, resolved against the parent channel's `available_tags`.

For the common case of a linear conversation, chronological order suffices. When a reply's `message_reference` points to a non-immediately-preceding message, render it indented under its referenced parent so the exchange reads coherently.

---

## Frontmatter schema

```yaml
---
thread_id: "1234567890123456789"
title: "How do I handle WebView2 NavigationCompleted?"
channel: "support"
channel_id: "9876543210987654321"
tags: ["Answered", "WebView2"]
created: "2024-03-15T10:23:00Z"
archived: "2024-03-18T14:05:00Z"   # omit for active threads
message_count: 12
last_message_id: "1234567890999999999"  # snowflake of the newest message; Phase 3 watermark
reply_count: 11                     # message_count minus the starter
starter_reactions:
  "👍": 5
  "✅": 3
top_reactions:                      # aggregate across all messages
  "👍": 8
  "✅": 3
  "❤️": 1
has_answer: true                    # true if "Answered" tag present
---
```

Text channels use a simpler frontmatter — no tags, thread metadata, or answer signal:

```yaml
---
channel_id: "927638154192748606"
title: "general"
message_count: 4523
top_reactions:
  "👍": 120
  "❤️": 45
---
```

`has_answer` is the strongest single quality signal — it means a community member or maintainer marked the thread resolved.

`last_message_id` is Phase 3's watermark. It carries the snowflake of the newest message in the thread (Discord snowflakes are monotonic and time-encoded), and pairs with `message_count` to let `extract` cheaply detect whether a thread has gained or lost content since its findings were last produced. The pair is content-derived, so it survives `git checkout`, cross-platform clones, filesystem syncs, and other operations that would invalidate a filesystem-mtime watermark.

---

## Output structure

```
data/threads/
  {channel_name}.md                          text channel (one file per channel)
  {forum_channel_name}/
    {thread_id}--{slugified-title}.md        forum thread (one file per thread)
```

Forum threads nest under a subdirectory named after the parent forum channel. Text channels produce a single `.md` at the root of `data/threads/`.

The `--` separator makes the ID and slug visually distinct without conflicting with slug hyphens. The ID prefix guarantees uniqueness even when two threads share similar titles after slugification.

Slugification rules: lowercase; replace spaces and punctuation runs with a single `-`; strip characters outside `[a-z0-9-]`; trim leading/trailing `-`; cap at 80 characters.

---

## Message rendering

Each message renders as a block:

```markdown
**DisplayName** _2024-03-15 10:23_

`DisplayName` is the resolved name from the priority chain described above (nick > global_name > username).

The message body text, including any **markdown** Discord already
uses (bold, italics, inline code, fenced code blocks).

> 👍×5  ✅×3
```

Reactions appear as a blockquote line only when the message has at least one reaction with count ≥ 1.

For a reply (message with `message_reference`), render a brief quoted excerpt of the referenced message before the reply body:

```markdown
**DisplayName** _2024-03-15 10:31_ ↩ replying to **OtherUser**

> The original snippet being replied to (first 120 characters)…

The reply content.
```

Attachments are noted inline as `[attachment: filename.ext]` — do not attempt to download or embed.

Code blocks in Discord messages (backtick-fenced, with or without a language hint) pass through verbatim. Single-backtick inline code also passes through.

---

## Filtering at the Process stage

Process applies only light, mechanical filtering — not relevance filtering (Phase 3's job):

- **System messages** — skip messages whose `type` is not 0 (DEFAULT) or 19 (REPLY). Type 19 messages are Discord's "reply to a specific message" — they carry real user content and the `message_reference` that the renderer uses for reply threading. Types to skip include joins (7), pins (18), thread-created markers (21), etc.
- **Empty threads** — skip threads with zero non-system messages after the starter. For text channels, skip if zero non-system messages total.
- **Bot-only** — skip threads (or text channels) where every message author has `bot: true`.

No content-based filtering here; that judgment belongs to the extraction agents.

**Discord markdown pass-through.** Discord-specific markdown extensions — `||spoiler||` syntax, `>>> multiline quote` blocks, `<t:timestamp:format>` timestamps, custom emoji `:name:id` notation — pass through verbatim into the output `.md`. The output files are consumed by Claude agents (Phase 3), not rendered as standard Markdown, so fidelity to the original message content matters more than rendering correctness.

---

## CLI

```
node wisdom/wisdom.mjs process [options]

  --in <dir>        Input directory of raw JSON  [default: wisdom/data/raw]
  --out <dir>       Output directory for .md files  [default: wisdom/data/threads]
  --channel <id>    Restrict to threads from this channel ID (repeatable)
  --since <date>    Only process threads created after this ISO 8601 date
  --force           Regenerate all output files (default: skip threads whose raw JSON has not changed since the last process run, detected by comparing the raw file's mtime against the output .md's mtime)
```

The `--force` flag is useful after changing the rendering logic to regenerate all files consistently.

---

## File layout (Phase 2 additions)

```
wisdom/
  PLAN-2.md
  process/
    thread.mjs      thread JSON → .md (orchestrates the steps below)
    frontmatter.mjs builds the YAML frontmatter object from thread + tag metadata
    render.mjs      message array → Markdown body (handles replies, reactions, attachments)
    slugify.mjs     thread title → filename-safe slug
    filter.mjs      system-message and empty-thread filtering
  data/
    threads/        gitignored
```

---

## Implementation notes

**Determinism.** Tags in frontmatter are sorted alphabetically. Reaction maps are sorted by count descending, then by emoji name. Input files are processed in lexicographic filename order. Timestamps are normalized to `YYYY-MM-DDTHH:MM:SSZ` (no fractional seconds). These choices ensure byte-identical output on re-runs.

**Slugification edge case.** If the thread title produces an empty slug after stripping (e.g. all-punctuation titles), the slug defaults to `untitled`.

**Timestamps.** Message timestamps render as `YYYY-MM-DD HH:MM` in UTC (no seconds — matches the plan's examples). Frontmatter timestamps use full ISO 8601 with seconds.

---

## Phase 1 changes made alongside Phase 2

Several resilience improvements to the export pipeline were implemented during Phase 2 development and are recorded here (PLAN-1 is unchanged):

- **403 resilience.** The members endpoint, per-channel message fetch, and archived-threads endpoints all catch 403 errors and continue with a warning instead of crashing.
- **Denied-target tracking.** Targets that return 403 during message fetch are recorded in `data/raw/denied.json` with a timestamp. On subsequent runs, denied targets sort to the end of the fetch queue so accessible targets get the session budget first. `--force` clears the denied set.
- **Skip already-fetched targets.** Targets with both a manifest entry and an existing JSON output file are skipped entirely (no API call). This is critical for multi-session bulk exports — once a thread is fetched, it costs zero requests on every subsequent run. `--force` and `--since` override the skip.
- **CLI overrides.** `--rate-limit <n>` and `--cap <n>` flags override the tier-selected rate limit and session cap for the current run.
