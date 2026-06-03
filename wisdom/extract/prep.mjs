import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSitemap, buildPackageSummary } from './sitemap.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

export async function runExtract(flags) {
  const threadsDir = flags.in || join(__dirname, '..', 'data', 'threads')
  const outDir = flags.out || join(__dirname, '..', 'data', 'findings')
  const docsDir = join(REPO_ROOT, 'docs', 'Reference')

  if (!existsSync(threadsDir)) {
    process.stderr.write('[wisdom] Threads directory not found — run process first\n')
    process.exit(1)
  }

  // Build docs sitemap
  const sitemap = buildSitemap(docsDir, REPO_ROOT)
  const packageSummary = buildPackageSummary(sitemap)
  process.stderr.write(`[wisdom] Sitemap: ${sitemap.length} reference pages\n`)

  // Scan thread .md files
  const sinceMs = flags.since ? Date.parse(flags.since) : null
  const channelFilter = flags.channels?.length ? new Set(flags.channels) : null

  const threads = []
  const subdirs = readdirSync(threadsDir, { withFileTypes: true })

  for (const entry of subdirs) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      // Top-level channel files — skip, these are text channel dumps not forum threads
      continue
    }
    if (!entry.isDirectory()) continue

    const channelName = entry.name
    if (channelFilter && !channelFilter.has(channelName)) continue

    const channelDir = join(threadsDir, channelName)
    const files = readdirSync(channelDir).filter(f => f.endsWith('.md')).sort()

    for (const file of files) {
      const filePath = join(channelDir, file)
      const fm = parseThreadFrontmatter(readFileSync(filePath, 'utf-8'))
      if (!fm.thread_id) continue

      if (sinceMs && fm.created) {
        if (Date.parse(fm.created) < sinceMs) continue
      }

      threads.push({
        path: filePath.split(sep).join('/').replace(/^.*?wisdom\//, 'wisdom/'),
        thread_id: fm.thread_id,
        channel: fm.channel || channelName,
        created: fm.created || null,
        message_count: fm.message_count || 0,
        has_answer: fm.has_answer === 'true' || fm.has_answer === true,
        tags: fm.tags || [],
      })
    }
  }

  process.stderr.write(`[wisdom] Threads: ${threads.length} (after filters)\n`)

  if (!threads.length) {
    process.stderr.write('[wisdom] No threads to process\n')
    return
  }

  // Write prep file
  mkdirSync(outDir, { recursive: true })
  const prepPath = join(outDir, 'extract-prep.json')
  const prep = {
    sitemap,
    packageSummary,
    threads,
    config: {
      minConfidence: flags.minConfidence || 'low',
      dryRun: !!flags.dryRun,
    },
  }
  writeFileSync(prepPath, JSON.stringify(prep, null, 2))

  const relPrep = prepPath.split(sep).join('/').replace(/^.*?wisdom\//, 'wisdom/')
  process.stderr.write(
    `[wisdom] Prep file written: ${relPrep}\n` +
    `[wisdom] Invoke the extract workflow from Claude Code with this data as args.\n`,
  )
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

    // Coerce booleans and numbers
    if (val === 'true') val = true
    else if (val === 'false') val = false
    else if (/^\d+$/.test(val) && val.length <= 15) val = parseInt(val, 10)

    result[key] = val
  }

  return result
}
