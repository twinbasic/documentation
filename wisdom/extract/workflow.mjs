export const meta = {
  name: 'wisdom-extract',
  description: 'Extract technical knowledge from Discord threads and draft documentation additions',
  phases: [
    { title: 'Extract', detail: 'Read each thread and identify actionable findings' },
    { title: 'Draft', detail: 'Map findings to doc pages and draft prose additions' },
  ],
}

// --- Schemas (inlined — workflow scripts cannot import modules) ---

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          package:        { type: 'string' },
          symbol:         { type: ['string', 'null'] },
          kind:           { enum: ['gotcha', 'workaround', 'example', 'clarification', 'deprecation'] },
          summary:        { type: 'string' },
          detail:         { type: 'string' },
          confidence:     { enum: ['high', 'medium', 'low'] },
          date_earliest:  { type: 'string' },
          date_latest:    { type: 'string' },
        },
        required: ['package', 'kind', 'summary', 'detail', 'confidence',
                   'date_earliest', 'date_latest'],
      },
    },
  },
  required: ['findings'],
}

const ADDITION_SCHEMA = {
  type: 'object',
  properties: {
    additions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          target_page:    { type: 'string' },
          section:        { enum: ['after-remarks', 'example', 'see-also', 'new-section'] },
          draft:          { type: 'string' },
          confidence:     { enum: ['high', 'medium', 'low'] },
          date_earliest:  { type: 'string' },
          date_latest:    { type: 'string' },
          reviewer_note:  { type: ['string', 'null'] },
        },
        required: ['target_page', 'section', 'draft', 'confidence',
                   'date_earliest', 'date_latest'],
      },
    },
  },
  required: ['additions'],
}

// --- Helper functions (pure JS — no Node.js APIs) ---

function buildPageLookup(sitemap) {
  var lookup = {}
  for (var i = 0; i < sitemap.length; i++) {
    var entry = sitemap[i]
    var rel = entry.path.replace(/^docs\/Reference\//, '')
    var parts = rel.split('/')
    var pkg = parts[0]
    var key = pkg + '/' + entry.title
    lookup[key] = entry.path
    if (!lookup['_' + entry.title]) {
      lookup['_' + entry.title] = entry.path
    } else {
      lookup['_' + entry.title] = null
    }
  }
  return lookup
}

function resolveTargetPage(lookup, pkg, symbol) {
  if (symbol) {
    var dotParts = symbol.split('.')
    var className = dotParts[0]
    var qualified = lookup[pkg + '/' + className]
    if (qualified) return qualified
    var exact = lookup[pkg + '/' + symbol]
    if (exact) return exact
    var byTitle = lookup['_' + className]
    if (byTitle) return byTitle
    var bySymbol = lookup['_' + symbol]
    if (bySymbol) return bySymbol
  }
  var idx = lookup[pkg + '/' + pkg + ' Package']
  if (idx) return idx
  for (var k in lookup) {
    if (k.startsWith(pkg + '/') && lookup[k] && lookup[k].endsWith('index.md')) return lookup[k]
  }
  return null
}

function formatMeta(add) {
  var parts = []
  var sources = (add.finding_ids || []).join(' · ')
  parts.push('_Source threads: ' + sources + ' · confidence: ' + (add.confidence || 'medium') + '_')
  if (add.date_earliest || add.date_latest) {
    var range = add.date_earliest === add.date_latest
      ? add.date_earliest
      : (add.date_earliest || '?') + ' to ' + (add.date_latest || '?')
    parts.push('_Date range: ' + range + '_')
  }
  if (add.reviewer_note) parts.push('_Reviewer note: ' + add.reviewer_note + '_')
  return parts
}

function renderStaging(additions) {
  if (!additions.length) return '# Wisdom Extract -- Staging\n\nNo additions found.\n'

  var unmapped = []
  var mapped = []
  for (var i = 0; i < additions.length; i++) {
    if (additions[i].target_page === 'UNMAPPED') unmapped.push(additions[i])
    else mapped.push(additions[i])
  }

  var lines = ['# Wisdom Extract -- Staging', '']

  // Unmapped findings first
  if (unmapped.length) {
    lines.push('# Unmapped Findings', '')
    lines.push('_These findings do not map to an existing documentation page. The reviewer ' +
      'decides: create a new page, attach to a package index, fold into an existing page, ' +
      'or discard._', '')
    for (var ui = 0; ui < unmapped.length; ui++) {
      var u = unmapped[ui]
      lines.push('## UNMAPPED · ' + u.section, '')
      lines.push(u.draft, '')
      var meta = formatMeta(u)
      for (var ml = 0; ml < meta.length; ml++) lines.push(meta[ml])
      lines.push('', '---', '')
    }
  }

  // Mapped additions grouped by target page + section
  if (mapped.length) {
    var groups = {}
    for (var mi = 0; mi < mapped.length; mi++) {
      var add = mapped[mi]
      var key = add.target_page + ' · ' + add.section
      if (!groups[key]) groups[key] = []
      groups[key].push(add)
    }

    var keys = Object.keys(groups).sort()
    for (var ki = 0; ki < keys.length; ki++) {
      var adds = groups[keys[ki]]
      for (var ai = 0; ai < adds.length; ai++) {
        var a = adds[ai]
        var heading = '## ' + keys[ki]
        if (adds.length > 1) {
          var others = []
          for (var oi = 0; oi < adds.length; oi++) {
            if (oi !== ai) {
              var ids = adds[oi].finding_ids || []
              for (var fi = 0; fi < ids.length; fi++) others.push(ids[fi])
            }
          }
          heading += ' [DUPLICATE? -- see also thread ' + others.join(', ') + ']'
        }
        lines.push(heading, '')
        lines.push(a.draft, '')
        var meta = formatMeta(a)
        for (var ml = 0; ml < meta.length; ml++) lines.push(meta[ml])
        lines.push('', '---', '')
      }
    }
  }

  return lines.join('\n')
}

// --- Main workflow ---

// args: {
//   sitemap:        [{path, title, permalink, parent}],
//   packageSummary: string,
//   threads:        [{path, thread_id, channel, created, message_count, has_answer, tags}],
//   config:         {minConfidence, dryRun}
// }

var CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 }
var minConf = CONFIDENCE_RANK[(args.config && args.config.minConfidence) || 'low']
var pageLookup = buildPageLookup(args.sitemap)

log('Processing ' + args.threads.length + ' threads against ' + args.sitemap.length + ' doc pages')

phase('Extract')

var results = await pipeline(
  args.threads,

  // Stage 1: extraction — read thread, identify findings
  function (thread) {
    return agent(
      'You are analyzing a Discord thread from the twinBASIC community for actionable ' +
      'technical knowledge that belongs in the twinBASIC documentation.\n\n' +

      'Read the thread file at: ' + thread.path + '\n\n' +

      'The documentation site covers these packages and symbols:\n' +
      args.packageSummary + '\n\n' +

      'Extract actionable findings: gotchas, workarounds, non-obvious behaviors, usage ' +
      'patterns, corrected misconceptions. Return an empty findings array if the thread ' +
      'is off-topic, purely social, unanswered, or has no actionable technical content.\n\n' +

      'Rules:\n' +
      '- One finding per distinct technical point. Do not bundle unrelated points.\n' +
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

      'Thread metadata:\n' +
      '  Thread ID: ' + thread.thread_id + '\n' +
      '  Channel: ' + thread.channel + '\n' +
      '  Has answer tag: ' + thread.has_answer + '\n' +
      '  Message count: ' + thread.message_count + '\n' +
      '  Tags: ' + ((thread.tags && thread.tags.length) ? thread.tags.join(', ') : 'none') + '\n',
      {
        label: 'extract:' + thread.channel + '/' + thread.thread_id,
        phase: 'Extract',
        schema: EXTRACTION_SCHEMA,
      }
    )
  },

  // Stage 2: drafting — map findings to doc pages, write prose
  function (extraction, thread) {
    if (!extraction || !extraction.findings || !extraction.findings.length) return null

    // Filter by minimum confidence
    var findings = []
    for (var i = 0; i < extraction.findings.length; i++) {
      var f = extraction.findings[i]
      if (CONFIDENCE_RANK[f.confidence] >= minConf) findings.push(f)
    }
    if (!findings.length) return null

    // Resolve target pages and add source_thread
    var mapped = []
    for (var j = 0; j < findings.length; j++) {
      var finding = findings[j]
      mapped.push({
        package: finding.package,
        symbol: finding.symbol,
        kind: finding.kind,
        summary: finding.summary,
        detail: finding.detail,
        confidence: finding.confidence,
        source_thread: thread.thread_id,
        resolved_page: resolveTargetPage(pageLookup, finding.package, finding.symbol),
      })
    }

    // Collect unique target pages for the agent to read
    var seen = {}
    var targetPages = []
    for (var k = 0; k < mapped.length; k++) {
      var rp = mapped[k].resolved_page
      if (rp && !seen[rp]) {
        seen[rp] = true
        targetPages.push(rp)
      }
    }

    return agent(
      'You are drafting documentation additions for the twinBASIC docs site based on ' +
      'findings extracted from a Discord thread.\n\n' +

      (targetPages.length
        ? 'Read these documentation pages to understand their current content and formatting:\n' +
          targetPages.map(function (p) { return '- ' + p }).join('\n') + '\n\n'
        : '') +

      'Findings to draft additions for:\n' +
      JSON.stringify(mapped, null, 2) + '\n\n' +

      'Rules:\n' +
      '- Produce one addition per logical insertion point. Merge related findings ' +
        'targeting the same page section into a single addition.\n' +
      '- target_page: repo-relative path (e.g. "docs/Reference/WebView2/WebView2/index.md"). ' +
        'Use the resolved_page from the finding when available. If it is null and you can ' +
        'identify an appropriate existing page, use that. If no existing page fits, set ' +
        'target_page to "UNMAPPED" — do NOT skip the finding.\n' +
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
      '- date_earliest, date_latest: the overall date range across all contributing findings ' +
        '(earliest of all date_earliest values, latest of all date_latest values).\n' +
      '- reviewer_note: set when the draft needs verification against the .twin source, ' +
        'or when it may conflict with existing page content. For UNMAPPED findings, include ' +
        'the package and symbol so the reviewer can triage placement. null otherwise.\n',
      {
        label: 'draft:' + thread.channel + '/' + thread.thread_id,
        phase: 'Draft',
        schema: ADDITION_SCHEMA,
      }
    )
  }
)

// --- Assemble results ---

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
      finding_ids:   [args.threads[ri].thread_id],
      confidence:    add.confidence || 'medium',
      date_earliest: add.date_earliest || null,
      date_latest:   add.date_latest || null,
      reviewer_note: add.reviewer_note || null,
    })
  }
}

log('Extracted ' + allAdditions.length + ' additions from ' + args.threads.length + ' threads')

var staging = renderStaging(allAdditions)

return { additions: allAdditions, staging: staging }
