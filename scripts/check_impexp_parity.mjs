// Checks that the two editions of the impexp tool behave the same.
//
// scripts/impexp.mjs and scripts/impexp.py are one tool offered to readers in
// two languages, and Tools.md promises that they print the same output and
// write byte-identical files. Each has the same built-in tests, and nothing ran
// them. This runs both suites, which must pass with the same test names in the
// same order, and then runs one sequence of commands through each edition, each
// in a scratch folder of its own holding copies of indexer/sample.twinpack and
// test/example-projects/console: export, import, the printing commands, and
// each refusal and failure the exit codes name. After every command the two
// exit codes, the two outputs and the two folders' files must be the same.
//
// Python's text streams write CRLF on Windows, so there a CRLF in the printed
// output is read as LF on both sides; on Linux, as in CI, the output is
// compared as written. Written files are always compared as bytes.
//
// Without Python 3.6 or later this reports the gate skipped, loudly, and exits
// 0, except in CI (GitHub sets CI=true), where it fails: CI must compare them.
//
//     node scripts/check_impexp_parity.mjs
//
// Exit codes: 0 the same, or skipped outside CI; 1 a difference or a failed
// built-in test; 2 a refused command line, no Python in CI, or a crash.

import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

Exit codes:
  0  the two editions agree, or the check was skipped because no Python was found
  1  the editions differ, or a built-in test failed
  2  the check could not run: a refused command line, no Python when CI=true, or a
     crash`);
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

const python = findPython();
if (!python) {
  const tried = process.platform === "win32" ? "python3, python, py -3" : "python3, python";
  if (IN_CI) {
    console.error(`${TOOL}: no Python 3.6 or later found (tried ${tried}), and CI must compare the two editions`);
    process.exit(2);
  }
  console.error(
    `${TOOL}: SKIPPED -- no Python 3.6 or later found (tried ${tried}).\n` +
      `${TOOL}: impexp.mjs and impexp.py were NOT compared; CI compares them and fails without Python.`,
  );
  process.exit(0);
}

const editions = [
  { name: "impexp.mjs", cmd: process.execPath, pre: [NODE_EDITION] },
  { name: "impexp.py", cmd: python.cmd, pre: [...python.pre, PYTHON_EDITION] },
];

// One command through one edition. The two editions run each command at the
// same time, each in its own folder.
function run(edition, args, cwd) {
  const text = (chunks) => {
    const s = Buffer.concat(chunks).toString("latin1");
    return process.platform === "win32" ? s.replace(/\r\n/g, "\n") : s;
  };
  return new Promise((resolve, reject) => {
    const child = spawn(edition.cmd, [...edition.pre, ...args], { cwd, timeout: TIMEOUT_MS });
    const out = [];
    const err = [];
    child.stdout.on("data", (b) => out.push(b));
    child.stderr.on("data", (b) => err.push(b));
    child.on("error", (e) => reject(new Error(`${edition.name} ${args.join(" ")}: ${e.message}`)));
    child.on("close", (status, signal) => {
      if (status === null) reject(new Error(`${edition.name} ${args.join(" ")}: ended by ${signal}`));
      else resolve({ status, stdout: text(out), stderr: text(err) });
    });
  });
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

// The files that differ between the two folders, each named only the first
// time, so a difference is reported against the command that made it.
const reported = new Set();
function compareFolders(a, b) {
  const fa = files(a);
  const fb = files(b);
  const problems = [];
  const report = (p, what) => {
    if (!reported.has(p)) problems.push(`${p} ${what}`);
    reported.add(p);
  };
  for (const p of fa.keys()) if (!fb.has(p)) report(p, "written by impexp.mjs only");
  for (const p of fb.keys()) if (!fa.has(p)) report(p, "written by impexp.py only");
  for (const [p, bytes] of fa) {
    if (fb.has(p) && !bytes.equals(fb.get(p))) report(p, `differs (${bytes.length} and ${fb.get(p).length} bytes)`);
  }
  return problems;
}

const problems = [];

// The built-in tests: both pass, with the same names in the same order. The
// first line names a temporary folder, which differs.
const selfTestRuns = await Promise.all(editions.map((e) => run(e, ["--self-test"], ROOT)));
const selfTests = editions.map((e, i) => {
  const r = selfTestRuns[i];
  const lines = r.stdout.split("\n").filter((l) => !l.startsWith("Self-test  workdir:"));
  const names = lines.filter((l) => /^\s+\[(PASS|FAIL|SKIP)\] /.test(l)).map((l) => l.trim());
  if (r.status !== 0) problems.push(`${e.name} --self-test exited ${r.status}`);
  for (const n of names) if (!n.startsWith("[PASS] ")) problems.push(`${e.name} --self-test: ${n}`);
  if (names.length === 0) problems.push(`${e.name} --self-test ran no test`);
  return { names, text: `${lines.join("\n")}\n${r.stderr}` };
});
const selfTestDifference = firstDifference(selfTests[0].text, selfTests[1].text);
if (selfTestDifference) problems.push(`--self-test prints differently, ${selfTestDifference}`);

const scratch = mkdtempSync(path.join(tmpdir(), "impexp-parity-"));
try {
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
    const [a, b] = await Promise.all(editions.map((e, i) => run(e, c.args, dirs[i])));
    if (a.status !== c.exit || b.status !== c.exit) {
      problems.push(`${label}: exit ${a.status} from impexp.mjs and ${b.status} from impexp.py, not ${c.exit}`);
    }
    for (const stream of ["stdout", "stderr"]) {
      const d = firstDifference(a[stream], b[stream]);
      if (d) problems.push(`${label}: ${stream} differs, ${d}`);
    }
    for (const p of compareFolders(dirs[0], dirs[1])) problems.push(`${label}: ${p}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (problems.length) {
  console.error(`${TOOL}: impexp.mjs and impexp.py (Python ${python.version}) differ:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `${TOOL}: impexp.mjs and impexp.py (Python ${python.version}) pass the same ${selfTests[0].names.length} ` +
    `built-in tests, and ${COMMANDS.length} commands exit, print and write the same`,
);
