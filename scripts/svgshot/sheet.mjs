// Writes a sheet to look at: an HTML page of the pictures under docs/ that have no SVG
// beside them, each drawn again from its bundle with the converter as it is now and
// judged against its PNG as replay.mjs and shoot_docs.mjs --svg judge it (keep.mjs's
// bar), worst first, with the PNG, the SVG's render and the difference map side by
// side; then the pictures with no bundle, as thumbnails. With --all, every picture.
//
// With --against <rev>, a sheet of another kind: every PNG that differs from the same
// file at a git revision, each as the revision has it, as it is and the difference map,
// to review what a screenshot run rewrote. PNG against PNG: no SVG is drawn, no bundle is
// read and no browser starts.
//
// It writes only into the folder it is given, which may not be under docs/ or anywhere
// git does not ignore: the SVGs are drawn without the user-name check (the sheet is
// for its owner alone; owner), so the sheet and its pictures can hold the Windows user
// name. It starts no IDE and writes nothing under docs/; the fonts' cuts go to the
// bundle folder's cache, as replay.mjs's do.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import path from "node:path";
import {
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  regexOption,
  withUsageError,
} from "../../lib/cli.mjs";
import { DOCS_DIR, REPO_ROOT } from "../../lib/repo-paths.mjs";
import { listBundles } from "./bundle.mjs";
import { useSubsetCache } from "./fonts.mjs";
import { judgeSvg, SVG_FAITHFUL } from "./keep.mjs";
import {
  changeFiles,
  changeSheetHtml,
  changedPictures,
  compareRevisionPicture,
  defaultJobs,
  inBrowser,
  judgedFiles,
  listPictures,
  mayWriteSheet,
  notDrawn,
  outputRefusal,
  pngSize,
  redraw,
  reportShard,
  retakeText,
  revisionBytes,
  runShards,
  sheetHtml,
  shardOf,
  shareOf,
  themeOf,
  writeJudged,
} from "./redraw.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/svgshot/sheet.mjs --out <dir> [--docs <dir>] [--bundles <dir>] [--only <regex>] [--all] [--jobs N] [-h, --help]
       node scripts/svgshot/sheet.mjs --out <dir> --against <rev> [--docs <dir>] [--only <regex>]

Writes <dir>/index.html, a page of the pictures under docs that have no SVG
beside them, with their files in <dir>/pictures. Each picture with a bundle is
drawn again from it with the converter as it is now and judged as replay.mjs
judges it (an SVG is kept below ${SVG_FAITHFUL}% of its pixels far off the PNG's),
worst first, with its PNG, the SVG's render and the difference map; then the
pictures with no bundle, as thumbnails. Starts no IDE and writes nothing under
docs; needs Python with fontTools for a font cut not in the cache, as replay does.

The pictures are drawn without the check for the Windows user name, so the sheet
can hold it: <dir> must not be under docs, nor inside a git working tree at a
path git does not ignore.

  --out <dir>      the folder for the sheet (required): new, empty, or holding a
                   sheet, which is replaced
  --docs <dir>     the folder the pictures are in (default docs)
  --bundles <dir>  the bundle cache (default .svgshot-bundles in the repository);
                   new font cuts are kept in its subsets folder
  --only <regex>   only the pictures whose path under docs (with .light for a
                   light one) matches
  --all            every picture, also one with an SVG beside it: drawn again from
                   its bundle, else its SVG file judged as it is
  --jobs N         processes drawing at once, each with a browser of its own
                   (default: half the logical processors, at most 8)
  --against <rev>  a sheet of another kind: every PNG under docs that differs from
                   the same file at the git revision <rev> (a commit, a branch, a
                   tag, HEAD), as the revision has it, as it is now and the
                   difference map, read with git run in the --docs folder, so that
                   folder's own repository answers. Most changed first; then the
                   pictures that differ only within the screenshotter's noise rule
                   (which it never writes: most likely rewritten in error), with a
                   command that would restore them, shown and never run; then the
                   added; then the deleted. No SVG is drawn, no bundle is read and
                   no browser starts. Not combined with --all, --bundles or --jobs
  -h, --help       print this text and exit

Exit codes:
  0  the sheet was written, every picture in it drawn or shown
  1  the sheet was written, but a picture could not be drawn or compared (it is listed so)
  2  the tool could not run: a refused command line, a refused output folder, no
     bundle cache, no browser, no such revision, or a crash`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      out: { type: "string" },
      docs: { type: "string" },
      bundles: { type: "string" },
      only: { type: "string" },
      all: { type: "boolean", default: false },
      jobs: { type: "string" },
      against: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const refuse = (message) => {
  console.error(`sheet: ${message}`);
  process.exit(2);
};
if (values.out === undefined) refuse("--out is required: the folder for the sheet");
if (values.against !== undefined)
  withUsageError(() => {
    for (const other of ["all", "bundles", "jobs"]) refuseTogether(values, ["against", other]);
  });
const only = values.only === undefined ? null : withUsageError(() => regexOption(values.only, { option: "--only" }));
const jobs = withUsageError(() =>
  numberOption(values.jobs ?? String(defaultJobs()), { option: "--jobs", integer: true, min: 1, max: 32 }),
);
const outRoot = path.resolve(values.out);
const docsRoot = path.resolve(values.docs ?? DOCS_DIR);
const bundlesRoot = path.resolve(values.bundles ?? path.join(REPO_ROOT, ".svgshot-bundles"));
const picturesDir = path.join(outRoot, "pictures");
const SHARD_ENV = "SVGSHOT_SHEET_SHARD";
const SHARD = shardOf(SHARD_ENV);

const refusal = outputRefusal(outRoot, [docsRoot, DOCS_DIR]);
if (refusal) refuse(`--out must not be under docs nor where git would take it: ${refusal}`);
// A child finds the folder as its parent left it, emptied for it.
if (!SHARD && !mayWriteSheet(outRoot)) refuse(`--out holds files that are not a sheet: ${outRoot}`);
if (!existsSync(docsRoot)) refuse(`no folder of pictures at ${docsRoot}`);

// The old sheet goes: its page, and the files in its pictures folder.
function clearSheet() {
  rmSync(path.join(outRoot, "index.html"), { force: true });
  if (existsSync(picturesDir))
    for (const e of readdirSync(picturesDir, { withFileTypes: true }))
      if (e.isFile()) rmSync(path.join(picturesDir, e.name));
  mkdirSync(picturesDir, { recursive: true });
}

// A sheet of changes against a git revision: PNG against PNG, in this process, with no browser.
if (values.against !== undefined) {
  let found;
  try {
    found = changedPictures(docsRoot, values.against);
  } catch (e) {
    refuse(e.message);
  }
  const listed = found.pictures.filter((p) => !only || only.test(p.out));
  clearSheet();
  const rows = [];
  for (const item of listed) {
    const names = changeFiles(item.out);
    let before = null;
    let after = null;
    let result;
    try {
      if (item.status !== "added") before = revisionBytes(docsRoot, found.hash, item.out);
      if (item.status !== "deleted") after = readFileSync(path.join(docsRoot, item.out));
      result = compareRevisionPicture(item, before, after);
    } catch (e) {
      result = {
        row: {
          out: item.out,
          theme: themeOf(item.out),
          status: item.status,
          kind: "error",
          error: e.message,
          files: {},
        },
        map: null,
      };
    }
    if (before && result.row.files.old) writeFileSync(path.join(picturesDir, names.old), before);
    if (after && result.row.files.new) writeFileSync(path.join(picturesDir, names.new), after);
    if (result.map) writeFileSync(path.join(picturesDir, names.map), result.map);
    rows.push(result.row);
  }
  writeFileSync(
    path.join(outRoot, "index.html"),
    changeSheetHtml({ rows, rev: values.against, hash: found.hash, short: found.short, prefix: found.prefix }),
  );
  const count = (kind) => rows.filter((r) => r.kind === kind).length;
  console.log(
    `${values.against} (${found.short}): ${rows.length} picture${rows.length === 1 ? "" : "s"}: ${count("changed")} changed, ${count("noise")} only by capture noise, ${count("added")} added, ${count("deleted")} deleted, ${count("error")} not compared`,
  );
  console.log(`the sheet: ${path.join(outRoot, "index.html")}`);
  process.exit(count("error") ? 1 : 0);
}

if (!existsSync(bundlesRoot)) refuse(`no bundle cache at ${bundlesRoot}; shoot_docs.mjs --svg writes it`);
useSubsetCache(path.join(bundlesRoot, "subsets"));
const USER = userInfo().username;

// The pictures, and what each is drawn from: its bundle, the SVG beside it (--all), or nothing.
const bundled = new Set(listBundles(bundlesRoot));
const chosen = listPictures(docsRoot).filter((p) => (values.all || !p.svg) && (!only || only.test(p.out)));
const drawn = chosen
  .filter((p) => bundled.has(p.out) || p.svg)
  .map((p) => ({ out: p.out, source: bundled.has(p.out) ? "bundle" : "file" }));
const plain = chosen.filter((p) => !bundled.has(p.out) && !p.svg).map((p) => p.out);

// One picture drawn and judged, its files written to the pictures folder: its row of the sheet.
async function draw({ out, source }, browser) {
  const row = { out, theme: themeOf(out), source, files: { png: judgedFiles(out).png } };
  let svg;
  let png;
  let stats;
  if (source === "bundle") {
    const got = await redraw({ bundlesRoot, docsRoot, out, user: USER, stale: true, checkUserName: false });
    if (got.retake) return { ...row, error: retakeText(got) };
    ({ svg, png, stats } = got);
    row.notes = got.notes;
  } else {
    svg = readFileSync(path.join(docsRoot, out.replace(/\.png$/i, ".svg")), "utf8").replace(/\r\n/g, "\n");
    png = readFileSync(path.join(docsRoot, out));
    stats = { unsupported: {} };
  }
  const { diff, faithful } = await judgeSvg(browser, svg, png, stats);
  Object.assign(row.files, writeJudged(picturesDir, out, diff, { render: true, svg }));
  return {
    ...row,
    pct96: diff.stats.pct96,
    pct32: diff.stats.pct32,
    pct8: diff.stats.pct8,
    faithful,
    notDrawn: notDrawn(stats.unsupported),
  };
}

if (SHARD) {
  const rows = [];
  await inBrowser(shareOf(drawn, SHARD), async (p, browser) => {
    let row;
    try {
      row = await draw(p, browser);
    } catch (e) {
      row = {
        out: p.out,
        theme: themeOf(p.out),
        source: p.source,
        files: { png: judgedFiles(p.out).png },
        error: e.message,
      };
    }
    rows.push(row);
    console.log(`${p.out}: ${row.error === undefined ? `${row.pct96}% strongly off` : `not drawn (${row.error})`}`);
  });
  reportShard({ rows });
  process.exit(0);
}

// The parent: the old sheet goes, the pictures are drawn in `jobs` children, then the page.
clearSheet();

const rows = [];
const shards = drawn.length ? await runShards(SHARD_ENV, Math.min(jobs, drawn.length)) : [];
for (const { result } of shards) rows.push(...(result?.rows ?? []));
// A child that ended without its report leaves its pictures undrawn: each is listed so.
const done = new Set(rows.map((r) => r.out));
for (const p of drawn)
  if (!done.has(p.out))
    rows.push({
      out: p.out,
      theme: themeOf(p.out),
      source: p.source,
      files: {},
      error: "its process ended without a report",
    });

// The PNGs are copied beside what was drawn, so the folder stands alone.
const sizes = new Map();
for (const out of [...drawn.map((p) => p.out), ...plain]) {
  const png = readFileSync(path.join(docsRoot, out));
  sizes.set(out, pngSize(png));
  copyFileSync(path.join(docsRoot, out), path.join(picturesDir, judgedFiles(out).png));
}
for (const r of rows) {
  r.size = sizes.get(r.out);
  r.files.png = judgedFiles(r.out).png;
}
const html = sheetHtml({
  rows,
  plain: plain.map((out) => ({ out, size: sizes.get(out), files: { png: judgedFiles(out).png } })),
  bar: SVG_FAITHFUL,
  all: values.all,
});
writeFileSync(path.join(outRoot, "index.html"), html);

const failed = rows.filter((r) => r.error !== undefined).length;
console.log(
  `\n${chosen.length} picture${chosen.length === 1 ? "" : "s"}: ${rows.length - failed} drawn, ${failed} not drawn, ${plain.length} with nothing to draw from`,
);
console.log(`the sheet: ${path.join(outRoot, "index.html")}`);
process.exit(failed ? 1 : 0);
