#!/usr/bin/env node
// The run-time errors each documented procedure raises: measuring them, and
// writing each page's Errors section from the data under errors/.
//
//     node scripts/errors.mjs run [<file.yml>...] [--only <regex>] [--runtime tb|vb6|win64]...
//     node scripts/errors.mjs generate <dir> [<file.yml>...] [--only <regex>]
//     node scripts/errors.mjs write [<file.yml>...]
//
// Exit codes:
//   0  run: every runtime agrees with the data; generate, write: done
//   1  run: a runtime disagrees with the data
//   2  refused command line, bad data, or a runtime could not be run
//
// WHY THIS EXISTS
//
// No VB or VBA reference says which errors a procedure can raise, and a reader
// writing an error handler needs exactly that. Hand-written tables cannot be
// re-checked on a new BETA, so each page's errors are data -- the cases that
// raise them, errors/*.yml, whose format WIP.Errors.md describes -- and the
// section, the probe and the check are generated from it. `run` builds one
// probe from the data for each runtime (a twinBASIC exe through scripts/tbrun.mjs,
// a VB6 exe through lib/vb6.mjs) and compares what each case raised with what
// the data says. It needs twinBASIC and VB6, so it is run by a person when a
// BETA is installed, never by CI. `write` needs neither; check_errors.mjs is its
// gate.

import { spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { die, exitOnCrash, parseCli, printHelpAndExit, regexOption, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  caseAtLine,
  dataFiles,
  findSection,
  loadDataFile,
  loadMessages,
  pageLevel,
  pagePath,
  probeCases,
  probeModule,
  readProbeOutput,
  renderSection,
  spliceSection,
} from "./lib/errors-data.mjs";
import { encodeAnsi, findVb6, NO_VB6, parseMakeLog, runRepro } from "./lib/vb6.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/errors.mjs run [<file.yml>...] [--only <regex>] [--runtime R]... [--ide P] [--vb6 P] [--keep]
       node scripts/errors.mjs generate <dir> [<file.yml>...] [--only <regex>]
       node scripts/errors.mjs write [<file.yml>...] [-h, --help]

The run-time errors of the documented procedures, from the data under errors/
(its format is in WIP.Errors.md). A file is named as it is in errors/; with none
named, every file there is used.

  run       builds a probe of the cases for each runtime, runs it, and compares
            what each case raised with the data. A case the compiler refuses is
            reported and left out, and the probe built again without it.
  generate  writes the probes to <dir>/tb (a tree for scripts/tbrun.mjs --exe)
            and <dir>/vb6 (Probe.vbp), without running them
  write     writes each page's Errors section from the data

  --only <regex>   only the pages whose path under docs/ matches
  --runtime R      tb (32-bit twinBASIC), vb6 or win64 (64-bit twinBASIC); may be
                   repeated. By default tb and vb6, and win64 for a file that says
                   win64: true
  --ide P          the twinBASIC IDE, as for tbrun (default $TB_IDE, or the newest
                   on the Desktop)
  --vb6 P          VB6.EXE (default $VB6_EXE, or VB6's own install folder)
  --keep           keep the generated probes, and print where
  -h, --help       print this text and exit

Exit codes:
  0  run: every runtime agrees with the data; generate, write: done
  1  run: a runtime disagrees with the data
  2  a refused command line, bad data, or a runtime that could not be run`;

const RUNTIMES = ["tb", "vb6", "win64"];
const COMMANDS = ["run", "generate", "write"];
const TBRUN = path.join(REPO_ROOT, "scripts", "tbrun.mjs");
const TB_TEMPLATE = path.join(REPO_ROOT, "test", "example-projects", "console", "Settings");
const VB6_PROJECT = path.join(REPO_ROOT, "test", "repro-templates", "vb6", "Probe.vbp");
const ROUNDS = 25;

const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        only: { type: "string" },
        runtime: { type: "string", multiple: true },
        ide: { type: "string" },
        vb6: { type: "string" },
        keep: { type: "boolean", default: false },
        help: { type: "boolean", short: "h" },
      },
      positionals: { min: 0 },
      stopAt: ["help"],
    }),
  { format: (err) => `${err.message}\n${USAGE}` },
);
if (values.help) printHelpAndExit(USAGE);

const usage = (msg) => die(2, `${msg}\n${USAGE}`);
const [command, ...rest] = positionals;
if (!COMMANDS.includes(command)) usage(command ? `unknown command: ${command}` : "give a command");
const only = withUsageError(() => (values.only ? regexOption(values.only, { option: "--only" }) : null));
for (const r of values.runtime) if (!RUNTIMES.includes(r)) usage(`--runtime: one of ${RUNTIMES.join(", ")}`);
let outDir = null;
if (command === "generate") {
  if (!rest.length) usage("generate needs the folder to write to");
  outDir = path.resolve(rest.shift());
}
if (command !== "run") {
  for (const k of ["runtime", "ide", "vb6"]) if (values[k]?.length) usage(`--${k} is for run`);
  if (values.keep) usage("--keep is for run");
}
if (command === "write" && only) usage("--only is for run and generate");

// ------------------------------------------------------------------ the data

const known = dataFiles();
const names = rest.length ? rest.map((n) => path.basename(n)) : known;
for (const n of names) if (!known.includes(n)) die(2, `no such data file: errors/${n}`);
const files = names.map((n) => loadDataFile(n));
const { messages, problems: messageProblems } = loadMessages();
const problems = [...messageProblems, ...files.flatMap((f) => f.problems)];
if (problems.length)
  die(2, `errors: the data has problems; scripts/check_errors.mjs lists them all\n  ${problems.join("\n  ")}`);

if (command === "write") {
  let changed = 0;
  for (const f of files) {
    for (const p of f.pages) {
      const file = pagePath(p.page);
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        die(2, `errors/${f.name}: no such page: docs/${p.page}`);
      }
      const { problems: marks } = findSection(text);
      if (marks.length) die(2, `docs/${p.page}: ${marks.join("; ")}`);
      const section = renderSection(p, { name: f.name, beta: f.beta, messages, level: pageLevel(text) });
      const next = spliceSection(text, section);
      if (next !== text) {
        writeFileSync(file, next);
        changed++;
        console.log(`wrote docs/${p.page}`);
      }
    }
  }
  console.log(`errors: ${changed} page${changed === 1 ? "" : "s"} written`);
  process.exit(0);
}

// ------------------------------------------------------------------ the probes

function writeTbTree(dir, cases) {
  mkdirSync(path.join(dir, "Sources"), { recursive: true });
  cpSync(TB_TEMPLATE, path.join(dir, "Settings"));
  const mod = probeModule(cases, "tb");
  writeFileSync(path.join(dir, "Sources", "Probe.twin"), mod.text);
  return mod;
}

function writeVb6Project(dir, cases) {
  mkdirSync(dir, { recursive: true });
  cpSync(VB6_PROJECT, path.join(dir, "Probe.vbp"));
  const mod = probeModule(cases, "vb6");
  writeFileSync(path.join(dir, "Module1.bas"), encodeAnsi(mod.text));
  return mod;
}

if (command === "generate") {
  const tb = probeCases(files, "tb", { only });
  const vb6 = probeCases(files, "vb6", { only });
  writeTbTree(path.join(outDir, "tb"), tb);
  writeVb6Project(path.join(outDir, "vb6"), vb6);
  console.log(`errors: ${tb.length} cases in ${path.join(outDir, "tb")}, ${vb6.length} in ${path.join(outDir, "vb6")}`);
  process.exit(0);
}

// run: node scripts/tbrun.mjs as a child, as bug_repro does; it runs on import.
function runNode(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [TBRUN, ...args], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

const work = mkdtempSync(path.join(tmpdir(), "errors-"));

// What each case raised in one runtime: Map id -> { number, description } or
// { refused: message } or { missing: true }; plus a note for the harness.
async function measure(runtime, cases, run) {
  const results = new Map();
  let left = cases;
  for (let round = 1; round <= ROUNDS && left.length; round++) {
    const dir = path.join(work, `${runtime}-${round}`);
    const got = await run(dir, left);
    if (got.harness) return { results, harness: got.harness };
    if (got.refused) {
      for (const [id, message] of got.refused) results.set(id, { refused: message });
      left = left.filter((c) => !got.refused.has(c.id));
      continue;
    }
    const { seen, done } = readProbeOutput(got.lines);
    for (const c of left) results.set(c.id, seen.get(c.id) ?? { missing: true });
    return { results, harness: done ? null : `the probe stopped before it ended${got.note ? `: ${got.note}` : ""}` };
  }
  return { results, harness: left.length ? `still refused after ${ROUNDS} builds` : null };
}

async function runTb(dir, cases, arch) {
  const mod = writeTbTree(dir, cases);
  const args = [dir, "--exe", "--json", "--arch", arch];
  if (values.ide) args.push("--ide", values.ide);
  const r = await runNode(args);
  if (r.code === 1) {
    const refused = new Map();
    for (const m of r.stdout.matchAll(/^\{ERROR\} \S*Probe\.twin \[(\d+),\d+\]: (.*)$/gm)) {
      const id = caseAtLine(mod.spans, Number(m[1]));
      if (id === null) return { harness: `a compile error outside every case: ${m[0]}` };
      refused.set(id, m[2]);
    }
    if (refused.size) return { refused };
  }
  let json = null;
  try {
    json = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  } catch {}
  if (!json?.exeRun)
    return { harness: `tbrun exit ${r.code}: ${(r.stderr || r.stdout).trim().split("\n").slice(-3).join(" / ")}` };
  const e = json.exeRun;
  const note = [e.fault, e.timedOut && "timed out", ...e.dialogs.map((d) => `a box: ${d.text}`)]
    .filter(Boolean)
    .join("; ");
  return { lines: e.lines, note };
}

async function runVb6(dir, cases, vb6) {
  const mod = writeVb6Project(dir, cases);
  let r;
  try {
    r = await runRepro(vb6, dir, { timeoutMs: 120000 });
  } catch (e) {
    return { harness: e.message.split("\n")[0] };
  }
  if (!r.built) {
    // VB6 reports the first error only. Its line counts from 0 and skips the
    // Attribute line: the file's line less two.
    const { line, message } = parseMakeLog(r.log, ["Module1"]);
    const id = line === null ? null : caseAtLine(mod.spans, line + 2);
    if (id === null) return { harness: `VB6 did not build the probe: ${message}` };
    return { refused: new Map([[id, message]]) };
  }
  const note = [r.fault, r.timedOut && "timed out", ...r.dialogs.map((d) => `a box: ${d.text}`)]
    .filter(Boolean)
    .join("; ");
  return { lines: r.lines, note };
}

const wanted = values.runtime.length ? values.runtime : null;
const plan = [];
const want = (rt) => (wanted ? wanted.includes(rt) : rt !== "win64");
if (want("tb")) plan.push(["tb", (d, c) => runTb(d, c, "win32")]);
if (wanted ? wanted.includes("win64") : files.some((f) => f.win64)) {
  plan.push(["win64", (d, c) => runTb(d, c, "win64")]);
}
if (want("vb6")) {
  const vb6 = findVb6(values.vb6);
  if (!vb6) die(2, values.vb6 ? `no such file: ${values.vb6}\n${NO_VB6}` : NO_VB6);
  plan.push(["vb6", (d, c) => runVb6(d, c, vb6)]);
}

const caseLists = Object.fromEntries(
  plan.map(([rt]) => {
    // win64 is measured for the files that ask for it, or for all when --runtime names it.
    const from = rt === "win64" && !wanted?.includes("win64") ? files.filter((f) => f.win64) : files;
    return [rt, probeCases(from, rt, { only })];
  }),
);
const measured = Object.fromEntries(
  await Promise.all(plan.map(async ([rt, run]) => [rt, await measure(rt, caseLists[rt], run)])),
);
if (values.keep) console.log(`errors: the probes are in ${work}`);
else rmSync(work, { recursive: true, force: true });

// ------------------------------------------------------------------ the report

let disagreements = 0;
let harness = 0;
for (const [rt] of plan) {
  if (measured[rt].harness) {
    harness++;
    console.log(`${rt}: ${measured[rt].harness}`);
  }
}
const shown = (r) =>
  !r ? "-" : r.refused ? "refused" : r.missing ? "none" : `${r.number}${r.setup ? " (setup)" : ""}`;
let lastPage = null;
const all = new Map();
for (const [rt] of plan) for (const c of caseLists[rt]) all.set(c.id, c);
for (const c of [...all.values()].sort((a, b) => a.id - b.id)) {
  if (c.page !== lastPage) {
    console.log(`\ndocs/${c.page} (errors/${c.file})`);
    lastPage = c.page;
  }
  const cells = [];
  const wrong = [];
  for (const [rt] of plan) {
    const mine = caseLists[rt].find((x) => x.id === c.id);
    if (!mine) continue;
    const r = measured[rt].results.get(c.id);
    cells.push(`${rt} ${shown(r)}`);
    if (!r) continue;
    if (r.refused) wrong.push(`${rt} refused it: ${r.refused}`);
    else if (r.missing) wrong.push(`${rt} reported nothing`);
    else if (r.setup) wrong.push(`${rt}: its setup raised ${r.number}, ${r.description}`);
    else if (r.number !== mine.expect) wrong.push(`${rt} raised ${r.number}, the data says ${mine.expect}`);
    else if (r.number !== 0 && r.description !== messages.get(r.number)) {
      wrong.push(
        `${rt}'s message is "${r.description}", errors/messages.yml has "${messages.get(r.number) ?? "nothing"}"`,
      );
    }
  }
  console.log(
    `  ${wrong.length ? "FAIL" : "ok  "} ${String(c.row ? c.row.error : 0).padStart(11)}  ${c.label}  [${cells.join(", ")}]`,
  );
  for (const w of wrong) console.log(`         ${w}`);
  if (wrong.length) disagreements++;
}
console.log(
  `\nerrors: ${all.size} cases, ${disagreements ? `${disagreements} disagree with the data` : "all agree with the data"}`,
);
process.exit(harness ? 2 : disagreements ? 1 : 0);
