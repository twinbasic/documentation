// Builds the xCalendar probe once, then runs the built exe once for each list of scenario ids,
// on a private desktop. What the package's xCalendar control does at run time, for the pages under
// docs/Reference/Contributed/xCalendar/: see README.md beside this file.
//
//   node test/package-probes/xCalendar/probe.mjs [--arch win32|win64] [--port N] [--shots DIR] [--form FILE] [--set K=JSON] <ids> [<ids> ...]
//
// 1. stage.mjs writes the source tree to %TEMP%\xcal-probe\tree-<port>.
// 2. tbrun builds it (its [RunAfterBuild] Sub only prints; no form opens in the IDE), with
//    --timeout 35. Not --exe: run-exe.mjs says why.
// 3. run-exe.mjs runs the exe tbrun built once per <ids>, each run ended after 33 s.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  choiceOption,
  exitOnCrash,
  numberOption,
  parseCli,
  printHelpAndExit,
  withUsageError,
} from "../../../lib/cli.mjs";
import { stageTree } from "./stage.mjs";

const USAGE = `usage: node test/package-probes/xCalendar/probe.mjs [--arch win32|win64] [--port N] [--shots DIR] [--form FILE] [--set K=JSON] <ids> [<ids> ...] [-h, --help]

Builds the xCalendar probe (src/) with tbrun, then runs the exe on a private desktop once for each
<ids>, a comma-separated list of the scenario ids listed at the top of src/Probe.twin.

  --arch A     win32 (default) or win64
  --port N     the IDE's DevTools port (default 9910, ports 9910 to 9940 are this probe's); it also
               keys the work folders
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
        port: { type: "string", default: "9910" },
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
const { arch, port } = withUsageError(
  () => ({
    arch: choiceOption(values.arch, { option: "--arch", choices: ["win32", "win64"] }),
    port: numberOption(values.port, { option: "--port", integer: true, min: 1024, max: 65535 }),
  }),
  usageError,
);

const here = import.meta.dirname;
const repo = path.resolve(here, "..", "..", "..");

// 1. The source tree.
let tree;
try {
  tree = await stageTree({ key: port, form: values.form, set: values.set });
} catch (e) {
  console.error(`probe: ${e.message}`);
  process.exit(2);
}

// 2. The build.
const tbrun = path.join(repo, "scripts", "tbrun.mjs");
const build = spawnSync(process.execPath, [tbrun, tree, "--arch", arch, "--port", String(port), "--timeout", "35"], {
  cwd: repo,
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(`probe: the build failed (tbrun exit ${build.status})`);
  console.error(`${build.stdout ?? ""}${build.stderr ?? ""}`.trim().split("\n").slice(-60).join("\n"));
  process.exit(2);
}
const outDir = path.join(tmpdir(), "tbrun", String(port), "out");
const exe = existsSync(outDir) && readdirSync(outDir).find((f) => f.toLowerCase().endsWith(`_${arch}.exe`));
if (!exe) {
  console.error(`probe: tbrun wrote no ${arch} exe to ${outDir}`);
  process.exit(2);
}

// 3. The runs.
let failed = false;
for (const ids of positionals) {
  console.log(`######## ${arch} run: ${ids}`);
  const args = [
    path.join(here, "run-exe.mjs"),
    path.join(outDir, exe),
    ids,
    "--timeout",
    "33",
    "--desktop",
    `xcalprobe-${port}`,
  ];
  if (values.shots) args.push("--shots", values.shots);
  const run = spawnSync(process.execPath, args, { cwd: repo, stdio: "inherit" });
  if (run.status === 2 || run.status === null) {
    console.error(`probe: run-exe failed (exit ${run.status})`);
    process.exit(2);
  }
  if (run.status !== 0) failed = true;
}
rmSync(tree, { recursive: true, force: true });
rmSync(path.join(tmpdir(), "tbrun", String(port)), { recursive: true, force: true });
process.exitCode = failed ? 1 : 0;
