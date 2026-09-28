// Checks the book's pdf-lib shims against stock pdf-lib.
//
// book/render-book.mjs loads Chromium's PDF with pdf-lib, adds the metadata
// and the outline, and saves it, with a dozen shims under pdf-lib replacing its
// parser, its object classes and its writer for speed, and parallelSave in
// place of save(). Nothing else compares what they write with what pdf-lib
// itself writes. This does: one document is loaded, changed and saved by stock
// pdf-lib and by pdf-lib with every shim render-book.mjs imports, each in a
// process of its own, and so is one built with PDFDocument.create. Each pair
// of files is compared object by object with every stream inflated, since
// node:zlib and pdf-lib's deflate may compress the same bytes differently.
// Each file's cross-reference entries are checked against the objects they
// locate as well, because pdf-lib's own parser finds objects without them, so
// a wrong size computed for an object is invisible to it.
//
// The loaded document is written here, without pdf-lib, so the forms the
// shims' parsers branch on are known to be in it: names with #xx escapes,
// numbers in every lexical form, a classic cross-reference table followed by
// an incremental update with an object stream and a cross-reference stream.
// The change (scripts/lib/pdf-shims-side.mjs) mirrors render-book.mjs and adds
// what reaches the rest of the shims: text drawn on a page given a new key
// first, which moves the page's entries and must keep its flags, a page
// inserted and one removed, dictionaries parsed early and edited late, and a call of
// each patched method the book does not make, its result written into the
// document. The created document reaches the page-tree and catalog factories.
//
// A shim none of whose functions runs is reported too: it means the documents
// no longer test it, or that the book never needed it. So is each member of
// pdf-lib the shims put a function into, against PATCHES below: a member
// listed there and not patched, one patched and not listed, one whose function
// ran in neither document, and one marked there as not reached that ran.
//
// On a difference, that document's shimmed side is run again with each shim
// alone and with each left out (parallelSave counts as one), to name the shims
// that make it.
//
//     node scripts/check_pdf_shims_equiv.mjs
//
// Exit codes: 0 the same, 1 a difference, a shim or patched member not reached
// or a patched member not as PATCHES lists it, 2 the check itself failed.

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { exitOnCrash } from "./lib/gate-probes.mjs";

exitOnCrash();

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), { options: { help: { type: "boolean", short: "h" } }, stopAt: ["help"] })
);
if (cli.stopped === "help") {
  printHelpAndExit(`usage: node scripts/check_pdf_shims_equiv.mjs

Loads, changes and saves one PDF with stock pdf-lib and with the book's pdf-lib
shims, and creates and saves another, compares each pair of files object by
object, streams inflated, and checks the members of pdf-lib the shims patch
against the list in this file. Exit 0 the same, 1 a difference, a shim or
patched member the documents no longer reach, or a patched member not as
listed, 2 the check itself failed.`);
}

const TOOL = "check_pdf_shims_equiv";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RENDER_BOOK = path.join(ROOT, "book", "render-book.mjs");
const SIDE = path.join(ROOT, "scripts", "lib", "pdf-shims-side.mjs");
const SIDE_TIMEOUT_MS = 120_000;

// render-book.mjs's imports from book/lib that are not shims: the side calls
// them as render-book.mjs does.
const HELPERS = new Set(["measure-pass.mjs", "postprocesser.mjs", "outline.mjs", "parallel-deflate.mjs"]);

// The shims are every other module render-book.mjs imports from book/lib, in
// its order, so a shim added there is checked here without an edit.
function shimsOf(source) {
  const names = [...source.matchAll(/(?:^import|\bfrom)\s+['"]\.\/lib\/([\w.-]+\.mjs)['"]/gm)].map((m) => m[1]);
  const shims = names.filter((name) => !HELPERS.has(name));
  if (shims.length === 0) throw new Error(`found no shim among ${path.relative(ROOT, RENDER_BOOK)}'s imports`);
  return shims.map((name) => path.join(ROOT, "book", "lib", name));
}

const shimName = (file) => path.basename(file);

// Every member of pdf-lib each shim puts a function into, named as the side
// names it. The side finds them by comparing pdf-lib's modules, their exported
// classes and those classes' prototypes before and after the shims load, so a
// patch applied to anything else, such as a copy of a class, is missing here.
// A member given as [member, reason] is one neither document reaches.
const SETTER = "only pdf-lib's constructors set it, and the shim builds its objects without them; it does nothing";
const PATCHES = {
  "fast-refs-class.mjs": [
    "PDFRef.of",
    "PDFRef.prototype.toString",
    "PDFRef.prototype.sizeInBytes",
    "PDFRef.prototype.copyBytesInto",
  ],
  "fast-parse-number.mjs": ["BaseParser.prototype.parseRawInt", "BaseParser.prototype.parseRawNumber"],
  "fast-decode-name.mjs": ["PDFName.of"],
  "fast-number-to-string.mjs": [
    "numberToString in pdf-lib/cjs/index.js",
    "numberToString in pdf-lib/cjs/utils/index.js",
    "numberToString in pdf-lib/cjs/utils/numbers.js",
  ],
  "fast-size-in-bytes.mjs": [
    "sizeInBytes in pdf-lib/cjs/index.js",
    "sizeInBytes in pdf-lib/cjs/utils/index.js",
    "sizeInBytes in pdf-lib/cjs/utils/numbers.js",
  ],
  "fast-dict-onebuf.mjs": [
    "PDFObjectParser.prototype.parseDict",
    "PDFDict.withContext",
    "PDFDict.fromMapWithContext",
    "PDFDict.prototype.keys",
    "PDFDict.prototype.values",
    "PDFDict.prototype.entries",
    "PDFDict.prototype.set",
    "PDFDict.prototype.get",
    "PDFDict.prototype.has",
    "PDFDict.prototype.delete",
    "PDFDict.prototype.asMap",
    "PDFDict.prototype.clone",
    "PDFDict.prototype.toString",
    "PDFDict.prototype.sizeInBytes",
    "PDFDict.prototype.copyBytesInto",
    "PDFDict.prototype.context (getter)",
    ["PDFDict.prototype.context (setter)", SETTER],
    "PDFCatalog.withContextAndPages",
    "PDFCatalog.fromMapWithContext",
    "PDFPageTree.withContext",
    "PDFPageTree.fromMapWithContext",
    "PDFPageLeaf.withContextAndParent",
    "PDFPageLeaf.fromMapWithContext",
    "PDFPageLeaf.prototype.normalized (getter)",
    "PDFPageLeaf.prototype.normalized (setter)",
    "PDFPageLeaf.prototype.autoNormalizeCTM (getter)",
    "PDFPageLeaf.prototype.autoNormalizeCTM (setter)",
  ],
  "fast-array-onebuf.mjs": [
    "PDFObjectParser.prototype.parseArray",
    "PDFArray.withContext",
    "PDFArray.prototype.size",
    "PDFArray.prototype.push",
    "PDFArray.prototype.insert",
    "PDFArray.prototype.indexOf",
    "PDFArray.prototype.remove",
    "PDFArray.prototype.set",
    "PDFArray.prototype.get",
    "PDFArray.prototype.asArray",
    "PDFArray.prototype.clone",
    "PDFArray.prototype.toString",
    "PDFArray.prototype.sizeInBytes",
    "PDFArray.prototype.copyBytesInto",
    "PDFArray.prototype.context (getter)",
    ["PDFArray.prototype.context (setter)", SETTER],
  ],
  "fast-parse-object.mjs": ["PDFObjectParser.prototype.parseObject"],
  "fast-parse-name.mjs": ["PDFObjectParser.prototype.parseName"],
  "fast-sync-load.mjs": [
    "PDFDocument.load",
    "PDFParser.prototype.parseDocument",
    "PDFParser.prototype.parseDocumentSection",
    "PDFParser.prototype.parseIndirectObjects",
    "PDFParser.prototype.parseIndirectObject",
    "PDFObjectStreamParser.prototype.parseIntoContext",
    "PDFWriter.prototype.serializeToBuffer",
  ],
  "fast-indirect-objects.mjs": [
    "PDFContext.prototype.assign",
    "PDFContext.prototype.delete",
    "PDFContext.prototype.lookupMaybe",
    "PDFContext.prototype.lookup",
    "PDFContext.prototype.getObjectRef",
    "PDFContext.prototype.enumerateIndirectObjects",
  ],
  "fast-pdfnumber-pool.mjs": ["PDFNumber.of"],
};

// The side's patched members against PATCHES, as lists of "shim: member".
// A shim that ran nothing is reported whole, so its members are left out.
function againstPatches(patched, unreached) {
  const listed = new Map();
  for (const [shim, entries] of Object.entries(PATCHES)) {
    for (const entry of entries) {
      const [member, reason = null] = Array.isArray(entry) ? entry : [entry];
      listed.set(`${shim}: ${member}`, reason);
    }
  }
  const seen = new Map(patched.map((p) => [`${shimName(p.shim)}: ${p.member}`, p]));
  const quiet = (key) => unreached.includes(key.slice(0, key.indexOf(":")));
  return {
    marked: [...listed.values()].filter((reason) => reason !== null).length,
    missing: [...listed.keys()].filter((key) => !seen.has(key) && !quiet(key)),
    unlisted: [...seen.keys()].filter((key) => !listed.has(key)),
    notRun: [...seen.values()]
      .map((p) => `${shimName(p.shim)}: ${p.member}`)
      .filter((key) => !seen.get(key).ran && listed.get(key) === null && !quiet(key)),
    nowRun: [...seen.keys()].filter((key) => seen.get(key).ran && listed.get(key)),
  };
}

// ---------------------------------------------------------------------------
// The document

// Written by hand, not by pdf-lib. A classic section as Chromium writes one,
// but for an object 0, which the parse removes; then an incremental update
// whose object stream redefines page 4 and adds the dictionary and the array
// that hold the lexical forms.
function buildFixture() {
  const parts = [];
  let size = 0;
  const offsets = new Map();
  const put = (data) => {
    const buf = typeof data === "string" ? Buffer.from(data, "latin1") : data;
    parts.push(buf);
    size += buf.length;
  };
  const obj = (num, gen, ...body) => {
    offsets.set(num, size);
    put(`${num} ${gen} obj\n`);
    for (const part of body) put(part);
    put("\nendobj\n");
  };
  const stream = (num, dict, data) => {
    const packed = deflateSync(data);
    obj(num, 0, `<< ${dict} /Filter /FlateDecode /Length ${packed.length} >>\nstream\n`, packed, "\nendstream");
  };
  const at = (n) => String(n).padStart(10, "0");

  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(0, 0, "<< /Zero true >>");
  obj(1, 0, "<< /Type /Catalog /Pages 2 0 R /Dests 8 0 R /Misc 7 0 R /Extra 9 1 R /PageMode /UseOutlines >>");
  obj(2, 0, "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>");
  obj(3, 0, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>");
  obj(4, 0, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>");
  obj(5, 0, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  stream(6, "", Buffer.from("BT /F1 12 Tf 72 720 Td (Fixture) Tj ET\n", "latin1"));
  obj(8, 0, "<< /sec-1 [3 0 R /XYZ 0 792 0] /sec-2 [4 0 R /Fit] >>");
  obj(9, 1, "<< /Gen (one) /Self 9 1 R >>");
  obj(10, 0, "<< /Producer (hand-written) /Title (Old title) >>");

  const xref1 = size;
  const entry = (num, gen = 0) => `${at(offsets.get(num))} ${String(gen).padStart(5, "0")} n \n`;
  put("xref\n0 7\n0000000000 65535 f \n");
  for (const num of [1, 2, 3, 4, 5, 6]) put(entry(num));
  put(`8 3\n${entry(8)}${entry(9, 1)}${entry(10)}`);
  put(`trailer\n<< /Size 11 /Root 1 0 R /Info 10 0 R >>\nstartxref\n${xref1}\n%%EOF\n`);

  // The incremental update: an object stream holding 7, 4 and 12.
  const members = [
    [7, [
      "<< /Type /Misc /Name#20With#23Escapes /A#42C /Repeated /Repeated",
      "/Int 42 /Neg -17 /Frac 3.25 /Lead .25 /NegLead -.5 /Plus +7 /Trail 3. /Paper 595.28 /Sum 2.28 /NegSum -40.8933",
      "/Long 12345678901234567 /LongFrac 1234567890123456.5 /Huge 10000000000000000000000",
      "/Tiny 0.0000001 /ManyDigits 0.12345678901234567890123",
      "/True true /False false /Nil null",
      "/Lit (a \\(nested\\) string, a \\\\ and \\053 and a newline\\n) /Hex <48656C6C6F> /OddHex <ABC> /SpacedHex <48 65 6C>",
      "/Arr [1 [2 [3 /Repeated]] << /K /V /Deep << /Z null >> >> (s) <00FF> true 3 0 R] /Empty [] /EmptyDict << >>",
      "/Ref 9 1 R >>",
    ].join("\n")],
    [4, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Rotate 90 /Resources << >> >>"],
    [12, "[1 -2 3.5 /Name (str) <AB> true false null [[]] << /A 1 >> 7 0 R]"],
  ];
  let body = "";
  const head = [];
  for (const [num, text] of members) {
    head.push(`${num} ${body.length}`);
    body += `${text}\n`;
  }
  const headText = `${head.join(" ")} `;
  stream(11, `/Type /ObjStm /N ${members.length} /First ${headText.length}`, Buffer.from(headText + body, "latin1"));

  // Its cross-reference stream: 4, 7 and 12 in the object stream, 11 and 13
  // at their offsets.
  const xref2 = size;
  const rows = [
    [2, 11, 1], // 4
    [2, 11, 0], // 7
    [1, offsets.get(11), 0], // 11
    [2, 11, 2], // 12
    [1, xref2, 0], // 13
  ];
  const table = Buffer.alloc(rows.length * 7);
  rows.forEach(([type, field, index], i) => {
    table.writeUInt8(type, i * 7);
    table.writeUInt32BE(field, i * 7 + 1);
    table.writeUInt16BE(index, i * 7 + 5);
  });
  const id = "<0123456789ABCDEF0123456789ABCDEF>";
  stream(13, `/Type /XRef /Size 14 /Root 1 0 R /Info 10 0 R /ID [${id} ${id}] /Prev ${xref1} /W [1 4 2] /Index [4 1 7 1 11 3]`, table);
  put(`startxref\n${xref2}\n%%EOF\n`);
  return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------
// Reading a file pdf-lib saved

// Every object in `bytes`, keyed by number: { gen, container, entry, text },
// where `container` and `entry` place an object inside an object stream (null
// at the top level), and `text` is what is compared: the object's bytes with
// streams inflated and the fields that follow from the compressed sizes (each
// /Length, and the cross-reference stream's /W) masked. An object stream's own
// text is its dictionary and its header of offsets. `problems` lists each
// cross-reference entry that does not locate its object. Throws if the file
// does not have the shape pdf-lib writes.
function readSaved(bytes) {
  const s = bytes.toString("latin1");
  const header = /^%PDF-\d\.\d\n%[^\n]*\n\n/.exec(s);
  if (!header) throw new Error("it does not start with the header pdf-lib writes");
  const top = new Map();
  const OBJ = /(\d+) (\d+) obj\n/y;
  let p = header[0].length;
  for (;;) {
    OBJ.lastIndex = p;
    const m = OBJ.exec(s);
    if (!m) break;
    const num = Number(m[1]);
    const at = { offset: p, gen: Number(m[2]) };
    const body = p + m[0].length;
    const endobj = s.indexOf("\nendobj\n", body);
    const keyword = s.indexOf("\nstream\n", body);
    if (endobj < 0) throw new Error(`object ${num} at byte ${p} has no endobj`);
    if (keyword >= 0 && keyword < endobj) {
      const dict = s.slice(body, keyword);
      const lengths = [...dict.matchAll(/\/Length (\d+)/g)];
      if (lengths.length !== 1) throw new Error(`stream ${num} has ${lengths.length} /Length entries`);
      const start = keyword + "\nstream\n".length;
      const end = start + Number(lengths[0][1]);
      if (!s.startsWith("\nendstream\nendobj\n", end)) throw new Error(`stream ${num}'s /Length does not end at its endstream`);
      Object.assign(at, { dict, content: bytes.subarray(start, end) });
      p = end + "\nendstream\nendobj\n".length;
    } else {
      at.text = s.slice(body, endobj);
      p = endobj + "\nendobj\n".length;
    }
    if (top.has(num)) throw new Error(`object ${num} is written twice`);
    top.set(num, at);
    if (s[p] === "\n") p++;
  }
  const tail = /startxref\n(\d+)\n%%EOF$/y;
  tail.lastIndex = p;
  const startxref = tail.exec(s);
  if (!startxref) throw new Error(`byte ${p} is neither an object nor the trailer`);

  const objects = new Map();
  const add = (num, value) => {
    if (objects.has(num)) throw new Error(`object ${num} is written twice`);
    objects.set(num, value);
  };
  let xref = null;
  for (const [num, at] of top) {
    const place = { gen: at.gen, container: null, entry: null };
    if (at.dict === undefined) {
      add(num, { ...place, text: at.text });
      continue;
    }
    const data = /\/Filter \/FlateDecode\b/.test(at.dict) ? inflateSync(at.content) : at.content;
    const dict = at.dict.replace(/\/Length \d+/, "/Length _");
    if (/\/Type \/XRef\b/.test(at.dict)) {
      xref = { num, dict: at.dict, data };
      add(num, { ...place, text: dict.replace(/\/W \[[\d ]+\]/, "/W _") });
    } else if (/\/Type \/ObjStm\b/.test(at.dict)) {
      const n = Number(/\/N (\d+)/.exec(at.dict)?.[1]);
      const first = Number(/\/First (\d+)/.exec(at.dict)?.[1]);
      const text = data.toString("latin1");
      const head = text.slice(0, first).trim().split(/\s+/).map(Number);
      if (head.length !== 2 * n || head.some(Number.isNaN)) throw new Error(`object stream ${num}'s header does not list ${n} objects`);
      for (let k = 0; k < n; k++) {
        const end = k + 1 < n ? first + head[2 * k + 3] : text.length;
        add(head[2 * k], { gen: 0, container: num, entry: k, text: text.slice(first + head[2 * k + 1], end) });
      }
      add(num, { ...place, text: `${dict}\n${text.slice(0, first)}` });
    } else {
      add(num, { ...place, text: `${dict}\nstream\n${data.toString("latin1")}` });
    }
  }

  const problems = [];
  if (!xref) {
    problems.push("it has no cross-reference stream");
  } else {
    const w = /\/W \[ ?(\d+) (\d+) (\d+) ?\]/.exec(xref.dict)?.slice(1).map(Number);
    const size = Number(/\/Size (\d+)/.exec(xref.dict)?.[1]);
    const index = /\/Index \[([\d ]+)\]/.exec(xref.dict)?.[1].trim().split(/\s+/).map(Number) ?? [0, size];
    if (!w) throw new Error("its cross-reference stream has no /W");
    let q = 0;
    const field = (width, otherwise) => {
      if (width === 0) return otherwise;
      let v = 0;
      for (let i = 0; i < width; i++) v = v * 256 + xref.data[q++];
      return v;
    };
    const located = new Set();
    for (let i = 0; i < index.length; i += 2) {
      for (let num = index[i]; num < index[i] + index[i + 1]; num++) {
        if (q + w[0] + w[1] + w[2] > xref.data.length) throw new Error("its cross-reference stream is shorter than its /Index");
        const type = field(w[0], 1);
        const f2 = field(w[1], 0);
        const f3 = field(w[2], 0);
        const o = objects.get(num);
        if (type === 1) {
          const at = top.get(num);
          if (!at || at.offset !== f2 || at.gen !== f3) {
            problems.push(`the cross-reference entry for object ${num} gives byte ${f2}, generation ${f3}, where ${at ? `it starts at byte ${at.offset}, generation ${at.gen}` : "no such object is written at the top level"}`);
          }
        } else if (type === 2) {
          if (!o || o.container !== f2 || o.entry !== f3) {
            problems.push(`the cross-reference entry for object ${num} gives object stream ${f2}, entry ${f3}, where it is ${o ? where(o) : "not written"}`);
          }
        } else {
          continue;
        }
        located.add(num);
      }
    }
    if (q !== xref.data.length) problems.push(`its cross-reference stream has ${xref.data.length - q} bytes after its last entry`);
    for (const num of objects.keys()) if (!located.has(num)) problems.push(`object ${num} has no cross-reference entry`);
    const xrefAt = top.get(xref.num).offset;
    if (Number(startxref[1]) !== xrefAt) problems.push(`startxref gives byte ${startxref[1]}, where the cross-reference stream starts at byte ${xrefAt}`);
  }
  return { objects, problems };
}

function where(o) {
  if (o.container !== null) return `object stream ${o.container}, entry ${o.entry}`;
  return o.gen === 0 ? "the top level" : `the top level, generation ${o.gen}`;
}

// Where `shimmed` differs from `stock`, one line or a few per object.
function differences(stock, shimmed) {
  const found = [];
  const nums = [...new Set([...stock.objects.keys(), ...shimmed.objects.keys()])].sort((a, b) => a - b);
  for (const num of nums) {
    const a = stock.objects.get(num);
    const b = shimmed.objects.get(num);
    if (!b) found.push(`object ${num} is missing; stock writes it in ${where(a)}`);
    else if (!a) found.push(`object ${num} is written in ${where(b)}, and stock does not write it`);
    else if (where(a) !== where(b)) found.push(`object ${num} is written in ${where(b)}; stock writes it in ${where(a)}`);
    else if (a.text !== b.text) {
      let i = 0;
      while (a.text[i] === b.text[i]) i++;
      const around = (t) => JSON.stringify(t.slice(Math.max(0, i - 30), i + 30));
      found.push(`object ${num}, in ${where(a)}, from byte ${i} of its text:\n  stock:   ${around(a.text)}\n  shimmed: ${around(b.text)}`);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Running a side

// Resolves to { bytes, streamCount, reached } or { error }.
function runSide(dir, name, fixture, { shims, parallel, coverage = false }) {
  const out = path.join(dir, `${name}.pdf`);
  const job = JSON.stringify({ fixture, out, shims, parallel, coverage });
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SIDE, job], { stdio: ["ignore", "pipe", "pipe"], timeout: SIDE_TIMEOUT_MS });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("error", (err) => resolve({ error: err.message }));
    child.on("close", (code, signal) => {
      if (code !== 0) {
        const why = signal ? `was ended by ${signal}` : `exited ${code}`;
        const lines = stderr.trim().split(/\r?\n/).filter((l) => !l.startsWith("Parsed number that is too large"));
        resolve({ error: `${why}${lines.length ? `: ${lines.slice(0, 6).join("\n    ")}` : ""}` });
        return;
      }
      resolve({ ...JSON.parse(stdout.trim().split(/\r?\n/).at(-1)), bytes: readFileSync(out) });
    });
  });
}

// The differences between a side's output and stock's, or the reason there is
// no output to compare.
function against(stock, side) {
  if (side.error) return [`the shimmed side failed: it ${side.error}`];
  let read;
  try {
    read = readSaved(side.bytes);
  } catch (err) {
    return [`the shimmed output cannot be read: ${err.message}`];
  }
  return [...read.problems, ...differences(stock, read)];
}

// Runs `jobs` (functions returning promises) a few at a time.
async function pool(jobs, width) {
  const results = new Array(jobs.length);
  let next = 0;
  const lane = async () => {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await jobs[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(width, jobs.length) }, lane));
  return results;
}

// Each shim alone, and each left out, as { subject, alone, differs }.
async function diagnose(dir, document, shims, stock) {
  const variants = [
    ...shims.map((s) => ({ subject: shimName(s), alone: true, shims: [s], parallel: false })),
    { subject: "parallelSave", alone: true, shims: [], parallel: true },
    ...shims.map((s) => ({ subject: shimName(s), alone: false, shims: shims.filter((x) => x !== s), parallel: true })),
    { subject: "parallelSave", alone: false, shims, parallel: false },
  ];
  const sides = await pool(
    variants.map((v, i) => () => runSide(dir, `${document.name}-variant-${i}`, document.fixture, v)),
    Math.min(4, availableParallelism())
  );
  return variants.map((v, i) => ({ ...v, differs: against(stock, sides[i]).length > 0 }));
}

// The two shimmed sides' patched members as one list: a member ran if it ran
// in either.
function mergePatched(sides) {
  const merged = new Map();
  for (const p of sides.flatMap((side) => side.patched)) {
    const key = `${p.shim}: ${p.member}`;
    merged.set(key, { ...p, ran: p.ran || (merged.get(key)?.ran ?? false) });
  }
  return [...merged.values()];
}

// ---------------------------------------------------------------------------

const shims = shimsOf(readFileSync(RENDER_BOOK, "utf8"));
const dir = mkdtempSync(path.join(tmpdir(), "pdf-shims-"));
try {
  const fixture = path.join(dir, "fixture.pdf");
  writeFileSync(fixture, buildFixture());
  const documents = [
    { name: "loaded", fixture },
    { name: "created", fixture: null },
  ];
  await Promise.all(
    documents.map(async (document) => {
      [document.stockSide, document.shimmedSide] = await Promise.all([
        runSide(dir, `${document.name}-stock`, document.fixture, { shims: [], parallel: false }),
        runSide(dir, `${document.name}-shimmed`, document.fixture, { shims, parallel: true, coverage: true }),
      ]);
    })
  );
  for (const document of documents) {
    const { name, stockSide, shimmedSide } = document;
    if (stockSide.error) throw new Error(`the stock side for the ${name} document ${stockSide.error}`);
    document.stock = readSaved(stockSide.bytes);
    if (document.stock.problems.length) {
      throw new Error(`stock pdf-lib's output for the ${name} document fails the reader here:\n  ${document.stock.problems.join("\n  ")}`);
    }
    document.found = against(document.stock, shimmedSide);
  }

  const shimmedSides = documents.map((d) => d.shimmedSide);
  const ok = shimmedSides.every((side) => !side.error);
  const unreached = ok ? shims.filter((s) => !shimmedSides.some((side) => side.reached.includes(s))).map(shimName) : [];
  if (ok && shimmedSides.some((side) => side.streamCount === 0)) unreached.push("parallel-deflate.mjs (no object stream was deflated on the thread pool)");
  const patched = ok ? mergePatched(shimmedSides) : null;
  const members = ok ? againstPatches(patched, unreached) : null;
  const faults = members ? members.missing.length + members.unlisted.length + members.notRun.length + members.nowRun.length : 0;
  const [loaded, created] = documents;

  if (documents.every((d) => d.found.length === 0) && unreached.length === 0 && faults === 0) {
    console.log(
      `${TOOL}: stock pdf-lib and ${shims.length} shims with parallelSave write the same ${loaded.stock.objects.size} objects ` +
        `for a loaded document and the same ${created.stock.objects.size} for a created one; ` +
        `the ${patched.length} members the shims patch are as listed, and all ran but the ${members.marked} marked`
    );
  } else {
    for (const document of documents.filter((d) => d.found.length)) {
      const { name, found } = document;
      console.log(`${TOOL}: the shimmed output for the ${name} document differs from stock pdf-lib's in ${found.length} place(s):`);
      for (const line of found.slice(0, 5)) console.log(`  ${line.replaceAll("\n", "\n  ")}`);
      if (found.length > 5) console.log(`  ... and ${found.length - 5} more`);
      const verdicts = await diagnose(dir, document, shims, document.stock);
      const list = (xs) => (xs.length ? xs.map((v) => v.subject).join(", ") : "none");
      console.log(`  differs with only this one:      ${list(verdicts.filter((v) => v.alone && v.differs))}`);
      console.log(`  matches with only this left out: ${list(verdicts.filter((v) => !v.alone && !v.differs))}`);
    }
    if (unreached.length) {
      console.log(`${TOOL}: ${unreached.length} shim(s) did nothing while the documents were loaded or created, changed and saved:`);
      for (const name of unreached) console.log(`  book/lib/${name}`);
      console.log("  The documents no longer reach the shim, or the book does not need it.");
    }
    const report = (list, what, why) => {
      if (list.length === 0) return;
      console.log(`${TOOL}: ${list.length} ${what}:`);
      for (const key of list) console.log(`  book/lib/${key}`);
      console.log(`  ${why}`);
    };
    if (members) {
      report(members.missing, "member(s) PATCHES lists are not patched", "The shim no longer patches pdf-lib's own object, or PATCHES is out of date.");
      report(members.unlisted, "patched member(s) are not in PATCHES", "Add each to PATCHES, marked with a reason if neither document reaches it.");
      report(members.notRun, "patched member(s) never ran", "The documents no longer reach the function, or the book does not need it; PATCHES can mark it, with the reason.");
      report(members.nowRun, "member(s) PATCHES marks as not reached ran", "Remove the mark from PATCHES.");
    }
    process.exitCode = 1;
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
