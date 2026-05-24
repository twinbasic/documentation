// Per-call counters for fastParseDictArray. Wraps the shim's
// parseDict to count invocations, entries-per-dict distribution,
// and recursion depth. Prints a histogram on process exit.
//
// Used to crack open fastParseDictArray's 58 MB self-row in the
// process-phase heap profile -- without counts, we can't tell
// whether "58 MB" is 10k dicts at 6 KB each or 300k dicts at
// 200 bytes each.
//
// Idempotent. Composes with --fast-dict-array (must be loaded
// AFTER fast-dict-array so it wraps the patched parseDict).

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PDFObjectParser = require('pdf-lib/cjs/core/parser/PDFObjectParser.js').default;

if (!PDFObjectParser.prototype.__instrumentParseDictInstalled) {
  const originalParseDict = PDFObjectParser.prototype.parseDict;
  let totalCalls = 0;
  let totalEntries = 0;
  let maxSize = 0;
  let depth = 0;
  let maxDepth = 0;
  const sizeHistogram = new Array(33).fill(0);  // [0..31] then 32+

  PDFObjectParser.prototype.parseDict = function () {
    depth++;
    if (depth > maxDepth) maxDepth = depth;
    let result;
    try {
      result = originalParseDict.call(this);
    } finally {
      depth--;
    }
    totalCalls++;
    // result.dict is the flat array [k0, v0, k1, v1, ...] (fast-dict-array)
    // or a Map (upstream / fast-parse-dict). Handle both.
    const inner = result.dict;
    const entryCount = Array.isArray(inner) ? (inner.length >> 1) : inner.size;
    totalEntries += entryCount;
    if (entryCount > maxSize) maxSize = entryCount;
    const bucket = entryCount < 32 ? entryCount : 32;
    sizeHistogram[bucket]++;
    return result;
  };

  process.on('exit', () => {
    console.error('');
    console.error('=== parseDict instrumentation ===');
    console.error(`total calls       : ${totalCalls}`);
    console.error(`total entries     : ${totalEntries}`);
    console.error(`avg entries/dict  : ${(totalEntries / totalCalls).toFixed(2)}`);
    console.error(`max entries/dict  : ${maxSize}`);
    console.error(`max recursion     : ${maxDepth}`);
    console.error('entries-per-dict histogram:');
    for (let i = 0; i <= 32; i++) {
      const n = sizeHistogram[i];
      if (n === 0) continue;
      const label = i === 32 ? '32+' : String(i);
      const bar = '#'.repeat(Math.min(60, Math.round(n / totalCalls * 200)));
      console.error(`  ${label.padStart(4)} : ${String(n).padStart(7)}  ${bar}`);
    }
  });

  PDFObjectParser.prototype.__instrumentParseDictInstalled = true;
  console.log('[harness] instrument-parsedict: counting parseDict calls + size distribution');
}
