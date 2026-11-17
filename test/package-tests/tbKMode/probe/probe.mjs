// Builds small drivers with the tbKMode package and reads their import tables: what a driver that
// calls the package's code imports. No driver is loaded, installed, signed or started. See README.md
// beside this file.
//
//   node test/package-tests/tbKMode/probe/probe.mjs [--arch win32|win64] [--package-settings published|suggested] [<id> ...]
//
// For each scenario (src/<id>.twin) and architecture: the source tree is written to
// %TEMP%\tbkmode-probe\<pid>\<id>-<arch> (the contributed-tbKMode sample template's Settings with a
// driver's settings, the package embedded from the indexer's store, the scenario as its one
// module), packed with impexp, built with `tbbuild --build`, and the import table of the file it
// built is printed and judged by the verifier's checkDriver (../verifier/lib/imports.mjs): a
// scenario passes when the driver imports from no user-mode DLL, and each routine it imports from a
// kernel-mode file is exported by that file in every Windows version of the verifier's
// db/kernels.json (x64 only; an x86 driver's routines are not checked).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { choiceOption, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../../../../lib/cli.mjs";
import { packTree } from "../../../../scripts/lib/tb-project.mjs";
import { checkDriver } from "../verifier/lib/imports.mjs";

const USAGE = `usage: node test/package-tests/tbKMode/probe/probe.mjs [--arch win32|win64] [--package-settings published|suggested] [<id> ...] [-h, --help]

Builds a driver for each scenario <id> (src/<id>.twin; all of them when none is named) with the
tbKMode package, in both architectures unless --arch names one, and prints the DLLs and routines
each driver imports. No driver is loaded.

  --arch A              win32 or win64 (default: both)
  --package-settings S  published (default): the package's Settings as TWINSERV has them;
                        suggested: with the five settings of a driver added to them
                        (isNativeSubsystem, dllRuntimeBinding off, the three Disable ... Checks)
  -h, --help            print this text and exit

Exit codes:
  0  every driver imports only what the kernel-mode files export (x64: in every Windows
     version of the verifier's db/kernels.json)
  1  a driver imports from a user-mode DLL, or a routine some Windows version does not export
  2  the command line was refused, the package is not in the indexer's store, a build failed,
     or the probe could not run`;

// The settings of a driver project (docs/Reference/Contributed/tbKMode/index.md, "Building a
// driver"), with the three Disable ... Checks on as well, to show that the project's own do not
// reach the package's code.
const DRIVER_SETTINGS = {
  "project.isNativeSubsystem": true,
  "project.overrideEntryPoint": "DriverEntry",
  "project.dllRuntimeBinding": false,
  "project.relocationSymbolsStripped": "NO",
  "compiler.disableOverflowChecks": true,
  "compiler.disableArrayBoundsChecks": true,
  "compiler.disableFPUErrorChecks": true,
};

// What the package's own Settings would need for its code to be a driver's.
const SUGGESTED_PACKAGE_SETTINGS = {
  "project.isNativeSubsystem": true,
  "project.dllRuntimeBinding": false,
  "compiler.disableOverflowChecks": true,
  "compiler.disableArrayBoundsChecks": true,
  "compiler.disableFPUErrorChecks": true,
};

// The exports of the kernel-mode files, by Windows version, which the verifier's `kernels` command
// downloads and records.
const kernels = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "..", "verifier", "db", "kernels.json"), "utf8"),
);

exitOnCrash();
const usageError = { format: (err) => `${err.message}\n${USAGE}` };
const { values, positionals } = withUsageError(
  () =>
    parseCli(process.argv.slice(2), {
      options: {
        arch: { type: "string" },
        "package-settings": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
      positionals: { min: 0 },
      stopAt: ["help"],
    }),
  usageError,
);
if (values.help) printHelpAndExit(USAGE);

const here = import.meta.dirname;
const repo = path.resolve(here, "..", "..", "..", "..");
const scenarios = readdirSync(path.join(here, "src"))
  .filter((f) => f.endsWith(".twin"))
  .map((f) => f.slice(0, -5));
const { arches, packageSettings } = withUsageError(
  () => ({
    arches: values.arch
      ? [choiceOption(values.arch, { option: "--arch", choices: ["win32", "win64"] })]
      : ["win32", "win64"],
    packageSettings: choiceOption(values.packageSettings ?? "published", {
      option: "--package-settings",
      choices: ["published", "suggested"],
    }),
  }),
  usageError,
);
for (const id of positionals) {
  if (!scenarios.includes(id)) {
    console.error(`probe: no scenario ${id}; the scenarios are ${scenarios.join(", ")}\n${USAGE}`);
    process.exit(2);
  }
}
const ids = positionals.length ? positionals : scenarios;

const pkg = path.join(repo, "indexer", ".packages", "contributed", "tbKMode");
if (!existsSync(path.join(pkg, "sources"))) {
  console.error(`probe: no package sources in ${pkg}; run \`node indexer/twin-index.mjs sync\` first`);
  process.exit(2);
}
const template = path.join(repo, "test", "example-projects", "contributed-tbKMode", "Settings");

/** Writes and packs one scenario's project; returns the .twinproj. */
function stage(id, arch, work) {
  const tree = path.join(work, `${id}-${arch}`);
  rmSync(tree, { recursive: true, force: true });
  mkdirSync(path.join(tree, "Sources"), { recursive: true });
  const settings = { ...JSON.parse(readFileSync(template, "utf8")), ...DRIVER_SETTINGS };
  settings["project.buildPath"] = "${SourcePath}\\Build\\${ProjectName}_${Architecture}.sys";
  writeFileSync(path.join(tree, "Settings"), JSON.stringify(settings, null, "\t"), "utf8");
  const embedded = path.join(tree, "Packages", "tbKMode");
  mkdirSync(path.join(embedded, "Sources"), { recursive: true });
  const own = JSON.parse(readFileSync(path.join(pkg, "Settings"), "utf8"));
  const pkgSettings = packageSettings === "suggested" ? { ...own, ...SUGGESTED_PACKAGE_SETTINGS } : own;
  writeFileSync(path.join(embedded, "Settings"), JSON.stringify(pkgSettings, null, "\t"), "utf8");
  for (const f of readdirSync(path.join(pkg, "sources")))
    cpSync(path.join(pkg, "sources", f), path.join(embedded, "Sources", f), { recursive: true });
  const text = readFileSync(path.join(here, "src", `${id}.twin`), "utf8").replace(/\r?\n/g, "\r\n");
  writeFileSync(path.join(tree, "Sources", "Driver.twin"), text, "utf8");
  const project = path.join(work, `${id}-${arch}.twinproj`);
  packTree(project, tree);
  return project;
}

const work = path.join(tmpdir(), "tbkmode-probe", String(process.pid));
mkdirSync(work, { recursive: true });
const tbbuild = path.join(repo, "scripts", "tbbuild.mjs");
let foreign = false;
console.log(`package settings: ${packageSettings}`);
for (const arch of arches) {
  for (const id of ids) {
    const project = stage(id, arch, work);
    const build = spawnSync(process.execPath, [tbbuild, project, "--arch", arch, "--build", "--json"], {
      cwd: repo,
      encoding: "utf8",
    });
    let report = null;
    try {
      report = JSON.parse(build.stdout);
    } catch {
      // below
    }
    if (build.status !== 0 || !report?.built || !existsSync(report.built)) {
      console.error(`probe: ${id} ${arch} did not build (tbbuild exit ${build.status})`);
      console.error(`${build.stdout ?? ""}${build.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n"));
      rmSync(work, { recursive: true, force: true });
      process.exit(2);
    }
    const r = checkDriver(readFileSync(report.built), kernels);
    if (!r.pass) foreign = true;
    console.log(`${r.pass ? "PASS" : "FAIL"} ${id} ${arch}`);
    for (const i of r.imports) console.log(`  ${i.dll}: ${i.names.join(", ")}`);
    for (const p of r.problems) console.log(`  problem: ${p}`);
    for (const u of r.unchecked) console.log(`  not checked: ${u}`);
  }
}
rmSync(work, { recursive: true, force: true });
process.exitCode = foreign ? 1 : 0;
