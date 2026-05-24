// "What does this frame actually allocate?" -- prints the heap-profile
// subtree under any frame whose name matches a substring, with each
// direct child's self + descendant byte total.
//
// Companion to analyze-heap.mjs (bottom-up flat list) and
// find-heap-callers.mjs (who called this allocator). Use this when a
// row in the top-15 looks suspicious -- e.g. a big self-size with
// invisible children -- and you want to see what was inlined into the
// frame's compiled code. Built during the PDFRef class-shape round,
// where `maybeParseCrossRefSection` showed 3.4 MB self but its named
// children totalled <40 KB; the subtree view confirmed V8 had
// inlined `PDFCrossRefSection.addEntry` and attributed its object-
// literal allocations to the parent frame.
//
// Usage:
//   node heap-subtree.mjs <path/to/process.heapprofile> <function-name-substring>
//
// The substring matches case-sensitively on the V8 frame's
// `functionName` field; all matches are reported, so a needle like
// "parseDict" surfaces every frame containing that name.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , profilePath, needle] = process.argv;
if (!profilePath || !needle) {
  console.error('usage: node heap-subtree.mjs <process.heapprofile> <function-substring>');
  process.exit(2);
}

const profile = JSON.parse(readFileSync(resolve(profilePath), 'utf8'));

function findNodes(node, out, depth = 0) {
  const fn = (node.callFrame && node.callFrame.functionName) || '';
  if (fn.includes(needle)) out.push(node);
  for (const c of (node.children || [])) findNodes(c, out, depth + 1);
}

const matches = [];
findNodes(profile.head, matches);
console.log(`Found ${matches.length} matching frame(s)\n`);

for (const m of matches) {
  const cf = m.callFrame;
  console.log(`=== ${cf.functionName}  @  ${cf.url}:${(cf.lineNumber||0)+1} ===`);
  console.log(`self: ${(m.selfSize/1024).toFixed(2)} KB`);
  console.log(`children (sorted by total):`);
  const summarize = (n) => {
    let total = n.selfSize;
    for (const c of (n.children || [])) total += summarize(c);
    n._total = total;
    return total;
  };
  for (const c of (m.children || [])) summarize(c);
  const sorted = (m.children || []).slice().sort((a, b) => b._total - a._total);
  for (const c of sorted.slice(0, 12)) {
    const cf = c.callFrame || {};
    const fn = cf.functionName || '(anonymous)';
    const url = cf.url || '';
    const tail = url.split(/[\\/]/).slice(-2).join('/');
    console.log(`  ${(c._total/1024).toFixed(2).padStart(10)} KB total | ${(c.selfSize/1024).toFixed(2).padStart(8)} KB self | ${fn}  @  ${tail}:${(cf.lineNumber||0)+1}`);
  }
  console.log('');
}
