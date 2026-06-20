// Phase 0 prototype: no-allocate measure pass over a PDF byte stream.
//
// Walks the PDF grammar as a state machine without instantiating any
// PDFObject. Counts what would need allocating: indirect objects,
// dicts and their slot counts, arrays and their slot counts, refs,
// names, numbers, strings, streams (incl. ObjStms with inflate +
// inner-object walk), max recursion depth.
//
// Then runs PDFDocument.load on the same bytes (with the production
// shim set imported), so we can compare CPU cost head-to-head.
//
// This is a viability gate: if measure-pass is <<load (e.g. <300 ms
// vs load's 1-2 s), the two-pass measure-then-allocate architecture
// is worth committing to. If it's not, we revisit.
//
// Usage:
//   node perf/phase0-measure.mjs [path/to/pdf] [--runs N] [--no-load]
//
// Defaults: --runs 3, input = most recent perf/results/*/book.pdf.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

// Production-equivalent shim wiring (same order as book/render-book.mjs).
await import('../book/lib/fast-refs.mjs');
await import('../book/lib/fast-inflate.mjs');
await import('../book/lib/fast-parse-number.mjs');
await import('../book/lib/fast-decode-name.mjs');
await import('../book/lib/fast-number-to-string.mjs');
await import('../book/lib/fast-size-in-bytes.mjs');
await import('../book/lib/fast-dict-onebuf.mjs');
await import('../book/lib/fast-parse-object.mjs');
await import('../book/lib/fast-sync-load.mjs');
await import('../book/lib/fast-indirect-objects.mjs');
await import('../book/lib/fast-pdfnumber-pool.mjs');

const require = createRequire(import.meta.url);
const { PDFDocument } = require('pdf-lib');

// ---- Byte constants -------------------------------------------------

const TAB = 9, LF = 10, FF = 12, CR = 13, SP = 32;
const LT = 60 /* < */, GT = 62 /* > */;
const LB = 91 /* [ */, RB = 93 /* ] */;
const LP = 40 /* ( */, RP = 41 /* ) */;
const SLASH = 47, PERCENT = 37, BACKSLASH = 92;
const D0 = 48, D9 = 57;
const MINUS = 45, PLUS = 43, DOT = 46;
const a_ = 97, b_ = 98, d_ = 100, e_ = 101, f_ = 102, j_ = 106;
const l_ = 108, m_ = 109, n_ = 110, o_ = 111, r_ = 114, s_ = 115;
const t_ = 116, u_ = 117, x_ = 120;
const R_CH = 82, L_CH = 76, T_CH = 84, N_CH = 78, F_CH = 70;

// ---- Lookup tables (mirror pdf-lib's IsWhitespace / IsDelimiter / IsDigit / IsNumeric) ----

const IsWS = new Uint8Array(256);
IsWS[0] = IsWS[TAB] = IsWS[LF] = IsWS[FF] = IsWS[CR] = IsWS[SP] = 1;

const IsDelim = new Uint8Array(256);
IsDelim[LT] = IsDelim[GT] = IsDelim[LB] = IsDelim[RB] = 1;
IsDelim[LP] = IsDelim[RP] = IsDelim[SLASH] = IsDelim[PERCENT] = 1;

const IsDigit = new Uint8Array(256);
for (let b = D0; b <= D9; b++) IsDigit[b] = 1;

const IsNumeric = new Uint8Array(IsDigit);
IsNumeric[DOT] = IsNumeric[MINUS] = IsNumeric[PLUS] = 1;

// ---- Measurer -------------------------------------------------------

class Measurer {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
    this._len = buf.length;

    // Counters
    this.numIndirectObjects = 0;
    this.numDicts = 0;
    this.numDictSlots = 0;
    this.numArrays = 0;
    this.numArraySlots = 0;
    this.numRefs = 0;
    this.numNames = 0;
    this.numNumbers = 0;
    this.numStrings = 0;
    this.numHexStrings = 0;
    this.numStreams = 0;
    this.numObjStms = 0;
    this.numObjStmInnerObjects = 0;
    this.maxDictSlots = 0;
    this.maxArraySlots = 0;
    this.maxRecursionDepth = 0;
    this.totalStreamBytes = 0;
    this.totalInflatedBytes = 0;

    // Dict-frame stack: parseDict pushes a frame and leaves it for
    // its caller to read (then pop). We track /Length, /Type=/ObjStm,
    // /N, /First per frame for stream/ObjStm handling.
    const MAX_DEPTH = 64;
    this._depth = 0;
    this._stLength  = new Int32Array(MAX_DEPTH);
    this._stIsObjStm = new Uint8Array(MAX_DEPTH);
    this._stN      = new Int32Array(MAX_DEPTH);
    this._stFirst  = new Int32Array(MAX_DEPTH);

    // Reusable ObjStm offset arrays (grown on demand)
    this._objNums    = new Int32Array(512);
    this._objOffsets = new Int32Array(512);
  }

  // ---- Skip helpers (no allocation) --------------------------------

  skipWS() {
    const buf = this.buf, len = this._len;
    let p = this.pos;
    while (p < len) {
      const b = buf[p];
      if (IsWS[b]) { p++; continue; }
      if (b === PERCENT) {
        while (p < len && buf[p] !== LF && buf[p] !== CR) p++;
        continue;
      }
      break;
    }
    this.pos = p;
  }

  // Parse an integer in place. No string concat. Returns NaN if no digit.
  // Does NOT bump numNumbers (used for metadata: header, ObjStm offsets).
  _skipInt() {
    const buf = this.buf, len = this._len;
    let p = this.pos, v = 0, sign = 1, any = 0;
    if (buf[p] === MINUS) { sign = -1; p++; }
    else if (buf[p] === PLUS) { p++; }
    while (p < len) {
      const b = buf[p];
      if (b < D0 || b > D9) break;
      v = v * 10 + (b - D0);
      any = 1; p++;
    }
    this.pos = p;
    return any ? sign * v : NaN;
  }

  // Skip a name (already past '/'); just consume body bytes
  _skipNameBody() {
    const buf = this.buf, len = this._len;
    let p = this.pos;
    while (p < len) {
      const b = buf[p];
      if (IsWS[b] || IsDelim[b]) break;
      p++;
    }
    this.pos = p;
  }

  // Skip a /name token, bumping numNames
  skipName() {
    this.pos++; // skip /
    this._skipNameBody();
    this.numNames++;
  }

  // Skip a literal (...) string, handling escapes
  skipString() {
    this.pos++; // skip (
    const buf = this.buf, len = this._len;
    let p = this.pos, depth = 1;
    while (p < len && depth > 0) {
      const b = buf[p];
      if (b === BACKSLASH) { p += 2; continue; }
      if (b === LP) depth++;
      else if (b === RP) depth--;
      p++;
    }
    this.pos = p;
    this.numStrings++;
  }

  // Skip a <hex> string
  skipHexString() {
    this.pos++; // skip <
    const buf = this.buf, len = this._len;
    let p = this.pos;
    while (p < len && buf[p] !== GT) p++;
    p++; // skip >
    this.pos = p;
    this.numHexStrings++;
  }

  // ---- Name disambiguation (no allocation) ------------------------

  // Skip /name and tag whether it matched a known stream-related key.
  // Returns: 0=other, 1=Length, 2=Type, 3=N, 4=First
  matchDictKey() {
    const buf = this.buf, len = this._len;
    this.pos++; // skip /
    const start = this.pos;
    let match = 0;

    const b0 = buf[start];
    if (b0 === L_CH /* L */) {
      if (start + 6 <= len &&
          buf[start+1] === e_ && buf[start+2] === n_ &&
          buf[start+3] === 103 /* g */ && buf[start+4] === t_ &&
          buf[start+5] === 104 /* h */ &&
          (start+6 === len || IsWS[buf[start+6]] || IsDelim[buf[start+6]])) {
        match = 1;
        this.pos = start + 6;
      }
    } else if (b0 === T_CH /* T */) {
      if (start + 4 <= len &&
          buf[start+1] === 121 /* y */ && buf[start+2] === 112 /* p */ &&
          buf[start+3] === e_ &&
          (start+4 === len || IsWS[buf[start+4]] || IsDelim[buf[start+4]])) {
        match = 2;
        this.pos = start + 4;
      }
    } else if (b0 === N_CH /* N */) {
      if (start + 1 === len || IsWS[buf[start+1]] || IsDelim[buf[start+1]]) {
        match = 3;
        this.pos = start + 1;
      }
    } else if (b0 === F_CH /* F */) {
      if (start + 5 <= len &&
          buf[start+1] === 105 /* i */ && buf[start+2] === r_ &&
          buf[start+3] === s_ && buf[start+4] === t_ &&
          (start+5 === len || IsWS[buf[start+5]] || IsDelim[buf[start+5]])) {
        match = 4;
        this.pos = start + 5;
      }
    }

    if (match === 0) this._skipNameBody();
    this.numNames++;
    return match;
  }

  // After / is already skipped, check if name body equals an ASCII string.
  // Does NOT move pos. Caller _skipNameBody afterwards.
  _isNameAt(p, name) {
    const buf = this.buf, len = this._len;
    const n = name.length;
    if (p + n > len) return false;
    for (let i = 0; i < n; i++) {
      if (buf[p + i] !== name.charCodeAt(i)) return false;
    }
    if (p + n === len) return true;
    const after = buf[p + n];
    return !!(IsWS[after] || IsDelim[after]);
  }

  // ---- Number / Ref ------------------------------------------------

  // Parse a number-or-ref token starting at pos. Bumps numNumbers or
  // numRefs as appropriate. Returns the integer value if it was a plain
  // integer (for /Length capture); else NaN.
  //
  // PDF grammar: optional sign, optional digits, optional dot, optional
  // digits. At least one digit required somewhere. No exponentials.
  // So '.251', '-1.5', '+5', '5.', '5' are all valid.
  parseNumberOrRefCapture() {
    const buf = this.buf, len = this._len;
    let p = this.pos;
    let sign = 1;
    if (buf[p] === MINUS) { sign = -1; p++; }
    else if (buf[p] === PLUS) { p++; }
    let intDigits = 0, intVal = 0;
    while (p < len && buf[p] >= D0 && buf[p] <= D9) {
      intVal = intVal * 10 + (buf[p] - D0);
      intDigits++; p++;
    }
    let hasDot = 0, fracDigits = 0;
    if (p < len && buf[p] === DOT) {
      hasDot = 1; p++;
      while (p < len && buf[p] >= D0 && buf[p] <= D9) { fracDigits++; p++; }
    }
    if (intDigits === 0 && fracDigits === 0) {
      throw new Error('expected number at ' + this.pos);
    }
    this.pos = p;
    if (hasDot) {
      this.numNumbers++;
      return NaN;
    }
    // Pure integer: lookahead for ref "<sp> <int> <sp> R"
    const save = this.pos;
    this.skipWS();
    if (this.pos < len && IsDigit[buf[this.pos]]) {
      this._skipInt();
      this.skipWS();
      if (this.pos < len && buf[this.pos] === R_CH) {
        this.pos++;
        this.numRefs++;
        return NaN;
      }
    }
    this.pos = save;
    this.numNumbers++;
    return sign * intVal;
  }

  // ---- Object dispatch --------------------------------------------

  parseObject() {
    this.skipWS();
    const buf = this.buf, len = this._len;
    if (this.pos >= len) return;
    const b = buf[this.pos];

    // Keywords: true / false / null
    if (b === t_) {
      if (this.pos + 4 <= len &&
          buf[this.pos+1] === r_ && buf[this.pos+2] === u_ && buf[this.pos+3] === e_) {
        this.pos += 4; return;
      }
    } else if (b === f_) {
      if (this.pos + 5 <= len &&
          buf[this.pos+1] === a_ && buf[this.pos+2] === l_ &&
          buf[this.pos+3] === s_ && buf[this.pos+4] === e_) {
        this.pos += 5; return;
      }
    } else if (b === n_) {
      if (this.pos + 4 <= len &&
          buf[this.pos+1] === u_ && buf[this.pos+2] === l_ && buf[this.pos+3] === l_) {
        this.pos += 4; return;
      }
    }

    if (b === LT) {
      if (buf[this.pos + 1] === LT) {
        // Dict value: parse, then pop the frame (caller doesn't care)
        const d = this._depth;
        this.parseDict();
        this._depth = d;
        return;
      }
      this.skipHexString();
      return;
    }
    if (b === LP) { this.skipString(); return; }
    if (b === SLASH) { this.skipName(); return; }
    if (b === LB) { this.parseArray(); return; }
    if (IsNumeric[b]) { this.parseNumberOrRefCapture(); return; }

    throw new Error(`parseObject: unexpected byte ${b} ('${String.fromCharCode(b)}') at ${this.pos}`);
  }

  // Parse << ... >>. Push frame on stack; do NOT decrement depth.
  // Caller reads stack frame at index this._depth - 1 and decrements.
  parseDict() {
    const d = this._depth++;
    if (d >= 64) throw new Error('dict depth overflow at ' + this.pos);
    if (this._depth > this.maxRecursionDepth) this.maxRecursionDepth = this._depth;
    this._stLength[d]  = -1;
    this._stIsObjStm[d] = 0;
    this._stN[d]      = -1;
    this._stFirst[d]  = -1;

    this.pos += 2; // skip <<
    this.skipWS();

    const buf = this.buf, len = this._len;
    let count = 0;
    while (this.pos < len) {
      if (buf[this.pos] === GT && buf[this.pos + 1] === GT) break;
      if (buf[this.pos] !== SLASH) throw new Error('expected name at ' + this.pos);

      const tag = this.matchDictKey();
      this.skipWS();

      if (tag === 1 && IsNumeric[buf[this.pos]]) {
        const v = this.parseNumberOrRefCapture();
        if (!isNaN(v)) this._stLength[d] = v;
      } else if (tag === 2 && buf[this.pos] === SLASH) {
        // /Type value -- detect /ObjStm
        if (this._isNameAt(this.pos + 1, 'ObjStm')) this._stIsObjStm[d] = 1;
        this.pos++; // skip /
        this._skipNameBody();
        this.numNames++;
      } else if (tag === 3 && IsNumeric[buf[this.pos]]) {
        const v = this.parseNumberOrRefCapture();
        if (!isNaN(v)) this._stN[d] = v;
      } else if (tag === 4 && IsNumeric[buf[this.pos]]) {
        const v = this.parseNumberOrRefCapture();
        if (!isNaN(v)) this._stFirst[d] = v;
      } else {
        this.parseObject();
      }
      this.skipWS();
      count++;
    }
    this.pos += 2; // skip >>

    this.numDicts++;
    this.numDictSlots += count * 2;
    if (count * 2 > this.maxDictSlots) this.maxDictSlots = count * 2;
    // Don't decrement _depth here -- caller reads frame then pops.
  }

  parseArray() {
    const d = this._depth++;
    if (this._depth > this.maxRecursionDepth) this.maxRecursionDepth = this._depth;

    this.pos++; // skip [
    this.skipWS();

    const buf = this.buf, len = this._len;
    let count = 0;
    while (this.pos < len && buf[this.pos] !== RB) {
      this.parseObject();
      this.skipWS();
      count++;
    }
    this.pos++; // skip ]

    this.numArrays++;
    this.numArraySlots += count;
    if (count > this.maxArraySlots) this.maxArraySlots = count;
    this._depth--;
  }

  // ---- Indirect object + stream handling --------------------------

  findEndStream(from) {
    const buf = this.buf, len = this._len;
    let p = from;
    while (p + 9 <= len) {
      if (buf[p] === e_ && buf[p+1] === n_ && buf[p+2] === d_ &&
          buf[p+3] === s_ && buf[p+4] === t_ && buf[p+5] === r_ &&
          buf[p+6] === e_ && buf[p+7] === a_ && buf[p+8] === m_) {
        let end = p;
        while (end > from && (buf[end-1] === LF || buf[end-1] === CR)) end--;
        return end;
      }
      p++;
    }
    throw new Error('endstream not found from ' + from);
  }

  // Inflate an ObjStm and walk its inner objects.
  processObjStm(start, end, N, first) {
    const compressed = this.buf.subarray(start, end);
    let inflated;
    try {
      inflated = inflateSync(compressed);
    } catch (e) {
      console.warn(`inflate failed at ${start}: ${e.message}`);
      return;
    }
    this.totalInflatedBytes += inflated.length;
    this.numObjStmInnerObjects += N;

    // Grow offset arrays if needed
    if (N > this._objOffsets.length) {
      this._objOffsets = new Int32Array(N);
      this._objNums = new Int32Array(N);
    }

    const saveBuf = this.buf, savePos = this.pos, saveLen = this._len;
    this.buf = inflated;
    this.pos = 0;
    this._len = inflated.length;

    // Read N (objNum, byteOffset) pairs
    for (let i = 0; i < N; i++) {
      this.skipWS();
      this._objNums[i] = this._skipInt();
      this.skipWS();
      this._objOffsets[i] = this._skipInt();
    }

    // Walk each inner object
    for (let i = 0; i < N; i++) {
      this.pos = first + this._objOffsets[i];
      const d0 = this._depth;
      this.parseObject();
      this._depth = d0; // safety pop
    }

    this.buf = saveBuf;
    this.pos = savePos;
    this._len = saveLen;
  }

  parseIndirectObject() {
    this.skipWS();
    this._skipInt(); // objNum
    this.skipWS();
    this._skipInt(); // gen
    this.skipWS();

    const buf = this.buf, len = this._len;
    if (!(this.pos + 3 <= len && buf[this.pos] === o_ && buf[this.pos+1] === b_ && buf[this.pos+2] === j_)) {
      throw new Error('expected "obj" at ' + this.pos);
    }
    this.pos += 3;
    this.skipWS();
    this.numIndirectObjects++;

    // Parse the object body. If it's a dict, leave the frame on the
    // stack so we can read /Length / /Type / /N / /First if a stream
    // follows.
    const frameDepth = this._depth;
    let wasDict = false;
    if (this.pos + 2 <= len && buf[this.pos] === LT && buf[this.pos+1] === LT) {
      this.parseDict();
      wasDict = true;
    } else {
      this.parseObject();
    }
    this.skipWS();

    // Stream?
    if (wasDict && this.pos + 6 <= len &&
        buf[this.pos] === s_ && buf[this.pos+1] === t_ && buf[this.pos+2] === r_ &&
        buf[this.pos+3] === e_ && buf[this.pos+4] === a_ && buf[this.pos+5] === m_) {
      this.pos += 6;
      // Optional CR/LF after 'stream'
      if (this.pos < len && buf[this.pos] === CR) this.pos++;
      if (this.pos < len && buf[this.pos] === LF) this.pos++;

      const streamStart = this.pos;
      const length    = this._stLength[frameDepth];
      const isObjStm  = this._stIsObjStm[frameDepth];
      const N         = this._stN[frameDepth];
      const first     = this._stFirst[frameDepth];

      let streamEnd;
      if (length > 0) {
        streamEnd = streamStart + length;
        // Sanity: streamEnd should land near 'endstream'. If not, fallback.
        if (streamEnd > len ||
            !(buf[streamEnd] === LF || buf[streamEnd] === CR ||
              buf[streamEnd] === e_ || IsWS[buf[streamEnd]])) {
          streamEnd = this.findEndStream(streamStart);
        }
      } else {
        streamEnd = this.findEndStream(streamStart);
      }
      this.pos = streamEnd;
      this.totalStreamBytes += (streamEnd - streamStart);
      this.numStreams++;

      if (isObjStm && N > 0 && first > 0) {
        this.numObjStms++;
        this.processObjStm(streamStart, streamEnd, N, first);
        this.pos = streamEnd; // restore (processObjStm restores too, defensive)
      }

      this.skipWS();
      // Optional 'endstream' keyword (we already positioned past content)
      if (this.pos + 9 <= len &&
          buf[this.pos] === e_ && buf[this.pos+1] === n_ && buf[this.pos+2] === d_ &&
          buf[this.pos+3] === s_ && buf[this.pos+4] === t_ && buf[this.pos+5] === r_ &&
          buf[this.pos+6] === e_ && buf[this.pos+7] === a_ && buf[this.pos+8] === m_) {
        this.pos += 9;
      }
      this.skipWS();
    }

    // Pop the dict frame
    if (wasDict) this._depth = frameDepth;

    // 'endobj' (lenient: tolerate missing)
    this.skipWS();
    if (this.pos + 6 <= len &&
        buf[this.pos] === e_ && buf[this.pos+1] === n_ && buf[this.pos+2] === d_ &&
        buf[this.pos+3] === o_ && buf[this.pos+4] === b_ && buf[this.pos+5] === j_) {
      this.pos += 6;
    }
  }

  // ---- Top-level walk --------------------------------------------

  walk() {
    const buf = this.buf, len = this._len;

    // Skip header line (%PDF-x.y), binary marker, etc.
    // Strategy: scan forward until we see a digit followed by "<sp> <digit>+ <sp> obj"
    // -- the first indirect-object header.
    while (this.pos < len) {
      this.skipWS();
      if (this.pos >= len) break;
      const b = buf[this.pos];
      if (IsDigit[b]) {
        // Try to validate this looks like an indirect-obj header
        const save = this.pos;
        this._skipInt();
        if (buf[this.pos] === SP || buf[this.pos] === TAB) {
          this.skipWS();
          if (IsDigit[buf[this.pos]]) {
            this._skipInt();
            this.skipWS();
            if (this.pos + 3 <= len && buf[this.pos] === o_ &&
                buf[this.pos+1] === b_ && buf[this.pos+2] === j_) {
              this.pos = save;
              break;
            }
          }
        }
        this.pos = save + 1;
      } else {
        this.pos++;
      }
    }

    // Walk indirect objects until xref / startxref / trailer
    while (this.pos < len) {
      this.skipWS();
      if (this.pos >= len) break;
      const b = buf[this.pos];
      if (b === x_) break;            // xref
      if (b === t_ && buf[this.pos+1] === r_ && buf[this.pos+2] === a_ &&
          buf[this.pos+3] === 105 /* i */) break;  // trailer
      if (b === s_ && buf[this.pos+1] === t_ && buf[this.pos+2] === a_ &&
          buf[this.pos+3] === r_ && buf[this.pos+4] === t_) break;  // startxref
      if (!IsDigit[b]) break;
      this.parseIndirectObject();
    }
  }
}

// ---- Main -----------------------------------------------------------

function pickDefaultPdf() {
  const dir = resolve('perf/results');
  const entries = readdirSync(dir)
    .filter(d => /^\d{4}-\d{2}-\d{2}T/.test(d))
    .filter(d => statSync(join(dir, d)).isDirectory())
    .sort();
  for (let i = entries.length - 1; i >= 0; i--) {
    const p = join(dir, entries[i], 'book.pdf');
    try { statSync(p); return p; } catch (_) {}
  }
  throw new Error('no perf/results/*/book.pdf found; pass a path as argv[2]');
}

async function main() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let runs = 3;
  let skipLoad = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--runs') runs = parseInt(args[++i], 10);
    else if (a === '--no-load') skipLoad = true;
    else if (!inputPath) inputPath = a;
  }
  if (!inputPath) inputPath = pickDefaultPdf();
  const buf = readFileSync(inputPath);
  console.log(`input: ${inputPath}`);
  console.log(`size:  ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
  console.log('');

  // Measure pass
  console.log(`--- measure pass (${runs} runs) ---`);
  const measureTimes = [];
  let lastM = null;
  for (let i = 0; i < runs; i++) {
    const m = new Measurer(buf);
    const t0 = performance.now();
    m.walk();
    const ms = performance.now() - t0;
    measureTimes.push(ms);
    console.log(`  run ${i+1}: ${ms.toFixed(1)} ms`);
    lastM = m;
  }
  const minMeasure = Math.min(...measureTimes);
  console.log(`  min:   ${minMeasure.toFixed(1)} ms`);
  console.log('');
  console.log('counts (last run):');
  console.log(`  indirect objects:    ${lastM.numIndirectObjects}`);
  console.log(`  dicts:               ${lastM.numDicts}   slots: ${lastM.numDictSlots}   max: ${lastM.maxDictSlots}`);
  console.log(`  arrays:              ${lastM.numArrays}   slots: ${lastM.numArraySlots}   max: ${lastM.maxArraySlots}`);
  console.log(`  refs:                ${lastM.numRefs}`);
  console.log(`  names:               ${lastM.numNames}`);
  console.log(`  numbers:             ${lastM.numNumbers}`);
  console.log(`  strings (literal):   ${lastM.numStrings}`);
  console.log(`  strings (hex):       ${lastM.numHexStrings}`);
  console.log(`  streams:             ${lastM.numStreams}   bytes: ${(lastM.totalStreamBytes/1024/1024).toFixed(2)} MB`);
  console.log(`  objstms:             ${lastM.numObjStms}   inner objs: ${lastM.numObjStmInnerObjects}   inflated: ${(lastM.totalInflatedBytes/1024/1024).toFixed(2)} MB`);
  console.log(`  max recursion:       ${lastM.maxRecursionDepth}`);
  console.log('');

  if (skipLoad) return;

  // pdf-lib load (1 run only -- fast-dict-onebuf is singleton-context)
  console.log(`--- PDFDocument.load (1 run; shim is singleton-context) ---`);
  const t0 = performance.now();
  await PDFDocument.load(buf);
  const loadMs = performance.now() - t0;
  console.log(`  load: ${loadMs.toFixed(1)} ms`);
  console.log('');
  console.log(`ratio measure(min)/load: ${(minMeasure / loadMs).toFixed(3)}  (lower = better)`);
}

main().catch(e => { console.error(e); process.exit(1); });
