// Self-test for the page-count drift guard.
//
// The guard in builder/page-baseline.mjs reports nothing on a healthy tree, so
// every ordinary build says exactly what a guard that had stopped working would
// say. These probes make the other assertion -- that it still refuses the
// things it exists to refuse -- against a scratch baseline file, so nothing
// here touches builder/page-baseline.json.
//
// The first probe is the defect that motivated the whole thing: `_config.yml`'s
// `exclude:` once swallowed AppGlobalClassObject's 37-page `_App/` folder, and
// the guard of the day (`pages.length < 836`, against a real 908) reported a
// clean build throughout.
//
// The last two are the ones a reader is most likely to think redundant, and
// they are the two that caught real bugs while this was being written:
//
//   - a foreign source root must be ignored. scripts/check_links_diff.mjs
//     builds test/fixtures/check-src, three pages, and an unkeyed baseline met
//     it with "905 pages missing" -- a confident, wrong finding on the one
//     harness whose job is noticing disagreement.
//   - CI must refuse a missing baseline rather than create one. A CI run that
//     wrote the file would bless whatever drop it had been asked to catch.
//
//     node scripts/check_page_baseline.mjs

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkPageBaseline, GUARDED_SRC } from "../builder/page-baseline.mjs";

// A crash is the harness failing, not a finding: exit 2, as Extending.md's gate
// conventions require. This file runs at top level, so there is no main().catch
// to do it; the handler also catches a rejected top-level await.
process.on("uncaughtException", (err) => { console.error(err); process.exit(2); });

const BASE = { src: GUARDED_SRC, pages: 908, staticFiles: 247 };

let failures = 0;
const results = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures++;
}

async function withBaseline(initial, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "tb-pagebaseline-"));
  const file = path.join(dir, "page-baseline.json");
  try {
    if (initial) await writeFile(file, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
    return await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

// --- it refuses a fall -------------------------------------------------------

await withBaseline(BASE, async (file) => {
  const r = await checkPageBaseline({ ...BASE, pages: 871, write: true, file });
  check("the _App loss repeated (-37 pages) fails",
        r.failed && r.text.includes("871") && r.text.includes("908"), r.text.trim());
  check("a fall does not lower the baseline by itself",
        (await readJson(file)).pages === 908);
});

await withBaseline(BASE, async (file) => {
  const r = await checkPageBaseline({ ...BASE, pages: 907, write: true, file });
  check("a one-page fall fails too", r.failed, r.text.trim());
});

await withBaseline(BASE, async (file) => {
  const r = await checkPageBaseline({ ...BASE, staticFiles: 246, write: true, file });
  check("a static-file fall fails", r.failed && r.text.includes("static files"), r.text.trim());
});

// --- it accepts a rise, and a level tree, quietly ----------------------------

await withBaseline(BASE, async (file) => {
  const r = await checkPageBaseline({ ...BASE, write: true, file });
  check("an unchanged tree says nothing", !r.failed && r.text === "", JSON.stringify(r.text));
});

await withBaseline(BASE, async (file) => {
  const r = await checkPageBaseline({ ...BASE, pages: 920, write: true, file });
  check("a rise is accepted and recorded",
        !r.failed && (await readJson(file)).pages === 920, r.text.trim());
});

await withBaseline(BASE, async (file) => {
  const r = await checkPageBaseline({ ...BASE, pages: 920, write: false, file });
  check("a rise with write:false leaves the file alone",
        !r.failed && (await readJson(file)).pages === 908, r.text.trim());
});

// --- --update-page-baseline is the only way down -----------------------------

await withBaseline(BASE, async (file) => {
  await checkPageBaseline({ ...BASE, pages: 871, write: false, force: true, file });
  check("--update-page-baseline lowers it on request",
        (await readJson(file)).pages === 871);
});

// --- the two that caught real bugs -------------------------------------------

await withBaseline(BASE, async (file) => {
  const r = await checkPageBaseline({
    src: "test/fixtures/check-src", pages: 3, staticFiles: 5, write: true, file,
  });
  check("a foreign source root is ignored, not measured",
        !r.failed && r.text === "" && (await readJson(file)).pages === 908, r.text.trim());
});

await withBaseline(null, async (file) => {
  const r = await checkPageBaseline({ ...BASE, write: false, file });
  check("a missing baseline fails where the build may not write (CI)",
        r.failed && r.text.includes("missing"), r.text.trim());
});

await withBaseline(null, async (file) => {
  const r = await checkPageBaseline({ ...BASE, write: true, file });
  check("a missing baseline is created where it may write",
        !r.failed && (await readJson(file)).pages === 908, r.text.trim());
});

// --- report ------------------------------------------------------------------

for (const { name, ok, detail } of results) {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok && detail) console.log(`       ${detail}`);
}
console.log(
  failures
    ? `check_page_baseline: ${failures} of ${results.length} probes failed`
    : `check_page_baseline: ${results.length} probes, all pass`
);
process.exit(failures ? 1 : 0);
