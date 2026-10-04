#!/usr/bin/env node
// Run the IDE add-in scenarios: every lane listed in test/addin/lanes.mjs, each
// a node:test file run in a process of its own, with its own DevTools port,
// work folder and copy of the twinBASIC install.
//
//     node scripts/addin_test.mjs [options]
//
// The options, the exit codes and how a run works are in scripts/lib/lane-runner.mjs,
// which ide_test.mjs shares; addin-test.bat is the wrapper. Not a gate.
//
// What is specific to add-ins:
//
//   * THE ADD-INS' OWN SETTINGS. An add-in's SaveSetting writes under
//     HKCU\Software\VB and VBA Program Settings\<app>, the same key as any
//     installed copy of that add-in. A lane names the applications its
//     add-ins save settings for (`settings` in lanes.mjs); the runner puts
//     them back as found.
//   * Not %APPDATA%\twinBASIC\addins. The compiler loads the add-ins there too
//     (P6 in WIP.HelpAddin.md), but the IDE makes that folder's path from its
//     own environment, and every IDE a lane starts has an APPDATA inside the
//     lane's work folder (lib/tb-lane.mjs). So an add-in the user keeps there
//     loads into none of them, and the run has no need to refuse while one is
//     there.

import { exitOnCrash } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { runLanes } from "./lib/lane-runner.mjs";
import path from "node:path";

exitOnCrash();

const USAGE = `usage: node scripts/addin_test.mjs [--only REGEX] [--port N] [--jobs N] [--timeout S] [--ide <twinBASIC.exe>] [--show|--hide] [-h, --help]

Runs the IDE add-in scenarios: every lane in test/addin/lanes.mjs, each in a
process of its own with its own IDE copy, DevTools port and work folder.

  --only <regex>    only the lanes whose name matches
  --port <n>        base DevTools port (default 9560); the lanes get the
                    first free ports from n, passing over one another run
                    has claimed or something listens on
  --jobs <n>        lanes at once (default 2)
  --timeout <secs>  a lane still running after this long is ended (default 600)
  --ide <path>      the twinBASIC.exe to copy (default: $TB_IDE, else the
                    newest twinBASIC_IDE_BETA_* on the Desktop)
  --show, --hide    as tbbuild's
  -h, --help        print this text and exit

Exit codes:
  0  every lane passed, and the registry is as it was found
  1  a lane failed, or the run was interrupted
  2  the harness could not run: a refused command line, no IDE, no matching lane, a
     registry it could not record, or a crash after which the registry was put back
  3  the registry or a work folder was not put back, at the end of a run or after a
     crash; see the lines above`;

await runLanes({
  tool: "addin-test",
  suite: path.join(REPO_ROOT, "test", "addin"),
  workDir: "tbaddin",
  defaultPort: 9560,
  usage: USAGE,
  subject: "add-in",
});
