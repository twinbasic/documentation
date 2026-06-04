// Invocation (after running `node wisdom/wisdom.mjs extract`):
//
// Single-batch (<=200 threads — prep writes extract-prep.json):
//   1. Read wisdom/data/findings/extract-prep.json, pass its parsed contents
//      as `args` to the Workflow tool with scriptPath
//      "wisdom/extract/workflow.mjs".
//   2. Write the returned additions array to extract-results-0.json.
//   3. Run `node wisdom/wisdom.mjs extract --merge` to graft the results into
//      staging.md and advance the watermark in extract-state.json.
//
// Multi-batch (>200 threads — prep writes extract-manifest.json + batch files):
//   1. Read wisdom/data/findings/extract-manifest.json.
//   2. For each batch in manifest.batches:
//      a. Read the batch file (e.g. extract-batch-0.json).
//      b. Pass its contents as `args` to the Workflow tool.
//      c. Write the returned additions array to extract-results-{i}.json.
//      d. Skip batches whose result file already exists (resumability).
//   3. Run `node wisdom/wisdom.mjs extract --merge` to graft all batches.
//
// Batch files are small (~19 KB): thread file paths, per-thread file sizes
// (for byte-budget grouping), and config.  Shared reference data
// (package-summary.txt, page-index.json) lives in wisdom/data/findings/ and
// is read by agents directly.  The Workflow tool delivers args as a JSON
// string, so the script parses it on entry.
//
// The workflow returns { additions: [...] } only — no rendered staging.
// Rendering and grafting are handled by `extract --merge`, which preserves
// pending review state in the long-lived staging.md.

export const meta = {
  name: 'wisdom-extract',
  description: 'Extract technical knowledge from Discord threads and draft documentation additions',
  phases: [
    { title: 'Extract', detail: 'Read each thread and identify actionable findings' },
    { title: 'Draft', detail: 'Map findings to doc pages and draft prose additions' },
  ],
}

// --- Schemas (inlined — workflow scripts cannot import modules) ---

var EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thread_path:    { type: 'string' },
          package:        { type: 'string' },
          symbol:         { type: ['string', 'null'] },
          kind:           { enum: ['gotcha', 'workaround', 'example', 'clarification', 'deprecation'] },
          summary:        { type: 'string' },
          detail:         { type: 'string' },
          confidence:     { enum: ['high', 'medium', 'low'] },
          date_earliest:  { type: 'string' },
          date_latest:    { type: 'string' },
        },
        required: ['thread_path', 'package', 'kind', 'summary', 'detail', 'confidence',
                   'date_earliest', 'date_latest'],
      },
    },
  },
  required: ['findings'],
}

var ADDITION_SCHEMA = {
  type: 'object',
  properties: {
    additions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thread_path:    { type: 'string' },
          target_page:    { type: 'string' },
          section:        { enum: ['after-remarks', 'example', 'see-also', 'new-section'] },
          draft:          { type: 'string' },
          confidence:     { enum: ['high', 'medium', 'low'] },
          date_earliest:  { type: 'string' },
          date_latest:    { type: 'string' },
          reviewer_note:  { type: ['string', 'null'] },
        },
        required: ['thread_path', 'target_page', 'section', 'draft', 'confidence',
                   'date_earliest', 'date_latest'],
      },
    },
  },
  required: ['additions'],
}

// --- Shared file paths (written by the prep step, read by agents) ---

var FINDINGS_DIR = 'wisdom/data/findings'
var PKG_SUMMARY_FILE = FINDINGS_DIR + '/package-summary.txt'
var PAGE_INDEX_FILE = FINDINGS_DIR + '/page-index.json'

// --- Main workflow ---

// args (JSON string, parsed below): {
//   threads:      [path, ...],        — file paths to thread .md files
//   thread_sizes: [bytes, ...],       — parallel array of file sizes (for grouping)
//   config:       { minConfidence }
// }

var data = typeof args === 'string' ? JSON.parse(args) : args

var CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 }
var minConf = CONFIDENCE_RANK[(data.config && data.config.minConfidence) || 'low']

// --- Group threads by total bytes to reduce agent calls ---
// Threads above MAX_SOLO_SIZE get their own group.  Everything else is packed
// into groups whose cumulative size approaches TARGET_GROUP_BYTES.

var TARGET_GROUP_BYTES = 25000
var MAX_SOLO_SIZE = 15000

var groups = []
var currentGroup = [], currentBytes = 0
for (var ti = 0; ti < data.threads.length; ti++) {
  var tp = data.threads[ti]
  var size = (data.thread_sizes && data.thread_sizes[ti]) || 3000
  if (size > MAX_SOLO_SIZE) {
    groups.push([tp])
  } else {
    currentGroup.push(tp)
    currentBytes += size
    if (currentBytes >= TARGET_GROUP_BYTES) {
      groups.push(currentGroup)
      currentGroup = []; currentBytes = 0
    }
  }
}
if (currentGroup.length) groups.push(currentGroup)

log('Processing ' + data.threads.length + ' threads in ' + groups.length + ' groups (' +
    groups.filter(function(g) { return g.length > 1 }).length + ' batched, ' +
    groups.filter(function(g) { return g.length === 1 }).length + ' solo)')

phase('Extract')

var results = await pipeline(
  groups,

  // Stage 1: extraction — read thread(s), identify findings
  function (group) {
    var firstName = group[0].split('/').pop().replace(/\.md$/, '')
    if (firstName.length > 40) firstName = firstName.slice(0, 40)
    var label = group.length > 1
      ? firstName + '+' + (group.length - 1)
      : firstName

    var fileList = ''
    for (var gi = 0; gi < group.length; gi++) {
      fileList += (gi + 1) + '. Read: ' + group[gi] + '\n'
    }

    return agent(
      'You are analyzing ' + group.length + ' Discord thread(s) from the twinBASIC ' +
      'community for actionable technical knowledge that belongs in the twinBASIC ' +
      'documentation.\n\n' +

      '## Input files\n\n' +

      fileList +
      (group.length + 1) + '. Read the package summary at: ' + PKG_SUMMARY_FILE + '\n' +
      '   This lists every documented package and its public symbols.\n\n' +

      'Each thread file has YAML frontmatter (thread_id, channel, message_count, ' +
      'has_answer, tags) followed by the rendered conversation.\n\n' +

      '## Task\n\n' +

      'Extract actionable findings: gotchas, workarounds, non-obvious behaviors, usage ' +
      'patterns, corrected misconceptions. Return an empty findings array if none of ' +
      'the threads contain actionable technical content.\n\n' +

      '## Rules\n\n' +

      '- One finding per distinct technical point. Do not bundle unrelated points.\n' +
      '- thread_path: the EXACT file path of the thread this finding came from ' +
        '(copy it verbatim from the list above).\n' +
      '- package: the top-level package name (e.g. "WebView2", "VBA", "VB", "CEF", ' +
        '"CustomControls", "VBRUN", "Core").\n' +
      '- symbol: the most specific qualified name (e.g. "WebView2.Navigate", "Split", ' +
        '"CheckBox.Value"). null only for package-level findings.\n' +
      '- kind: "gotcha" for surprising pitfalls, "workaround" for known-issue fixes, ' +
        '"example" for useful usage patterns, "clarification" for corrected misconceptions, ' +
        '"deprecation" for deprecated features.\n' +
      '- confidence:\n' +
      '    "high" — confirmed by a twinBASIC maintainer (username containing "Wayne" or ' +
        '"EA" suffix), or agreed upon by 2+ independent users.\n' +
      '    "medium" — one clear, plausible explanation from a knowledgeable user.\n' +
      '    "low" — single user, untested suggestion, hedged claim ("I think", "maybe").\n' +
      '- detail: self-contained prose. The reader has no access to the original thread.\n' +
      '- date_earliest, date_latest: YYYY-MM-DD dates of the earliest and latest messages ' +
        'that inform this finding. Use the timestamps shown on each message line.\n' +
      '- Do not extract findings about already-obvious API surface behavior.\n' +
      '- Prefer findings that are surprising or not obvious from the API alone.\n\n' +
      'IMPORTANT: You MUST return your result by calling the StructuredOutput tool. ' +
      'Do NOT respond with plain text. Call the StructuredOutput tool with a ' +
      '{"findings": [...]} object matching the required schema. If there are no ' +
      'findings, call StructuredOutput with {"findings": []}.\n',
      {
        label: 'extract:' + label,
        phase: 'Extract',
        schema: EXTRACTION_SCHEMA,
        model: 'sonnet',
      }
    )
  },

  // Stage 2: drafting — map findings to doc pages, write prose
  function (extraction, group) {
    if (!extraction || !extraction.findings || !extraction.findings.length) return null

    // Filter by minimum confidence
    var findings = []
    for (var i = 0; i < extraction.findings.length; i++) {
      var f = extraction.findings[i]
      if (CONFIDENCE_RANK[f.confidence] >= minConf) findings.push(f)
    }
    if (!findings.length) return null

    var firstName = group[0].split('/').pop().replace(/\.md$/, '')
    if (firstName.length > 40) firstName = firstName.slice(0, 40)
    var label = group.length > 1
      ? firstName + '+' + (group.length - 1)
      : firstName

    return agent(
      'You are drafting documentation additions for the twinBASIC docs site based on ' +
      'findings extracted from Discord threads.\n\n' +

      '## Input files\n\n' +

      '1. Read the page index at: ' + PAGE_INDEX_FILE + '\n' +
      '   This is a JSON object mapping "Package/Title" keys to repo-relative file paths ' +
      '(e.g. "VBA/AppActivate" → "docs/Reference/VBA/Interaction/AppActivate.md"). ' +
      'Unambiguous titles also appear as bare keys (e.g. "AppActivate" → same path).\n' +
      '2. For each finding, resolve its target page:\n' +
      '   a. Look up "<package>/<symbol>" (e.g. "WebView2/Navigate").\n' +
      '   b. If symbol has a dot, also try "<package>/<className>" ' +
        '(e.g. "WebView2/WebView2" for "WebView2.Navigate").\n' +
      '   c. Fall back to "<package>/<Package> Package" for the package index page.\n' +
      '   d. If none match, set target_page to "UNMAPPED".\n' +
      '3. Read each resolved target page to understand its current content and formatting.\n\n' +

      '## Findings to draft\n\n' +

      JSON.stringify(findings, null, 2) + '\n\n' +

      '## Rules\n\n' +

      '- Produce one addition per logical insertion point. Merge related findings ' +
        'targeting the same page section into a single addition.\n' +
      '- thread_path: copy the thread_path from the finding(s) this addition is based on. ' +
        'If an addition merges findings from multiple threads, use the thread_path of the ' +
        'primary (highest-confidence) finding.\n' +
      '- target_page: repo-relative path (e.g. "docs/Reference/WebView2/WebView2/index.md"). ' +
        'Use the resolved path from the page index. If resolution fails and you can ' +
        'identify an appropriate existing page by reading nearby files, use that. ' +
        'Otherwise set target_page to "UNMAPPED" — do NOT skip the finding.\n' +
      '- section: "after-remarks" for behavioral notes and gotchas, "example" for code ' +
        'examples, "see-also" for cross-references, "new-section" for substantial new content.\n' +
      '- draft: the exact Markdown prose to insert.\n' +
      '    Use `> [!NOTE]` callouts for non-obvious behavioral clarifications.\n' +
      '    Use ```tb for twinBASIC code blocks.\n' +
      '    Use "--" for en-dashes, "---" for em-dashes (never literal — or –).\n' +
      '    Write in third-person impersonal, active voice, present tense.\n' +
      '    Plain English for an international audience.\n' +
      '    Do not reproduce findings verbatim — rewrite in the site\'s voice.\n' +
      '- For See Also entries: `- [Symbol](relative-url) -- short description`\n' +
      '- confidence: highest confidence among the contributing findings.\n' +
      '- date_earliest, date_latest: the overall date range across all contributing findings.\n' +
      '- reviewer_note: set when the draft needs verification against the .twin source, ' +
        'or when it may conflict with existing page content. For UNMAPPED findings, include ' +
        'the package and symbol so the reviewer can triage placement. null otherwise.\n\n' +
      'IMPORTANT: You MUST return your result by calling the StructuredOutput tool. ' +
      'Do NOT respond with plain text. Call the StructuredOutput tool with an ' +
      '{"additions": [...]} object matching the required schema.\n',
      {
        label: 'draft:' + label,
        phase: 'Draft',
        schema: ADDITION_SCHEMA,
        model: 'sonnet',
      }
    )
  }
)

// --- Assemble results ---

function threadIdFromPath(p) {
  var parts = (p || '').split('/')
  var filename = parts[parts.length - 1] || ''
  return filename.split('--')[0]
}

var allAdditions = []
for (var ri = 0; ri < results.length; ri++) {
  var r = results[ri]
  if (!r || !r.additions || !r.additions.length) continue

  for (var ai = 0; ai < r.additions.length; ai++) {
    var add = r.additions[ai]
    allAdditions.push({
      target_page:   add.target_page,
      section:       add.section,
      draft:         add.draft,
      finding_ids:   [threadIdFromPath(add.thread_path)],
      confidence:    add.confidence || 'medium',
      date_earliest: add.date_earliest || null,
      date_latest:   add.date_latest || null,
      reviewer_note: add.reviewer_note || null,
    })
  }
}

log('Extracted ' + allAdditions.length + ' additions from ' + data.threads.length + ' threads')

return { additions: allAdditions }
