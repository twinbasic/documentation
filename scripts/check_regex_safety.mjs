#!/usr/bin/env node
// Refuse a regex literal that can backtrack exponentially.
//
// Why this gate exists
// -------------------
// `VOID_TAGS_RE` in builder/render.mjs matched a void tag's attributes
// with `(?:\s+[^>/]+...)*`. `[^>/]` matches a space and so does `\s`, so
// one run of attribute text could be partitioned in exponentially many
// ways, and every partition got tried whenever the match failed -- which
// it did on any `/` the quoted-value alternative did not cover. Two alt
// strings in `docs/` contained one (`Line/Column`, `/Packages/WinDevLib`),
// and each hung a render worker outright. The build reached its last log
// line and sat there forever; three such processes accumulated in one
// session before anyone worked out what was happening.
//
// Nothing caught it. The regex is ordinary-looking, the corpus passed for
// as long as no page happened to contain the trigger, and the failure was
// a hang rather than an error. This gate asks the question of the regex
// itself, so it does not depend on the corpus containing a trigger. Run
// against the tree as it stood, it finds that one and a second nobody
// knew about: `STANDALONE_INLINE_HTML_RE`, where `[^>]*\/?` spelled an
// optional slash that `[^>]` already covered, giving two parses per tag
// and 2^n over an html_block of them.
//
// What it gates on, and what it does not
// --------------------------------------
// **Exponential only.** recheck also reports polynomial blowup, and 37 of
// this repo's 176 regex literals are polynomial -- almost all of them the
// ordinary `<tag[^>]*>` shape, degree 2, applied to bounded inputs. A gate
// that failed on those would fail on day one against 37 findings, and a
// gate that fails on day one gets switched off. Exponential is the class
// that turns a content edit into an unbounded hang, and it has been stable
// at exactly the real faults across every checker and every run.
//
// Honest limitation: a regex recheck cannot decide comes back `unknown`,
// and an unknown is NOT a pass -- it is an unchecked regex. `--census`
// prints them and the count is worth watching.
//
// Scope: regex *literals*, found by parsing with acorn. A regex built from
// a string at runtime (`new RegExp(someVar)`) is not analysed; `--census`
// reports how many such constructions exist, so the blind spot has a
// number rather than being invisible.
//
//   node scripts/check_regex_safety.mjs             # the gate
//   node scripts/check_regex_safety.mjs --census    # full classification
//   node scripts/check_regex_safety.mjs --self-test # prove it still detects

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { parse } from "acorn";
import * as walk from "acorn-walk";
import fg from "fast-glob";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ── Backend selection ────────────────────────────────────────────────────────
//
// recheck 4.5.0 cannot find its own backend on Windows. Both
// `recheck-jar` and `recheck-<platform>-<arch>` are located by taking
// `require.resolve("<pkg>/package.json")` and stripping the tail with
// `/\/package\.json$/` -- a forward-slash pattern against a path Node
// returns with backslashes. The strip silently does nothing, so it tries
// to run `package.json` itself: "Invalid or corrupt jarfile ...
// package.json", then `spawn EFTYPE`, then a quiet fall back to the pure
// JS implementation.
//
// That fallback is correct but about a hundred times slower -- the whole
// sweep took ~27 s on JS and takes well under a second native, because
// the JS path spends ~150 ms per regex where the native agent spends ~2.
// Nothing reports the downgrade, so the only symptom is a gate that feels
// too slow to keep in check.bat. Resolve the binary properly and name it.
function locateNativeBackend() {
  const plat = { darwin: "macos", linux: "linux", win32: "windows" }[process.platform];
  const arch = { x64: "x64", arm64: "arm64" }[process.arch];
  if (!plat || !arch) return null;
  const require_ = createRequire(import.meta.url);
  try {
    const pkgJson = require_.resolve(`recheck-${plat}-${arch}/package.json`);
    const bin = path.join(path.dirname(pkgJson), plat === "windows" ? "recheck.exe" : "recheck");
    // The optional dependency can be present-but-empty if npm skipped
    // the platform package. Pointing RECHECK_BIN at a file that is not
    // there turns a slow-but-correct fallback into a hard failure.
    return existsSync(bin) ? bin : null;
  } catch (err) {
    if (err?.code === "MODULE_NOT_FOUND") return null;
    throw err;
  }
}

const nativeBin = locateNativeBackend();
if (nativeBin && !process.env.RECHECK_BIN) {
  process.env.RECHECK_BIN = nativeBin;
  process.env.RECHECK_BACKEND ||= "native";
}

const SOURCE_GLOBS = [
  "builder/**/*.mjs",
  "scripts/**/*.mjs",
  "book/*.mjs",
  "eval/*.mjs",
  "wisdom/**/*.mjs",
];
// Vendored third-party code is not ours to fix.
const IGNORE = ["**/node_modules/**", "**/vendor/**", "book/lib/**"];

// Probes for --self-test. A pass here means "nothing exponential was
// found", which is also what a gate that has stopped working reports, so
// assert against known answers in both directions. The first two are the
// real faults this gate was written after.
// The first three are real regexes this repo shipped. The second is
// worth keeping for its own sake: it was the *fix* for the first, it
// looked obviously correct, and it was still exponential -- the name
// class no longer matched a space but still matched `=`, `"` and `'`,
// so an attribute could be consumed either by the name or by the
// quoted-value alternative. This gate is what caught that, which is the
// clearest argument for keeping it.
const PROBES = [
  { name: "shipped VOID_TAGS_RE (original)",        expect: "exponential",
    pattern: String.raw`<(br|hr|img)((?:\s+[^>/]+(?:="[^"]*"|='[^']*')?)*)\s*\/?>`, flags: "gi" },
  { name: "shipped VOID_TAGS_RE (incomplete fix)",  expect: "exponential",
    pattern: String.raw`<(br|hr|img)((?:\s+[^\s>/]+(?:="[^"]*"|='[^']*')?)*)\s*\/?>`, flags: "gi" },
  { name: "shipped STANDALONE_INLINE_HTML_RE",      expect: "exponential",
    pattern: String.raw`^(?:<(br|hr|img)\b[^>]*\/?>\s*)+$`, flags: "i" },
  { name: "textbook (a+)+",                         expect: "exponential",
    pattern: String.raw`^(a+)+$`, flags: "" },
  { name: "plain literal",                          expect: "not-exponential",
    pattern: String.raw`^hello world$`, flags: "" },
  { name: "ordinary tag scan",                      expect: "not-exponential",
    pattern: String.raw`<(t[dh])([^>]*)><\/\1>`, flags: "g" },
  { name: "VOID_TAGS_RE as it stands now",          expect: "not-exponential",
    pattern: String.raw`<(br|hr|img)\b([^>]*)>`, flags: "gi" },
  { name: "STANDALONE_INLINE_HTML_RE as it stands now", expect: "not-exponential",
    pattern: String.raw`^(?:<(br|hr|img)\b[^>]*>\s*)+$`, flags: "i" },
];

// ── Extraction ───────────────────────────────────────────────────────────────

async function extractRegexes() {
  const files = (await fg(SOURCE_GLOBS, { cwd: ROOT, ignore: IGNORE })).sort();
  const found = new Map();
  let dynamic = 0;
  const parseFailures = [];

  for (const rel of files) {
    const src = await readFile(path.join(ROOT, rel), "utf8");
    let ast;
    try {
      // allowReturnOutsideFunction: wisdom/extract/workflow.mjs has a
      // top-level return. A file skipped because it would not parse is
      // a file whose regexes are never checked, which is the exact
      // failure mode this gate exists to prevent -- so collect it and
      // fail, rather than continuing quietly.
      ast = parse(src, {
        ecmaVersion: "latest", sourceType: "module",
        locations: true, allowReturnOutsideFunction: true,
      });
    } catch (err) {
      parseFailures.push(`${rel}: ${err.message}`);
      continue;
    }
    walk.simple(ast, {
      Literal(node) {
        if (!node.regex) return;
        const key = `${node.regex.pattern} ${node.regex.flags}`;
        if (!found.has(key)) {
          found.set(key, {
            pattern: node.regex.pattern,
            flags: node.regex.flags,
            file: rel, line: node.loc.start.line,
          });
        }
      },
      NewExpression(node) {
        if (node.callee?.type === "Identifier" && node.callee.name === "RegExp") dynamic++;
      },
    });
  }
  return { regexes: [...found.values()], files, dynamic, parseFailures };
}

// ── Checking ─────────────────────────────────────────────────────────────────

async function checkList(list) {
  const { check } = await import("recheck");
  const out = [];
  for (const r of list) {
    let verdict, degree, attack;
    try {
      const res = await check(r.pattern, r.flags, { timeout: 10000 });
      if (res.status === "safe") verdict = "safe";
      else if (res.status === "vulnerable") {
        verdict = res.complexity?.type ?? "vulnerable";
        degree = res.complexity?.degree;
        attack = res.attack?.string;
      } else verdict = "unknown";
    } catch (err) {
      verdict = "error";
      attack = err.message;
    }
    out.push({ ...r, verdict, degree, attack });
  }
  return out;
}

// Importing recheck spawns ONE long-lived agent and feeds it requests
// one at a time, so awaiting several checks concurrently in a single
// process buys nothing -- measured at 42.5 s for concurrency 1 against
// 37.5 s for 16. Parallelism has to come from separate processes, each
// with its own agent. Serial native is ~19 s for 178 literals; sharded
// it is a few seconds, which is the difference between a gate that lives
// in check.bat and one that gets moved to CI and then ignored.
function runShard(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--shard"], {
      cwd: ROOT, stdio: ["pipe", "pipe", "inherit"],
    });
    let buf = "";
    child.stdout.on("data", (d) => { buf += d; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`shard exited ${code}`));
      try { resolve(JSON.parse(buf)); }
      catch (e) { reject(new Error(`shard produced unparseable output: ${e.message}`)); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

async function checkAll(regexes) {
  const shards = Math.max(1, Math.min(os.cpus().length, 16, regexes.length));
  if (shards === 1) return checkList(regexes);
  // Round-robin rather than contiguous blocks: the expensive literals
  // cluster by file (render.mjs alone holds 69 of them), so contiguous
  // slices would leave one shard doing nearly all the work.
  const buckets = Array.from({ length: shards }, () => []);
  regexes.forEach((r, i) => buckets[i % shards].push(r));
  const settled = await Promise.all(buckets.map(runShard));
  const merged = settled.flat();
  // A shard that returns fewer results than it was given would silently
  // shrink the gate's coverage, which is the failure this whole script
  // exists to prevent.
  if (merged.length !== regexes.length) {
    throw new Error(`sharding lost results: sent ${regexes.length}, got back ${merged.length}`);
  }
  return merged;
}

// ── Reporting ────────────────────────────────────────────────────────────────

function printFinding(r) {
  console.error(`  ${r.file}:${r.line}`);
  console.error(`    /${r.pattern}/${r.flags}`);
  if (r.attack) {
    const a = r.attack.length > 70 ? `${r.attack.slice(0, 70)}...` : r.attack;
    console.error(`    witness: ${JSON.stringify(a)}`);
  }
}

async function gate({ census }) {
  const t0 = Date.now();
  const { regexes, files, dynamic, parseFailures } = await extractRegexes();

  // The probes ride along in the same sharded run rather than sitting
  // behind a separate --self-test nobody remembers to invoke. They cost
  // 8 more literals out of ~186 and they are what distinguishes "no
  // exponential regex in the tree" from "this gate has stopped
  // detecting exponential regexes".
  const tagged = [
    ...regexes.map(r => ({ ...r, probe: null })),
    ...PROBES.map(p => ({ ...p, file: "<probe>", line: 0, probe: p.expect })),
  ];
  const all = await checkAll(tagged);
  const results = all.filter(r => !r.probe);
  const probeResults = all.filter(r => r.probe);

  const by = {};
  for (const r of results) (by[r.verdict] ??= []).push(r);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const exponential = by.exponential ?? [];
  const errors = by.error ?? [];

  console.log(
    `regex safety: ${regexes.length} literals in ${files.length} files, ${secs}s -- ` +
    `${(by.safe ?? []).length} safe, ${(by.polynomial ?? []).length} polynomial, ` +
    `${(by.unknown ?? []).length} undecided, ${exponential.length} exponential` +
    `${nativeBin ? "" : "  (no native backend: slow JS fallback)"}`,
  );

  if (census) {
    for (const kind of ["exponential", "polynomial", "unknown", "error"]) {
      const list = by[kind] ?? [];
      if (!list.length) continue;
      console.log(`\n${kind} (${list.length}):`);
      for (const r of [...list].sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))) {
        const deg = r.degree ? ` deg${r.degree}` : "";
        console.log(`  ${r.file}:${r.line}${deg}  /${r.pattern.slice(0, 90)}/${r.flags}`);
      }
    }
    console.log(`\n${dynamic} runtime \`new RegExp(...)\` construction(s) -- not analysed.`);
  }

  let failed = false;
  const misclassified = probeResults.filter(r =>
    r.verdict === "error" || (r.verdict === "exponential") !== (r.probe === "exponential"));
  if (misclassified.length) {
    failed = true;
    console.error(`\nFAIL: ${misclassified.length} of ${probeResults.length} self-test probes misclassified.`);
    for (const r of misclassified) console.error(`  ${r.name}: expected ${r.probe}, got ${r.verdict}`);
    console.error("  The gate is not measuring what it claims; its verdict above means nothing.");
  }
  if (parseFailures.length) {
    failed = true;
    console.error(`\nFAIL: ${parseFailures.length} file(s) could not be parsed, so their regexes were never checked:`);
    for (const f of parseFailures) console.error(`  ${f}`);
  }
  if (errors.length) {
    failed = true;
    console.error(`\nFAIL: ${errors.length} regex(es) could not be analysed:`);
    for (const r of errors) printFinding(r);
  }
  if (exponential.length) {
    failed = true;
    console.error(`\nFAIL: ${exponential.length} regex(es) can backtrack exponentially:`);
    for (const r of exponential) printFinding(r);
    console.error(
      "\n  An exponential regex is a hang waiting for the right input, not a slow one.\n" +
      "  The usual cause is two quantified atoms whose character sets overlap:\n" +
      "  `\\s+[^>/]+` repeated, or `[^>]*\\/?` where `/` is already in the class.\n" +
      "  Narrow one of them so the partition is unique, then check equivalence by\n" +
      "  running both forms over the cases the regex is meant to match.",
    );
  }
  if (!failed) {
    console.log(`ok    no regex literal can backtrack exponentially ` +
                `(${probeResults.length} self-test probes classified correctly)`);
  }
  return failed ? 1 : 0;
}

async function selfTest() {
  const results = await checkList(PROBES.map(p => ({ ...p })));
  let bad = 0;
  for (const r of results) {
    // An `error` verdict is never a pass, whichever way the probe was
    // expected to go -- otherwise a backend that cannot run at all
    // reports every not-exponential probe as correct, and the gate
    // looks half-healthy while measuring nothing.
    const ok = r.verdict !== "error" &&
      (r.verdict === "exponential") === (r.expect === "exponential");
    if (!ok) bad++;
    console.log(`  ${ok ? "ok   " : "FAIL "} ${r.name}: expected ${r.expect}, got ${r.verdict}`);
  }
  if (bad) {
    console.error(`\nFAIL: ${bad} probe(s) misclassified -- the gate is not measuring what it claims.`);
    return 1;
  }
  console.log(`ok    ${results.length} probes classified correctly, both directions`);
  return 0;
}

const argv = process.argv.slice(2);
if (argv.includes("--shard")) {
  // Worker half of checkAll(): a slice in on stdin, its verdicts out on
  // stdout. Not meant to be run by hand.
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const list = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  process.stdout.write(JSON.stringify(await checkList(list)));
} else {
  process.exitCode = argv.includes("--self-test")
    ? await selfTest()
    : await gate({ census: argv.includes("--census") });
}
