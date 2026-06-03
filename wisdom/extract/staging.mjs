function formatMeta(add) {
  const parts = []
  const sources = (add.finding_ids || []).join(' · ')
  parts.push(`_Source threads: ${sources} · confidence: ${add.confidence || 'medium'}_`)
  if (add.date_earliest || add.date_latest) {
    const range = add.date_earliest === add.date_latest
      ? add.date_earliest
      : `${add.date_earliest || '?'} to ${add.date_latest || '?'}`
    parts.push(`_Date range: ${range}_`)
  }
  if (add.reviewer_note) parts.push(`_Reviewer note: ${add.reviewer_note}_`)
  return parts
}

export function renderStaging(additions) {
  if (!additions.length) return '# Wisdom Extract -- Staging\n\nNo additions found.\n'

  const unmapped = additions.filter(a => a.target_page === 'UNMAPPED')
  const mapped = additions.filter(a => a.target_page !== 'UNMAPPED')

  const lines = ['# Wisdom Extract -- Staging', '']

  // Unmapped findings first
  if (unmapped.length) {
    lines.push('# Unmapped Findings', '')
    lines.push(
      '_These findings do not map to an existing documentation page. The reviewer ' +
      'decides: create a new page, attach to a package index, fold into an existing page, ' +
      'or discard._', '',
    )
    for (const u of unmapped) {
      lines.push(`## UNMAPPED · ${u.section}`, '')
      lines.push(u.draft, '')
      lines.push(...formatMeta(u))
      lines.push('', '---', '')
    }
  }

  // Mapped additions grouped by target page + section
  if (mapped.length) {
    const groups = new Map()
    for (const add of mapped) {
      const key = `${add.target_page} · ${add.section}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(add)
    }

    for (const key of [...groups.keys()].sort()) {
      const adds = groups.get(key)
      for (let i = 0; i < adds.length; i++) {
        const add = adds[i]
        let heading = `## ${key}`
        if (adds.length > 1) {
          const others = adds
            .filter((_, j) => j !== i)
            .flatMap(a => a.finding_ids || [])
            .join(', ')
          heading += ` [DUPLICATE? -- see also thread ${others}]`
        }
        lines.push(heading, '')
        lines.push(add.draft, '')
        lines.push(...formatMeta(add))
        lines.push('', '---', '')
      }
    }
  }

  return lines.join('\n')
}
