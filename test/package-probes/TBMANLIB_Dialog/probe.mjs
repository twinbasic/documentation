// Builds the TBMANLIB_Dialog probe once, then runs the built exe once for each list of scenario
// ids, on a private desktop. What the package's dialogs do at run time, for the pages under
// docs/Reference/Contributed/TBMANLIB_Dialog/: see README.md beside this file.
//
//   node test/package-probes/TBMANLIB_Dialog/probe.mjs [--arch win32|win64] [--port N] <ids> [<ids> ...]
//
// 1. The source tree is written to %TEMP%\dialog-probe\tree-<port>: the contributed template's
//    Settings (test/example-projects/contributed-TBMANLIB_Dialog), the package embedded under
//    Packages/TBMANLIB_Dialog as check_examples embeds it, from the indexer's store
//    (indexer/.packages/contributed/TBMANLIB_Dialog, written by `twin-index sync`), and src/.
// 2. tbrun builds it (its [RunAfterBuild] Sub only prints; no dialog opens in the IDE), with
//    --timeout 35. Not --exe: run-exe.mjs says why.
// 3. run-exe.mjs runs the exe tbrun built once per <ids>, each run ended after 25 s.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const USAGE = `usage: node test/package-probes/TBMANLIB_Dialog/probe.mjs [--arch win32|win64] [--port N] <ids> [<ids> ...] [-h, --help]

Builds the TBMANLIB_Dialog probe (src/) with tbrun, then runs the exe on a private desktop once
for each <ids>, a comma-separated list of the scenario ids listed at the top of src/Probe.twin.

  --arch A    win32 (default) or win64
  --port N    the IDE's DevTools port (default 9720); it also keys the work folders
  -h, --help  print this text and exit

Exit codes:
  0  the probe was built, and every run of the exe ended normally
  1  a run of the exe crashed, exited with another code, or was still running at its timeout
  2  the command line was refused, the package is not in the indexer's store, the build failed,
     or the probe could not run`;

exitOnCrash();
const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        arch: { type: "string", default: "win32" },
        port: { type: "string", default: "9720" },
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
const pkg = path.join(repo, "indexer", ".packages", "contributed", "TBMANLIB_Dialog");
if (!existsSync(path.join(pkg, "sources"))) {
  console.error(`probe: no package sources in ${pkg}; run \`node indexer/twin-index.mjs sync\` first`);
  process.exit(2);
}

// 1. The source tree, with CRLF as the IDE writes it.
const tree = path.join(tmpdir(), "dialog-probe", `tree-${port}`);
rmSync(tree, { recursive: true, force: true });
mkdirSync(path.join(tree, "Sources"), { recursive: true });
cpSync(
  path.join(repo, "test", "example-projects", "contributed-TBMANLIB_Dialog", "Settings"),
  path.join(tree, "Settings"),
);
const embedded = path.join(tree, "Packages", "TBMANLIB_Dialog");
mkdirSync(path.join(embedded, "Sources"), { recursive: true });
cpSync(path.join(pkg, "Settings"), path.join(embedded, "Settings"));
for (const f of readdirSync(path.join(pkg, "sources")))
  cpSync(path.join(pkg, "sources", f), path.join(embedded, "Sources", f));
for (const f of readdirSync(path.join(here, "src"))) {
  const text = readFileSync(path.join(here, "src", f), "utf8").replace(/\r?\n/g, "\r\n");
  writeFileSync(path.join(tree, "Sources", f), text, "utf8");
}

// 2. The build.
const tbrun = path.join(repo, "scripts", "tbrun.mjs");
const build = spawnSync(process.execPath, [tbrun, tree, "--arch", arch, "--port", String(port), "--timeout", "35"], {
  cwd: repo,
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(`probe: the build failed (tbrun exit ${build.status})`);
  console.error(`${build.stdout ?? ""}${build.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n"));
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
  const run = spawnSync(
    process.execPath,
    [path.join(here, "run-exe.mjs"), path.join(outDir, exe), ids, "--timeout", "25", "--desktop", `dlgprobe-${port}`],
    { cwd: repo, stdio: "inherit" },
  );
  if (run.status === 2 || run.status === null) {
    console.error(`probe: run-exe failed (exit ${run.status})`);
    process.exit(2);
  }
  if (run.status !== 0) failed = true;
}
rmSync(tree, { recursive: true, force: true });
rmSync(path.join(tmpdir(), "tbrun", String(port)), { recursive: true, force: true });
process.exitCode = failed ? 1 : 0;
