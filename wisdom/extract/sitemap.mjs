import { join, relative, sep } from 'node:path'
import { markdownFiles } from '../../lib/markdown-files.mjs'
import { readFrontmatter } from '../files.mjs'

export async function buildSitemap(docsDir, rootDir) {
  const root = rootDir || process.cwd()
  const entries = []
  for (const rel of await markdownFiles(docsDir)) {
    const filePath = join(docsDir, rel)
    const fm = readFrontmatter(filePath)
    if (!fm.title || !fm.permalink) continue
    entries.push({
      path: relative(root, filePath).split(sep).join('/'),
      title: fm.title,
      permalink: fm.permalink,
      parent: fm.parent || null,
    })
  }
  return entries
}

// A reference page's path from its package down: docs/Reference/Default/VBA/
// Strings/Len.md gives [VBA, Strings, Len.md].  Default/ and Built-In/ only sort
// the packages into those every project references and those it may; Core/,
// the language itself, sits directly under docs/Reference/.
function packageParts(path) {
  return path.replace(/^docs\/Reference\/(?:(?:Default|Built-In)\/)?/, '').split('/')
}

export function buildPackageSummary(sitemap) {
  const groups = {}
  for (const entry of sitemap) {
    const parts = packageParts(entry.path)
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

// Flat { "Package/Title" → path, "Title" → path (if unambiguous) } for agent-side resolution.
export function buildPageIndex(sitemap) {
  const index = {}
  const titleCount = {}
  for (const entry of sitemap) {
    const pkg = packageParts(entry.path)[0]
    index[`${pkg}/${entry.title}`] = entry.path
    titleCount[entry.title] = (titleCount[entry.title] || 0) + 1
  }
  // Unambiguous titles get a bare-title shortcut
  for (const entry of sitemap) {
    if (titleCount[entry.title] === 1) {
      index[entry.title] = entry.path
    }
  }
  return index
}
