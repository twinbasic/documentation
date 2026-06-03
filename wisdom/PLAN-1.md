# Wisdom — Phase 1: Export

## Overview

`wisdom` is a three-phase tool for harvesting knowledge from the twinBASIC Discord server and surfacing it as additions to the documentation. Phase 1 covers the export step: authenticating with the Discord HTTP API, discovering channels and forum threads, fetching full message history with pagination and rate-limit handling, and writing stable raw JSON output that Phases 2 and 3 consume.

## Architecture summary

| Phase | Description | Plan |
|-------|-------------|------|
| 1 — Export  | Discord API → raw JSON                       | this file  |
| 2 — Process | Raw JSON → structured `.md` files            | PLAN-2.md  |
| 3 — Extract | `.md` files → knowledge findings via agents  | PLAN-3.md  |

Each phase is independently runnable. The boundaries are plain files on disk: `data/raw/` separates Phase 1 from Phase 2; `data/threads/` separates Phase 2 from Phase 3. Re-running Phase 2 with improved logic does not require touching the Discord API again.

## Goals

- Fetch all message history from designated channels and forum threads.
- Support incremental updates: re-running only fetches content newer than the last run.
- Handle Discord rate limits automatically, without manual throttling by the caller.
- Produce stable, reproducible JSON output that downstream phases can consume without network access.

## Non-goals (Phase 1)

- Filtering or classifying messages — Phase 2.
- Generating Markdown — Phase 2.
- Knowledge extraction — Phase 3.
- Any write operation (sending messages, adding reactions, modifying the server).

---

## Authentication

Discord supports two token types:

- **Bot token** — `Authorization: Bot <token>` header. Requires the bot to be added to the server with `Read Message History`, `View Channels`, and `Read Messages` permissions. This is the ToS-compliant path and the recommended default.
- **User token** — `Authorization: <token>` header (no prefix). Authenticates as the caller's own Discord account and inherits the caller's access rights. Technically violates Discord ToS for automation; acceptable for one-off personal archival.

Bot and user tokens are structurally identical — both are three-segment base64url strings (`[user_id].[timestamp].[signature]`). The "Bot " prefix exists only in the HTTP `Authorization` header, not in the stored token value. There is no way to distinguish token type by inspecting the string alone.

**Auto-detection.** The tool starts every session under user-token limits (the conservative tier). After a randomized delay of 5–10 seconds, a background probe sends `GET /api/v10/@me`. If the response contains `bot: true`, the tool upgrades to bot-token limits for the remainder of the session. Requests already in flight or completed before the probe returns are unaffected — only the rate and cap governing future requests change. If the probe fails or times out, user-token limits remain in effect; the failure is logged but does not abort the export. The probe counts toward the session query cap.

Token is read from the `DISCORD_TOKEN` environment variable. It is never accepted as a CLI argument to avoid shell-history leakage.

---

## Discovery: Guild → Channels → Threads

```
Guild
├── Text channels (type 0)    regular discussion, announcements
├── Forum channels (type 15)  Q&A, support, show & tell
│   ├── Active threads
│   └── Archived threads (paginated)
└── Voice, stage, categories  skipped
```

**Step 1 — Channel list.** `GET /guilds/{guild_id}/channels` returns all channels in the server. Keep text channels (type 0) and forum channels (type 15); skip everything else. Channel objects are preserved in full — in particular, forum channels carry an `available_tags` array that Phase 2 needs to resolve thread tag IDs to display names.

**Step 2 — Active threads.** `GET /guilds/{guild_id}/threads/active` returns all currently open threads across the entire guild. Filter to threads whose `parent_id` is one of the forum channels from Step 1.

**Step 3 — Archived threads.** `GET /channels/{channel_id}/threads/archived/public?limit=100` paginates archived threads per forum channel. Paginate using the `has_more` flag and the `before` query parameter (ISO 8601 timestamp of the last thread's `archive_timestamp`).

**Step 4 — Message fetch.** For each thread (and each in-scope text channel), fetch messages via `GET /channels/{channel_id}/messages?limit=100&before={snowflake}`, paginating until the response is empty or the incremental cutoff is reached.

**Step 5 — Guild members.** `GET /guilds/{guild_id}/members?limit=1000&after={snowflake}` paginates the full member list. Server-specific nicknames (`nick` field) are not available on message author objects — this bulk fetch is the only way to obtain them. The response is written to `data/raw/members.json` as a map from user ID to `{ username, global_name, nick }`. On incremental runs, the member list is re-fetched in full (it is small relative to message history).

Discovery (Steps 1–4) always runs in full on every invocation — it is the manifest that governs message pagination within known channels and threads, not channel or thread discovery. This ensures newly created threads are picked up on incremental runs.

---

## Snowflake IDs and Incremental Updates

Discord message IDs are Snowflakes — 64-bit integers that encode a millisecond timestamp:

```js
const DISCORD_EPOCH = 1420070400000n
const timestampMs = (BigInt(snowflake) >> 22n) + DISCORD_EPOCH
```

Conversely, constructing a "synthetic message ID at time T" for use as a `before`/`after` cursor:

```js
const snowflakeAtTime = (BigInt(timestampMs) - DISCORD_EPOCH) << 22n
```

The manifest file (`data/raw/manifest.json`) records the highest message Snowflake seen per channel or thread. The manifest is updated on disk as each channel or thread completes — not batched at the end of the run — so an interrupted export can resume where it left off. On subsequent runs, the `after` parameter is set to that stored value, so only newer messages are fetched. Passing `--force` ignores the manifest entirely and re-fetches from the beginning of history.

---

## Rate Limiting

Two layers of throttling apply: Discord's own per-route rate limits (communicated via response headers), and the tool's self-imposed limits that vary by token type.

### Discord response headers

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Remaining` | Requests remaining in the current bucket window |
| `X-RateLimit-Reset-After` | Seconds until the window resets |
| `X-RateLimit-Bucket` | Opaque bucket identifier for this route |

After each response, inspect `X-RateLimit-Remaining`. When it reaches 0, sleep `X-RateLimit-Reset-After` seconds before issuing the next request in that bucket. On a `429 Too Many Requests` response, sleep the `retry_after` value from the JSON body before retrying.

### Tool-imposed limits

The tool enforces its own rate and cap limits on top of Discord's per-route headers. Two tiers exist; the active tier is selected by auto-detection (see Authentication above). All values are configurable in `config.jsonc` under the `limits` key.

|                     | User token (default) | Bot token (auto-detected) |
|---------------------|----------------------|---------------------------|
| Rate limit          | 2 requests/second    | 5 requests/second         |
| Jitter              | yes (randomized)     | no (fixed interval)       |
| Session query cap   | 100 requests         | 200 requests              |

**Rate limit.** The inter-request delay enforces the rate ceiling. For user tokens, the delay is randomized (jittered uniformly within the window — e.g. 400–600 ms for 2 req/s) to avoid a machine-regular cadence. For bot tokens, the delay is fixed (200 ms for 5 req/s) since bots are expected to make automated requests.

**Session query cap.** The total number of Discord API requests (excluding retries after `429`) is capped per invocation. When the cap is reached, the tool stops fetching, writes the manifest with progress so far, and exits with a distinctive exit code and message. The next run resumes from where it left off via the manifest. This prevents a single session from making an unbounded number of requests — especially important during initial full-history exports of large servers, which will span multiple sessions.

Both layers are additive: the tool never exceeds its own rate limit even if Discord's headers would allow a higher burst, and it never exceeds the session cap even if Discord's rate limit has remaining headroom.

---

## Output Structure

```
data/raw/
  manifest.json                  { channelOrThreadId: highestSnowflakeString, ... }
  guild.json                     raw response from GET /guilds/{id}/channels
  threads/
    {thread_id}.json             { thread: {...}, messages: [{...}, ...] }
  channels/
    {channel_id}.json            { channel: {...}, messages: [{...}, ...] }
```

`{thread_id}.json` includes the full thread object (title, creation time, forum tags, applied tag IDs) plus the complete ordered message array. Message objects are the raw Discord API shape — no transformation at this stage. The `guild.json` and `manifest.json` files are rewritten on every successful run.

`data/` is covered by a local `.gitignore` entry — Discord message content is not committed to the repository.

---

## Configuration file

`wisdom/config.jsonc` is a committed JSONC (JSON with Comments) configuration file that controls discovery policy, rate limits, and export defaults. It is the right place for any persistent policy decision that would otherwise require a CLI flag on every run. JSONC is parsed by stripping `//` and `/* */` comments before `JSON.parse` — no external dependency required.

```jsonc
{
  "guild_id": "1234567890123456789",

  "channels": {
    "exclude_patterns": [
      "github-.*",
      "bot-.*",
      "log-.*"
    ],
    "exclude_ids": [],
    "include_types": ["text", "forum"]
  },

  "threads": {
    "min_message_count": 2
  },

  "export": {
    "concurrency": 3
  },

  // Tool-imposed rate and session limits, per token type.
  // Auto-detection selects the active tier; see Authentication in PLAN-1.
  "limits": {
    "user": {
      "requests_per_second": 2,   // inter-request delay with uniform jitter
      "session_query_cap": 100
    },
    "bot": {
      "requests_per_second": 5,   // fixed inter-request delay, no jitter
      "session_query_cap": 200
    },
    // Randomized delay (seconds) before the auto-detection probe fires.
    "probe_delay": [5, 10]
  }
}
```

**`channels.exclude_patterns`** — regular expressions matched against the channel name (case-insensitive). Channels whose name matches any pattern are skipped entirely — their threads are never fetched. This is the primary mechanism for excluding noisy channels like `github-.*` (commit/PR feed bots) that contain no usable prose.

**`channels.exclude_ids`** — a fallback for channels whose names are ambiguous or that lack a useful name pattern. Matched by exact Snowflake ID string.

**`channels.include_types`** — limit discovery to `"text"` (type 0) and/or `"forum"` (type 15) channels. Both are included by default; remove `"text"` to skip regular text channels entirely if the server's knowledge is concentrated in forum threads.

**`threads.min_message_count`** — threads with fewer messages than this threshold are not fetched. Skips dead-on-arrival threads (e.g. unanswered one-liners). Default: 2 (starter + at least one reply).

**`export.concurrency`** — default parallel fetch count, overridable at runtime via `--concurrency`.

**`guild_id`** — the server's Snowflake ID, so `--guild` does not need to be passed on every invocation. Can still be overridden on the CLI.

**`limits.user`** / **`limits.bot`** — per-tier rate and session cap settings. `requests_per_second` controls the inter-request delay; user-tier delays are jittered, bot-tier delays are fixed. `session_query_cap` is the maximum number of counted API requests per invocation.

**`limits.probe_delay`** — a `[min, max]` pair in seconds. The auto-detection probe (`GET /api/v10/@me`) fires after a uniformly random delay in this range. Setting both values to `0` fires the probe immediately at startup.

The config is loaded at startup and merged with any CLI flags; explicit CLI flags take precedence over config values. In particular, an explicit `--channel <id>` flag bypasses the config's `exclude_patterns` and `exclude_ids` rules entirely — requesting a specific channel by ID is an unambiguous include.

---

## CLI

```
node wisdom/wisdom.mjs export [options]

  --guild <id>          Guild (server) ID  [required, or DISCORD_GUILD_ID env var]
  --channel <id>        Restrict to this channel ID (repeatable; default: all text + forum channels)
  --since <date>        Fetch only content after this ISO 8601 date (overrides manifest)
  --force               Ignore manifest; re-fetch complete history
  --out <dir>           Output directory  [default: wisdom/data/raw]
  --concurrency <n>     Parallel channel/thread fetches  [default: 3; Discord recommends ≤ 5]
  --dry-run             Discover channels and threads, print counts, do not fetch messages
```

During a live (non-dry-run) export, progress is logged to stderr: channels discovered, threads queued, messages fetched per thread, and a running total. This is the only user-facing feedback for what can be a long-running operation on a large server.

---

## File layout (Phase 1)

```
wisdom/
  PLAN-1.md               this file
  PLAN-2.md               process phase
  PLAN-3.md               extract phase
  config.jsonc            committed configuration (guild ID, channel exclusions, limits, defaults)
  wisdom.mjs              CLI entry point (subcommand dispatcher: export / process / extract)
  config.mjs              loads and validates config.jsonc (strips comments, parses, merges with CLI flags)
  discord/
    api.mjs               fetch wrapper: auth headers, rate-limit handling, retries
    discover.mjs          guild → channel list → active threads → archived threads → guild members
    messages.mjs          paginated message fetch with Snowflake cursor
  .gitignore              ignores data/
  data/                   gitignored
    raw/
      members.json        user ID → { username, global_name, nick }
```

`wisdom/` uses only Node.js built-in APIs (`fetch`, `fs`, `path`, `crypto`). No external dependencies, no `package.json`. The `wisdom.mjs` dispatcher is part of Phase 1's implementation scope — it owns argument parsing and delegates to the right module for each subcommand.
