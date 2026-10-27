#!/usr/bin/env node
// The run-time errors each documented procedure raises: measuring them, and
// writing each page's Common Errors section from the data under errors/.
//
//     node scripts/errors.mjs run [<file.yml>...] [--only <regex>] [--runtime tb|win64|vb6|vba64]...
//     node scripts/errors.mjs generate <dir> [<file.yml>...] [--only <regex>]
//     node scripts/errors.mjs write [<file.yml>...]
//     node scripts/errors.mjs messages [--runtime tb|win64|vb6|vba64]...
//
// Exit codes:
//   0  run, messages: every runtime agrees with the data; generate, write: done
//   1  run, messages: a runtime disagrees with the data
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
// 32-bit and 64-bit, a VB6 exe through lib/vb6.mjs, and a module run in 64-bit
// Access through lib/vba.mjs: twinBASIC 32-bit answers to VB6, 64-bit to 64-bit VBA)
// and compares what each case raised with what the data says; `messages` does the
// same for errors/messages.yml, the message of every number. They need twinBASIC,
// VB6 and 64-bit Office, so they are run by a person when a BETA is installed,
// never by CI. `write` -- each page's section, and the
// index of the numbers on the central page -- needs neither; check_errors.mjs is
// its gate.

import { spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { die, exitOnCrash, parseCli, printHelpAndExit, regexOption, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import {
  CENTRAL_PAGE,
  caseAtLine,
  compareMessages,
  expectedDescription,
  dataFiles,
  findSection,
  loadDataFile,
  loadMessages,
  messageProbeModule,
  pageLevel,
  pageMeta,
  pagePath,
  probeCases,
  probeModule,
  harnessCode,
  readMessageOutput,
  RUNTIMES,
  readProbeOutput,
  renderIndex,
  renderSection,
  spliceIndex,
  spliceSection,
  VB_NUMBERS,
  vb6Unattended,
} from "./lib/errors-data.mjs";
import { encodeAnsi, findVb6, NO_VB6, parseMakeLog, runRepro } from "./lib/vb6.mjs";
import { faultText } from "./lib/win-fault.mjs";
import { findAccess64, NO_VBA64, VBA_MODULE, VbaSession } from "./lib/vba.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/errors.mjs run [<file.yml>...] [--only <regex>] [--runtime R]... [--ide P] [--vb6 P] [--keep]
       node scripts/errors.mjs generate <dir> [<file.yml>...] [--only <regex>]
       node scripts/errors.mjs write [<file.yml>...]
       node scripts/errors.mjs messages [--runtime R]... [--ide P] [--vb6 P] [--keep] [-h, --help]

The run-time errors of the documented procedures, from the data under errors/
(its format is in WIP.Errors.md). A file is named as it is in errors/; with none
named, every file there is used.

  run       builds a probe of the cases for each runtime, runs it, and compares
            what each case raised with the data. A case the compiler refuses is
            reported and left out, and the probe built again without it.
  generate  writes the probes to <dir>/tb (a tree for scripts/tbrun.mjs --exe),
            <dir>/vb6 (Probe.vbp) and <dir>/vba (Module1.bas), without running them
  write     writes each page's Common Errors section from the data, and the index of
            the numbers on the central page, docs/Reference/Run-time-Errors.md
  messages  builds a probe of the messages for each runtime, runs it, and
            compares what Error$(n) and Err.Raise n give with errors/messages.yml:
            every number from 1 to 65535 with a message of its own, and every
            other number the file lists

  --only <regex>   only the pages whose path under docs/ matches
  --runtime R      tb (32-bit twinBASIC), win64 (64-bit twinBASIC), vb6, or vba64
                   (64-bit VBA, in Access); may be repeated. By default all four
  --ide P          the twinBASIC IDE, as for tbrun (default $TB_IDE, or the newest
                   on the Desktop)
  --vb6 P          VB6.EXE (default $VB6_EXE, or VB6's own install folder)
  --keep           run, messages: keep the generated probes, and print where
  -h, --help       print this text and exit

Exit codes:
  0  run, messages: every runtime agrees with the data; generate, write: done
  1  run, messages: a runtime disagrees with the data
  2  a refused command line, bad data, or a runtime that could not be run`;

const COMMANDS = ["run", "generate", "write", "messages"];
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
if (command !== "run" && command !== "messages") {
  for (const k of ["runtime", "ide", "vb6"]) if (values[k]?.length) usage(`--${k} is for run and messages`);
  if (values.keep) usage("--keep is for run and messages");
}
if ((command === "write" || command === "messages") && only) usage("--only is for run and generate");
if (command === "messages") {
  if (rest.length) usage("messages takes no data file: it measures errors/messages.yml");
}

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
      const meta = pageMeta(text);
      if (!meta.title || !meta.permalink) marks.push("no title: or permalink: in the front matter, to link it by");
      if (marks.length) die(2, `docs/${p.page}: ${marks.join("; ")}`);
      const section = renderSection(p, {
        name: f.name,
        beta: f.beta,
        messages,
        level: pageLevel(text),
      });
      const next = spliceSection(text, section);
      if (next !== text) {
        writeFileSync(file, next);
        changed++;
        console.log(`wrote docs/${p.page}`);
      }
    }
  }
  // The index names the pages of every data file, whichever were named.
  const every = known.map((n) => loadDataFile(n));
  const metas = new Map();
  for (const f of every) for (const p of f.pages) metas.set(p.page, pageMeta(readFileSync(pagePath(p.page), "utf8")));
  const centralFile = pagePath(CENTRAL_PAGE);
  const central = readFileSync(centralFile, "utf8");
  const { text: index, problem } = spliceIndex(central, renderIndex(every, messages, metas));
  if (problem) die(2, `docs/${CENTRAL_PAGE}: ${problem}`);
  if (index !== central) {
    writeFileSync(centralFile, index);
    changed++;
    console.log(`wrote docs/${CENTRAL_PAGE}`);
  }
  console.log(`errors: ${changed} page${changed === 1 ? "" : "s"} written`);
  process.exit(0);
}

// ------------------------------------------------------------------ the probes

// The module is the cases' probe, or `text` when it is given (the messages' probe).
function writeTbTree(dir, cases, text) {
  mkdirSync(path.join(dir, "Sources"), { recursive: true });
  cpSync(TB_TEMPLATE, path.join(dir, "Settings"));
  const mod = text === undefined ? probeModule(cases, "tb", harnessCode(cases)) : { text, spans: [] };
  writeFileSync(path.join(dir, "Sources", "Probe.twin"), mod.text);
  return mod;
}

function writeVb6Project(dir, cases, text) {
  mkdirSync(dir, { recursive: true });
  cpSync(VB6_PROJECT, path.join(dir, "Probe.vbp"));
  const mod = text === undefined ? probeModule(cases, "vb6", harnessCode(cases)) : { text, spans: [] };
  writeFileSync(path.join(dir, "Module1.bas"), encodeAnsi(mod.text));
  return mod;
}

const vbaModule = (cases) => probeModule(cases, "vba", harnessCode(cases));

if (command === "generate") {
  const tb = probeCases(files, "tb", { only });
  const vb6 = probeCases(files, "vb6", { only });
  const vba = probeCases(files, "vba64", { only });
  writeTbTree(path.join(outDir, "tb"), tb);
  writeVb6Project(path.join(outDir, "vb6"), vb6);
  mkdirSync(path.join(outDir, "vba"), { recursive: true });
  writeFileSync(path.join(outDir, "vba", VBA_MODULE), encodeAnsi(vbaModule(vba).text));
  console.log(
    `errors: ${tb.length} cases in ${path.join(outDir, "tb")}, ${vb6.length} in ${path.join(outDir, "vb6")}, ${vba.length} in ${path.join(outDir, "vba")}`,
  );
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

async function runTb(dir, cases, arch, text) {
  const mod = writeTbTree(dir, cases, text);
  const args = [dir, "--exe", "--json", "--arch", arch];
  // A probe of many cases can outlast tbrun's limit for an exe: each AppActivate case takes
  // about 1.5 s in twinBASIC (BETA 1010). VB6 and VBA have 120 s too.
  args.push("--exe-run-timeout", text !== undefined ? "600" : "120");
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
  const note = [e.fault && faultText(e.fault), e.timedOut && "timed out", ...e.dialogs.map((d) => `a box: ${d.text}`)]
    .filter(Boolean)
    .join("; ");
  return { lines: e.lines, note };
}

async function runVb6(dir, cases, vb6, text) {
  const mod = writeVb6Project(dir, cases, text);
  let r;
  try {
    r = await runRepro(vb6, dir, {
      timeoutMs: text === undefined ? 120000 : 600000,
      unattended: vb6Unattended(cases),
    });
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
  const note = [r.fault && faultText(r.fault), r.timedOut && "timed out", ...r.dialogs.map((d) => `a box: ${d.text}`)]
    .filter(Boolean)
    .join("; ");
  return { lines: r.lines, note };
}

// One Access for the whole run (lib/vba.mjs, 4), started by the first probe that needs it.
let vbaSession = null;

async function runVba64(dir, cases, text) {
  vbaSession ??= new VbaSession();
  const mod = text === undefined ? vbaModule(cases) : { text, spans: [] };
  let r;
  try {
    r = await vbaSession.runModule(dir, mod.text, { timeoutMs: text === undefined ? 120000 : 600000 });
  } catch (e) {
    return { harness: e.message.split("\n")[0] };
  }
  const compile = r.boxes.find((b) => /^Compile error/i.test(b.text));
  if (compile) {
    // VBA compiles a case's Sub as Main first calls it, and Main calls them in order: the
    // refused one is the first that did not report.
    if (!r.lines.includes("start")) return { harness: `an error in the module's declarations: ${compile.text}` };
    const { seen } = readProbeOutput(r.lines);
    const id = cases.find((c) => !seen.has(c.id))?.id;
    if (id === undefined) return { harness: `a compile error after every case: ${compile.text}` };
    return { refused: new Map([[id, compile.text.replace(/^Compile error:\s*/i, "")]]) };
  }
  const note = [
    r.timedOut && "timed out",
    ...r.boxes.map((b) => `a box: ${b.text}`),
    r.result && r.result !== "ran" && r.result,
    !r.result && !r.timedOut && "Access ended",
  ]
    .filter(Boolean)
    .join("; ");
  return { lines: r.lines, note };
}

// The runtimes a command measures, and what each needs found first.
function runtimesWanted() {
  const runtimes = values.runtime.length ? RUNTIMES.filter((r) => values.runtime.includes(r)) : RUNTIMES;
  let vb6 = null;
  if (runtimes.includes("vb6")) {
    vb6 = findVb6(values.vb6);
    if (!vb6) die(2, values.vb6 ? `no such file: ${values.vb6}\n${NO_VB6}` : NO_VB6);
  }
  if (runtimes.includes("vba64") && !findAccess64()) die(2, NO_VBA64);
  return { runtimes, vb6 };
}

async function finish() {
  await vbaSession?.close();
  if (values.keep) console.log(`errors: the probes are in ${work}`);
  else rmSync(work, { recursive: true, force: true });
}

if (command === "messages") {
  // The numbers past VB's own that the list gives are measured as well.
  const others = [...messages.keys()].filter((n) => n < VB_NUMBERS.from || n > VB_NUMBERS.to).sort((a, b) => a - b);
  const { runtimes, vb6 } = runtimesWanted();
  const run = {
    tb: (d) => runTb(d, [], "win32", messageProbeModule(others, "tb")),
    win64: (d) => runTb(d, [], "win64", messageProbeModule(others, "tb")),
    vb6: (d) => runVb6(d, [], vb6, messageProbeModule(others, "vb6")),
    vba64: (d) => runVba64(d, [], messageProbeModule(others, "vba")),
  };
  const seen = {};
  const broken = [];
  await Promise.all(
    runtimes.map(async (rt) => {
      const got = await run[rt](path.join(work, rt));
      const read = got.lines ? readMessageOutput(got.lines) : null;
      if (read?.done) seen[rt] = read.seen;
      else if (got.harness) broken.push(`${rt}: ${got.harness}`);
      else if (got.refused) broken.push(`${rt}: the probe did not build: ${[...got.refused.values()].join("; ")}`);
      else broken.push(`${rt}: the probe stopped before it ended${got.note ? `: ${got.note}` : ""}`);
    }),
  );
  await finish();
  if (broken.length) die(2, broken.join("\n"));
  const wrong = compareMessages(messages, seen);
  for (const w of wrong) console.log(`  ${w}`);
  const against = runtimes.join(" and ");
  console.log(
    `errors: ${messages.size} numbers in messages.yml, ${wrong.length ? `${wrong.length} disagreements with ${against}` : `all agree with ${against}`}`,
  );
  process.exit(wrong.length ? 1 : 0);
}

const { runtimes, vb6 } = runtimesWanted();
const runners = {
  tb: (d, c) => runTb(d, c, "win32"),
  win64: (d, c) => runTb(d, c, "win64"),
  vb6: (d, c) => runVb6(d, c, vb6),
  vba64: (d, c) => runVba64(d, c),
};
const plan = runtimes.map((rt) => [rt, runners[rt]]);

const caseLists = Object.fromEntries(plan.map(([rt]) => [rt, probeCases(files, rt, { only })]));
const measured = Object.fromEntries(
  await Promise.all(plan.map(async ([rt, run]) => [rt, await measure(rt, caseLists[rt], run)])),
);
await finish();

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
    else if (r.number !== mine.expect)
      wrong.push(`${rt} raised ${r.number}${r.description ? ` (${r.description})` : ""}, the data says ${mine.expect}`);
    else if (r.number !== 0) {
      const want = expectedDescription(mine.row, rt, r.number, messages);
      if (want !== null && r.description !== want) {
        wrong.push(`${rt}'s message is "${r.description}", the data and errors/messages.yml say "${want}"`);
      }
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
