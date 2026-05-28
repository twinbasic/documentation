// No-allocate measure pass over a PDF byte stream.
//
// Walks the PDF grammar (indirect objects, dicts, arrays, names,
// numbers, refs, strings, streams, ObjStms-with-inflate) without
// instantiating any PDFObject. Produces counts that downstream
// pre-sizing shims consume:
//
//   { indirectObjects, dicts, dictSlots, arrays, arraySlots,
//     refs, names, numbers, strings, hexStrings, streams,
//     objStms, objStmInner, maxDictSlots, maxArraySlots,
//     maxRecursion, totalStreamBytes, totalInflatedBytes }
//
// Counts are *appearances*, not unique values. Phase 2+ will add
// interning to produce unique-count tables (for exact name/ref/
// number pool sizing).
//
// Allocation discipline:
//   - No string concat. Names, numbers, strings are skipped by
//     advancing the byte cursor without keeping bytes.
//   - Per-dict captures (/Length, /Type, /N, /First) live on
//     depth-indexed typed-array stacks. Max recursion observed
//     on the book is 4; stack size 64 is plenty.
//   - ObjStm offset arrays are reusable Int32Array(512), grown
//     on demand. The inflate destination is a fresh Buffer per
//     ObjStm (Chrome's raw output has zero ObjStms; book.pdf
//     has 453 after pdf-lib's save bundles them).
//
// One PDF parse-corner to remember: PDF reals can omit the
// integer part. `.251` is valid (Chrome emits it for /CA, /ca
// alpha values). The parser accepts `[sign?][digits?]
// [.[digits?]]?` with the constraint that at least one digit
// appears.

import { inflateSync } from 'node:zlib';

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

export class Measurer {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
    this._len = buf.length;

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

    const MAX_DEPTH = 64;
    this._depth = 0;
    this._stLength  = new Int32Array(MAX_DEPTH);
    this._stIsObjStm = new Uint8Array(MAX_DEPTH);
    this._stN      = new Int32Array(MAX_DEPTH);
    this._stFirst  = new Int32Array(MAX_DEPTH);

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

  skipName() {
    this.pos++;
    this._skipNameBody();
    this.numNames++;
  }

  skipString() {
    this.pos++;
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

  skipHexString() {
    this.pos++;
    const buf = this.buf, len = this._len;
    let p = this.pos;
    while (p < len && buf[p] !== GT) p++;
    p++;
    this.pos = p;
    this.numHexStrings++;
  }

  // Skip /name; tag whether it matched a known stream-related key.
  // 0=other, 1=Length, 2=Type, 3=N, 4=First.
  matchDictKey() {
    const buf = this.buf, len = this._len;
    this.pos++;
    const start = this.pos;
    let match = 0;
    const b0 = buf[start];
    if (b0 === L_CH) {
      if (start + 6 <= len &&
          buf[start+1] === e_ && buf[start+2] === n_ &&
          buf[start+3] === 103 /* g */ && buf[start+4] === t_ &&
          buf[start+5] === 104 /* h */ &&
          (start+6 === len || IsWS[buf[start+6]] || IsDelim[buf[start+6]])) {
        match = 1; this.pos = start + 6;
      }
    } else if (b0 === T_CH) {
      if (start + 4 <= len &&
          buf[start+1] === 121 /* y */ && buf[start+2] === 112 /* p */ &&
          buf[start+3] === e_ &&
          (start+4 === len || IsWS[buf[start+4]] || IsDelim[buf[start+4]])) {
        match = 2; this.pos = start + 4;
      }
    } else if (b0 === N_CH) {
      if (start + 1 === len || IsWS[buf[start+1]] || IsDelim[buf[start+1]]) {
        match = 3; this.pos = start + 1;
      }
    } else if (b0 === F_CH) {
      if (start + 5 <= len &&
          buf[start+1] === 105 /* i */ && buf[start+2] === r_ &&
          buf[start+3] === s_ && buf[start+4] === t_ &&
          (start+5 === len || IsWS[buf[start+5]] || IsDelim[buf[start+5]])) {
        match = 4; this.pos = start + 5;
      }
    }
    if (match === 0) this._skipNameBody();
    this.numNames++;
    return match;
  }

  // After / is already skipped, check if name body equals an ASCII string.
  // Does NOT move pos.
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

  // PDF number grammar: optional sign, optional digits, optional dot,
  // optional digits. At least one digit required somewhere. No exps.
  // Returns the integer value for pure-integer-non-ref case (for
  // /Length capture); else NaN.
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
      throw new Error('measure-pass: expected number at ' + this.pos);
    }
    this.pos = p;
    if (hasDot) {
      this.numNumbers++;
      return NaN;
    }
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

    throw new Error(`measure-pass: unexpected byte ${b} ('${String.fromCharCode(b)}') at ${this.pos}`);
  }

  // Parse << ... >>. Push frame on stack; do NOT decrement depth.
  // Caller reads stack frame at index this._depth - 1 and decrements.
  parseDict() {
    const d = this._depth++;
    if (d >= 64) throw new Error('measure-pass: dict depth overflow at ' + this.pos);
    if (this._depth > this.maxRecursionDepth) this.maxRecursionDepth = this._depth;
    this._stLength[d]  = -1;
    this._stIsObjStm[d] = 0;
    this._stN[d]      = -1;
    this._stFirst[d]  = -1;

    this.pos += 2;
    this.skipWS();

    const buf = this.buf, len = this._len;
    let count = 0;
    while (this.pos < len) {
      if (buf[this.pos] === GT && buf[this.pos + 1] === GT) break;
      if (buf[this.pos] !== SLASH) throw new Error('measure-pass: expected name at ' + this.pos);

      const tag = this.matchDictKey();
      this.skipWS();

      if (tag === 1 && IsNumeric[buf[this.pos]]) {
        const v = this.parseNumberOrRefCapture();
        if (!isNaN(v)) this._stLength[d] = v;
      } else if (tag === 2 && buf[this.pos] === SLASH) {
        if (this._isNameAt(this.pos + 1, 'ObjStm')) this._stIsObjStm[d] = 1;
        this.pos++;
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
    this.pos += 2;

    this.numDicts++;
    this.numDictSlots += count * 2;
    if (count * 2 > this.maxDictSlots) this.maxDictSlots = count * 2;
  }

  parseArray() {
    const d = this._depth++;
    if (this._depth > this.maxRecursionDepth) this.maxRecursionDepth = this._depth;

    this.pos++;
    this.skipWS();

    const buf = this.buf, len = this._len;
    let count = 0;
    while (this.pos < len && buf[this.pos] !== RB) {
      this.parseObject();
      this.skipWS();
      count++;
    }
    this.pos++;

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
    throw new Error('measure-pass: endstream not found from ' + from);
  }

  processObjStm(start, end, N, first) {
    const compressed = this.buf.subarray(start, end);
    let inflated;
    try {
      inflated = inflateSync(compressed);
    } catch (e) {
      console.warn(`measure-pass: inflate failed at ${start}: ${e.message}`);
      return;
    }
    this.totalInflatedBytes += inflated.length;
    this.numObjStmInnerObjects += N;

    if (N > this._objOffsets.length) {
      this._objOffsets = new Int32Array(N);
      this._objNums    = new Int32Array(N);
    }

    const saveBuf = this.buf, savePos = this.pos, saveLen = this._len;
    this.buf = inflated;
    this.pos = 0;
    this._len = inflated.length;

    for (let i = 0; i < N; i++) {
      this.skipWS();
      this._objNums[i] = this._skipInt();
      this.skipWS();
      this._objOffsets[i] = this._skipInt();
    }
    for (let i = 0; i < N; i++) {
      this.pos = first + this._objOffsets[i];
      const d0 = this._depth;
      this.parseObject();
      this._depth = d0;
    }

    this.buf = saveBuf;
    this.pos = savePos;
    this._len = saveLen;
  }

  parseIndirectObject() {
    this.skipWS();
    this._skipInt();
    this.skipWS();
    this._skipInt();
    this.skipWS();

    const buf = this.buf, len = this._len;
    if (!(this.pos + 3 <= len && buf[this.pos] === o_ && buf[this.pos+1] === b_ && buf[this.pos+2] === j_)) {
      throw new Error('measure-pass: expected "obj" at ' + this.pos);
    }
    this.pos += 3;
    this.skipWS();
    this.numIndirectObjects++;

    const frameDepth = this._depth;
    let wasDict = false;
    if (this.pos + 2 <= len && buf[this.pos] === LT && buf[this.pos+1] === LT) {
      this.parseDict();
      wasDict = true;
    } else {
      this.parseObject();
    }
    this.skipWS();

    if (wasDict && this.pos + 6 <= len &&
        buf[this.pos] === s_ && buf[this.pos+1] === t_ && buf[this.pos+2] === r_ &&
        buf[this.pos+3] === e_ && buf[this.pos+4] === a_ && buf[this.pos+5] === m_) {
      this.pos += 6;
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
        this.pos = streamEnd;
      }

      this.skipWS();
      if (this.pos + 9 <= len &&
          buf[this.pos] === e_ && buf[this.pos+1] === n_ && buf[this.pos+2] === d_ &&
          buf[this.pos+3] === s_ && buf[this.pos+4] === t_ && buf[this.pos+5] === r_ &&
          buf[this.pos+6] === e_ && buf[this.pos+7] === a_ && buf[this.pos+8] === m_) {
        this.pos += 9;
      }
      this.skipWS();
    }

    if (wasDict) this._depth = frameDepth;

    this.skipWS();
    if (this.pos + 6 <= len &&
        buf[this.pos] === e_ && buf[this.pos+1] === n_ && buf[this.pos+2] === d_ &&
        buf[this.pos+3] === o_ && buf[this.pos+4] === b_ && buf[this.pos+5] === j_) {
      this.pos += 6;
    }
  }

  walk() {
    const buf = this.buf, len = this._len;

    while (this.pos < len) {
      this.skipWS();
      if (this.pos >= len) break;
      const b = buf[this.pos];
      if (IsDigit[b]) {
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

    while (this.pos < len) {
      this.skipWS();
      if (this.pos >= len) break;
      const b = buf[this.pos];
      if (b === x_) break;
      if (b === t_ && buf[this.pos+1] === r_ && buf[this.pos+2] === a_ &&
          buf[this.pos+3] === 105 /* i */) break;
      if (b === s_ && buf[this.pos+1] === t_ && buf[this.pos+2] === a_ &&
          buf[this.pos+3] === r_ && buf[this.pos+4] === t_) break;
      if (!IsDigit[b]) break;
      this.parseIndirectObject();
    }
  }
}

// ---- Convenience wrapper -------------------------------------------

export function measure(bytes) {
  const m = new Measurer(bytes);
  m.walk();
  return {
    indirectObjects:    m.numIndirectObjects,
    dicts:              m.numDicts,
    dictSlots:          m.numDictSlots,
    arrays:             m.numArrays,
    arraySlots:         m.numArraySlots,
    refs:               m.numRefs,
    names:              m.numNames,
    numbers:            m.numNumbers,
    strings:            m.numStrings,
    hexStrings:         m.numHexStrings,
    streams:            m.numStreams,
    objStms:            m.numObjStms,
    objStmInner:        m.numObjStmInnerObjects,
    maxDictSlots:       m.maxDictSlots,
    maxArraySlots:      m.maxArraySlots,
    maxRecursion:       m.maxRecursionDepth,
    totalStreamBytes:   m.totalStreamBytes,
    totalInflatedBytes: m.totalInflatedBytes,
  };
}
