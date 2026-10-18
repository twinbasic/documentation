// Builds tbbroker (scripts/broker/, WIP.Broker.md) and installs it where every client looks for it:
// %LOCALAPPDATA%\tbbroker\tbbroker.exe. That is outside every checkout, so the clients of each
// worktree and of launcher-re find the same one, and the broker that runs never holds a file of a
// worktree open.
//
//     node scripts/tbbroker.mjs install                 build it with tbbuild, then install it
//     node scripts/tbbroker.mjs install --exe <file>    install an exe built already
//
// A broker that runs keeps running the exe it was started from: Windows lets a running exe be
// renamed but not replaced, so that one is renamed to tbbroker.exe.old-<time> first, and removed
// by a later install once nothing runs it. `tbbroker stop` ends the old broker; every lease it
// holds is void then, so do it between runs.
//
// Exit codes: 0 installed; 1 the build failed; 2 a refused command line, an --exe that is not a
// file, or a crash.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { die, exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import { DEFAULT_PIPE } from "./lib/tb-broker.mjs";

exitOnCrash();

const HELP = `usage: node scripts/tbbroker.mjs install [--exe <file>] [-h, --help]

Builds scripts/broker/tbbroker.twinproj with tbbuild (which needs a twinBASIC
install) and installs the exe as %LOCALAPPDATA%\\tbbroker\\tbbroker.exe, where
every client of the broker looks for it.

  --exe <file>   install this built exe instead of building one
  -h, --help     print this text and exit

Then, from a shell:
  %LOCALAPPDATA%\\tbbroker\\tbbroker.exe status   what the broker holds
  %LOCALAPPDATA%\\tbbroker\\tbbroker.exe stop     end it (its leases are void)

Exit codes:
  0  installed
  1  the build failed
  2  a refused command line, an --exe that is not a file, or a crash`;

const cli = withUsageError(() =>
  parseCli(process.argv.slice(2), {
    options: { exe: { type: "string" }, help: { type: "boolean", short: "h" } },
    positionals: { min: 0, max: 1 },
    stopAt: ["help"],
  }),
);
if (cli.stopped === "help") printHelpAndExit(HELP);
if (cli.positionals[0] !== "install") printHelpAndExit(HELP, { stream: "stderr", exitCode: 2 });

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOME = path.join(process.env.LOCALAPPDATA ?? "", "tbbroker");
const TARGET = path.join(HOME, "tbbroker.exe");

let built = cli.values.exe;
if (built) {
  if (!existsSync(built) || !statSync(built).isFile()) die(2, `tbbroker: --exe ${built} is not a file`);
} else {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, "scripts", "tbbuild.mjs"), path.join(ROOT, "scripts", "broker", "tbbroker.twinproj"), "--build"],
    // The one build that cannot lease from the broker, since it may be what is being built:
    // TB_BROKER=off gives the IDE a desktop of its own, as every launch had before.
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, TB_BROKER: "off" } },
  );
  process.stdout.write(r.stdout ?? "");
  const m = /^built: (.+)$/m.exec(r.stdout ?? "");
  if (r.status !== 0 || !m) die(1, "tbbroker: the build failed");
  built = m[1].trim();
}

mkdirSync(HOME, { recursive: true });
// What earlier installs set aside, once nothing runs it any more.
for (const name of readdirSync(HOME)) {
  if (!name.startsWith("tbbroker.exe.old-")) continue;
  try {
    rmSync(path.join(HOME, name));
  } catch {
    // a broker still runs it
  }
}
try {
  copyFileSync(built, TARGET);
} catch (e) {
  if (e.code !== "EBUSY" && e.code !== "EPERM") throw e;
  // A broker runs this exe: set it aside, which Windows allows, and put the new one in its place.
  renameSync(TARGET, `${TARGET}.old-${Date.now()}`);
  copyFileSync(built, TARGET);
  console.log(
    `a broker runs the exe installed before; it goes on running it until it is stopped (${TARGET} stop, ` +
      `which voids every lease it holds)`,
  );
}
console.log(`installed: ${TARGET}`);
console.log(`its default pipe: ${DEFAULT_PIPE}`);
