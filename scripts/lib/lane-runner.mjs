// The lane runner behind scripts/addin_test.mjs (addin-test.bat) and
// scripts/ide_test.mjs (ide-test.bat): every lane listed in a suite's lanes.mjs,
// each a node:test file run in a process of its own, with its own DevTools port,
// work folder and copy of the twinBASIC install.
//
// The two tools differ only in what they are given: the suite folder, their
// name, the work folder under the temp directory, the default base port, and
// the usage text. Everything else, the options included, is here, so the two
// cannot drift apart. The entry scripts call exitOnCrash() before calling
// runLanes().
//
// Options, as each tool's usage text states them:
//
//       --only <regex>    only the lanes whose name matches
//       --port <n>        base DevTools port; the lanes get the first free ones
//                         from n (lib/tb-ports.mjs)
//       --jobs <n>        lanes at once (default 2)
//       --timeout <secs>  a lane still running after this long is ended (default 600)
//       --ide <path>      the twinBASIC.exe to copy (default: $TB_IDE, else the
//                         newest %USERPROFILE%/Desktop/twinBASIC_IDE_BETA_*)
//       --show / --hide   as tbbuild's
//
// Exit: 0 every lane passed and the registry is as it was found, 1 a lane
// failed or the run was interrupted, 2 the harness could not run (a refused
// command line included) or crashed, 3 the registry or the work folders could
// not be put back (the registry is what to repair, so 3 wins over 1).
//
// Not a gate, for the reasons examples.bat is not one: it needs Windows and a
// twinBASIC install.
//
// ---------------------------------------------------------------- how
//
// A lane is one scenario file. The file operates the IDE in its lane's copy of
// the install, one IDE at a time, through scripts/lib/tb-lane.mjs; this module
// only hands each file its lane (LANE_ENV), runs the files a few at a time, and
// owns what they share:
//
//   * THE REGISTRY. One process owns it per run (lib/tb-registry.mjs). This
//     one records it before the first lane starts, and the lanes inherit
//     TB_REGISTRY_OWNER and leave it alone. Once every lane has ended it
//     puts back the IDE's lists, the .twinproj association and the build
//     targets the IDE remembers, then checks that nothing under the lanes'
//     folders is left.
//   * THE LANES' SETTINGS. SaveSetting writes under HKCU\Software\VB and VBA
//     Program Settings\<app>, the same key as any installed copy of the
//     program that saves it. A lane names the applications its program saves
//     settings for (`settings` in lanes.mjs); their keys are recorded before
//     the first lane starts, deleted before each lane that names them, so that
//     its program starts from its defaults, and put back at the end. Lanes
//     that name the same application never run at once.
//
// Ctrl+C ends the lanes and still puts the registry back.
//
// What only the add-in tool has to say about its lanes (the add-ins' own
// settings, %APPDATA%\twinBASIC\addins) is with its lanes, in
// test/addin/lanes.mjs and scripts/lib/tb-lane.mjs: every IDE a lane starts has
// an APPDATA inside the lane's work folder, so an add-in the user keeps in the
// real one (P6 in WIP.HelpAddin.md) loads into none of them, and the run has no
// need to refuse while one is there.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  die,
  numberOption,
  parseCli,
  printHelpAndExit,
  refuseTogether,
  regexOption,
  withUsageError,
} from "../../lib/cli.mjs";
import { REPO_ROOT } from "../../lib/repo-paths.mjs";
import { removeTree } from "./tb-ide-copy.mjs";
import { wantShow } from "./tb-ide.mjs";
import { buildNumber, findIde } from "./tb-install.mjs";
import { LANE_ENV } from "./tb-lane.mjs";
import { claimPorts } from "./tb-ports.mjs";
import {
  alive,
  deleteSettings,
  finishTidy,
  ideLists,
  norm,
  restoreKeys,
  SETTINGS_ROOT,
  settingsKey,
  snapshotKeys,
  startTidy,
  subkeyNames,
  sweepArchitectureMemory,
} from "./tb-registry.mjs";

/**
 * Parse the command line, run the suite's lanes and exit with the run's code.
 * Never returns.
 *
 * @param {object} o
 * @param {string} o.tool     the tool's name in messages ("addin-test")
 * @param {string} o.suite    the suite folder, holding lanes.mjs and the scenario files
 * @param {string} o.workDir  the folder under the temp directory the lanes' work folders go in
 * @param {number} o.defaultPort  the base DevTools port when --port is not given
 * @param {string} o.usage    the tool's whole usage text, printed by --help and on a refused command line
 * @param {string} o.subject  what a lane's scenario operates, as a noun in messages ("add-in")
 */
// Ports as a short list: runs of consecutive ones as a range, "9560-9563, 9565".
function portList(ports) {
  const runs = [];
  for (const p of ports) {
    const last = runs.at(-1);
    if (last && p === last[1] + 1) last[1] = p;
    else runs.push([p, p]);
  }
  return runs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");
}

export async function runLanes({ tool, suite: SUITE, workDir, defaultPort, usage: USAGE, subject }) {
  const { values } = withUsageError(() =>
    parseCli(process.argv.slice(2), {
      options: {
        only: { type: "string" },
        port: { type: "string" },
        jobs: { type: "string" },
        timeout: { type: "string" },
        ide: { type: "string" },
        show: { type: "boolean", default: false },
        hide: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
      stopAt: ["help"],
    }),
  );
  if (values.help) printHelpAndExit(USAGE);
  // setTimeout takes at most 2147483647 ms, so a lane's timeout is at most 2147483 s.
  const { only, basePort, jobs, laneTimeout } = withUsageError(() => {
    refuseTogether(values, ["show", "hide"]);
    return {
      only: values.only ? regexOption(values.only, { option: "--only" }) : null,
      basePort: numberOption(values.port ?? String(defaultPort), {
        option: "--port",
        integer: true,
        min: 1,
        max: 65535,
      }),
      jobs: numberOption(values.jobs ?? "2", { option: "--jobs", integer: true, min: 1 }),
      laneTimeout: numberOption(values.timeout ?? "600", { option: "--timeout", above: 0, max: 2147483 }) * 1000,
    };
  });
  const show = wantShow({ show: values.show, hide: values.hide });

  // ---------------------------------------------------------------- refusals

  const ide = findIde(values.ide || undefined);
  if (!ide || !existsSync(ide)) {
    die(
      2,
      "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
        "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop",
    );
  }

  const manifest = (await import(pathToFileURL(path.join(SUITE, "lanes.mjs")).href)).default;
  const lanes = manifest
    .map((l) => ({ ...l, name: l.name ?? path.basename(l.file).replace(/\.test\.mjs$/, "") }))
    .filter((l) => !only || only.test(l.name))
    .map((l) => ({ ...l, settings: l.settings ?? [] }));
  if (!lanes.length) die(2, `no lane in ${path.join(SUITE, "lanes.mjs")} matches ${only}`);
  for (const l of lanes) {
    if (!existsSync(path.join(SUITE, l.file))) die(2, `lane ${l.name}: no file ${path.join(SUITE, l.file)}`);
    try {
      l.settings.forEach(settingsKey);
    } catch (e) {
      die(2, `lane ${l.name}: ${e.message}`);
    }
  }

  // Each lane gets a port of its own, the first free ones from the base: a port
  // another run has claimed, or that something listens on, is passed over.
  let ports;
  try {
    ports = await claimPorts(lanes.length, { from: basePort });
  } catch (e) {
    die(2, e.message);
  }
  lanes.forEach((l, i) => {
    l.port = ports[i];
    l.work = path.join(tmpdir(), workDir, String(ports[i]));
  });

  // ---------------------------------------------------------------- the registry

  // startTidy leaves the registry to a live owner that is not this process, and
  // such an owner would tidy only its own folders, not the lanes'.
  const owner = Number(process.env.TB_REGISTRY_OWNER);
  if (owner && owner !== process.pid && alive(owner)) {
    die(
      2,
      `process ${owner} already owns the registry for a run (TB_REGISTRY_OWNER); ` +
        `run the ${subject} tests on their own`,
    );
  }
  for (const l of lanes) {
    try {
      removeTree(l.work);
    } catch (e) {
      die(2, `${l.work} could not be emptied (${e.code}): is a process from an earlier run still running?`);
    }
    mkdirSync(l.work, { recursive: true });
  }
  const tidy = startTidy({ prefixes: lanes.map((l) => l.work) });
  if (!tidy) die(2, "could not record the registry, so the run could not put it back");
  const apps = [...new Set(lanes.flatMap((l) => l.settings))];
  const snapshotSettings = () => (apps.length ? [].concat(snapshotKeys(apps.map(settingsKey))) : []);
  let settingsBefore, appsBefore;
  try {
    settingsBefore = snapshotSettings();
    // Only the names, to notice an application key the run creates that no lane
    // named: a program saving settings nobody told the runner about.
    appsBefore = subkeyNames(SETTINGS_ROOT).map((n) => n.toLowerCase());
  } catch (e) {
    const tidied = finishTidy(tidy);
    die(tidied ? 2 : 3, `could not record the ${subject}s' settings: ${e.message}`);
  }

  let interrupted = false;
  const children = new Set();

  // A crash from here on still puts back what the run recorded, as the end of a
  // run does: the lanes are ended first, as Ctrl+C ends them, so that no IDE
  // writes to the registry after it is put back. It exits 3 if the registry or a
  // work folder was not put back, and 2 if it was. A crash while putting it back
  // leaves the registry as it happens to be, so it exits 3 at once.
  let crashed = false,
    putBackStarted = false,
    putBackResult = null;
  process.removeAllListeners("uncaughtException");
  process.on("uncaughtException", (err) => {
    console.error(err);
    if (putBackResult) process.exit(putBackResult.problems.length ? 3 : 2);
    if (crashed || putBackStarted) process.exit(3);
    crashed = true;
    for (const child of children) child.kill();
    const deadline = Date.now() + 10_000;
    const wait = setInterval(() => {
      if (children.size && Date.now() < deadline) return;
      clearInterval(wait);
      const { tidied, problems } = putBack();
      console.error(registryLine(tidied, problems));
      process.exit(problems.length ? 3 : 2);
    }, 100);
  });

  // ---------------------------------------------------------------- the lanes

  console.log(
    `${tool}: BETA ${buildNumber(ide) ?? "?"}, ${lanes.length} lane(s) on ports ${portList(ports)}, ` +
      `${Math.min(jobs, lanes.length)} at a time`,
  );

  process.on("SIGINT", () => {
    if (interrupted) return;
    interrupted = true;
    console.error("\ninterrupted: ending the lanes, then putting the registry back");
    for (const child of children) child.kill();
  });

  // A lane's output is held until it ends and then printed whole, so that two
  // lanes' reports never interleave.
  function runLane(l) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      let finished = false;
      const finish = (r) => {
        if (finished) return;
        finished = true;
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        const verdict = r.code === 0 ? "passed" : r.timedOut ? "TIMED OUT" : "FAILED";
        // node:test reports a test once it ends, so a lane ended in the middle
        // of one, as a timeout or Ctrl+C ends it, has usually printed nothing.
        const report = r.out.trimEnd() || "(the lane printed nothing before it ended)";
        process.stdout.write(`\n--- ${l.name} (port ${l.port}): ${verdict} in ${secs} s\n${report}\n`);
        resolve({ ...r, lane: l });
      };
      try {
        if (l.settings.length) deleteSettings(l.settings);
      } catch (e) {
        finish({ code: null, out: `could not clear the settings of ${l.settings.join(", ")}: ${e.message}` });
        return;
      }
      console.log(`  ${l.name}: started on port ${l.port}`);
      const child = spawn(process.execPath, ["--test", "--test-reporter=spec", path.join(SUITE, l.file)], {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: { ...process.env, [LANE_ENV]: JSON.stringify({ name: l.name, port: l.port, work: l.work, ide, show }) },
      });
      children.add(child);
      let out = "",
        timedOut = false;
      child.stdout.on("data", (d) => {
        out += d;
      });
      child.stderr.on("data", (d) => {
        out += d;
      });
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, laneTimeout);
      child.on("error", (e) => {
        clearTimeout(timer);
        children.delete(child);
        finish({ code: null, out: `${out}\ncould not start the lane: ${e.message}`, timedOut });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        children.delete(child);
        finish({ code, out, timedOut });
      });
    });
  }

  // A few lanes at a time, and never two that name the same application's
  // settings: each deletes the key before it starts, and its program reads it.
  async function runAll() {
    const results = [];
    const pending = [...lanes];
    const running = new Map();
    const clash = (a, b) => a.settings.some((s) => b.settings.includes(s));
    while ((pending.length && !interrupted) || running.size) {
      for (let i = 0; i < pending.length && running.size < jobs && !interrupted; ) {
        const l = pending[i];
        if ([...running.keys()].some((r) => clash(l, r))) {
          i++;
          continue;
        }
        pending.splice(i, 1);
        running.set(
          l,
          runLane(l).then((r) => {
            results.push(r);
            running.delete(l);
          }),
        );
      }
      if (running.size) await Promise.race(running.values());
    }
    return results;
  }

  const results = await runAll();
  // A crash ended the lanes, so runAll returned; the crash handler puts the
  // registry back and exits, and its timer keeps the process alive until then.
  if (crashed) await new Promise(() => {});

  // ---------------------------------------------------------------- putting it back

  // Called once every lane has ended, at the end of a run or after a crash.
  function putBack() {
    putBackStarted = true;
    const problems = [];
    const tidied = finishTidy(tidy);
    if (!tidied) problems.push("the IDE's registry entries could not be put back (see the warning above)");
    try {
      if (apps.length) restoreKeys(settingsBefore);
    } catch (e) {
      problems.push(`the ${subject}s' settings could not be put back: ${e.message}`);
    }

    // The check that the run left nothing: an entry naming a lane's folder in the
    // IDE's lists, a build target remembered for one, or settings that differ
    // from what was recorded. Another session's IDE that is open meanwhile
    // can write its own copy of the recent list back, which is the one way an
    // entry could return (WIP.Harness.md).
    const folders = lanes.map((l) => norm(l.work) + "\\");
    try {
      const lists = ideLists();
      const left = [...lists.projectState, ...lists.recentlyOpened].filter(
        (p) => p && folders.some((f) => norm(p).startsWith(f)),
      );
      if (left.length) problems.push(`the IDE's lists still name the lanes' folders: ${left.join(", ")}`);
      const targets = sweepArchitectureMemory(lanes.map((l) => l.work));
      if (targets) problems.push(`${targets} build target(s) were still remembered for the lanes' folders`);
      const settingsAfter = snapshotSettings();
      for (let i = 0; i < apps.length; i++) {
        if (JSON.stringify(settingsAfter[i]) !== JSON.stringify(settingsBefore[i])) {
          problems.push(`the settings of ${apps[i]} are not as they were found`);
        }
      }
      const named = apps.map((a) => a.toLowerCase());
      const created = subkeyNames(SETTINGS_ROOT).filter(
        (n) => !appsBefore.includes(n.toLowerCase()) && !named.includes(n.toLowerCase()),
      );
      if (created.length) {
        problems.push(
          `HKCU\\${SETTINGS_ROOT} gained ${created.map((n) => `"${n}"`).join(", ")} during the ` +
            `run, which no lane names in test/${path.basename(SUITE)}/lanes.mjs. An ${subject} under test that saves settings ` +
            "must be named there, or its settings stay behind; the key is left as it is",
        );
      }
    } catch (e) {
      problems.push(`could not check the registry: ${e.message}`);
    }

    // A folder that will not delete is held open by a process that outlived its
    // lane, which is worth hearing about (WIP.Harness.md, The IDE runs inside a job).
    for (const l of lanes) {
      try {
        removeTree(l.work);
      } catch (e) {
        problems.push(`${l.work} could not be deleted (${e.code}): is a process of its lane still running?`);
      }
    }
    putBackResult = { tidied, problems };
    return putBackResult;
  }

  function registryLine(tidied, problems) {
    const settingsNote = apps.length ? `, and the settings of ${apps.join(", ")} as found` : "";
    return problems.length
      ? `registry and work folders: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`
      : `registry: put back (${tidied.projectState} project-state, ${tidied.recentlyOpened} recent-list ` +
          `and ${tidied.association ?? "no"} association writes); nothing names the lanes' folders${settingsNote}`;
  }

  const { tidied, problems } = putBack();
  const failed = results.filter((r) => r.code !== 0);
  console.log("");
  console.log(registryLine(tidied, problems));
  console.log(
    `${results.length} of ${lanes.length} lane(s) ran: ${results.length - failed.length} passed` +
      (failed.length ? `, ${failed.length} failed (${failed.map((r) => r.lane.name).join(", ")})` : "") +
      (interrupted ? "; interrupted" : ""),
  );
  process.exit(problems.length ? 3 : failed.length || interrupted ? 1 : 0);
}
