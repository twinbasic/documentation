// Builds the xCalendar probe once, then runs the built exe once for each list of scenario ids,
// on a private desktop. What the package's xCalendar control does at run time, for the pages under
// docs/Reference/Contributed/xCalendar/: see README.md beside this file.
//
//   node test/package-tests/xCalendar/probe/probe.mjs [--arch win32|win64] [--shots DIR] [--form FILE] [--set K=JSON] <ids> [<ids> ...]
//
// 1. stage.mjs writes the source tree to %TEMP%\xcal-probe\tree-<pid>.
// 2. tbrun builds it (its [RunAfterBuild] Sub only prints; no form opens in the IDE), with
//    --timeout 35, and names the exe in its --json report. Not --exe: run-exe.mjs says why.
// 3. run-exe.mjs runs the exe tbrun built once per <ids>, each run ended after 33 s, each on a
//    private desktop it takes from tbbroker.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { choiceOption, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../../../../lib/cli.mjs";
import { stageTree } from "./stage.mjs";

const USAGE = `usage: node test/package-tests/xCalendar/probe/probe.mjs [--arch win32|win64] [--shots DIR] [--form FILE] [--set K=JSON] <ids> [<ids> ...] [-h, --help]

Builds the xCalendar probe (src/) with tbrun, then runs the exe on a private desktop once for each
<ids>, a comma-separated list of the scenario ids listed at the top of src/Probe.twin.

  --arch A     win32 (default) or win64
  --shots DIR  write the pictures scenario 15 asks for into DIR
  --form FILE  build with this .tbform file in place of src/Form1.tbform
  --set K=JSON add the key K, with the JSON value, to the control's entry in Form1.tbform (the
               designer data of xCalendar1); repeatable, e.g. --set FirstDay=1 --set ShowTitle=false
  -h, --help   print this text and exit

Exit codes:
  0  the probe was built, and every run of the exe ended normally
  1  a run of the exe crashed, exited with another code, opened a box, or was still running at its timeout
  2  the command line was refused, the package could not be fetched, the build failed, or the probe could not run`;

exitOnCrash();
const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        arch: { type: "string", default: "win32" },
        shots: { type: "string" },
        form: { type: "string" },
        set: { type: "string", multiple: true },
        help: { type: "boolean", short: "h" },
      },
      positionals: { min: 1 },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);
const arch = withUsageError(
  () => choiceOption(values.arch, { option: "--arch", choices: ["win32", "win64"] }),
  usageError,
);

const here = import.meta.dirname;
const repo = path.resolve(here, "..", "..", "..", "..");

// 1. The source tree.
let tree;
try {
  tree = await stageTree({ key: process.pid, form: values.form, set: values.set });
} catch (e) {
  console.error(`probe: ${e.message}`);
  process.exit(2);
}

// 2. The build.
const tbrun = path.join(repo, "scripts", "tbrun.mjs");
const build = spawnSync(process.execPath, [tbrun, tree, "--arch", arch, "--timeout", "35", "--json"], {
  cwd: repo,
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(`probe: the build failed (tbrun exit ${build.status})`);
  console.error(`${build.stdout ?? ""}${build.stderr ?? ""}`.trim().split("\n").slice(-60).join("\n"));
  process.exit(2);
}
// tbrun's work folder is its slot's, named in its report through the exe it built.
let exe = null;
try {
  exe = JSON.parse(build.stdout).exe;
} catch {
  // below
}
if (!exe || !exe.toLowerCase().endsWith(`_${arch}.exe`) || !existsSync(exe)) {
  console.error(`probe: tbrun built no ${arch} exe (it reported ${exe})`);
  process.exit(2);
}
const tbrunWork = path.dirname(path.dirname(exe));

// 3. The runs.
let failed = false;
for (const ids of positionals) {
  console.log(`######## ${arch} run: ${ids}`);
  const args = [path.join(here, "run-exe.mjs"), exe, ids, "--timeout", "33"];
  if (values.shots) args.push("--shots", values.shots);
  const run = spawnSync(process.execPath, args, { cwd: repo, stdio: "inherit" });
  if (run.status === 2 || run.status === null) {
    console.error(`probe: run-exe failed (exit ${run.status})`);
    process.exit(2);
  }
  if (run.status !== 0) failed = true;
}
rmSync(tree, { recursive: true, force: true });
rmSync(tbrunWork, { recursive: true, force: true });
process.exitCode = failed ? 1 : 0;
