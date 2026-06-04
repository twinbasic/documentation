// extract-state.json — Phase 3 watermark + emission log.
//
// Shape:
//   {
//     "version": 1,
//     "lastRun": "2026-06-04T15:35:00Z",
//     "processedThreads": {
//       "<thread_id>": {
//         "last_message_id": "<snowflake>",
//         "message_count": 12,
//         "emitted": [{ "target_page": "...", "section": "...", "finding_ids": [...] }]
//       }
//     }
//   }
//
// last_message_id and message_count are read from each thread's frontmatter
// (emitted by Phase 2's process step) and compared against the stored values.
// A thread is included for re-extraction iff either field differs from the
// stored value, or the thread is not in processedThreads at all.
//
// emitted records the (target_page, section, finding_ids) tuples this thread
// has previously contributed to staging.md.  The merge step uses this to
// detect "previously-emitted finding that's no longer in staging.md" and
// emit a [REFINED?] marker rather than silently inserting.
//
// State is updated only on successful merge.  A workflow failure mid-pipeline
// leaves state untouched, so the next run retries the same threads.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const STATE_FILE = 'extract-state.json'
const STATE_VERSION = 1

/**
 * Load state from outDir/extract-state.json, or return an empty state if the
 * file doesn't exist.  Corrupt or wrong-version files trigger a clear error
 * rather than silent reset (we never want to lose the emission log by accident).
 */
export function loadState(outDir) {
  const path = join(outDir, STATE_FILE)
  if (!existsSync(path)) {
    return { version: STATE_VERSION, lastRun: null, processedThreads: {} }
  }
  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf-8'))
  } catch (err) {
    throw new Error(`extract-state.json is corrupt: ${err.message}. Delete it to reset state.`)
  }
  if (data.version !== STATE_VERSION) {
    throw new Error(
      `extract-state.json version mismatch (file: ${data.version}, expected: ${STATE_VERSION}). ` +
      `Delete it to reset state, or migrate manually.`,
    )
  }
  if (!data.processedThreads) data.processedThreads = {}
  return data
}

/**
 * Write state atomically (temp file + rename).  Sets lastRun to current ISO
 * timestamp.  Caller must ensure outDir exists.
 */
export function saveState(outDir, state) {
  mkdirSync(outDir, { recursive: true })
  const path = join(outDir, STATE_FILE)
  const tmpPath = path + '.tmp'
  const serialized = {
    version: STATE_VERSION,
    lastRun: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    processedThreads: state.processedThreads || {},
  }
  writeFileSync(tmpPath, JSON.stringify(serialized, null, 2))
  renameSync(tmpPath, path)
}

/**
 * Returns true if the thread's current (last_message_id, message_count) pair
 * differs from the stored values, or if the thread is not in state at all.
 *
 * Comparison is string-equality on last_message_id (snowflakes are strings to
 * avoid float precision loss on 19-digit values) and numeric on message_count.
 */
export function isThreadChanged(state, threadId, last_message_id, message_count) {
  const entry = state.processedThreads?.[threadId]
  if (!entry) return true
  if (entry.last_message_id !== last_message_id) return true
  if (entry.message_count !== message_count) return true
  return false
}

/**
 * Record that a thread's findings have been emitted to staging.md.
 *
 * Updates state.processedThreads[threadId] with the current watermark values
 * and merges the new emissions into the existing emission log (deduplicated
 * by (target_page, section, sorted finding_ids)).
 *
 * `emissions` is an array of { target_page, section, finding_ids } objects.
 * Mutates state in place; caller is responsible for saveState() after a batch.
 */
export function recordEmission(state, threadId, last_message_id, message_count, emissions) {
  if (!state.processedThreads) state.processedThreads = {}
  const existing = state.processedThreads[threadId] || { emitted: [] }
  if (!existing.emitted) existing.emitted = []

  // Dedup the merged emission log.
  const seen = new Set()
  const merged = []
  for (const list of [existing.emitted, emissions]) {
    for (const e of list) {
      const k = emissionKey(e)
      if (seen.has(k)) continue
      seen.add(k)
      merged.push({
        target_page: e.target_page,
        section: e.section,
        finding_ids: [...(e.finding_ids || [])].sort(),
      })
    }
  }

  state.processedThreads[threadId] = {
    last_message_id,
    message_count,
    emitted: merged,
  }
}

/**
 * Build a Set of every (target_page, section, finding_ids) key the state file
 * has ever emitted.  The merger uses this to detect refined findings whose
 * prior section has been removed from staging.md (presumably reviewed and
 * integrated) — those get a [REFINED?] marker on re-emission.
 */
export function buildEmissionKeySet(state) {
  const set = new Set()
  for (const tid of Object.keys(state.processedThreads || {})) {
    for (const e of state.processedThreads[tid].emitted || []) {
      set.add(emissionKey(e))
    }
  }
  return set
}

/**
 * Canonical match-key for a (target_page, section, finding_ids) tuple.
 * Used both for in-staging.md section indexing and for the emission log.
 */
export function emissionKey(e) {
  const ids = [...(e.finding_ids || [])].sort().join(',')
  return `${e.target_page}\t${e.section}\t${ids}`
}
