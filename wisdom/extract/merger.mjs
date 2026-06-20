// merger.mjs — graft new doc additions into the long-lived staging.md.
//
// Design (see wisdom/PLAN-3.md "Merge semantics"):
//
//   - Match key: (target_page, section, sorted(finding_ids))
//   - Match in staging.md: replace section body + meta in place.
//   - No match, but key is in extract-state.json's emission log: append with
//     a [REFINED?] marker (prior version was reviewed and removed).
//   - No match and never emitted: append at the end of the target_page's
//     contiguous group, creating the group if the page is new.
//   - Sections whose heading contains the literal string "LOCKED" are skipped
//     by the matcher — reviewer escape hatch.
//
// Atomic writes: temp file + rename, previous staging.md retained as
// staging.md.bak for one generation.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { buildEmissionKeySet, emissionKey } from './state.mjs'

const STAGING_FILE = 'staging.md'
const BACKUP_FILE = 'staging.md.bak'

const STAGING_H1 = '# Wisdom Extract -- Staging'
const UNMAPPED_H1 = '# Unmapped Findings'
const UNMAPPED_PREAMBLE =
  '_These findings do not map to an existing documentation page. The reviewer ' +
  'decides: create a new page, attach to a package index, fold into an existing page, ' +
  'or discard._'

const REFINED_MARKER = 'REFINED? -- previously processed; please diff against current docs page'

// ----------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------

/**
 * Graft `additions` into outDir/staging.md.  Updates state in place
 * (recording emissions per thread); caller is responsible for saveState.
 *
 * Returns a stats object: { replaced, inserted, refined, total }.
 */
export function graftAdditions(outDir, additions, state) {
  const stagingPath = join(outDir, STAGING_FILE)
  const backupPath = join(outDir, BACKUP_FILE)

  let parsed
  if (existsSync(stagingPath)) {
    const content = readFileSync(stagingPath, 'utf-8')
    parsed = parseStaging(content)
  } else {
    parsed = freshStaging()
  }

  const emissionKeys = buildEmissionKeySet(state)
  const stats = mergeIntoParsed(parsed, additions, emissionKeys)

  // Record emissions per thread so future runs can detect refinements.
  const byThread = new Map()
  for (const add of additions) {
    const ids = add.finding_ids || []
    for (const tid of ids) {
      if (!byThread.has(tid)) byThread.set(tid, [])
      byThread.get(tid).push({
        target_page: add.target_page,
        section: add.section,
        finding_ids: ids,
      })
    }
  }
  // Caller will use the returned per-thread emissions to update state.
  stats.emissionsByThread = byThread

  // Ensure UNMAPPED H1 is present if any UNMAPPED sections exist.
  ensureUnmappedHeader(parsed)

  // Atomic write: backup current, write to temp, rename.
  const serialized = serializeStaging(parsed)
  mkdirSync(outDir, { recursive: true })
  if (existsSync(stagingPath)) {
    copyFileSync(stagingPath, backupPath)
  }
  const tmpPath = stagingPath + '.tmp'
  writeFileSync(tmpPath, serialized)
  renameSync(tmpPath, stagingPath)

  return stats
}

/**
 * Render additions to a standalone sideband file (no merge, no state touch).
 * Used by `extract --since` to give the reviewer a peek without disturbing
 * the canonical staging file.
 */
export function renderSideband(additions) {
  const parsed = freshStaging()
  const stats = mergeIntoParsed(parsed, additions, new Set())
  ensureUnmappedHeader(parsed)
  return serializeStaging(parsed)
}

// ----------------------------------------------------------------------
// Parser
// ----------------------------------------------------------------------

/**
 * Parse staging.md into { preamble, sections } where:
 *   preamble: string[] — lines before the first `## ` heading
 *   sections: Section[] — each section parsed from a chunk delimited by `---`
 *
 * The parser is forgiving: anything it can't categorise gets preserved as
 * part of a section body so we never silently drop reviewer content.
 */
export function parseStaging(content) {
  const text = content.replace(/\r\n/g, '\n')
  const lines = text.split('\n')

  // Split on lines that are exactly "---".
  const chunks = []
  let current = []
  for (const line of lines) {
    if (line === '---') {
      chunks.push(current)
      current = []
    } else {
      current.push(line)
    }
  }
  if (current.length || chunks.length === 0) chunks.push(current)

  // First chunk = preamble + first section.  Subsequent chunks = sections.
  // Trailing chunk after the last `---` is usually blank lines; preserve as
  // a trailing-blank count.
  let preamble = []
  let firstSectionLines = null
  for (let i = 0; i < chunks[0].length; i++) {
    if (chunks[0][i].startsWith('## ')) {
      preamble = chunks[0].slice(0, i)
      firstSectionLines = chunks[0].slice(i)
      break
    }
  }
  if (!firstSectionLines) preamble = chunks[0]

  const sections = []
  if (firstSectionLines && firstSectionLines.length) {
    const s = parseSection(firstSectionLines)
    if (s) sections.push(s)
  }
  for (let i = 1; i < chunks.length; i++) {
    if (!chunks[i].length) continue
    const s = parseSection(chunks[i])
    if (s) sections.push(s)
  }

  // Strip leading/trailing blank lines from preamble.
  while (preamble.length && preamble[preamble.length - 1] === '') preamble.pop()

  return { preamble, sections }
}

function parseSection(lines) {
  // Strip leading/trailing blank lines.
  const buf = lines.slice()
  while (buf.length && buf[0] === '') buf.shift()
  while (buf.length && buf[buf.length - 1] === '') buf.pop()
  if (!buf.length) return null
  if (!buf[0].startsWith('## ')) return null

  const heading = buf[0]
  const parsedHeading = parseHeading(heading)

  // Walk backward to collect trailing meta lines (those wrapped in `_..._`).
  const meta = []
  let bodyEnd = buf.length
  for (let i = buf.length - 1; i >= 1; i--) {
    const ln = buf[i]
    if (ln === '') {
      bodyEnd = i
      continue
    }
    if (ln.startsWith('_') && ln.endsWith('_')) {
      meta.unshift(ln)
      bodyEnd = i
      continue
    }
    break
  }

  // Body = everything between the heading and the meta block, trimmed.
  let body = buf.slice(1, bodyEnd)
  while (body.length && body[0] === '') body.shift()
  while (body.length && body[body.length - 1] === '') body.pop()

  const metaParsed = parseMeta(meta)

  return {
    heading,
    headingRaw: heading,
    target_page: parsedHeading.target_page,
    section: parsedHeading.section,
    marker: parsedHeading.marker,
    locked: parsedHeading.marker ? parsedHeading.marker.includes('LOCKED') : false,
    body,
    finding_ids: metaParsed.finding_ids,
    confidence: metaParsed.confidence,
    date_earliest: metaParsed.date_earliest,
    date_latest: metaParsed.date_latest,
    reviewer_note: metaParsed.reviewer_note,
  }
}

function parseHeading(line) {
  // line = "## <target_page> · <section>" or with trailing " [<marker>]"
  if (!line.startsWith('## ')) return { target_page: '', section: '', marker: null }
  let rest = line.slice(3).trim()

  let marker = null
  if (rest.endsWith(']')) {
    const openIdx = rest.lastIndexOf(' [')
    if (openIdx > 0) {
      marker = rest.slice(openIdx + 2, rest.length - 1)
      rest = rest.slice(0, openIdx)
    }
  }

  const sepIdx = rest.lastIndexOf(' · ')
  if (sepIdx < 0) return { target_page: rest, section: '', marker }
  return {
    target_page: rest.slice(0, sepIdx),
    section: rest.slice(sepIdx + 3),
    marker,
  }
}

function parseMeta(metaLines) {
  let finding_ids = []
  let confidence = null
  let date_earliest = null
  let date_latest = null
  let reviewer_note = null

  for (const m of metaLines) {
    const src = m.match(/^_Source threads:\s*(.+?)\s*·\s*confidence:\s*(\w+)_$/)
    if (src) {
      finding_ids = src[1].split('·').map(s => s.trim()).filter(Boolean)
      confidence = src[2]
      continue
    }
    const date = m.match(/^_Date range:\s*(.+?)_$/)
    if (date) {
      const range = date[1].trim()
      const idx = range.indexOf(' to ')
      if (idx > 0) {
        date_earliest = range.slice(0, idx).trim()
        date_latest = range.slice(idx + 4).trim()
      } else {
        date_earliest = range
        date_latest = range
      }
      continue
    }
    const rev = m.match(/^_Reviewer note:\s*(.+)_$/)
    if (rev) {
      reviewer_note = rev[1].trim()
      continue
    }
  }

  return { finding_ids, confidence, date_earliest, date_latest, reviewer_note }
}

// ----------------------------------------------------------------------
// Merger
// ----------------------------------------------------------------------

function mergeIntoParsed(parsed, additions, emissionKeys) {
  const stats = { replaced: 0, inserted: 0, refined: 0, total: additions.length }

  // Build index of existing sections by match key (skip locked).
  const index = new Map()
  for (let i = 0; i < parsed.sections.length; i++) {
    const s = parsed.sections[i]
    if (s.locked) continue
    const k = emissionKey(s)
    if (!index.has(k)) index.set(k, i)
  }

  for (const add of additions) {
    const normalised = normaliseAddition(add)
    const k = emissionKey(normalised)

    if (index.has(k)) {
      // Replace in place — preserve heading marker (so [DUPLICATE?] etc.
      // carry through).
      const idx = index.get(k)
      const existing = parsed.sections[idx]
      parsed.sections[idx] = sectionFromAddition(normalised, existing.marker)
      stats.replaced++
      continue
    }

    const isRefined = emissionKeys.has(k)
    const marker = isRefined ? REFINED_MARKER : null
    const newSection = sectionFromAddition(normalised, marker)

    // Insert at end of the target_page's contiguous group.
    let insertIdx = -1
    for (let i = parsed.sections.length - 1; i >= 0; i--) {
      if (parsed.sections[i].target_page === normalised.target_page) {
        insertIdx = i + 1
        break
      }
    }

    if (insertIdx === -1) {
      // New target_page: UNMAPPED goes at the top (before mapped pages);
      // mapped pages go at the end.
      if (normalised.target_page === 'UNMAPPED') {
        // Find the first non-UNMAPPED section, insert before it.
        let firstMapped = parsed.sections.findIndex(s => s.target_page !== 'UNMAPPED')
        if (firstMapped === -1) firstMapped = parsed.sections.length
        parsed.sections.splice(firstMapped, 0, newSection)
        insertIdx = firstMapped
      } else {
        parsed.sections.push(newSection)
        insertIdx = parsed.sections.length - 1
      }
    } else {
      parsed.sections.splice(insertIdx, 0, newSection)
    }

    // Shift indices of existing entries at or after the insertion point.
    for (const [otherKey, otherIdx] of [...index.entries()]) {
      if (otherIdx >= insertIdx) index.set(otherKey, otherIdx + 1)
    }
    // Record the new section's index so later additions can match.
    index.set(k, insertIdx)

    if (isRefined) stats.refined++
    else stats.inserted++
  }

  return stats
}

function normaliseAddition(add) {
  return {
    target_page: add.target_page,
    section: add.section,
    finding_ids: [...(add.finding_ids || [])].sort(),
    confidence: add.confidence || 'medium',
    date_earliest: add.date_earliest || null,
    date_latest: add.date_latest || null,
    draft: add.draft || '',
    reviewer_note: add.reviewer_note || null,
  }
}

function sectionFromAddition(add, marker) {
  const headingPrefix = `## ${add.target_page} · ${add.section}`
  const heading = marker ? `${headingPrefix} [${marker}]` : headingPrefix
  return {
    heading,
    headingRaw: heading,
    target_page: add.target_page,
    section: add.section,
    marker: marker || null,
    locked: marker ? marker.includes('LOCKED') : false,
    body: add.draft.split('\n'),
    finding_ids: add.finding_ids,
    confidence: add.confidence,
    date_earliest: add.date_earliest,
    date_latest: add.date_latest,
    reviewer_note: add.reviewer_note,
  }
}

// ----------------------------------------------------------------------
// Preamble management
// ----------------------------------------------------------------------

function freshStaging() {
  return {
    preamble: [STAGING_H1],
    sections: [],
  }
}

function ensureUnmappedHeader(parsed) {
  const hasUnmapped = parsed.sections.some(s => s.target_page === 'UNMAPPED')
  const preambleStr = parsed.preamble.join('\n')
  const hasHeader = preambleStr.includes(UNMAPPED_H1)

  if (hasUnmapped && !hasHeader) {
    // Inject the UNMAPPED H1 + descriptive paragraph after the main H1.
    const mainH1Idx = parsed.preamble.findIndex(ln => ln.startsWith('# Wisdom Extract'))
    const insertAt = mainH1Idx >= 0 ? mainH1Idx + 1 : parsed.preamble.length
    parsed.preamble.splice(insertAt, 0, '', UNMAPPED_H1, '', UNMAPPED_PREAMBLE)
  }

  // Ensure the main H1 exists.
  if (!preambleStr.includes('# Wisdom Extract')) {
    parsed.preamble.unshift(STAGING_H1)
  }
}

// ----------------------------------------------------------------------
// Serialiser
// ----------------------------------------------------------------------

function serializeStaging(parsed) {
  const out = []
  for (const line of parsed.preamble) out.push(line)

  // Group sections: UNMAPPED first, then mapped (preserving in-group order).
  const unmapped = parsed.sections.filter(s => s.target_page === 'UNMAPPED')
  const mapped = parsed.sections.filter(s => s.target_page !== 'UNMAPPED')
  const ordered = [...unmapped, ...mapped]

  for (const s of ordered) {
    if (out.length && out[out.length - 1] !== '') out.push('')
    out.push(s.heading, '')
    for (const ln of s.body) out.push(ln)
    out.push('')
    out.push(formatSourceMeta(s))
    if (s.date_earliest || s.date_latest) out.push(formatDateMeta(s))
    if (s.reviewer_note) out.push(formatReviewerMeta(s))
    out.push('', '---', '')
  }

  // Trim trailing blanks but keep a single trailing newline.
  while (out.length && out[out.length - 1] === '') out.pop()
  return out.join('\n') + '\n'
}

function formatSourceMeta(s) {
  const ids = (s.finding_ids || []).join(' · ')
  return `_Source threads: ${ids} · confidence: ${s.confidence || 'medium'}_`
}

function formatDateMeta(s) {
  const range = s.date_earliest === s.date_latest
    ? s.date_earliest
    : `${s.date_earliest || '?'} to ${s.date_latest || '?'}`
  return `_Date range: ${range}_`
}

function formatReviewerMeta(s) {
  return `_Reviewer note: ${s.reviewer_note}_`
}
