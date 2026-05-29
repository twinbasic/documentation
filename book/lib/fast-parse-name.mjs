// Byte-keyed cache in front of parseName: on cache hit (99.7 % of
// calls on the book) return the existing PDFName without allocating
// the lookup string at all.
//
// Step 1 of this optimisation (commit history shows the failed
// attempt) hand-inlined parseName's byte loop to skip the
// `this.bytes.peek() / .next() / .done()` per-byte method dispatch
// while keeping the original cons-string accumulator. CPU didn't move:
// V8 was already optimising the cons-string path well, and the saved
// method-call cost just shifted attribution to the callers
// (fastParseDictOneBuf / fastParseObject). Heap was flat too.
//
// This shim attacks the actual transient cost: each call builds a
// throwaway string (cons-chain of ~8 chars on average, then flattened
// on first use) only to hand it to PDFName.of, which hashes the string
// against a Map<string, PDFName> and returns the cached instance.
// 1.68 M calls × ~10-byte average × cons-string allocations + Map.get
// hashing-the-string-again adds up to non-trivial heap throughput and
// CPU even though the per-call work is small.
//
// PDF names are 4 787 unique on the book vs 1 681 225 calls -- 99.7 %
// hit rate. So 99.7 % of those string allocations + Map hashings are
// pure overhead: the answer was already computed, we just needed a
// way to find it without rebuilding the key.
//
// The byte-cache. Keyed by `Uint8Array.prototype.hash`-ish value
// (Java-style `hash * 31 + byte`), valued by the cached PDFName.
// Each bucket stores `Entry` (single-entry, the common case for ~99 %
// of buckets) or `Entry[]` (collision, vanishingly rare for the 4.8 k
// unique names hashed into 2^32 space). Entry holds the bytes-key
// (a small Uint8Array copy of the name body) for collision-check
// equality.
//
// Cold path. On byte-cache miss, build the string via
// `String.fromCharCode` (one allocation, not the per-byte cons chain
// because we already have the full byte range from the scan) and
// call the upstream `PDFName.of` -- which on this stack means
// fast-decode-name's string-keyed cache, which returns the PDFName
// (cache hit on the string side) or constructs it. Either way, the
// PDFName instance gets cached in the byte-cache for next time.
// Both caches converge on the same PDFName instance per logical name.
//
// Composes with fast-decode-name (their caches see different keys for
// the same logical name; both return the same PDFName via this fall-
// back chain). Direct `PDFName.of(...)` calls from non-parser code
// (setOutline, setMetadata) bypass the byte-cache and go straight
// through fast-decode-name -- correct, since those calls don't have
// a byte range to work with.
//
// Side-effecting import. Import once before PDFDocument.load runs;
// idempotent.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PDFObjectParser = require('pdf-lib/cjs/core/parser/PDFObjectParser.js').default;
const PDFName         = require('pdf-lib/cjs/core/objects/PDFName.js').default;
const CharCodes       = require('pdf-lib/cjs/core/syntax/CharCodes.js').default;
const { IsWhitespace } = require('pdf-lib/cjs/core/syntax/Whitespace.js');
const { IsDelimiter }  = require('pdf-lib/cjs/core/syntax/Delimiters.js');

const FORWARD_SLASH = CharCodes.ForwardSlash;

// hash -> Entry | Entry[]. Single-entry buckets store the Entry
// directly; on collision we promote to an array. Entry shape is fixed
// (bytes + name) so V8 gives it a stable hidden class.
const byteCache = new Map();

class Entry {
  constructor(bytes, name) {
    this.bytes = bytes;
    this.name = name;
  }
}

function _bytesEqual(a, buf, start, end) {
  if (a.length !== end - start) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== buf[start + i]) return false;
  }
  return true;
}

if (!PDFObjectParser.prototype.__fastParseNameInstalled) {
  const orig = PDFObjectParser.prototype.parseName;

  PDFObjectParser.prototype.parseName = function fastParseName() {
    const stream = this.bytes;
    const buf = stream.bytes;
    const len = stream.length;
    let idx = stream.idx;

    // assertNext(ForwardSlash). Fall back on the unexpected path.
    if (idx >= len || buf[idx] !== FORWARD_SLASH) {
      return orig.call(this);
    }
    idx++;

    // Scan body + compute hash in one pass. Java-style hashCode
    // (`hash * 31 + byte`) -- monomorphic Smi math, no allocations.
    const start = idx;
    let hash = 0;
    while (idx < len) {
      const byte = buf[idx];
      if (IsWhitespace[byte] || IsDelimiter[byte]) break;
      hash = (hash * 31 + byte) | 0;
      idx++;
    }
    stream.idx = idx;

    // Look up the byte-cache.
    const bucket = byteCache.get(hash);
    if (bucket !== undefined) {
      if (bucket instanceof Entry) {
        if (_bytesEqual(bucket.bytes, buf, start, idx)) return bucket.name;
      } else {
        // Collision: rare. Linear scan of the bucket.
        for (let i = 0; i < bucket.length; i++) {
          const e = bucket[i];
          if (_bytesEqual(e.bytes, buf, start, idx)) return e.name;
        }
      }
    }

    // Miss. Build the lookup string in one shot (no cons-chain --
    // String.fromCharCode handles bytes 0-255 directly) and route
    // through the upstream PDFName.of (which on this stack is
    // fast-decode-name's string-keyed cache). The resulting PDFName
    // is the canonical instance; cache it in the byte-cache for next
    // time so subsequent calls with the same bytes hit here.
    const slice = buf.subarray(start, idx);
    const name = PDFName.of(String.fromCharCode.apply(null, slice));
    const key = new Uint8Array(slice);   // copy for stable cache key
    const entry = new Entry(key, name);
    if (bucket === undefined) {
      byteCache.set(hash, entry);
    } else if (bucket instanceof Entry) {
      byteCache.set(hash, [bucket, entry]);
    } else {
      bucket.push(entry);
    }
    return name;
  };

  PDFObjectParser.prototype.__fastParseNameInstalled = true;
}
