// Runs the LLVM claims probe in every mode and compares what it prints with expect.json: what the
// documentation says code compiled with LLVM does, checked again on a new BETA. See README.md beside
// this file for the claims and the pages that state them.
//
//   node test/llvm/run.mjs [--only <mode>] [--update] [--ide <twinBASIC.exe>]
//
// Each mode is one tbrun --exe of src/: an IDE run, whose lines come before tbrun's "--- exe" line,
// and the built exe, whose lines come after it. gra64/ is built for 64-bit alone, and fails.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { choiceOption, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../../lib/cli.mjs";

const MODES = {
  win32: [],
  "win32-llvm": ["--llvm"],
  win64: ["--arch", "win64"],
  "win64-llvm": ["--arch", "win64", "--llvm"],
};
const ALL = [...Object.keys(MODES), "gra64"];

const USAGE = `usage: node test/llvm/run.mjs [--only <mode>] [--update] [--ide <twinBASIC.exe>] [-h, --help]

Runs the LLVM claims probe (src/) with tbrun --exe in each mode, and compares every line it prints,
in the IDE run and in the built exe, with expect.json. The modes are win32 and win64, each with LLVM
off and on for the whole project (win32-llvm, win64-llvm), and gra64, a 64-bit build of gra64/ that
must fail with a codegen error.

  --only <mode>  run one mode: ${ALL.join(", ")}
  --update       write what the run printed into expect.json, for the modes run; read the diff
                 before committing it, since each changed line is a changed claim
  --ide <path>   twinBASIC.exe, as for tbrun (default $TB_IDE, else the newest on the Desktop)
  -h, --help     print this text and exit

Exit codes:
  0  every mode printed what expect.json says
  1  a line differs from expect.json, is missing, or is new
  2  the command line was refused, or a mode could not be run`;

exitOnCrash();
const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        only: { type: "string" },
        update: { type: "boolean" },
        ide: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);
const only =
  values.only && withUsageError(() => choiceOption(values.only, { option: "--only", choices: ALL }), usageError);

const here = import.meta.dirname;
const repo = path.resolve(here, "..", "..");
const expectPath = path.join(here, "expect.json");
const expected = JSON.parse(readFileSync(expectPath, "utf8"));
const ideArgs = values.ide ? ["--ide", values.ide] : [];

function tbrun(tree, args) {
  const run = spawnSync(process.execPath, [path.join(repo, "scripts", "tbrun.mjs"), tree, ...args, ...ideArgs], {
    cwd: repo,
    encoding: "utf8",
  });
  return { status: run.status, text: `${run.stdout ?? ""}${run.stderr ?? ""}` };
}

// An expected value written "/.../" is a regular expression, for a value that changes from run to
// run (the IDE run's for-step-llvm); any other is compared exactly.
const isPattern = (w) => typeof w === "string" && w.length > 1 && w.startsWith("/") && w.endsWith("/");
const matches = (w, g) => (isPattern(w) ? typeof g === "string" && new RegExp(w.slice(1, -1)).test(g) : w === g);

// What --update writes: the run's values, except that a pattern the new value still matches stays.
function merge(w, g) {
  if (typeof g !== "object" || g === null) return isPattern(w) && matches(w, g) ? w : g;
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, merge(w?.[k], v)]));
}

// "key: value" lines, by side: the IDE run's before tbrun's "--- exe" line, the exe's after it.
function sides(text) {
  const got = { ide: {}, exe: {} };
  let side = "ide";
  for (const line of text.split(/\r?\n/)) {
    if (/^--- exe/.test(line)) side = "exe";
    const m = /^([a-z0-9-]+): (.*)$/.exec(line);
    if (m) got[side][m[1]] = m[2].trimEnd();
  }
  return got;
}

const differences = [];
let failed = false;
for (const mode of only ? [only] : ALL) {
  process.stdout.write(`${mode}: `);
  let got;
  if (mode === "gra64") {
    const run = tbrun(path.join(here, "gra64"), ["--arch", "win64"]);
    got = { codegenError: /\[LINKER\] compilation \(codegen\) error detected in 'Probe\.Where'/.test(run.text) };
  } else {
    const run = tbrun(path.join(here, "src"), ["--exe", ...MODES[mode]]);
    got = sides(run.text);
    if (run.status !== 0 || !Object.keys(got.ide).length || !Object.keys(got.exe).length) {
      console.log(`tbrun exited ${run.status}`);
      console.log(run.text.trim().split("\n").slice(-30).join("\n"));
      failed = true;
      continue;
    }
  }
  const want = expected.modes[mode] ?? {};
  if (values.update) {
    expected.modes[mode] = merge(want, got);
    console.log("recorded");
    continue;
  }
  const before = differences.length;
  const compare = (where, w, g) => {
    for (const k of new Set([...Object.keys(w ?? {}), ...Object.keys(g ?? {})])) {
      if (typeof (w?.[k] ?? g?.[k]) === "object") compare(`${where}${k}/`, w?.[k], g?.[k]);
      else if (!matches(w?.[k], g?.[k]))
        differences.push(`${mode} ${where}${k}: expected ${JSON.stringify(w?.[k])}, got ${JSON.stringify(g?.[k])}`);
    }
  };
  compare("", want, got);
  console.log(differences.length === before ? "as expected" : `${differences.length - before} difference(s)`);
}

if (values.update) {
  writeFileSync(expectPath, `${JSON.stringify(expected, null, 2)}\n`);
  console.log(`wrote ${path.relative(repo, expectPath)}`);
}
for (const d of differences) console.log(`  ${d}`);
process.exit(failed ? 2 : differences.length ? 1 : 0);
