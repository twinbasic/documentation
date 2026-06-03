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

**Tag resolution.** Thread objects carry `applied_tags` as an array of Snowflake IDs. The human-readable tag names ("Answered", "WebView2", etc.) come from the parent forum channel's `available_tags` array, stored in `data/raw/guild.json` by Phase 1. Process loads the channel definitions at startup and builds a tag-ID-to-name lookup map for frontmatter generation.

**Display names.** Message author objects carry `username` and `global_name` but not the server-specific nickname. Phase 1 exports a separate `data/raw/members.json` mapping user IDs to `{ username, global_name, nick }`. Process resolves display names in priority order: `nick` (server nickname) > `global_name` > `username`.

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

`has_answer` is the strongest single quality signal — it means a community member or maintainer marked the thread resolved.

---

## Output structure

```
data/threads/
  {channel_name}/
    {thread_id}--{slugified-title}.md
```

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

- **System messages** — skip messages where `type ≠ 0` (joins, pins, thread-created markers, etc.).
- **Empty threads** — skip threads with zero non-system messages after the starter.
- **Bot-only threads** — skip threads where every message author has `bot: true`.

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
