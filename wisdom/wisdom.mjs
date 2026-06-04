#!/usr/bin/env node

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.mjs'
import { createClient, CapReachedError, timestampToSnowflake, EXIT_CAP_REACHED } from './discord/api.mjs'
import { discoverChannels, fetchMembers } from './discord/discover.mjs'
import { fetchMessages, loadManifest, saveManifest, highestSnowflake } from './discord/messages.mjs'
import { runProcess } from './process/thread.mjs'
import { runExtract, runMerge } from './extract/prep.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
  const args = argv.slice(2)
  const command = args[0]
  const flags = { channels: [] }

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--guild':       flags.guild = args[++i]; break
      case '--channel':     flags.channels.push(args[++i]); break
      case '--since':       flags.since = args[++i]; break
      case '--force':       flags.force = true; break
      case '--in':          flags.in = args[++i]; break
      case '--out':         flags.out = args[++i]; break
      case '--concurrency': flags.concurrency = parseInt(args[++i], 10); break
      case '--rate-limit':  flags.rateLimit = parseFloat(args[++i]); break
      case '--cap':         flags.cap = parseInt(args[++i], 10); break
      case '--dry-run':     flags.dryRun = true; break
      case '--merge':       flags.merge = true; break
      case '--all':         flags.all = true; break
      case '--min-confidence': flags.minConfidence = args[++i]; break
      default:
        process.stderr.write(`Unknown option: ${args[i]}\n`)
        process.exit(1)
    }
  }

  return { command, flags }
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}

async function runConcurrent(items, concurrency, fn) {
  let index = 0
  let capReached = false

  async function worker() {
    while (index < items.length && !capReached) {
      const i = index++
      try {
        await fn(items[i], i)
      } catch (err) {
        if (err instanceof CapReachedError) { capReached = true; return }
        throw err
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return capReached
}

async function runExport(flags) {
  const config = loadConfig(flags)
  const outDir = flags.out || join(__dirname, 'data', 'raw')
  mkdirSync(join(outDir, 'threads'), { recursive: true })
  mkdirSync(join(outDir, 'channels'), { recursive: true })

  const client = await createClient(config)

  // Discovery (always runs in full — picks up new channels/threads on incremental runs)
  const { allChannels, textChannels, forumChannels, threads } =
    await discoverChannels(client, config, flags.channels.length ? flags.channels : null)

  if (flags.dryRun) {
    process.stderr.write(
      `[wisdom] Dry run — ${textChannels.length} text, ${forumChannels.length} forum, ` +
      `${threads.length} threads | ${client.queryCount} requests used\n`,
    )
    return
  }

  // Step 5 — guild members
  let members
  try {
    members = await fetchMembers(client, config.guild_id)
  } catch (err) {
    if (err instanceof CapReachedError) {
      process.stderr.write('[wisdom] Cap reached during member fetch\n')
      process.exit(EXIT_CAP_REACHED)
    }
    throw err
  }

  writeJson(join(outDir, 'guild.json'), allChannels)
  writeJson(join(outDir, 'members.json'), members)

  // Manifest governs incremental fetches
  const manifest = (flags.force || flags.since) ? {} : loadManifest(outDir)
  const sinceSnowflake = flags.since
    ? timestampToSnowflake(Date.parse(flags.since))
    : null

  // Track targets that returned 403 — try them last
  const deniedPath = join(outDir, 'denied.json')
  const denied = flags.force
    ? {}
    : existsSync(deniedPath) ? JSON.parse(readFileSync(deniedPath, 'utf-8')) : {}

  // Fetch targets: text channels + forum threads
  // Previously denied targets sort to the end
  const targets = [
    ...textChannels.map(c => ({ kind: 'channel', id: c.id, obj: c, name: c.name })),
    ...threads.map(t => ({ kind: 'thread', id: t.id, obj: t, name: t.name })),
  ]
  targets.sort((a, b) => (denied[a.id] ? 1 : 0) - (denied[b.id] ? 1 : 0))

  let totalMessages = 0
  let completed = 0
  let upToDate = 0

  const capHit = await runConcurrent(targets, config.export.concurrency, async (target) => {
    const subdir = target.kind === 'thread' ? 'threads' : 'channels'
    const filePath = join(outDir, subdir, `${target.id}.json`)

    if (!flags.force && !sinceSnowflake && manifest[target.id] && existsSync(filePath)) {
      upToDate++
      return
    }

    const after = sinceSnowflake || manifest[target.id] || null
    let messages
    try {
      messages = await fetchMessages(client, target.id, after)
    } catch (err) {
      if (/403/.test(err.message)) {
        denied[target.id] = new Date().toISOString()
        writeFileSync(deniedPath, JSON.stringify(denied, null, 2))
        completed++
        process.stderr.write(`[wisdom] [${completed}/${targets.length}] ${target.name}: no access; skipping\n`)
        return
      }
      throw err
    }

    if (messages.length) {
      writeJson(filePath, {
        [target.kind]: target.obj,
        messages,
      })
      const highest = highestSnowflake(messages)
      if (highest) manifest[target.id] = highest
      saveManifest(outDir, manifest)
    }

    totalMessages += messages.length
    completed++
    process.stderr.write(
      `[wisdom] [${completed}/${targets.length}] ${target.name}: ${messages.length} messages\n`,
    )
  })

  process.stderr.write(
    `[wisdom] Done — ${totalMessages} messages, ${completed}/${targets.length} targets` +
    (upToDate ? `, ${upToDate} up-to-date` : '') +
    `, ${client.queryCount}/${client.sessionCap} requests\n`,
  )

  if (capHit) {
    process.stderr.write('[wisdom] Session cap reached — re-run to continue\n')
    process.exit(EXIT_CAP_REACHED)
  }
}

// --- Main ---

const USAGE = `Usage: node wisdom/wisdom.mjs <command> [options]

Commands:
  export    Fetch Discord messages to data/raw/
  process   Convert raw JSON to structured .md files
  extract   Prepare data for Claude-agent knowledge extraction

Export options:
  --guild <id>          Guild (server) ID
  --channel <id>        Restrict to this channel (repeatable)
  --since <date>        Only content after this ISO 8601 date
  --force               Ignore manifest; re-fetch all history
  --out <dir>           Output directory  [default: wisdom/data/raw]
  --concurrency <n>     Parallel fetches  [default: 3]
  --rate-limit <n>      Requests per second  [default: per tier]
  --cap <n>             Session request cap  [default: per tier]
  --dry-run             Discover only; do not fetch messages

Process options:
  --in <dir>            Input directory of raw JSON  [default: wisdom/data/raw]
  --out <dir>           Output directory for .md files  [default: wisdom/data/threads]
  --channel <id>        Restrict to threads from this channel ID (repeatable)
  --since <date>        Only process threads created after this ISO 8601 date
  --force               Regenerate all output files (skip mtime check)

Extract options:
  --in <dir>            Input directory of processed .md files  [default: wisdom/data/threads]
  --out <dir>           Output directory for findings  [default: wisdom/data/findings]
  --channel <name>      Restrict to threads from this channel name (repeatable)
  --min-confidence <l>  Skip findings below this level: high | medium | low  [default: low]
  --since <date>        Diagnostic: filter by thread created date; sideband output, no state update
  --all                 Bootstrap: process all threads, ignoring state and channel filter
  --force               Re-process threads even if their watermark matches state (pair with --channel to scope)
  --dry-run             Write the prep file but do not invoke the workflow; state is not touched
  --merge               Graft extract-results-*.json into staging.md and advance state (no agents)

  Default mode is incremental: only threads whose last_message_id or message_count
  has changed since the last successful merge are re-extracted.
  --since, --all, and --force are mutually exclusive primary modes.
`

const { command, flags } = parseArgs(process.argv)

switch (command) {
  case 'export':
    await runExport(flags)
    break
  case 'process':
    await runProcess(flags)
    break
  case 'extract':
    if (flags.merge) await runMerge(flags)
    else await runExtract(flags)
    break
  default:
    process.stderr.write(USAGE)
    process.exit(command ? 1 : 0)
}
