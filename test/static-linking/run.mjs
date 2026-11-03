// Runs the static linking claims probe in every mode and compares what it finds with expect.json:
// what the Static Linking page's experimental NOTE says links and what does not, checked again on a
// new BETA. See README.md beside this file for the claims.
//
//   node test/static-linking/run.mjs [--only <mode>] [--update] [--ide <twinBASIC.exe>]
//
// Each mode names what it runs and the architecture: links-<arch> is one tbrun --exe of links/, whose
// lines come from the IDE run and from the built exe; refused-<arch> is one tbbuild of refused/, read
// for its errors; sqlite-<arch> is one tbrun --exe of the install's own sample that links SQLite,
// which is not copied here: it is 3.6 MB of objects, and what matters is that the sample still works;
// detours-<arch> is one run of the DetoursLib package's test project, which links SlimDetours: no case
// of it runs unless it links, and each detours a function of Windows. A sample of that package would
// say nothing, since check_examples fails no sample for an error inside an embedded package.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { choiceOption, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../../lib/cli.mjs";
import { findIde } from "../../scripts/lib/tb-install.mjs";
import { packTree, unpackProject } from "../../scripts/lib/tb-project.mjs";

const ALL = ["links", "refused", "sqlite", "detours"].flatMap((kind) => [`${kind}-win32`, `${kind}-win64`]);

const USAGE = `usage: node test/static-linking/run.mjs [--only <mode>] [--update] [--ide <twinBASIC.exe>] [-h, --help]

Runs the static linking claims probe in each mode and compares what it finds with expect.json:
links-<arch> builds and runs code that needs only "stdlib", refused-<arch> reads the errors for code
that needs more of the C runtime or the C++ runtime, sqlite-<arch> builds and runs the install's
sample that links SQLite, and detours-<arch> runs the test project of DetoursLib, which links
SlimDetours.

  --only <mode>  run one mode: ${ALL.join(", ")}
  --update       write what the run found into expect.json, for the modes run; read the diff before
                 committing it, since each changed line is a changed claim
  --ide <path>   twinBASIC.exe, as for tbrun (default $TB_IDE, else the newest on the Desktop)
  -h, --help     print this text and exit

Exit codes:
  0  every mode found what expect.json says
  1  a value differs from expect.json, is missing, or is new
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
const work = mkdtempSync(path.join(tmpdir(), "static-linking-"));
process.on("exit", () => rmSync(work, { recursive: true, force: true }));

function tool(name, args) {
  const run = spawnSync(process.execPath, [path.join(repo, "scripts", name), ...args, ...ideArgs], {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: run.status, stdout: run.stdout ?? "", text: `${run.stdout ?? ""}${run.stderr ?? ""}` };
}

function cannotRun(run) {
  console.log(`exited ${run.status}`);
  console.log(run.text.trim().split("\n").slice(-30).join("\n"));
  return null;
}

// "key: value" lines, by side: the IDE run's before tbrun's "--- exe" line, the exe's after it.
function links(arch) {
  const run = tool("tbrun.mjs", [path.join(here, "links"), "--exe", "--arch", arch]);
  if (run.status !== 0) return cannotRun(run);
  const got = { ide: {}, exe: {} };
  let side = "ide";
  for (const line of run.text.split(/\r?\n/)) {
    if (/^--- exe/.test(line)) side = "exe";
    const m = /^([a-z]+): (.*)$/.exec(line);
    if (m) got[side][m[1]] = m[2].trimEnd();
  }
  return got;
}

// The errors of a compile, each as its code and message, sorted: the order is not the claim.
function refused(arch) {
  const file = path.join(work, `refused-${arch}.twinproj`);
  packTree(file, path.join(here, "refused"));
  const run = tool("tbbuild.mjs", [file, "--arch", arch, "--json"]);
  if (run.status !== 1) return cannotRun(run);
  const errors = JSON.parse(run.stdout)
    .diagnostics.filter((d) => String(d).startsWith("{ERROR}"))
    .map((d) => String(d).replace(/^.*?\]: /, ""));
  return { errors: [...new Set(errors)].sort() };
}

// The install's sample, unpacked with a [RunAfterBuild] Sub added, which tbrun needs to see that the
// build has ended. The sample reports through MsgBox, so what it did is in the boxes the exe opened:
// tbrun closes each one and says so with exit 6.
const BUILT = `Module Built

    [RunAfterBuild]
    Public Sub TellsTheRunTheBuildEnded()
        Debug.Cls
        Debug.Print "built"
    End Sub

End Module
`;

function sqlite(arch) {
  const projects = path.join(path.dirname(findIde(values.ide)), "projects");
  const folder = readdirSync(projects).find((f) => /Static Library Example \(SQLITE3\)/.test(f));
  if (!folder) throw new Error(`no SQLite sample under ${projects}`);
  const tree = path.join(work, `sqlite-${arch}`);
  mkdirSync(tree, { recursive: true });
  unpackProject(path.join(projects, folder, "projectName.twinproj"), tree);
  writeFileSync(path.join(tree, "Sources", "Built.twin"), BUILT);
  const run = tool("tbrun.mjs", [tree, "--exe", "--json", "--arch", arch]);
  if (run.status !== 6) return cannotRun(run);
  const { exeRun } = JSON.parse(run.stdout);
  return { exitCode: exeRun.exitCode, boxes: exeRun.dialogs.map((d) => d.text) };
}

// A defect of the package is its section's to document: here only that its cases ran, and did what
// its expect.json says.
function detours(arch) {
  const run = tool("package_tests.mjs", ["DetoursLib", "--arch", arch, "--json"]);
  if (run.status !== 0 && run.status !== 1) return cannotRun(run);
  const { cases } = JSON.parse(run.stdout).packages[0];
  return { ran: cases.length > 0, documented: cases.every((c) => c.verdict === "documented") };
}

const RUN = { links, refused, sqlite, detours };

const differences = [];
let failed = false;
for (const mode of only ? [only] : ALL) {
  process.stdout.write(`${mode}: `);
  const [kind, arch] = mode.split("-");
  const got = RUN[kind](arch);
  if (!got) {
    failed = true;
    continue;
  }
  const want = expected.modes[mode] ?? {};
  if (values.update) {
    expected.modes[mode] = got;
    console.log("recorded");
    continue;
  }
  const before = differences.length;
  const compare = (where, w, g) => {
    for (const k of new Set([...Object.keys(w ?? {}), ...Object.keys(g ?? {})])) {
      if (typeof (w?.[k] ?? g?.[k]) === "object") compare(`${where}${k}/`, w?.[k], g?.[k]);
      else if (w?.[k] !== g?.[k])
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
