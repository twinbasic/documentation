#!/usr/bin/env node
// Open an IDE on your own desktop with the help add-in (add-in/) loaded, to try
// it by hand. The IDE is set up as a lane of addin-test sets one up
// (lib/tb-lane.mjs), and the tool waits until it is closed.
//
//     node scripts/try_help_addin.mjs [options]
//
// try-help-addin.bat is the wrapper. Not a gate, for the reasons addin-test.bat
// is not one: it needs Windows and a twinBASIC install.
//
// It keeps the rules addin-test keeps, so that trying the add-in changes
// nothing the user owns:
//
//   * The add-in is built into a copy of the install made in the work folder,
//     never into the install's addins\ or %APPDATA%\twinBASIC\addins\, and the
//     IDE gets an APPDATA of its own there, so none of the user's add-ins loads.
//   * The IDE's registry entries and the add-in's SaveSetting key (tbDocsHelp)
//     are recorded first and put back once the IDE is closed.
//   * The test switch is on, as in every IDE the harness starts, so Open in
//     browser prints `open <url>` to the DEBUG CONSOLE and starts nothing. The
//     pane's pages come from the built site, docs/_site, served on localhost.
//
// Unlike the lanes, the IDE is always on the user's desktop: there is nothing
// to try on a private one.

import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStaticHandler } from "../builder/static-files.mjs";
import { die, exitOnCrash, numberOption, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { serveLoopback } from "../test/addin/pages.mjs";
import { removeTree } from "./lib/tb-ide-copy.mjs";
import { shutdownIde } from "./lib/tb-ide.mjs";
import { findIde } from "./lib/tb-install.mjs";
import { Lane } from "./lib/tb-lane.mjs";
import { alive, finishTidy, restoreKeys, settingsKey, snapshotKeys, startTidy } from "./lib/tb-registry.mjs";

const SETTINGS = "tbDocsHelp";
const ADDIN = path.join(REPO_ROOT, "add-in");
const HOST = path.join(REPO_ROOT, "test", "addin", "helphost");
const SITE = path.join(REPO_ROOT, "docs", "_site");

const USAGE = `usage: node scripts/try_help_addin.mjs [--project <dir>] [--port N] [--ide <twinBASIC.exe>] [-h, --help]

Opens an IDE on your desktop with the help add-in in add-in/ built and loaded,
and waits until you close it. The add-in goes into a copy of the install in the
temp folder, the IDE gets an APPDATA of its own, and the IDE's registry entries
and the add-in's saved settings are put back afterwards. Open in browser prints
the URL to the DEBUG CONSOLE; the pane's pages come from docs/_site, so run
build.bat first.

  --project <dir>  the exported project to open (default test/addin/helphost,
                   the help lane's host); it is opened as a staged copy, so
                   edits made in the IDE are not kept
  --port <n>       the IDE's DevTools port (default 9590)
  --ide <path>     the twinBASIC.exe to copy (default: $TB_IDE, else the
                   newest twinBASIC_IDE_BETA_* on the Desktop)
  -h, --help       print this text and exit

Exit codes:
  0  the IDE was closed, and the registry is as it was found
  1  the add-in did not build, or the project does not compile
  2  the tool could not run: a refused command line, no IDE, no built site, a
     registry it could not record, or a crash
  3  the registry or the work folder was not put back; see the lines above`;

const { values } = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: {
      project: { type: "string" },
      port: { type: "string" },
      ide: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    stopAt: ["help"],
  }),
);
if (values.help) printHelpAndExit(USAGE);
const port = withUsageError(() =>
  numberOption(values.port ?? "9590", { option: "--port", integer: true, min: 1, max: 65535 }),
);
const project = path.resolve(values.project ?? HOST);

const ide = findIde(values.ide || undefined);
if (!ide || !existsSync(ide)) {
  die(
    2,
    "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
      "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
  );
}
if (!existsSync(path.join(project, "Settings"))) die(2, `${project} is not an exported project: it has no Settings`);
if (!existsSync(path.join(SITE, "tB", "symbols.json"))) die(2, `no built site in ${SITE}: run build.bat first`);

const work = path.join(tmpdir(), "tbhelp-try", String(port));
try {
  removeTree(work);
} catch (e) {
  die(2, `${work} could not be emptied (${e.code}): is an IDE from an earlier run still open?`);
}
mkdirSync(work, { recursive: true });
const tidy = startTidy({ prefixes: [work] });
if (!tidy) die(2, "could not record the registry, so it could not be put back afterwards");
const settingsBefore = snapshotKeys([settingsKey(SETTINGS)]);

const lane = new Lane({ name: "try", port, work, ide, show: true });
let server = null;
let stopping = false;

// Puts everything back; returns the problems, as lines.
async function putBack() {
  const problems = [];
  try {
    await lane.close();
  } catch (e) {
    console.error(e.message);
  }
  server?.close();
  if (!finishTidy(tidy)) problems.push("the IDE's registry entries could not be put back (see the warning above)");
  try {
    restoreKeys(settingsBefore);
  } catch (e) {
    problems.push(`the ${SETTINGS} settings could not be put back: ${e.message}`);
  }
  try {
    removeTree(work);
  } catch (e) {
    problems.push(`${work} could not be removed (${e.code})`);
  }
  return problems;
}

exitOnCrash(() => {
  console.error("putting the registry back after the crash");
  shutdownIde(lane.run);
  finishTidy(tidy);
  restoreKeys(settingsBefore);
});
// Ctrl+C ends the wait, and the IDE is closed and everything put back as on a
// normal close. A second Ctrl+C is Node's own.
process.once("SIGINT", () => {
  stopping = true;
  console.log("closing the IDE");
});

// The exit code for an error from one step: 1 when it is the add-in's or the
// project's own fault, 2 when the tool failed.
let failed = 0;
let step = "the site";
try {
  const files = createStaticHandler(SITE);
  server = await serveLoopback((req, res) => files(req, res));
  const origin = `http://localhost:${server.port}`;
  step = "build";
  console.log(`building ${path.relative(REPO_ROOT, ADDIN)} into a copy of ${ide}`);
  await lane.addAddin(ADDIN);
  if (!stopping) {
    step = "open";
    console.log(`opening ${project}`);
    await lane.open(project, { env: { TB_DOCS_HELP_SITE: origin } });
    step = "wait";
    const pid = lane.run.pid;
    console.log(`the IDE is open (pid ${pid}), its pages from ${origin}; close it, or press Ctrl+C here, to end`);
    while (!stopping && alive(pid)) await new Promise((r) => setTimeout(r, 1000));
  }
} catch (e) {
  console.error(e.message);
  // buildAddin's exitCode is tbbuild's: 1 compile errors, 4 the compiler
  // crashed. Lane.open says "does not compile" for a project with errors.
  const own =
    (step === "build" && (e.exitCode === 1 || e.exitCode === 4)) ||
    (step === "open" && / does not compile\n/.test(e.message));
  failed = own ? 1 : 2;
}
const problems = await putBack();
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(3);
}
console.log("the registry and the add-in's settings are as they were found");
process.exit(failed);
