// One part of the build timed alone, on one thread: what `build_speed.mjs part
// <name>` runs. Each part imports the modules of the tree it is given, so the
// code of another checkout (a branch's worktree, an older commit's) is measured
// by the same tool. A part that reads built files reads that tree's: build it
// first.
//
// A part's time alone is not its time in a build, where it shares the machine
// with every lane: measure both, and report both.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import zlib from "node:zlib";

const OUTPUT_TREES = ["_site*/**", "_serve/**", "_pdf/**"];
const ms = (t) => `${t.toFixed(0)} ms`;

function context(tree) {
  const imp = (rel) => import(pathToFileURL(path.join(tree, rel)).href);
  return {
    tree,
    imp,
    srcRoot: path.join(tree, "docs"),
    searchData: () => JSON.parse(readFileSync(path.join(tree, "docs/_site/assets/js/search-data.json"), "utf8")),
  };
}

// discover() warns about pages it leaves out; a timing run does not repeat them.
async function quietly(fn) {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.warn = warn;
  }
}

// The first call, which the engine has not compiled yet, and the range of the rest.
function time(label, fn, runs = 5) {
  const ts = [];
  let out;
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    out = fn();
    ts.push(performance.now() - t);
  }
  const rest = ts.slice(1);
  const later = `${Math.min(...rest).toFixed(1)} to ${Math.max(...rest).toFixed(1)} ms`;
  console.log(`${label.padEnd(34)} first ${ts[0].toFixed(1)} ms, then ${later}`);
  return out;
}

// What markdownInit is made of (builder/tbdocs.mjs): the link tables, the
// counts, the parser, and the scan for placeholders with the scans inside it.
async function markdownInit({ imp, srcRoot }) {
  const { discover } = await imp("builder/discover.mjs");
  const { deriveCounts, checkPlaceholders, deriveDownloads, findCountRefs } = await imp("builder/counts.mjs");
  const { buildLinkTables, createMarkdownIt, serializeLinkTables } = await imp("builder/render.mjs");
  const { blockRegions, maskCode } = await imp("lib/markdown.mjs");
  const { pages, staticFiles } = await quietly(() => discover(srcRoot, OUTPUT_TREES));
  const state = { pages, staticFiles };
  console.log(`${pages.length} pages, ${staticFiles.length} static files`);
  const linkTables = time("buildLinkTables", () => buildLinkTables(pages));
  const counts = time("deriveCounts", () => deriveCounts(state, { redirectStubs: 0 }));
  const md = time("createMarkdownIt", () =>
    createMarkdownIt({
      highlighter: null,
      linkTables,
      baseurl: "",
      staticFiles: new Set(staticFiles.map((f) => f.srcRel)),
      counts,
    }),
  );
  const downloads = deriveDownloads(state, {});
  const withRef = pages.filter((p) => p.rawContent.includes("{{tbdocs:"));
  const chars = withRef.reduce((n, p) => n + p.rawContent.length, 0);
  console.log(`pages with a placeholder: ${withRef.length}, ${chars} characters`);
  time("checkPlaceholders", () => checkPlaceholders(pages, counts, downloads, md));
  time("  maskCode of those pages", () => withRef.map((p) => maskCode(p.rawContent.replace(/\r\n?/g, "\n"), { md })));
  time("  blockRegions of those pages", () => withRef.map((p) => blockRegions(p.rawContent, { md })));
  time("  findCountRefs of those pages", () => withRef.map((p) => findCountRefs(p.rawContent, md)));
  time("serializeLinkTables", () => serializeLinkTables(linkTables));
}

// computeNav, each call on a fresh copy of the pages: it writes to them.
async function nav({ imp, srcRoot }) {
  const { discover } = await imp("builder/discover.mjs");
  const { computeNav } = await imp("builder/nav.mjs");
  const { pages } = await quietly(() => discover(srcRoot, OUTPUT_TREES));
  const count = (nodes) => nodes.reduce((n, node) => n + 1 + count(node.children), 0);
  let tree;
  const ts = [];
  for (let i = 0; i < 6; i++) {
    const copy = pages.map((p) => ({ ...p }));
    const t = performance.now();
    tree = computeNav(copy, {}).navTree;
    ts.push(performance.now() - t);
  }
  console.log(`${pages.length} pages, ${count(tree)} nav nodes`);
  console.log(`computeNav: ${ts.map((t) => t.toFixed(1)).join(", ")} ms`);
}

// The index's add step, one slice after another, against the slice count: its
// CPU in all, and how long the longest slice holds a lane.
async function indexSlices(ctx) {
  const si = await ctx.imp("builder/search-index.mjs");
  const docs = ctx.searchData();
  const lunr = si.loadSearchLunr();
  for (const k of [1, 2, 4, 8, 16, 32]) {
    const times = [];
    let terms = 0;
    for (const p of si.planIndexSlices(lunr, docs, k)) {
      const t = performance.now();
      const { added } = si.addSlice(lunr, p.docs, p.twins);
      times.push(performance.now() - t);
      terms += added.terms.length;
    }
    const sum = times.reduce((a, b) => a + b, 0);
    const slices = `${String(k).padStart(2)} slices`;
    console.log(
      `${slices}: ${ms(sum)} in all, longest ${ms(Math.max(...times))}, shortest ${ms(Math.min(...times))}, ${terms} terms held`,
    );
  }
}

// The add step split: making the entries, tokenizing and stemming the content,
// lunr's Builder.add, and the postings written as JSON.
async function indexAdd(ctx) {
  const si = await ctx.imp("builder/search-index.mjs");
  const docs = ctx.searchData();
  const lunr = si.loadSearchLunr();
  const ids = Object.keys(docs);
  const twins = si.stemTwins(lunr, docs);
  let t0 = performance.now();
  const lap = (label) => {
    const t = performance.now();
    console.log(`${label.padEnd(44)} ${ms(t - t0).padStart(8)}`);
    t0 = t;
  };
  const entries = ids.map((id) => si.entryFor(lunr, docs, id, twins));
  lap(`entryFor (${ids.length} entries)`);
  let tokens = 0;
  const pipeline = si.newBuilder(lunr).pipeline;
  for (const e of entries) tokens += pipeline.run(lunr.tokenizer(e.content, { fields: ["content"] })).length;
  lap(`content tokenized and stemmed (${tokens} tokens)`);
  const builder = si.newBuilder(lunr);
  for (const e of entries) builder.add(e);
  lap("Builder.add");
  const fields = Object.keys(builder._fields);
  let bytes = 0;
  for (const term in builder.invertedIndex) {
    const posting = builder.invertedIndex[term];
    for (const f of fields) bytes += JSON.stringify(posting[f]).length;
  }
  lap(`postings as JSON (${bytes} characters)`);
}

// What follows the adds: the merge, the inverted index's JSON, the vectors of
// every slice, the file's assembly and the offline copy's escaping.
async function indexTerms(ctx) {
  const si = await ctx.imp("builder/search-index.mjs");
  const docs = ctx.searchData();
  const lunr = si.loadSearchLunr();
  for (const k of [2, 8, 16]) {
    const lanes = si.planIndexSlices(lunr, docs, k).map((p) => si.addSlice(lunr, p.docs, p.twins));
    const laps = [];
    let t = performance.now();
    const lap = (label) => {
      laps.push(`${label} ${ms(performance.now() - t)}`);
      t = performance.now();
    };
    const { merged, totals } = si.mergeSlices(lanes.map((l) => l.added));
    lap("merge");
    const json = si.invertedIndexJson(merged);
    lap("terms");
    const vectors = lanes.map((l, i) => si.sliceVectors(lunr, l.state, { ...totals, numbers: totals.numbers[i] }));
    lap("vectors (every slice)");
    const text = si.searchIndexFile(si.assembleIndexJson(lunr, vectors, json), docs);
    lap("assembly");
    si.offlineSearchIndexJs(text);
    lap("offline copy");
    console.log(`${String(k).padStart(2)} slices: ${laps.join(", ")}`);
  }
}

// A file deflated as one stream and as pieces joined into one stream (pigz's
// method, lib/help-archive.mjs), by level, piece size and whether a piece is
// primed with the 32 KB before it. The pieces run on Node's thread pool here,
// four at a time, where the build runs them on its lanes.
async function deflate(ctx, { file }) {
  const data = readFileSync(file ?? path.join(ctx.tree, "docs/_site-offline/assets/js/search-index.js"));
  const deflateRaw = promisify(zlib.deflateRaw);
  const WINDOW = 32768;
  const pieces = async (size, primed, level) => {
    const parts = [];
    for (let at = 0; at < data.length; at += size) {
      const last = at + size >= data.length;
      const opts = { level, finishFlush: last ? zlib.constants.Z_FINISH : zlib.constants.Z_SYNC_FLUSH };
      if (primed && at > 0) opts.dictionary = data.subarray(Math.max(0, at - WINDOW), at);
      parts.push(deflateRaw(data.subarray(at, at + size), opts));
    }
    return Buffer.concat(await Promise.all(parts));
  };
  let t = performance.now();
  const whole = zlib.deflateRawSync(data, { level: 9 });
  console.log(`${data.length} bytes`);
  console.log(`one stream, level 9          ${ms(performance.now() - t).padStart(8)}  ${whole.length}`);
  for (const level of [9, 6]) {
    for (const size of [256 << 10, 1 << 20, 4 << 20]) {
      for (const primed of [false, true]) {
        t = performance.now();
        const z = await pieces(size, primed, level);
        const took = ms(performance.now() - t).padStart(8);
        const pct = `${((z.length / whole.length - 1) * 100).toFixed(2)}%`.padStart(7);
        const ok = zlib.inflateRawSync(z).equals(data) ? "inflates" : "DOES NOT INFLATE";
        const what = `level ${level}, ${String(size >> 10).padStart(4)} KB, ${primed ? "primed    " : "not primed"}`;
        console.log(`${what} ${took}  ${z.length} ${pct}  ${ok}`);
      }
    }
  }
}

// The help archive's deflating on one thread, whole files and pieces apart, and
// the end-of-build recheck of the archive the tree's last build wrote.
async function archive(ctx) {
  const { helpArchiveSkips } = await ctx.imp("builder/help-archive-step.mjs");
  const lib = await ctx.imp("lib/help-archive.mjs");
  const root = path.join(ctx.tree, "docs/_site-offline");
  const units = lib.planUnits(lib.listFiles(root, helpArchiveSkips));
  for (const [what, list] of [
    ["whole files", units.filter((u) => !u.piece)],
    ["pieces of large files", units.filter((u) => u.piece)],
  ]) {
    const t = performance.now();
    let bytes = 0;
    for (const u of list) bytes += lib.deflateUnit(root, u).body.length;
    console.log(
      `${what}: ${list.length} units, ${ms(performance.now() - t)}, ${(bytes / 1048576).toFixed(1)} MB in the archive`,
    );
  }
  const t = performance.now();
  const problems = await lib.checkHelpArchive({
    src: root,
    zip: path.join(ctx.tree, "add-in/Resources/HELP/site.zip"),
    mayDiffer: ["BuildInfo.html", "assets/images/gantt.svg"],
    skip: helpArchiveSkips,
  });
  console.log(`the recheck of site.zip: ${ms(performance.now() - t)}, ${problems.length} problems`);
}

export const PARTS = {
  "markdown-init": { run: markdownInit, about: "what markdownInit is made of, each piece five times" },
  nav: { run: nav, about: "computeNav, six calls on fresh copies of the pages" },
  "index-slices": { run: indexSlices, about: "the index's add step against the slice count (needs a built tree)" },
  "index-add": { run: indexAdd, about: "the add step split into its costs (needs a built tree)" },
  "index-terms": { run: indexTerms, about: "the merge, the terms, the vectors and the assembly (needs a built tree)" },
  deflate: { run: deflate, about: "a file as one deflate stream and as pieces; --file, else the offline search index" },
  archive: { run: archive, about: "the help archive's deflating on one thread, and its recheck (needs a built tree)" },
};

export async function runPart(name, tree, options = {}) {
  await PARTS[name].run(context(tree), options);
}
