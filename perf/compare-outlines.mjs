// Diff two PDFs' /Outlines trees by (depth, title, target page).
//
// The two inputs should be the same source rendered with each outline
// strategy:
//
//   A = injected   -- our parseOutline + setOutline path
//                     (--outline-tags h1,h2,h3,h4, named destinations)
//   B = Chrome     -- page.pdf({ outline: true })
//                     (walks h1..h6 unfiltered, page-coord destinations)
//
// For each entry we record:
//   - depth in the outline tree (0 = top-level entry)
//   - title (decoded text, trimmed)
//   - resolved page index (1-based, for human readability)
//
// We then walk both trees in pre-order and compare. Chrome's outline
// can be deeper because it includes h5/h6; we filter to depth <= 3
// (h1..h4) before comparing so we're contrasting like-with-like.
//
// Usage:
//   node compare-outlines.mjs <injected.pdf> <chrome.pdf>

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { PDFDocument, PDFName, PDFRef, PDFDict, PDFArray, PDFString, PDFHexString, ParseSpeeds } from 'pdf-lib';

const [aPath, bPath] = process.argv.slice(2);
if (!aPath || !bPath) {
  console.error('usage: node compare-outlines.mjs <injected.pdf> <chrome.pdf>');
  process.exit(2);
}

async function loadDoc(p) {
  const bytes = readFileSync(resolve(process.cwd(), p));
  return PDFDocument.load(bytes, { updateMetadata: false, parseSpeed: ParseSpeeds.Fastest });
}

function decodeTitle(t) {
  if (!t) return '';
  if (t instanceof PDFHexString || t instanceof PDFString) return t.decodeText();
  return t.toString();
}

// Resolve an outline /Dest (array or name) to its target page ref.
// - Array: [pageRef /XYZ x y z ...] -- take element 0.
// - Name:  look up in catalog /Dests dictionary; that resolves to an
//          array of the same shape.
function resolveDestPageRef(doc, destObj) {
  let arr = destObj;
  if (arr instanceof PDFName) {
    const destsRef = doc.catalog.get(PDFName.of('Dests'));
    const dests = destsRef instanceof PDFRef ? doc.context.lookup(destsRef) : destsRef;
    if (!dests) return null;
    // /Dests can be a Name Tree (rarely from Chrome) or a flat dict.
    // Chrome flat-dicts it for our content, so try .get(name) first.
    const entry = dests.get ? dests.get(arr) : null;
    arr = entry instanceof PDFRef ? doc.context.lookup(entry) : entry;
  }
  if (arr instanceof PDFArray && arr.size() > 0) {
    const first = arr.get(0);
    return first instanceof PDFRef ? first : null;
  }
  return null;
}

function buildPageIndex(doc) {
  const pages = doc.getPages();
  const m = new Map();
  for (let i = 0; i < pages.length; i++) m.set(pages[i].ref, i + 1);
  return m;
}

function flattenOutline(doc) {
  const pageIndex = buildPageIndex(doc);
  const outlinesRef = doc.catalog.get(PDFName.of('Outlines'));
  if (!(outlinesRef instanceof PDFRef)) return [];
  const root = doc.context.lookup(outlinesRef, PDFDict);
  const out = [];
  function walk(firstRef, depth) {
    let cur = firstRef;
    while (cur instanceof PDFRef) {
      const node = doc.context.lookup(cur, PDFDict);
      const title = decodeTitle(node.get(PDFName.of('Title'))).trim();
      const destObj = node.get(PDFName.of('Dest'));
      const pageRef = destObj ? resolveDestPageRef(doc, destObj) : null;
      const page = pageRef ? pageIndex.get(pageRef) ?? null : null;
      out.push({ depth, title, page });
      const child = node.get(PDFName.of('First'));
      if (child instanceof PDFRef) walk(child, depth + 1);
      cur = node.get(PDFName.of('Next'));
    }
  }
  walk(root.get(PDFName.of('First')), 0);
  return out;
}

const [docA, docB] = await Promise.all([loadDoc(aPath), loadDoc(bPath)]);
const flatA = flattenOutline(docA);
const flatBfull = flattenOutline(docB);
const flatB = flatBfull.filter(e => e.depth <= 3); // h1..h4 only

console.log(`A (${basename(aPath)}): ${flatA.length} entries (depth 0..${Math.max(...flatA.map(e => e.depth), 0)})`);
console.log(`B (${basename(bPath)}): ${flatBfull.length} entries total, ${flatB.length} after filter to depth<=3  (depths present: ${[...new Set(flatBfull.map(e => e.depth))].sort().join(',')})`);
console.log('');

// Pre-order walk diff. Walk both in order and compare entry-by-entry.
// Mismatches: print up to N adjacent ones with context.
const max = Math.max(flatA.length, flatB.length);
const mismatches = [];
for (let i = 0; i < max; i++) {
  const a = flatA[i];
  const b = flatB[i];
  if (!a || !b) {
    mismatches.push({ i, a, b, kind: 'length' });
    continue;
  }
  const titleEq = a.title === b.title;
  const depthEq = a.depth === b.depth;
  const pageEq  = a.page === b.page;
  if (!titleEq || !depthEq || !pageEq) {
    mismatches.push({ i, a, b, kind: 'value', titleEq, depthEq, pageEq });
  }
}

console.log(`matches:    ${max - mismatches.length} / ${max}`);
console.log(`mismatches: ${mismatches.length}`);

// Page-only mismatch (same title + depth) is the most interesting --
// tells us if the two paths target different pages for the same heading.
const titleAndDepthOnly = mismatches.filter(m => m.kind === 'value' && m.titleEq && m.depthEq && !m.pageEq);
const titleMismatch     = mismatches.filter(m => m.kind === 'value' && !m.titleEq);
const depthMismatch     = mismatches.filter(m => m.kind === 'value' && !m.depthEq);
console.log('');
console.log(`  title differs:       ${titleMismatch.length}`);
console.log(`  depth differs:       ${depthMismatch.length}`);
console.log(`  only page differs:   ${titleAndDepthOnly.length}`);

console.log('');
console.log('--- first 25 mismatches ---');
for (const m of mismatches.slice(0, 25)) {
  if (m.kind === 'length') {
    console.log(`[${m.i}] LENGTH-ONLY  A=${m.a ? `${'  '.repeat(m.a.depth)}${m.a.title} (p${m.a.page})` : '<end>'}  B=${m.b ? `${'  '.repeat(m.b.depth)}${m.b.title} (p${m.b.page})` : '<end>'}`);
  } else {
    const a = m.a, b = m.b;
    console.log(`[${m.i}]  A: ${'  '.repeat(a.depth)}${a.title}  (p${a.page})`);
    console.log(`     B: ${'  '.repeat(b.depth)}${b.title}  (p${b.page})`);
  }
}

if (titleAndDepthOnly.length) {
  console.log('');
  console.log('--- first 25 page-only mismatches (same title+depth, different page) ---');
  for (const m of titleAndDepthOnly.slice(0, 25)) {
    const a = m.a, b = m.b;
    const delta = (b.page ?? 0) - (a.page ?? 0);
    console.log(`[${m.i}] ${'  '.repeat(a.depth)}${a.title}  A=p${a.page}  B=p${b.page}  (Δ=${delta >= 0 ? '+' : ''}${delta})`);
  }
}

// Dump both for offline diff.
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dump = (fname, flat) => {
  const lines = flat.map(e => `${e.depth}\t${e.page ?? '-'}\t${e.title}`);
  writeFileSync(fname, lines.join('\n') + '\n');
};
dump(`results/outline-compare-A-${stamp}.tsv`, flatA);
dump(`results/outline-compare-B-${stamp}.tsv`, flatB);
console.log('');
console.log(`full dumps: results/outline-compare-{A,B}-${stamp}.tsv`);
