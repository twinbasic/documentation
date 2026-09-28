// One side of check_pdf_shims_equiv.mjs: loads the fixture, changes it as
// book/render-book.mjs changes the book, and saves it, with the shims it is
// given and no others. Each side is a process of its own, because the onebuf
// shims allow one PDFContext per process and the stock side must load no shim.
//
//     node scripts/lib/pdf-shims-side.mjs <job as JSON>
//
// The job is { fixture, out, shims, parallel, coverage }: `shims` are absolute
// paths, imported in the order given; `parallel` saves through parallelSave, as
// the book does, and otherwise as stock pdf-lib's save would with the book's 500
// objects per stream; `coverage` records which of the shims ran a function
// during the load, change and save, their imports left out, and which of the
// members of pdf-lib they put a function into, and whether each function ran.
// The side writes the saved PDF to `out` and prints one JSON line,
// { streamCount, reached, patched }.

import { readFileSync, writeFileSync } from "node:fs";
import { Session } from "node:inspector/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BOOK_LIB = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "book", "lib");
const bookLib = (name) => pathToFileURL(path.join(BOOK_LIB, name)).href;
const PDF_LIB_CJS = /[\\/]node_modules[\\/]pdf-lib[\\/]cjs[\\/](.+)$/;
const require = createRequire(import.meta.url);

// A fixed date, so the Info dictionary is the same on both sides.
const WHEN = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));

// Two entries, the first closed: a closed entry's /Count is negative.
const OUTLINE = [
  {
    title: "First \u{00E9}ntry",
    destination: "sec-1",
    closed: true,
    children: [{ title: "Child (one)", destination: "sec-2", closed: false, children: [] }],
  },
  { title: "Second", destination: "sec-2", closed: false, children: [] },
];

// Where a shim can install a function: the exports of each pdf-lib module
// loaded, each function they export and that function's prototype. Each maps
// to the name a report gives a member of it.
function pdfLibHolders() {
  const holders = new Map();
  const add = (obj, label) => {
    if (!holders.has(obj)) holders.set(obj, label);
  };
  for (const [file, mod] of Object.entries(require.cache)) {
    const rel = file.match(PDF_LIB_CJS)?.[1].replaceAll("\\", "/");
    const exported = mod.exports;
    if (!rel || exported === null || typeof exported !== "object") continue;
    add(exported, (key) => `${key} in pdf-lib/cjs/${rel}`);
    for (const key of Object.keys(exported)) {
      const fn = exported[key];
      if (typeof fn !== "function") continue;
      const name = fn.name || key;
      add(fn, (member) => `${name}.${member}`);
      if (fn.prototype) add(fn.prototype, (member) => `${name}.prototype.${member}`);
    }
  }
  return holders;
}

function snapshot(holders) {
  const snap = new Map();
  for (const obj of holders.keys()) {
    snap.set(obj, new Map(Reflect.ownKeys(obj).map((key) => [key, Object.getOwnPropertyDescriptor(obj, key)])));
  }
  return snap;
}

// The functions the holders hold now and did not hold in `before`, each with
// the members that hold it.
function installedSince(holders, before) {
  const installed = new Map();
  for (const [obj, label] of holders) {
    const was = before.get(obj);
    for (const key of Reflect.ownKeys(obj)) {
      const now = Object.getOwnPropertyDescriptor(obj, key);
      for (const [part, suffix] of [["value", ""], ["get", " (getter)"], ["set", " (setter)"]]) {
        const fn = now[part];
        if (typeof fn !== "function" || was.get(key)?.[part] === fn) continue;
        installed.set(fn, [...(installed.get(fn) ?? []), `${label(String(key))}${suffix}`]);
      }
    }
  }
  return installed;
}

// Each member that holds an installed function a shim defines, as
// { shim, member, ran }. The inspector gives each function's position; its
// coverage entry is the one at that position whose source is the function's
// own.
async function patchedMembers(coverage, installed, shimUrls) {
  const scripts = new Map(coverage.map((s) => [s.scriptId, s]));
  const fns = [...installed.keys()];
  globalThis.__installedByShims = fns;
  const { result: list } = await session.post("Runtime.evaluate", { expression: "globalThis.__installedByShims" });
  const { result: items } = await session.post("Runtime.getProperties", { objectId: list.objectId, ownProperties: true });
  delete globalThis.__installedByShims;
  await session.post("Debugger.enable");
  const sources = new Map();
  const patched = [];
  for (const item of items.filter((p) => /^\d+$/.test(p.name))) {
    const fn = fns[Number(item.name)];
    const members = installed.get(fn);
    const { internalProperties = [] } = await session.post("Runtime.getProperties", { objectId: item.value.objectId });
    const at = internalProperties.find((p) => p.name === "[[FunctionLocation]]")?.value.value;
    if (!at) throw new Error(`the inspector gives no position for ${members[0]}`);
    const script = scripts.get(at.scriptId);
    if (!script || !shimUrls.has(script.url)) continue;
    if (!sources.has(at.scriptId)) {
      sources.set(at.scriptId, (await session.post("Debugger.getScriptSource", { scriptId: at.scriptId })).scriptSource);
    }
    const source = sources.get(at.scriptId);
    const offset = lineStart(source, at.lineNumber) + at.columnNumber;
    const text = Function.prototype.toString.call(fn);
    const entry = script.functions.find(({ ranges: [r] }) =>
      r.startOffset <= offset && offset < r.endOffset && source.slice(r.startOffset, r.endOffset) === text
    );
    // A function never called may never have been compiled, and then the
    // coverage has no entry for it at all.
    const ran = entry !== undefined && entry.ranges[0].count > 0;
    for (const member of members) patched.push({ shim: fileURLToPath(script.url), member, ran });
  }
  return patched;
}

function lineStart(source, line) {
  let i = 0;
  for (let n = 0; n < line; n++) i = source.indexOf("\n", i) + 1;
  return i;
}

const job = JSON.parse(process.argv[2]);

let session = null;
if (job.coverage) {
  session = new Session();
  session.connect();
  await session.post("Profiler.enable");
  await session.post("Profiler.startPreciseCoverage", { callCount: true, detailed: false });
}

const pdfLib = await import("pdf-lib");
const holders = session ? pdfLibHolders() : null;
const before = holders && snapshot(holders);
const shims = [];
for (const file of job.shims) shims.push(await import(pathToFileURL(file).href));
const installed = holders && installedSince(holders, before);
const { measure } = await import(bookLib("measure-pass.mjs"));
const { setMetadata } = await import(bookLib("postprocesser.mjs"));
const { setOutline } = await import(bookLib("outline.mjs"));
const parallelSave = job.parallel ? (await import(bookLib("parallel-deflate.mjs"))).parallelSave : null;

// Taking the coverage resets its counts, so what the imports ran is not
// counted as reaching a shim.
if (session) await session.post("Profiler.takePreciseCoverage");

const { PDFDocument, PDFName, PDFNumber, PDFRef, PDFStreamWriter, PDFString, rgb } = pdfLib;
const raw = readFileSync(job.fixture);

// As render-book.mjs does: size the onebuf shims from a measure of the input.
const counts = measure(raw);
for (const shim of shims) {
  shim.setExpectedDictSlots?.(counts.dictSlots);
  shim.setExpectedArraySlots?.(counts.arraySlots);
}

const doc = await PDFDocument.load(raw);
setMetadata(doc, { title: "Fixture", subject: "check_pdf_shims_equiv", keywords: "one,two", creationDate: WHEN });
doc.setModificationDate(WHEN); // setMetadata stamps the time it runs
await setOutline(doc, OUTLINE, false);

// What the book's own change does not reach: a page drawn on, which
// normalizes its content streams; a page inserted and one removed, which edit
// /Kids; and dictionaries and an array parsed early, edited after the objects
// above were made.
const [first] = doc.getPages();
first.drawText("Drawn 0.5 over", { x: 72.25, y: 700.125, size: 11.5, color: rgb(0.25, 0.5, 0.75) });
doc.insertPage(1, [300.5, 400]);
doc.removePage(2);
const misc = doc.context.lookup(PDFRef.of(7));
misc.set(PDFName.of("Added"), PDFNumber.of(-0.001));
misc.set(PDFName.of("Int"), PDFString.of("replaced"));
misc.delete(PDFName.of("Nil"));
doc.context.lookup(PDFRef.of(12)).push(PDFNumber.of(1e-7));
doc.catalog.set(PDFName.of("Edited"), PDFNumber.of(2 ** 20));

let bytes;
let streamCount = null;
if (parallelSave) {
  ({ bytes, streamCount } = await parallelSave(doc, { objectsPerStream: 500 }));
} else {
  // Stock save() with object streams writes 50 objects to a stream, and the
  // book 500; these are save()'s own steps before it writes.
  if (doc.getPageCount() === 0) doc.addPage();
  doc.formCache.getValue()?.updateFieldAppearances();
  await doc.flush();
  bytes = await PDFStreamWriter.forContext(doc.context, Infinity, true, 500).serializeToBuffer();
}
writeFileSync(job.out, bytes);

let reached = null;
let patched = null;
if (session) {
  const { result } = await session.post("Profiler.takePreciseCoverage");
  const ran = new Set(result.filter((s) => s.functions.some((f) => f.ranges[0].count > 0)).map((s) => s.url));
  reached = job.shims.filter((file) => ran.has(pathToFileURL(file).href));
  patched = await patchedMembers(result, installed, new Set(job.shims.map((file) => pathToFileURL(file).href)));
  session.disconnect();
}
console.log(JSON.stringify({ streamCount, reached, patched }));
