// Checks that the editions of the impexp tool behave the same.
//
// scripts/impexp.mjs and scripts/impexp.py are one tool offered to readers in
// two languages, and Tools-Compiler.md promises that they print the same output and
// write byte-identical files. Each has the same built-in tests, and nothing ran
// them. This runs every suite, which must pass with the same test names in the
// same order, and then runs one sequence of commands through each edition, each
// in a scratch folder of its own holding copies of indexer/sample.twinpack and
// test/example-projects/console: export, import, the printing commands, and
// each refusal and failure the exit codes name. After every command the
// exit codes, the outputs and the folders' files must be the same in every
// edition as in the first, impexp.mjs.
//
// A third edition is a twinBASIC console program, scripts/impexp/, built to an
// exe. No gate can build it, as none can build scripts/imagestrip/, so it is
// compared only when IMPEXP_EXE names the built exe (Windows only). It is run
// through launchOnDesktop, on a private desktop of its own, as every program a
// test starts is; a box it opens is a difference.
//
// Python's text streams write CRLF on Windows, so there a CRLF in the printed
// output is read as LF in every edition; on Linux, as in CI, the output is
// compared as written. Written files are always compared as bytes.
//
// Without Python 3.6 or later this reports the gate skipped, loudly, and exits
// 0, except in CI (GitHub sets CI=true), where it fails: CI must compare them.
// With IMPEXP_EXE set and no Python outside CI, impexp.mjs and the exe are still
// compared, and the report says impexp.py was not.
//
//     node scripts/check_impexp_parity.mjs
//     IMPEXP_EXE=path/to/impexp_win32.exe node scripts/check_impexp_parity.mjs
//
// Exit codes: 0 the same, or skipped outside CI; 1 a difference or a failed
// built-in test; 2 a refused command line, an IMPEXP_EXE that cannot be used,
// no Python in CI, or a crash.

import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";

exitOnCrash();

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), { options: { help: { type: "boolean", short: "h" } }, stopAt: ["help"] }),
);
if (cli.stopped === "help") {
  printHelpAndExit(`usage: node scripts/check_impexp_parity.mjs

Runs the built-in tests of scripts/impexp.mjs and scripts/impexp.py, and one
sequence of commands through each, comparing exit codes, printed output and
written files. Without Python 3.6 or later it reports the check skipped, or
fails when CI=true.

Environment:
  IMPEXP_EXE  the built exe of scripts/impexp/, the twinBASIC edition (Windows
              only). It joins the comparison as impexp.exe, run on a private
              desktop. No gate builds it, so without this it is not compared.
              With it and no Python outside CI, only impexp.mjs and the exe are
              compared, and the report says impexp.py was not.

Exit codes:
  0  the editions agree, or the check was skipped because no Python was found
  1  the editions differ, or a built-in test failed
  2  the check could not run: a refused command line, an IMPEXP_EXE that is not a
     file or is set off Windows, no Python when CI=true, or a crash`);
}

const TOOL = "check_impexp_parity";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NODE_EDITION = path.join(ROOT, "scripts", "impexp.mjs");
const PYTHON_EDITION = path.join(ROOT, "scripts", "impexp.py");
const SAMPLE = path.join(ROOT, "indexer", "sample.twinpack");
const CONSOLE = path.join(ROOT, "test", "example-projects", "console");
const TIMEOUT_MS = 60_000;
const IN_CI = process.env.CI === "true";

// The commands, run in order in each edition's folder, so each sees what the
// ones before it wrote. `setup` changes both folders the same way first, and
// `exit` is the code both must give, so each command is known to reach the
// branch it is here for.
const COMMANDS = [
  { args: ["--help"], exit: 0 },
  { args: ["export", "sample.twinpack", "sample"], exit: 0 },
  { args: ["export", "sample.twinpack", "sample"], exit: 3, why: "refused: the files exist" },
  { args: ["export", "sample.twinpack", "sample", "--overwrite"], exit: 0 },
  {
    args: ["export", "sample.twinpack", "sample", "--overwrite"],
    exit: 6,
    why: "warns: a file the project lacks",
    setup: (dir) => writeFileSync(path.join(dir, "sample", "extra.txt"), "not in the project\r\n"),
  },
  { args: ["import", "repacked.twinpack", "sample"], exit: 0, why: "packs the extra file in" },
  {
    args: ["import", "console.twinproj", "console"],
    exit: 0,
    why: "with a README and a code file in LF",
    setup: (dir) => {
      writeFileSync(path.join(dir, "console", "README.md"), "# Console\r\n\r\nCaf\u{e9}, in UTF-8.\r\n");
      writeFileSync(
        path.join(dir, "console", "Sources", "Extra.twin"),
        "Module Extra\n    Sub Nothing()\n    End Sub\nEnd Module\n",
      );
    },
  },
  { args: ["import", "console.twinproj", "console"], exit: 3, why: "refused: the project exists" },
  { args: ["import", "console.twinproj", "console", "--overwrite"], exit: 0 },
  { args: ["export", "console.twinproj", "console-out"], exit: 0 },
  { args: ["settings", "sample.twinpack"], exit: 0 },
  { args: ["licence", "sample.twinpack"], exit: 0 },
  { args: ["changelog", "sample.twinpack"], exit: 0 },
  { args: ["readme", "sample.twinpack"], exit: 4, why: "the project has no README.md" },
  { args: ["readme", "console.twinproj"], exit: 0 },
  { args: ["export", "missing.twinproj", "out"], exit: 4, why: "the project file does not exist" },
  {
    args: ["import", "empty.twinproj", "empty"],
    exit: 5,
    why: "the folder has no Settings",
    setup: (dir) => mkdirSync(path.join(dir, "empty")),
  },
  {
    args: ["settings", "damaged.twinproj"],
    exit: 5,
    why: "the project file is damaged",
    setup: (dir) => writeFileSync(path.join(dir, "damaged.twinproj"), "not a project file"),
  },
  { args: ["export", "sample", "sample.twinpack"], exit: 2, why: "the arguments in the wrong order" },
  { args: ["bogus", "sample.twinpack"], exit: 2, why: "an unknown command" },
  { args: ["export", "sample.twinpack", "sample", "--bogus"], exit: 2, why: "an unknown option" },
];

// The first Python 3.6+ on PATH, as [command, ...args, version], or null.
function findPython() {
  const candidates = [["python3"], ["python"]];
  if (process.platform === "win32") candidates.push(["py", "-3"]);
  for (const [cmd, ...pre] of candidates) {
    const r = spawnSync(cmd, [...pre, "--version"], { encoding: "utf8", timeout: TIMEOUT_MS });
    const m = /^Python (3)\.(\d+)\.\S+/.exec(`${r.stdout ?? ""}${r.stderr ?? ""}`.trim());
    if (r.status === 0 && m && Number(m[2]) >= 6) return { cmd, pre, version: m[0].slice(7) };
  }
  return null;
}

// The twinBASIC edition's exe. It is refused, not skipped, when it cannot be
// used: someone who set the variable meant it to be compared.
const exePath = process.env.IMPEXP_EXE;
if (exePath) {
  if (process.platform !== "win32") {
    console.error(`${TOOL}: IMPEXP_EXE is set, but the twinBASIC edition runs only on Windows`);
    process.exit(2);
  }
  if (!existsSync(exePath) || !statSync(exePath).isFile()) {
    console.error(`${TOOL}: IMPEXP_EXE is "${exePath}", which is not a file`);
    process.exit(2);
  }
}

const python = findPython();
if (!python) {
  const tried = process.platform === "win32" ? "python3, python, py -3" : "python3, python";
  if (IN_CI) {
    console.error(`${TOOL}: no Python 3.6 or later found (tried ${tried}), and CI must compare the editions`);
    process.exit(2);
  }
  if (!exePath) {
    console.error(
      `${TOOL}: SKIPPED -- no Python 3.6 or later found (tried ${tried}).\n` +
        `${TOOL}: impexp.mjs and impexp.py were NOT compared; CI compares them and fails without Python.`,
    );
    process.exit(0);
  }
  console.error(
    `${TOOL}: WARNING -- no Python 3.6 or later found (tried ${tried}).\n` +
      `${TOOL}: impexp.py was NOT compared; only impexp.mjs and impexp.exe are.`,
  );
}

// impexp.mjs comes first: every other edition is compared with it.
const editions = [{ name: "impexp.mjs", cmd: process.execPath, pre: [NODE_EDITION] }];
if (python) editions.push({ name: "impexp.py", cmd: python.cmd, pre: [...python.pre, PYTHON_EDITION] });
if (exePath) editions.push({ name: "impexp.exe", exe: exePath });
const first = editions[0].name;

// Where the exe's output goes, outside every edition's folder so that it is not
// compared as a written file. Set once the scratch folder exists.
let outputs;
let outputCount = 0;

// What a stream's text is: latin1, with CRLF read as LF on Windows.
function text(buffer) {
  const s = buffer.toString("latin1");
  return process.platform === "win32" ? s.replace(/\r\n/g, "\n") : s;
}

// One command through the exe, on a private desktop. The program's output goes
// to files, one pair for each run, because the editions run at the same time.
async function runExe(edition, args, cwd) {
  const { launchOnDesktop } = await import("./lib/tb-ide.mjs");
  const n = ++outputCount;
  const stdout = path.join(outputs, `${n}.out`);
  const stderr = path.join(outputs, `${n}.err`);
  const launched = await launchOnDesktop({
    exe: edition.exe,
    args,
    cwd,
    desktop: "impexp-parity",
    env: process.env,
    stdout,
    stderr,
    dialogs: "close",
  });
  const { code, dialogs } = await launched.finished;
  if (code === null) throw new Error(`${edition.name} ${args.join(" ")}: ended without an exit code`);
  const read = (p) => (existsSync(p) ? text(readFileSync(p)) : "");
  return { status: code, stdout: read(stdout), stderr: read(stderr), dialogs };
}

// One command through one edition. The editions run each command at the
// same time, each in its own folder.
function run(edition, args, cwd) {
  if (edition.exe) return runExe(edition, args, cwd);
  return new Promise((resolve, reject) => {
    const child = spawn(edition.cmd, [...edition.pre, ...args], { cwd, timeout: TIMEOUT_MS });
    const out = [];
    const err = [];
    child.stdout.on("data", (b) => out.push(b));
    child.stderr.on("data", (b) => err.push(b));
    child.on("error", (e) => reject(new Error(`${edition.name} ${args.join(" ")}: ${e.message}`)));
    child.on("close", (status, signal) => {
      if (status === null) reject(new Error(`${edition.name} ${args.join(" ")}: ended by ${signal}`));
      else resolve({ status, stdout: text(Buffer.concat(out)), stderr: text(Buffer.concat(err)), dialogs: [] });
    });
  });
}

// A box an edition opened is reported against its command.
function dialogProblems(edition, r) {
  return r.dialogs.map((d) => `${edition.name} opened a box, "${d.title}": ${d.text}`);
}

// Every file under dir, by path relative to it with forward slashes.
function files(dir) {
  const out = new Map();
  for (const e of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!e.isFile()) continue;
    const full = path.join(e.parentPath, e.name);
    out.set(path.relative(dir, full).split(path.sep).join("/"), readFileSync(full));
  }
  return out;
}

// The first line two texts differ at, quoted from each, or null.
function firstDifference(a, b) {
  if (a === b) return null;
  const la = a.split("\n");
  const lb = b.split("\n");
  let i = 0;
  while (i < la.length && i < lb.length && la[i] === lb[i]) i++;
  const q = (l) => (l === undefined ? "(ends)" : JSON.stringify(l.length > 100 ? `${l.slice(0, 100)}...` : l));
  return `line ${i + 1}: ${q(la[i])} and ${q(lb[i])}`;
}

// The files that differ between the first edition's folder and another's, each
// named only the first time, so a difference is reported against the command
// that made it.
const reported = new Set();
function compareFolders(a, b, edition) {
  const fa = files(a);
  const fb = files(b);
  const problems = [];
  const report = (p, what) => {
    const key = `${edition.name} ${p}`;
    if (!reported.has(key)) problems.push(`${p} ${what}`);
    reported.add(key);
  };
  for (const p of fa.keys()) if (!fb.has(p)) report(p, `written by ${first} only`);
  for (const p of fb.keys()) if (!fa.has(p)) report(p, `written by ${edition.name} only`);
  for (const [p, bytes] of fa) {
    if (fb.has(p) && !bytes.equals(fb.get(p))) {
      report(p, `differs between ${first} and ${edition.name} (${bytes.length} and ${fb.get(p).length} bytes)`);
    }
  }
  return problems;
}

const problems = [];
const scratch = mkdtempSync(path.join(tmpdir(), "impexp-parity-"));
outputs = path.join(scratch, "outputs");
mkdirSync(outputs);
let selfTestCount = 0;
try {
  // The built-in tests: every one passes, with the same names in the same order.
  // The first line names a temporary folder, which differs.
  const selfTestRuns = await Promise.all(editions.map((e) => run(e, ["--self-test"], ROOT)));
  const selfTests = editions.map((e, i) => {
    const r = selfTestRuns[i];
    const lines = r.stdout.split("\n").filter((l) => !l.startsWith("Self-test  workdir:"));
    const names = lines.filter((l) => /^\s+\[(PASS|FAIL|SKIP)\] /.test(l)).map((l) => l.trim());
    problems.push(...dialogProblems(e, r).map((p) => `--self-test: ${p}`));
    if (r.status !== 0) problems.push(`${e.name} --self-test exited ${r.status}`);
    for (const n of names) if (!n.startsWith("[PASS] ")) problems.push(`${e.name} --self-test: ${n}`);
    if (names.length === 0) problems.push(`${e.name} --self-test ran no test`);
    return { names, text: `${lines.join("\n")}\n${r.stderr}` };
  });
  selfTestCount = selfTests[0].names.length;
  for (let i = 1; i < editions.length; i++) {
    const d = firstDifference(selfTests[0].text, selfTests[i].text);
    if (d) problems.push(`--self-test of ${editions[i].name} prints differently from ${first}'s, ${d}`);
  }

  const dirs = editions.map((e) => {
    const dir = path.join(scratch, e.name);
    mkdirSync(dir);
    cpSync(SAMPLE, path.join(dir, "sample.twinpack"));
    cpSync(CONSOLE, path.join(dir, "console"), { recursive: true });
    return dir;
  });
  for (const c of COMMANDS) {
    const label = `impexp ${c.args.join(" ")}${c.why ? ` (${c.why})` : ""}`;
    for (const dir of dirs) c.setup?.(dir);
    const results = await Promise.all(editions.map((e, i) => run(e, c.args, dirs[i])));
    if (results.some((r) => r.status !== c.exit)) {
      const codes = editions.map((e, i) => `${results[i].status} from ${e.name}`);
      problems.push(`${label}: exit ${codes.join(", ")}, not ${c.exit}`);
    }
    for (let i = 0; i < editions.length; i++) {
      for (const p of dialogProblems(editions[i], results[i])) problems.push(`${label}: ${p}`);
    }
    for (let i = 1; i < editions.length; i++) {
      for (const stream of ["stdout", "stderr"]) {
        const d = firstDifference(results[0][stream], results[i][stream]);
        if (d) problems.push(`${label}: ${stream} of ${editions[i].name} differs from ${first}'s, ${d}`);
      }
      for (const p of compareFolders(dirs[0], dirs[i], editions[i])) problems.push(`${label}: ${p}`);
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// "impexp.mjs, impexp.py (Python 3.12.1) and impexp.exe"
const names = editions.map((e) => (e.name === "impexp.py" ? `${e.name} (Python ${python.version})` : e.name));
const named = `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
if (problems.length) {
  console.error(`${TOOL}: ${named} differ:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `${TOOL}: ${named} pass the same ${selfTestCount} ` +
    `built-in tests, and ${COMMANDS.length} commands exit, print and write the same`,
);
if (!python) console.error(`${TOOL}: WARNING -- impexp.py was NOT compared (no Python 3.6 or later found)`);
