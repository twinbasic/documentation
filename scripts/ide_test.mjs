#!/usr/bin/env node
// Run the IDE scenarios: every lane listed in test/ide/lanes.mjs, each a
// node:test file run in a process of its own, with its own DevTools port, work
// folder and copy of the twinBASIC install. These operate the IDE itself (the
// debugger, Export Project, the Packages dialog); add-ins are addin_test.mjs's.
//
//     node scripts/ide_test.mjs [options]
//
// The options, the exit codes and how a run works are in scripts/lib/lane-runner.mjs,
// which addin_test.mjs shares; ide-test.bat is the wrapper. Not a gate. The base
// port differs from addin_test.mjs's (9660 against 9560) so the two never collide.

import path from "node:path";
import { exitOnCrash } from "../lib/cli.mjs";
import { REPO_ROOT } from "../lib/repo-paths.mjs";
import { runLanes } from "./lib/lane-runner.mjs";

exitOnCrash();

const USAGE = `usage: node scripts/ide_test.mjs [--only REGEX] [--port N] [--jobs N] [--timeout S] [--ide <twinBASIC.exe>] [--show|--hide] [-h, --help]

Runs the IDE scenarios: every lane in test/ide/lanes.mjs, each in a process of
its own with its own IDE copy, DevTools port and work folder.

  --only <regex>    only the lanes whose name matches
  --port <n>        base DevTools port (default 9660); the lanes get the
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
  tool: "ide-test",
  suite: path.join(REPO_ROOT, "test", "ide"),
  workDir: "tbide",
  defaultPort: 9660,
  usage: USAGE,
  subject: "IDE",
});
