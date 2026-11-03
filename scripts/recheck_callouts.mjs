// Checks again, on a new twinBASIC build, every callout labelled with an older one: runs what each
// callout's marker names (scripts/lib/test-markers.mjs), moves the label of each callout whose
// evidence all holds to the new build, and lists the rest for a person.
//
//     node scripts/recheck_callouts.mjs --plan       # what it would run, and nothing else
//     node scripts/recheck_callouts.mjs              # run it all, relabel, list the rest
//
// The build is the IDE's: --ide, else $TB_IDE, else the newest twinBASIC_IDE_BETA_<n> on the
// Desktop. A callout is selected when its label is BETA <n> with <n> below that build; a callout
// of a generated Common Errors section is selected through its data file, errors/<name>.yml,
// whose `beta:` is moved and whose sections `errors.mjs write` writes again when the data holds.
//
// Each check runs once, however many callouts name it, through the tool that owns it, one after
// another, since runs at once give false failures under load:
//
//   lane     ide_test.mjs or addin_test.mjs, once for each suite, with every lane named; a lane
//            reproducer under bugs/ is judged here from the same report, by the tests it names
//   bug      bug_repro.mjs verify, for the other reproducers
//   sample   check_examples.mjs --json, over the pages that hold the samples
//   errors   errors.mjs run, for twinBASIC 32-bit and 64-bit (what VB6 does does not change)
//   llvm     test/llvm/run.mjs --only <mode>
//   package  package_tests.mjs --json, for the packages whose cases are named
//
// Every tool's output is kept under %TEMP%\recheck-callouts\<pid>\, and --report writes what was
// decided, which --from reads back to run again only what did not hold: a surprise is run again
// alone before it is believed.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { exitOnCrash, parseCli, printHelpAndExit, regexOption, withUsageError, CliError } from "../lib/cli.mjs";
import { markdownFiles } from "../lib/markdown-files.mjs";
import { DOCS_DIR, REPO_ROOT } from "../lib/repo-paths.mjs";
import { laneBlocks, testMark, FAILED } from "./lib/lane-report.mjs";
import {
  checkKey,
  keyKind,
  packageCases,
  readVerify,
  relabelLine,
  RUN_KINDS,
  sampleStatus,
  verdictOf,
} from "./lib/recheck.mjs";
import { archesOf, collectFences, RUN_MARKER } from "./lib/tb-fences.mjs";
import { buildNumber, findIde, unsupportedIde } from "./lib/tb-install.mjs";
import { itemText, kindOf, markersOf, SUITES } from "./lib/test-markers.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/recheck_callouts.mjs [--only <regex>] [--kinds <list>] [--ide <twinBASIC.exe>] [--plan] [--dry-run] [--report <file>] [--from <report>] [-h, --help]

Checks again, on a twinBASIC build, every callout labelled BETA <n> with an
older <n>: runs what the <!-- test: ... --> marker above each one names, moves
the label of each callout whose evidence all holds to the build, and lists the
rest for a person. A generated Common Errors section's callouts follow their
data file, errors/<name>.yml, whose beta: moves when the data holds.

  --only <regex>   only the pages whose path under docs/ matches
  --kinds <list>   run only these kinds of check, comma-separated: ${RUN_KINDS.join(", ")};
                   a callout that needs another kind is not relabelled
  --ide <path>     the build to check on (default: $TB_IDE, else the newest
                   twinBASIC_IDE_BETA_<n> on the Desktop)
  --plan           print the callouts and the checks, and run nothing
  --dry-run        run the checks, and change no file
  --report <file>  write what was run and decided, as JSON
  --from <file>    a report of an earlier run on the same build: a check that
                   held there is not run again
  -h, --help       print this text and exit

Exit codes:
  0  every selected callout held, and was relabelled (or --plan)
  1  a callout is listed for a person: its evidence changed, could not be run,
     or is checked by hand
  2  the command line was refused, no IDE was found, or a crash`;

const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        only: { type: "string" },
        kinds: { type: "string" },
        ide: { type: "string" },
        plan: { type: "boolean" },
        "dry-run": { type: "boolean" },
        report: { type: "string" },
        from: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);
const { only, kinds } = withUsageError(() => {
  const kinds = values.kinds ? values.kinds.split(",").map((k) => k.trim()) : RUN_KINDS;
  const unknown = kinds.filter((k) => !RUN_KINDS.includes(k));
  if (unknown.length)
    throw new CliError("value", `--kinds: ${unknown.join(", ")} is not one of ${RUN_KINDS.join(", ")}`, {
      option: "--kinds",
    });
  return { only: values.only ? regexOption(values.only, { option: "--only" }) : null, kinds: new Set(kinds) };
}, usageError);

const IDE = findIde(values.ide);
const tooOld = IDE && unsupportedIde(IDE);
if (tooOld) {
  console.error(tooOld);
  process.exit(2);
}
const BUILD = IDE ? buildNumber(IDE) : null;
if (!BUILD) {
  console.error(
    "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
  process.exit(2);
}

// ---------------------------------------------------------------- what is selected

const pages = (await markdownFiles(DOCS_DIR)).filter((rel) => !only || only.test(rel));
const callouts = [];
const errorFiles = new Map(); // name -> its beta
for (const rel of pages) {
  const text = readFileSync(path.join(DOCS_DIR, rel), "utf8");
  const pkg = /^Reference\/Contributed\/([^/]+)\//.exec(rel)?.[1] ?? null;
  for (const c of markersOf(text).callouts) {
    const beta = c.label.items.find((i) => i.kind === "beta");
    if (!beta || Number(beta.value) >= BUILD) continue;
    if (c.errors) {
      errorFiles.set(c.errors, Number(beta.value));
      continue;
    }
    const items = c.evidence ?? [];
    callouts.push({
      rel,
      line: c.line,
      kind: c.kind,
      label: c.label.items.map((i) => i.text).join(", "),
      items: items.map(itemText),
      keys: items.length ? items.map((i) => checkKey(i, pkg)) : ["unmarked"],
      cases: items.filter((i) => kindOf(i) === "case" || kindOf(i) === "compile").map((i) => i.case ?? i.compile),
      pkg,
    });
  }
}
for (const name of errorFiles.keys()) {
  const file = path.join(REPO_ROOT, "errors", `${name}.yml`);
  const beta = /^beta:[ \t]*(\d+)/m.exec(readFileSync(file, "utf8"))?.[1];
  if (Number(beta) >= BUILD) errorFiles.delete(name); // written already; the pages are behind
}

// The checks, by key.
const checks = new Map();
for (const c of callouts) for (const key of c.keys) if (!checks.has(key)) checks.set(key, null);
for (const name of errorFiles.keys()) checks.set(`errors ${name}`, null);

// What an earlier run on this build found held is not run again.
if (values.from) {
  const earlier = JSON.parse(readFileSync(values.from, "utf8"));
  if (earlier.build !== BUILD) {
    console.error(`recheck_callouts: ${values.from} is a run on BETA ${earlier.build}, not ${BUILD}`);
    process.exit(2);
  }
  for (const [key, r] of Object.entries(earlier.checks ?? {}))
    if (checks.has(key) && r.status === "holds") checks.set(key, { ...r, from: values.from });
}
for (const key of checks.keys()) {
  if (checks.get(key)) continue;
  if (key === "none") checks.set(key, { status: "hand", detail: "none: a person checks it" });
  else if (key === "unmarked") checks.set(key, { status: "hand", detail: "the callout names nothing that checks it" });
  else if (keyKind(key) === "probe")
    checks.set(key, { status: "hand", detail: "the package's probe/ harness is run by hand" });
  else if (!kinds.has(keyKind(key))) checks.set(key, { status: "skipped", detail: "not in --kinds" });
}

const todo = (kind) =>
  [...checks.keys()].filter((k) => keyKind(k) === kind && !checks.get(k)).map((k) => k.slice(kind.length + 1));
const say = (s) => console.log(s);
say(
  `recheck_callouts: BETA ${BUILD}: ${callouts.length} callout(s) labelled with an older build, in ` +
    `${new Set(callouts.map((c) => c.rel)).size} page(s), and ${errorFiles.size} error data file(s)`,
);
for (const kind of RUN_KINDS) {
  const list = todo(kind);
  if (list.length) say(`  ${kind}: ${list.length} to run${values.plan ? `: ${list.join(", ")}` : ""}`);
}
const reused = [...checks.values()].filter((r) => r?.from).length;
if (reused) say(`  ${reused} check(s) held in ${values.from}, not run again`);
if (values.plan) process.exit(0);

// ---------------------------------------------------------------- running

const work = path.join(tmpdir(), "recheck-callouts", String(process.pid));
mkdirSync(work, { recursive: true });
let runs = 0;
const ideArgs = values.ide ? ["--ide", values.ide] : [];

/** Runs `node <tool> <args>` to its end, keeps its output in the work folder, and returns it. */
function runTool(tool, args, name) {
  const log = path.join(work, `${String(++runs).padStart(2, "0")}-${name}.log`);
  say(`running ${tool} ${args.join(" ")}`.slice(0, 200));
  const t0 = Date.now();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(REPO_ROOT, tool), ...args], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    const done = (code) => {
      writeFileSync(log, `${out}${err ? `\n--- stderr\n${err}` : ""}`);
      say(`  exit ${code} in ${Math.round((Date.now() - t0) / 1000)} s; output in ${log}`);
      resolve({ code, out, err, log });
    };
    child.on("error", (e) => {
      err += `could not start: ${e.message}`;
      done(null);
    });
    child.on("close", done);
  });
}
const set = (key, status, detail, log) => checks.set(key, { status, detail, log });

// Lanes, with the lane reproducers' lanes: one run of each suite.
const repros = new Map();
for (const slug of todo("bug")) {
  for (const dir of [path.join(REPO_ROOT, "bugs", slug), path.join(REPO_ROOT, "bugs", "filed", slug)]) {
    const f = path.join(dir, "repro.json");
    if (existsSync(f)) repros.set(slug, JSON.parse(readFileSync(f, "utf8").replace(/^﻿/, "")));
  }
}
const laneBugs = [...repros].filter(([, r]) => r.mode === "lane").map(([slug]) => slug);
const lanesWanted = new Set(todo("lane"));
for (const slug of laneBugs) lanesWanted.add(repros.get(slug).lane);
for (const [suite, { tool }] of Object.entries(SUITES)) {
  const mine = [...lanesWanted].filter((l) => l.startsWith(`${suite}:`)).map((l) => l.slice(suite.length + 1));
  if (!mine.length) continue;
  const r = await runTool(tool, ["--only", `^(${mine.join("|")})$`, ...ideArgs], `${suite}-lanes`);
  const blocks = laneBlocks(r.out);
  const broken = r.code === null || r.code >= 2;
  for (const lane of mine) {
    const key = `lane ${suite}:${lane}`;
    const block = blocks.get(lane);
    if (checks.has(key) && !checks.get(key)) {
      if (broken || !block) set(key, "error", broken ? `${tool} exit ${r.code}` : "no report for the lane", r.log);
      else if (block.verdict === "passed") set(key, "holds", "", r.log);
      else {
        const failed = block.lines.filter((l) => l.trimStart().startsWith(FAILED)).map((l) => l.trim());
        set(key, "changed", `${block.verdict}: ${failed.join("; ")}`, r.log);
      }
    }
    for (const slug of laneBugs.filter((s) => repros.get(s).lane === `${suite}:${lane}`)) {
      const marks = repros.get(slug).tests.map((t) => ({ t, mark: block ? testMark(block.lines, t) : null }));
      const failed = marks.filter((m) => m.mark === "failed").map((m) => `"${m.t}"`);
      if (broken || marks.some((m) => !m.mark))
        set(`bug ${slug}`, "error", `the lane did not report every test`, r.log);
      else if (failed.length) set(`bug ${slug}`, "changed", `NO LONGER REPRODUCES: failed ${failed.join(", ")}`, r.log);
      else set(`bug ${slug}`, "holds", `${marks.length} test(s) passed`, r.log);
    }
  }
}

// The other reproducers.
const bugs = todo("bug");
if (bugs.length) {
  const r = await runTool("scripts/bug_repro.mjs", ["verify", ...bugs, ...ideArgs], "bugs");
  const read = readVerify(r.out);
  for (const slug of bugs) {
    const got = read.get(slug);
    set(`bug ${slug}`, got?.status ?? "error", got?.detail ?? `bug_repro reported nothing (exit ${r.code})`, r.log);
  }
}

// Samples: check_examples over the pages that hold them.
const samples = todo("sample");
if (samples.length) {
  const fences = await collectFences(DOCS_DIR);
  const byId = new Map(fences.filter((f) => f.keys.has("id")).map((f) => [f.keys.get("id"), f]));
  const rels = [...new Set(samples.map((id) => byId.get(id)?.rel).filter(Boolean))];
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const r = await runTool(
    "scripts/check_examples.mjs",
    ["--only", `^(?:${rels.map(escapeRe).join("|")})$`, "--json", ...ideArgs],
    "samples",
  );
  let report = null;
  try {
    report = JSON.parse(r.out);
  } catch {}
  for (const id of samples) {
    const f = byId.get(id);
    const runIds =
      f?.flags.has(RUN_MARKER) && archesOf(f).includes("win64")
        ? [...(archesOf(f).includes("win32") ? [id] : []), `${id}@win64`]
        : [id];
    const got = f ? sampleStatus(report, runIds) : { status: "error", detail: `no fence with id=${id}` };
    set(`sample ${id}`, got.status, got.detail, r.log);
  }
}

// Error data, for twinBASIC's two architectures.
for (const name of todo("errors")) {
  const r = await runTool(
    "scripts/errors.mjs",
    ["run", `${name}.yml`, "--runtime", "tb", "--runtime", "win64", ...ideArgs],
    `errors-${name}`,
  );
  set(
    `errors ${name}`,
    r.code === 0 ? "holds" : r.code === 1 ? "changed" : "error",
    `errors.mjs exit ${r.code}`,
    r.log,
  );
}

// The LLVM claims probe, one mode at a time.
for (const mode of todo("llvm")) {
  const r = await runTool("test/llvm/run.mjs", ["--only", mode, ...ideArgs], `llvm-${mode}`);
  set(`llvm ${mode}`, r.code === 0 ? "holds" : r.code === 1 ? "changed" : "error", `run.mjs exit ${r.code}`, r.log);
}

// The contributed packages' cases.
const pkgs = todo("package");
if (pkgs.length) {
  const r = await runTool("scripts/package_tests.mjs", [...pkgs, "--json", ...ideArgs], "packages");
  let report = null;
  try {
    report = JSON.parse(r.out);
  } catch {}
  for (const pkg of pkgs) {
    const judge = packageCases(report, pkg);
    const mine = callouts.filter((c) => c.pkg === pkg).flatMap((c) => c.cases);
    const off = [...new Set(mine)].map((n) => [n, judge(n)]).filter(([, j]) => j.status !== "holds");
    const worst = verdictOf(off.map(([, j]) => j.status).concat("holds"));
    set(`package ${pkg}`, worst, off.map(([n, j]) => `${n}: ${j.detail}`).join("; "), r.log);
    // A callout is judged by its own cases, not the package's worst.
    for (const c of callouts.filter((c) => c.pkg === pkg && c.cases.length)) {
      const own = c.cases.map((n) => judge(n));
      c.packageVerdict = {
        status: verdictOf(own.map((j) => j.status)),
        detail: own
          .map((j) => j.detail)
          .filter(Boolean)
          .join("; "),
      };
    }
  }
}

// ---------------------------------------------------------------- deciding

for (const c of callouts) {
  const statuses = c.keys.map((k) =>
    keyKind(k) === "package" && c.packageVerdict ? c.packageVerdict.status : (checks.get(k)?.status ?? "error"),
  );
  c.verdict = verdictOf(statuses);
}
const held = callouts.filter((c) => c.verdict === "holds");
const heldData = [...errorFiles.keys()].filter((n) => checks.get(`errors ${n}`)?.status === "holds");

if (!values.dryRun) {
  const byFile = new Map();
  for (const c of held) {
    if (!byFile.has(c.rel)) byFile.set(c.rel, []);
    byFile.get(c.rel).push(c);
  }
  for (const [rel, list] of byFile) {
    const file = path.join(DOCS_DIR, rel);
    const text = readFileSync(file, "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    for (const c of list) {
      const next = relabelLine(lines[c.line - 1], BUILD);
      if (next === null) throw new Error(`docs/${rel} line ${c.line} is no longer a callout labelled BETA <n>`);
      lines[c.line - 1] = next;
    }
    writeFileSync(file, lines.join(eol));
  }
  for (const name of heldData) {
    const file = path.join(REPO_ROOT, "errors", `${name}.yml`);
    writeFileSync(file, readFileSync(file, "utf8").replace(/^beta:[ \t]*\d+/m, `beta: ${BUILD}`));
  }
  if (heldData.length) {
    const r = await runTool("scripts/errors.mjs", ["write", ...heldData.map((n) => `${n}.yml`)], "errors-write");
    if (r.code !== 0) say(`  errors.mjs write exited ${r.code}: the data files' beta is moved, the pages are not`);
  }
}

// ---------------------------------------------------------------- the report

const verb = values.dryRun ? "would be relabelled" : "relabelled";
say(`\n${held.length} callout(s) and ${heldData.length} error data file(s) ${verb} to BETA ${BUILD}`);
const HEADINGS = {
  changed: "changed: the evidence no longer says what the callout says; read it, then fix or remove the callout",
  error: "not checked: the evidence could not be run or read; run it again alone (--from)",
  skipped: "not checked: its kind was not in --kinds",
  hand: "by hand: a person checks it, then moves the label",
};
for (const [verdict, heading] of Object.entries(HEADINGS)) {
  const list = callouts.filter((c) => c.verdict === verdict);
  if (!list.length) continue;
  say(`\n${list.length} ${heading}:`);
  for (const c of list) {
    say(`  docs/${c.rel}:${c.line}  [${c.kind}] ${c.label}`);
    c.keys.forEach((k, i) => {
      const r = k === `package ${c.pkg}` && c.packageVerdict ? c.packageVerdict : checks.get(k);
      if (r?.status !== "holds") say(`      ${c.items[i] ?? k}: ${r?.status}${r?.detail ? ` -- ${r.detail}` : ""}`);
    });
  }
}
const badData = [...errorFiles.keys()].filter((n) => !heldData.includes(n));
if (badData.length) {
  say(`\n${badData.length} error data file(s) not moved:`);
  for (const n of badData) {
    const r = checks.get(`errors ${n}`);
    say(`  errors/${n}.yml: ${r.status}${r.detail ? ` -- ${r.detail}` : ""}${r.log ? ` (${r.log})` : ""}`);
  }
}
if (values.report) {
  writeFileSync(
    values.report,
    `${JSON.stringify({ build: BUILD, dryRun: !!values.dryRun, checks: Object.fromEntries(checks), callouts, errorData: Object.fromEntries([...errorFiles.keys()].map((n) => [n, checks.get(`errors ${n}`)])) }, null, 1)}\n`,
  );
  say(`\nreport: ${values.report}`);
}
say(`tool output: ${work}`);
process.exitCode = callouts.every((c) => c.verdict === "holds") && !badData.length ? 0 : 1;
