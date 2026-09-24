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
// **Exponential only.** recheck also reports polynomial blowup, and about
// a fifth of the regexes here are polynomial -- almost all of them the
// ordinary `<tag[^>]*>` shape, degree 2, applied to bounded inputs. A gate
// that failed on those would fail on day one against fifty findings, and a
// gate that fails on day one gets switched off. Exponential is the class
// that turns a content edit into an unbounded hang, and it has been stable
// at exactly the real faults across every checker and every run. The
// summary line prints the current counts, so they are not written here.
//
// Honest limitation: a regex recheck cannot decide comes back `unknown`,
// and an unknown is NOT a pass -- it is an unchecked regex. `--census`
// prints them and the count is worth watching.
//
// **The `degN` in `--census` is a backend-dependent number, and the
// exponential/not verdict is not.** Measured on one pattern, three runs
// each: the native agent says polynomial degree 2 where the pure-JS
// fallback says degree 3. Both backends classify all eight probes
// identically, which is the assertion this gate rests on; the degree is
// for ranking a census, not for quoting.
//
// Scope: regex literals, plus every `new RegExp(...)` whose arguments can
// be folded to constants from the source alone -- see
// `scripts/lib/regex-fold.mjs` for which shapes fold and why each rule is
// exact. A construction that cannot be folded is listed by `--census` with
// the reason, which is a better blind spot than a count.
//
// That scope used to be literals only, and the cost of it was measured:
// the shared-fragment style -- `const NUM = ...; new RegExp(`${W}${NUM}`)`
// -- is how anyone avoids repeating a sub-pattern six times, and it made
// six regexes in one gate invisible here. One of them was polynomial, and
// was found only by someone running recheck against it by hand.
//
//   node scripts/check_regex_safety.mjs             # the gate
//   node scripts/check_regex_safety.mjs --census    # full classification
//   node scripts/check_regex_safety.mjs --self-test # prove it still detects
//
// Exits 0 clean, 1 on an exponential regex, 2 when the gate itself failed
// -- a file it could not parse, a regex recheck could not analyse, a probe
// that came back wrong, or a throw. Each of those leaves something
// unchecked, so it must not read as either a clean tree or a finding.

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

import { foldConstructedRegexes } from "./lib/regex-fold.mjs";

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

// ── Fold probes ──────────────────────────────────────────────────────────────
//
// The probes above assert that recheck still classifies. These assert that
// the folder still reaches it, which is a separate question with the same
// failure mode: a folder that quietly resolves nothing leaves the summary
// line reading `0 constructed` and every construction in the unresolved
// list, which is exactly what this gate looked like before it could fold at
// all. Both directions, because a folder that resolves *everything* --
// including a pattern it cannot actually know -- is the worse failure.
//
// These run in-process in a few milliseconds; nothing here calls recheck.
const FOLD_PROBES = [
  { name: "a template over module consts",
    src: 'const A = "^(a"; const B = "+)+$"; const R = new RegExp(`${A}${B}`, "g");',
    expect: [{ pattern: "^(a+)+$", flags: "g" }] },
  { name: "string concatenation",
    src: 'const A = "^x"; const R = new RegExp(A + "y$", "i");',
    expect: [{ pattern: "^xy$", flags: "i" }] },
  { name: "Array.join over a const array",
    src: 'const W = ["a","b"]; const R = new RegExp(`\\\\b(${W.join("|")})\\\\b`);',
    expect: [{ pattern: String.raw`\b(a|b)\b`, flags: "" }] },
  { name: "the .source of a const regex",
    src: 'const P = /<pre[^>]*>/g; const R = new RegExp(`(${P.source})`, "g");',
    expect: [{ pattern: "(<pre[^>]*>)", flags: "g" }] },
  { name: "String.raw concatenated with a const",
    src: 'const D = "-"; const R = new RegExp(String.raw`^\\w+` + D);',
    expect: [{ pattern: String.raw`^\w+-`, flags: "" }] },
  { name: "a ternary, checked as both branches",
    src: 'const C = 1 ? "`" : "~"; const R = new RegExp(`^${C}{3,}$`);',
    expect: [{ pattern: "^`{3,}$", flags: "" }, { pattern: "^~{3,}$", flags: "" }] },
  { name: "an escaping call, modelled as literal text",
    src: 'function esc(s){return s.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&");}\n' +
         'const R = new RegExp(`^${esc(x)}[ ]*$`, "gm");',
    expect: [{ pattern: "^x[ ]*$", flags: "gm", modelled: true }] },
  { name: "RegExp called without new",
    src: 'const A = "ab"; const R = RegExp(A, "g");',
    expect: [{ pattern: "ab", flags: "g" }] },
];

const FOLD_NEGATIVES = [
  { name: "a function parameter is not resolved",
    src: 'function f(p) { return new RegExp(`^${p}$`); }', reason: /function parameter/ },
  { name: "a let is not resolved",
    src: 'let re = ""; for (const c of "ab") re += c; const R = new RegExp(re + "$");',
    reason: /`let` or `var`/ },
  { name: "a name declared twice is not resolved",
    src: 'function a(){ const s = "x"; return s; }\nfunction b(){ const s = "y"; return new RegExp(s); }',
    reason: /more than once/ },
  { name: "a loop binding is not resolved",
    src: 'for (const pat of list) { new RegExp(pat, "i"); }', reason: /bound by a loop/ },
  { name: "unknown flags are not guessed",
    src: 'const A = "ab"; function f(fl) { return new RegExp(A, fl); }', reason: /^flags: / },
  { name: "an unknown call is not resolved",
    src: 'const R = new RegExp(buildPattern(), "g");', reason: /a call to `buildPattern`/ },
];

function foldSelfTest() {
  const out = [];
  const parseProbe = (src) => parse(src, {
    ecmaVersion: "latest", sourceType: "module", locations: true, allowReturnOutsideFunction: true,
  });
  for (const p of FOLD_PROBES) {
    let ok = false, detail = "";
    try {
      const { resolved, unresolved } = foldConstructedRegexes(parseProbe(p.src), "<probe>");
      const got = resolved.map((r) => ({ pattern: r.pattern, flags: r.flags, modelled: r.modelled }));
      ok = unresolved.length === 0 && got.length === p.expect.length &&
        p.expect.every((e, i) => got[i].pattern === e.pattern && got[i].flags === e.flags &&
          got[i].modelled === Boolean(e.modelled));
      detail = ok ? "" : `got ${JSON.stringify(got)}${unresolved.length ? ` + unresolved ${JSON.stringify(unresolved.map(u => u.reason))}` : ""}`;
    } catch (err) { detail = err.message; }
    out.push([ok, `fold: ${p.name}`, detail]);
  }
  for (const p of FOLD_NEGATIVES) {
    let ok = false, detail = "";
    try {
      const { resolved, unresolved } = foldConstructedRegexes(parseProbe(p.src), "<probe>");
      ok = resolved.length === 0 && unresolved.length === 1 && p.reason.test(unresolved[0].reason);
      detail = ok ? "" : `resolved ${JSON.stringify(resolved.map(r => r.pattern))}, unresolved ${JSON.stringify(unresolved.map(u => u.reason))}`;
    } catch (err) { detail = err.message; }
    out.push([ok, `fold: ${p.name}`, detail]);
  }
  return out;
}

// ── Extraction ───────────────────────────────────────────────────────────────

async function extractRegexes() {
  const files = (await fg(SOURCE_GLOBS, { cwd: ROOT, ignore: IGNORE })).sort();
  const found = new Map();
  const unresolved = [];
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
        add({
          pattern: node.regex.pattern,
          flags: node.regex.flags,
          file: rel, line: node.loc.start.line,
        });
      },
    });

    // Constructions whose arguments fold to constants are checked exactly
    // like a literal; the rest are reported with the reason they could not
    // be, which is a blind spot a reader can act on rather than a count.
    const folded = foldConstructedRegexes(ast, rel);
    for (const r of folded.resolved) add(r);
    unresolved.push(...folded.unresolved);
  }

  const regexes = [...found.values()];
  return {
    regexes, files, parseFailures, unresolved,
    literals: regexes.filter((r) => !r.constructed).length,
    constructed: regexes.filter((r) => r.constructed).length,
  };

  // One check per distinct pattern, first site seen owning the report --
  // the rule literals have always had, since render.mjs alone holds 69 and
  // several repeat.
  function add(entry) {
    const key = `${entry.pattern}\u0000${entry.flags}`;
    if (!found.has(key)) found.set(key, entry);
  }
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

/**
 * How the pattern was obtained, when that is not "it is written there".
 * A `new RegExp` site does not show the pattern at that line, so a finding
 * that printed only `file:line` and a pattern would look like a typo.
 */
function tagOf(r) {
  if (!r.constructed) return "";
  const bits = ["constructed"];
  if (r.variants > 1) bits.push(`branch ${r.variant} of ${r.variants}`);
  if (r.modelled) bits.push("escaped splice modelled as \"x\"");
  return `  [${bits.join("; ")}]`;
}

function printFinding(r) {
  console.error(`  ${r.file}:${r.line}${tagOf(r)}`);
  console.error(`    /${r.pattern}/${r.flags}`);
  if (r.verdict === "error") {
    if (r.attack) console.error(`    error: ${r.attack}`);
  } else if (r.attack) {
    // Printed whole, never shortened. The documented way to watch the
    // fault, and later to prove the rewrite, is re.test(witness) -- and
    // a witness cut to 70 characters has fewer repetitions of its pump,
    // so it can return at once from a regex that is still exponential.
    // Two of the three shipped exponential regexes have witnesses of 148
    // and 492 characters.
    console.error(`    witness (${r.attack.length} chars): ${JSON.stringify(r.attack)}`);
  }
}

async function gate({ census }) {
  const t0 = Date.now();
  const { regexes, files, literals, constructed, unresolved, parseFailures } = await extractRegexes();
  const foldProbes = foldSelfTest();

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
    `regex safety: ${literals} literals + ${constructed} constructed in ${files.length} files, ${secs}s -- ` +
    `${(by.safe ?? []).length} safe, ${(by.polynomial ?? []).length} polynomial, ` +
    `${(by.unknown ?? []).length} undecided, ${exponential.length} exponential` +
    `${unresolved.length ? `; ${unresolved.length} construction(s) not resolvable` : ""}` +
    `${nativeBin ? "" : "  (no native backend: slow JS fallback)"}`,
  );

  if (census) {
    for (const kind of ["exponential", "polynomial", "unknown", "error"]) {
      const list = by[kind] ?? [];
      if (!list.length) continue;
      console.log(`\n${kind} (${list.length}):`);
      for (const r of [...list].sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))) {
        const deg = r.degree ? ` deg${r.degree}` : "";
        console.log(`  ${r.file}:${r.line}${deg}${tagOf(r)}  /${r.pattern.slice(0, 90)}/${r.flags}`);
      }
    }
    const modelled = results.filter((r) => r.modelled);
    if (modelled.length) {
      console.log(`\nmodelled (${modelled.length}) -- an escaped splice stood in for as "x":`);
      for (const r of modelled) console.log(`  ${r.file}:${r.line}  /${r.pattern.slice(0, 90)}/${r.flags}`);
    }
    // Not "N constructions, not analysed". A reason per site is the
    // difference between a blind spot someone can close and one they can
    // only count: `pattern` being a function parameter says to go and read
    // the call sites, and a `let` accumulated in a loop says not to bother.
    console.log(`\nnot resolvable (${unresolved.length}):`);
    for (const u of unresolved) console.log(`  ${u.file}:${u.line}  ${u.reason}`);
  }

  // `failed` is a finding in the tree (exit 1); `broken` is the gate
  // itself failing (exit 2), and wins, because a verdict from a gate that
  // did not check everything is not a verdict.
  let failed = false;
  let broken = false;
  const misclassified = probeResults.filter(r =>
    r.verdict === "error" || (r.verdict === "exponential") !== (r.probe === "exponential"));
  if (misclassified.length) {
    broken = true;
    console.error(`\nFAIL: ${misclassified.length} of ${probeResults.length} self-test probes misclassified.`);
    for (const r of misclassified) console.error(`  ${r.name}: expected ${r.probe}, got ${r.verdict}`);
    console.error("  The gate is not measuring what it claims; its verdict above means nothing.");
  }
  const badFolds = foldProbes.filter(([ok]) => !ok);
  if (badFolds.length) {
    broken = true;
    console.error(`\nFAIL: ${badFolds.length} of ${foldProbes.length} fold probes failed.`);
    for (const [, name, detail] of badFolds) console.error(`  ${name}${detail ? `: ${detail}` : ""}`);
    console.error(
      "  A folder that resolves less than it claims moves constructions into the\n" +
      "  unresolved list, where nothing checks them and the run still passes.",
    );
  }
  if (parseFailures.length) {
    broken = true;
    console.error(`\nFAIL: ${parseFailures.length} file(s) could not be parsed, so their regexes were never checked:`);
    for (const f of parseFailures) console.error(`  ${f}`);
  }
  if (errors.length) {
    broken = true;
    console.error(`\nFAIL: ${errors.length} regex(es) could not be analysed:`);
    for (const r of errors) printFinding(r);
  }
  if (exponential.length) {
    failed = true;
    console.error(`\nFAIL: ${exponential.length} regex(es) can backtrack exponentially:`);
    for (const r of exponential) printFinding(r);
    // The advice agrees with Extending.md#regex-refused and Tools.md's
    // entry. It used to say "narrow one of them", which is the move that
    // left VOID_TAGS_RE's first fix exponential one level down.
    console.error(
      "\n  An exponential regex is a hang waiting for the right input, not a slow one.\n" +
      "  The cause is two parts of the pattern that can match the same character:\n" +
      "  `\\s+[^>/]+` repeated, or `[^>]*\\/?` where `/` is already in the class.\n" +
      "  Narrowing one class usually leaves the same overlap one level down. What\n" +
      "  works is to match only the delimiters, as in `<tag([^>]*)>`, and take the\n" +
      "  inside apart in JavaScript. Keep the witness: re.test(witness) hangs now,\n" +
      "  and must return at once after the rewrite. The full procedure is in\n" +
      "  docs/Documentation/Extending.md, under \"When test.bat says a regex can\n" +
      "  backtrack exponentially\".",
    );
  }
  if (!failed && !broken) {
    console.log(`ok    no regex can backtrack exponentially ` +
                `(${probeResults.length} classification + ${foldProbes.length} fold probes correct)`);
  }
  return broken ? 2 : failed ? 1 : 0;
}

async function selfTest() {
  let bad = 0;
  for (const [ok, name, detail] of foldSelfTest()) {
    if (!ok) bad++;
    console.log(`  ${ok ? "ok   " : "FAIL "} ${name}${ok || !detail ? "" : `: ${detail}`}`);
  }
  const results = await checkList(PROBES.map(p => ({ ...p })));
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
    console.error(`\nFAIL: ${bad} probe(s) wrong -- the gate is not measuring what it claims.`);
    return 2;
  }
  console.log(`ok    ${results.length} classification + ${FOLD_PROBES.length + FOLD_NEGATIVES.length} ` +
              `fold probes correct, both directions`);
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
  try {
    process.exitCode = argv.includes("--self-test")
      ? await selfTest()
      : await gate({ census: argv.includes("--census") });
  } catch (err) {
    // Node's own exit code for an unhandled throw is 1, which here means
    // "an exponential regex was found". A crash is the gate failing.
    console.error(err);
    process.exitCode = 2;
  }
}
