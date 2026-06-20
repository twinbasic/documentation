import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, unlinkSync, statSync } from 'node:fs'
import { join, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSitemap, buildPackageSummary, buildPageIndex } from './sitemap.mjs'
import { loadState, saveState, isThreadChanged, recordEmission } from './state.mjs'
import { graftAdditions, renderSideband } from './merger.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const BATCH_SIZE = 200

export async function runExtract(flags) {
  const threadsDir = flags.in || join(__dirname, '..', 'data', 'threads')
  const outDir = flags.out || join(__dirname, '..', 'data', 'findings')
  const docsDir = join(REPO_ROOT, 'docs', 'Reference')

  if (!existsSync(threadsDir)) {
    process.stderr.write('[wisdom] Threads directory not found — run process first\n')
    process.exit(1)
  }

  // Mode resolution: --since, --all, --force are mutually exclusive primary modes.
  const modeFlags = [flags.since && 'since', flags.all && 'all', flags.force && 'force'].filter(Boolean)
  if (modeFlags.length > 1) {
    process.stderr.write(`[wisdom] --since, --all, and --force are mutually exclusive (got: ${modeFlags.join(', ')})\n`)
    process.exit(1)
  }
  const mode = modeFlags[0] || 'incremental'

  // Build docs sitemap
  const sitemap = buildSitemap(docsDir, REPO_ROOT)
  const packageSummary = buildPackageSummary(sitemap)
  process.stderr.write(`[wisdom] Sitemap: ${sitemap.length} reference pages\n`)

  // State (skipped for --all bootstrap)
  const state = mode === 'all'
    ? { version: 1, lastRun: null, processedThreads: {} }
    : loadState(outDir)

  // Filter logic per mode
  const sinceMs = flags.since ? Date.parse(flags.since) : null
  const channelFilter = flags.channels?.length ? new Set(flags.channels) : null
  // --all bypasses channel filter; --force respects it.
  const applyChannelFilter = mode !== 'all' && channelFilter

  // Scan thread .md files
  const allThreads = []
  let skippedByState = 0
  let skippedByChannel = 0
  let skippedBySince = 0

  const subdirs = readdirSync(threadsDir, { withFileTypes: true })
  for (const entry of subdirs) {
    if (entry.isFile() && entry.name.endsWith('.md')) continue  // text channel dump
    if (!entry.isDirectory()) continue

    const channelName = entry.name
    if (applyChannelFilter && !channelFilter.has(channelName)) {
      // Count silently — too noisy to count per thread.
      continue
    }

    const channelDir = join(threadsDir, channelName)
    const files = readdirSync(channelDir).filter(f => f.endsWith('.md')).sort()

    for (const file of files) {
      const filePath = join(channelDir, file)
      const fm = parseThreadFrontmatter(readFileSync(filePath, 'utf-8'))
      if (!fm.thread_id) continue

      // --since filter: thread creation date
      if (mode === 'since' && fm.created) {
        if (Date.parse(fm.created) < sinceMs) { skippedBySince++; continue }
      }

      // State filter: only changed threads (default mode only)
      if (mode === 'incremental') {
        if (!isThreadChanged(state, fm.thread_id, fm.last_message_id, fm.message_count)) {
          skippedByState++; continue
        }
      }

      allThreads.push({
        path: filePath.split(sep).join('/').replace(/^.*?wisdom\//, 'wisdom/'),
        thread_id: fm.thread_id,
        channel: fm.channel || channelName,
        created: fm.created || null,
        message_count: fm.message_count || 0,
        last_message_id: fm.last_message_id || null,
        has_answer: fm.has_answer === 'true' || fm.has_answer === true,
        tags: fm.tags || [],
        size: statSync(filePath).size,
      })
    }
  }

  process.stderr.write(
    `[wisdom] Mode: ${mode} | Threads: ${allThreads.length}` +
    (skippedByState ? ` (skipped ${skippedByState} unchanged)` : '') +
    (skippedBySince ? ` (skipped ${skippedBySince} pre-${flags.since})` : '') +
    `\n`,
  )

  if (!allThreads.length) {
    if (mode === 'incremental') {
      process.stderr.write('[wisdom] No new threads since the last successful merge — nothing to do.\n')
    } else {
      process.stderr.write('[wisdom] No threads to process.\n')
    }
    return
  }

  // Cleanup prior artefacts (single-batch / multi-batch / shared files)
  mkdirSync(outDir, { recursive: true })
  for (const f of readdirSync(outDir)) {
    if (f === 'extract-prep.json' || f === 'extract-manifest.json' ||
        /^extract-batch-\d+\.json$/.test(f) ||
        f === 'package-summary.txt' || f === 'page-index.json') {
      unlinkSync(join(outDir, f))
    }
  }

  // Shared reference files
  const pageIndex = buildPageIndex(sitemap)
  writeFileSync(join(outDir, 'package-summary.txt'), packageSummary)
  writeFileSync(join(outDir, 'page-index.json'), JSON.stringify(pageIndex, null, 2))
  process.stderr.write(`[wisdom] Shared files: package-summary.txt, page-index.json (${Object.keys(pageIndex).length} entries)\n`)

  // Config carried through to the workflow agents
  const config = {
    minConfidence: flags.minConfidence || 'low',
    dryRun: !!flags.dryRun,
  }

  // Prep metadata stored in the prep / manifest files so the merge step
  // knows what mode produced these results.
  const prepMeta = {
    mode,
    sinceDate: flags.since || null,
    generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }

  const threadPaths = allThreads.map(t => t.path)

  if (threadPaths.length <= BATCH_SIZE) {
    const prepPath = join(outDir, 'extract-prep.json')
    writeFileSync(prepPath, JSON.stringify({
      threads: threadPaths,
      thread_sizes: allThreads.map(t => t.size),
      config,
      ...prepMeta,
    }, null, 2))

    // Remove any stale per-batch result files from a prior multi-batch run.
    for (const f of readdirSync(outDir)) {
      if (/^extract-results-\d+\.json$/.test(f)) unlinkSync(join(outDir, f))
    }

    const relPrep = prepPath.split(sep).join('/').replace(/^.*?wisdom\//, 'wisdom/')
    process.stderr.write(
      `[wisdom] Prep file written: ${relPrep}\n` +
      `[wisdom] Invoke the extract workflow from Claude Code, then run ` +
      `'node wisdom/wisdom.mjs extract --merge' to graft the results into staging.md.\n`,
    )
    if (flags.dryRun) {
      process.stderr.write('[wisdom] --dry-run: workflow not invoked; state not touched.\n')
    }
  } else {
    // Multi-batch mode
    allThreads.sort((a, b) => {
      const ch = a.channel.localeCompare(b.channel)
      if (ch !== 0) return ch
      return (a.created || '').localeCompare(b.created || '')
    })

    const batches = []
    for (let i = 0; i < allThreads.length; i += BATCH_SIZE) {
      const slice = allThreads.slice(i, i + BATCH_SIZE)
      const index = batches.length
      const file = `extract-batch-${index}.json`
      const channels = [...new Set(slice.map(t => t.channel))].sort()
      const dates = slice.filter(t => t.created).map(t => t.created).sort()

      batches.push({
        index,
        file,
        threadCount: slice.length,
        channels,
        threadRange: dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : null,
      })

      writeFileSync(
        join(outDir, file),
        JSON.stringify({
          threads: slice.map(t => t.path),
          thread_sizes: slice.map(t => t.size),
          config,
          ...prepMeta,
        }, null, 2),
      )
    }

    const manifest = {
      version: 1,
      ...prepMeta,
      totalThreads: allThreads.length,
      totalBatches: batches.length,
      config,
      batches,
    }
    writeFileSync(join(outDir, 'extract-manifest.json'), JSON.stringify(manifest, null, 2))

    process.stderr.write(
      `[wisdom] ${batches.length} batches written (${BATCH_SIZE} threads each, ${allThreads.length} total)\n` +
      `[wisdom] Manifest: wisdom/data/findings/extract-manifest.json\n` +
      `[wisdom] Invoke the extract workflow for each batch from Claude Code, then run ` +
      `'node wisdom/wisdom.mjs extract --merge' to graft the results into staging.md.\n`,
    )
  }
}

export async function runMerge(flags) {
  const threadsDir = flags.in || join(__dirname, '..', 'data', 'threads')
  const outDir = flags.out || join(__dirname, '..', 'data', 'findings')

  if (!existsSync(outDir)) {
    process.stderr.write('[wisdom] Findings directory not found\n')
    process.exit(1)
  }

  // Determine mode from the prep / manifest file (whichever exists)
  let mode = 'incremental'
  let sinceDate = null
  const prepPath = join(outDir, 'extract-prep.json')
  const manifestPath = join(outDir, 'extract-manifest.json')
  if (existsSync(prepPath)) {
    const prep = JSON.parse(readFileSync(prepPath, 'utf-8'))
    mode = prep.mode || 'incremental'
    sinceDate = prep.sinceDate || null
  } else if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    mode = manifest.mode || 'incremental'
    sinceDate = manifest.sinceDate || null
  }

  // Collect additions from extract-results-*.json
  const files = readdirSync(outDir)
    .filter(f => /^extract-results-\d+\.json$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))

  if (!files.length) {
    process.stderr.write('[wisdom] No result files (extract-results-*.json) to merge\n')
    process.exit(1)
  }

  let allAdditions = []
  for (const file of files) {
    const data = JSON.parse(readFileSync(join(outDir, file), 'utf-8'))
    const additions = Array.isArray(data) ? data : (data.additions || [])
    allAdditions = allAdditions.concat(additions)
  }

  process.stderr.write(`[wisdom] Merging ${allAdditions.length} additions from ${files.length} result file(s) | mode: ${mode}\n`)

  if (mode === 'since') {
    // Sideband output — no state update.
    const sideband = renderSideband(allAdditions)
    const outFile = sinceDate ? `staging-since-${sinceDate}.md` : 'staging-sideband.md'
    const outPath = join(outDir, outFile)
    writeFileSync(outPath, sideband)
    process.stderr.write(`[wisdom] Sideband output: ${outFile} (canonical staging.md and state are untouched)\n`)
    return
  }

  // Default / --all / --force: graft to staging.md and advance state.
  const state = loadState(outDir)
  const stats = graftAdditions(outDir, allAdditions, state)

  // Update state with the per-thread emissions
  const threadIds = new Set()
  for (const add of allAdditions) {
    for (const tid of (add.finding_ids || [])) threadIds.add(tid)
  }
  const threadMeta = findThreadMetadata(threadsDir, threadIds)

  // Group additions by thread_id
  const emissionsByThread = new Map()
  for (const add of allAdditions) {
    for (const tid of (add.finding_ids || [])) {
      if (!emissionsByThread.has(tid)) emissionsByThread.set(tid, [])
      emissionsByThread.get(tid).push({
        target_page: add.target_page,
        section: add.section,
        finding_ids: add.finding_ids,
      })
    }
  }

  let stateUpdated = 0, stateSkipped = 0
  for (const [tid, emissions] of emissionsByThread.entries()) {
    const meta = threadMeta.get(tid)
    if (!meta || !meta.last_message_id) { stateSkipped++; continue }
    recordEmission(state, tid, meta.last_message_id, meta.message_count, emissions)
    stateUpdated++
  }

  saveState(outDir, state)

  process.stderr.write(
    `[wisdom] Grafted: ${stats.replaced} replaced, ${stats.inserted} inserted, ${stats.refined} refined ` +
    `(${stats.total} total) | state: ${stateUpdated} threads recorded` +
    (stateSkipped ? `, ${stateSkipped} skipped (missing watermark)` : '') +
    `\n`,
  )
}

// Find each thread's frontmatter watermark by scanning the threads dir.
function findThreadMetadata(threadsDir, threadIds) {
  const result = new Map()
  if (!existsSync(threadsDir) || !threadIds.size) return result
  const channels = readdirSync(threadsDir, { withFileTypes: true })
  for (const ch of channels) {
    if (!ch.isDirectory()) continue
    const chDir = join(threadsDir, ch.name)
    let files
    try { files = readdirSync(chDir) } catch { continue }
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const tid = file.split('--')[0]
      if (!threadIds.has(tid)) continue
      try {
        const fm = parseThreadFrontmatter(readFileSync(join(chDir, file), 'utf-8'))
        result.set(tid, {
          last_message_id: fm.last_message_id || null,
          message_count: fm.message_count || 0,
        })
      } catch { /* skip unreadable */ }
    }
  }
  return result
}

function parseThreadFrontmatter(content) {
  content = content.replace(/\r\n/g, '\n')
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end === -1) return {}
  const block = content.slice(4, end)
  const result = {}

  for (const line of block.split('\n')) {
    const m = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/)
    if (!m) continue
    const key = m[1]
    let val = m[2].trim()

    // Inline array: [item, item, ...]
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim()
      if (!inner) { result[key] = []; continue }
      result[key] = inner.split(',').map(s => {
        s = s.trim()
        if ((s.startsWith('"') && s.endsWith('"')) ||
            (s.startsWith("'") && s.endsWith("'"))) {
          s = s.slice(1, -1)
        }
        return s
      })
      continue
    }

    // Strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }

    // Coerce booleans and numbers (but not snowflakes — those exceed 15 digits
    // and must stay as strings to avoid float precision loss)
    if (val === 'true') val = true
    else if (val === 'false') val = false
    else if (/^\d+$/.test(val) && val.length <= 15) val = parseInt(val, 10)

    result[key] = val
  }

  return result
}
