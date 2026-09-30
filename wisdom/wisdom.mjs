#!/usr/bin/env node

import { mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { choiceOption, dateOption, numberOption, parseCli, printHelpAndExit, refuseTogether, withUsageError } from '../lib/cli.mjs'
import { loadConfig } from './config.mjs'
import { readJsonFile, writeFileAtomic } from './files.mjs'
import { createClient, CapReachedError, timestampToSnowflake, EXIT_CAP_REACHED } from './discord/api.mjs'
import { discoverChannels, fetchMembers } from './discord/discover.mjs'
import { fetchMessages, appendMessages, loadManifest, saveManifest, highestSnowflake } from './discord/messages.mjs'
import { runProcess } from './process/thread.mjs'
import { runExtract, runMerge } from './extract/prep.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// No Discord message is older than this.
const DISCORD_EPOCH = '2015-01-01'

function parseArgs(argv) {
  const [command, ...rest] = argv.slice(2)
  if (command === '--help' || command === '-h') printHelpAndExit(USAGE)
  const { values, concurrency, rateLimit, cap } = withUsageError(() => {
    const cli = parseCli(rest, {
      options: {
        help: { type: 'boolean', short: 'h' },
        guild: { type: 'string' },
        channel: { type: 'string', multiple: true },
        since: { type: 'string' },
        in: { type: 'string' },
        out: { type: 'string' },
        concurrency: { type: 'string' },
        'rate-limit': { type: 'string' },
        cap: { type: 'string' },
        'min-confidence': { type: 'string' },
        force: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        merge: { type: 'boolean' },
        all: { type: 'boolean' },
      },
      positionals: 0,
      stopAt: ['help'],
    })
    if (cli.stopped === 'help') return cli
    const v = cli.values
    if ('since' in v) dateOption(v.since, { option: '--since', min: DISCORD_EPOCH })
    if ('minConfidence' in v) choiceOption(v.minConfidence, { option: '--min-confidence', choices: ['high', 'medium', 'low'] })
    // --merge grafts results already on disk and reads none of the three modes.
    if (command === 'extract' && !v.merge) refuseTogether(v, ['since', 'all', 'force'])
    return {
      ...cli,
      concurrency: 'concurrency' in v ? numberOption(v.concurrency, { option: '--concurrency', integer: true, min: 1 }) : undefined,
      rateLimit: 'rateLimit' in v ? numberOption(v.rateLimit, { option: '--rate-limit', above: 0 }) : undefined,
      cap: 'cap' in v ? numberOption(v.cap, { option: '--cap', integer: true, min: 1 }) : undefined,
    }
  })
  if (values.help) printHelpAndExit(USAGE)

  const flags = { channels: values.channel }
  if ('guild' in values) flags.guild = values.guild
  if ('since' in values) flags.since = values.since
  if ('in' in values) flags.in = values.in
  if ('out' in values) flags.out = values.out
  if (concurrency !== undefined) flags.concurrency = concurrency
  if (rateLimit !== undefined) flags.rateLimit = rateLimit
  if (cap !== undefined) flags.cap = cap
  if ('minConfidence' in values) flags.minConfidence = values.minConfidence
  if (values.force) flags.force = true
  if (values.dryRun) flags.dryRun = true
  if (values.merge) flags.merge = true
  if (values.all) flags.all = true

  return { command, flags }
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileAtomic(path, JSON.stringify(data, null, 2))
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
  const manifest = flags.force ? {} : loadManifest(outDir)
  const sinceSnowflake = flags.since
    ? timestampToSnowflake(Date.parse(flags.since))
    : null

  // Track targets that returned 403 — try them last
  const deniedPath = join(outDir, 'denied.json')
  const denied = flags.force
    ? {}
    : readJsonFile(deniedPath, {},
      'Delete it: it only lists the targets that refused access, so that they are tried last.')

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

    // A target already on disk is fetched again only when discovery reports a
    // message newer than its watermark, and then only for what came after it,
    // --since or not.  --since limits how far back any other target goes.
    const watermark = manifest[target.id]
    const stored = Boolean(watermark) && existsSync(filePath)
    const lastId = target.obj.last_message_id
    if (stored && lastId && BigInt(lastId) <= BigInt(watermark)) {
      upToDate++
      return
    }

    const after = stored ? watermark : sinceSnowflake
    let messages
    try {
      messages = await fetchMessages(client, target.id, after)
    } catch (err) {
      if (/403/.test(err.message)) {
        denied[target.id] = new Date().toISOString()
        writeFileAtomic(deniedPath, JSON.stringify(denied, null, 2))
        completed++
        process.stderr.write(`[wisdom] [${completed}/${targets.length}] ${target.name}: no access; skipping\n`)
        return
      }
      throw err
    }

    if (messages.length) {
      const held = stored
        ? readJsonFile(filePath, null,
          'Delete it, and the next export fetches the whole history of this target again.').messages
        : []
      writeJson(filePath, {
        [target.kind]: target.obj,
        messages: appendMessages(held, messages),
      })
    }
    // Every message from where the target's file starts (its first message, or
    // the --since date) up to the newest one discovery reported is now on disk.
    // The watermark moves past that one even when it has since been deleted,
    // so that the next run does not fetch the target again for nothing.  A
    // target with no file gets no watermark.
    if (messages.length || stored) {
      const newest = highestSnowflake([...messages, { id: lastId }, { id: watermark }].filter(m => m.id))
      if (newest !== watermark) {
        manifest[target.id] = newest
        saveManifest(outDir, manifest)
      }
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

Any command, or none, also takes -h, --help: print this text and exit.

Export options:
  --guild <id>          Guild (server) ID
  --channel <id>        Restrict to this channel (repeatable)
  --since <date>        Fetch targets not exported yet only from this ISO 8601 date
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
    if (command) console.error(`unknown command: ${command}`)
    printHelpAndExit(USAGE, { stream: 'stderr', exitCode: 2 })
}
