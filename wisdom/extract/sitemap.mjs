import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export function buildSitemap(docsDir, rootDir) {
  const root = rootDir || process.cwd()
  const entries = []
  walk(docsDir, filePath => {
    if (!filePath.endsWith('.md')) return
    const fm = parseFrontmatter(readFileSync(filePath, 'utf-8'))
    if (!fm.title || !fm.permalink) return
    entries.push({
      path: relative(root, filePath).split(sep).join('/'),
      title: fm.title,
      permalink: fm.permalink,
      parent: fm.parent || null,
    })
  })
  return entries
}

export function buildPackageSummary(sitemap) {
  const groups = {}
  for (const entry of sitemap) {
    const rel = entry.path.replace(/^docs\/Reference\//, '')
    const parts = rel.split('/')
    if (parts.length < 2) continue
    const pkg = parts[0]
    const isModule = (pkg === 'VBA' || pkg === 'VBRUN') && parts.length > 2
    const group = isModule ? `${pkg} > ${parts[1]}` : pkg
    if (!groups[group]) groups[group] = new Set()
    if (!entry.title.endsWith(' Package') && !entry.title.endsWith(' Module')) {
      groups[group].add(entry.title)
    }
  }
  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, titles]) => `- ${group}: ${[...titles].sort().join(', ')}`)
    .join('\n')
}

function walk(dir, callback) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, callback)
    else callback(full)
  }
}

function parseFrontmatter(content) {
  content = content.replace(/\r\n/g, '\n')
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end === -1) return {}
  const block = content.slice(4, end)
  const result = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/)
    if (!m) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    result[m[1]] = val
  }
  return result
}
