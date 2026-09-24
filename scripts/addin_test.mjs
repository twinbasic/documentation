#!/usr/bin/env node
// Run the IDE add-in scenarios: every lane listed in test/addin/lanes.mjs, each
// a node:test file run in a process of its own, with its own DevTools port,
// work folder and copy of the twinBASIC install.
//
//     node scripts/addin_test.mjs [options]
//
//       --only <regex>    only the lanes whose name matches
//       --port <n>        base DevTools port (default 9560); the lanes get n, n+1, ...
//       --jobs <n>        lanes at once (default 2)
//       --timeout <secs>  a lane still running after this long is ended (default 600)
//       --ide <path>      the twinBASIC.exe to copy (default: $TB_IDE, else the
//                         newest %USERPROFILE%/Desktop/twinBASIC_IDE_BETA_*)
//       --show / --hide   as tbbuild's
//
// Exit: 0 every lane passed and the registry is as it was found, 1 a lane
// failed, 2 the harness failed or could not put the registry back.
//
// Not a gate, for the reasons examples.bat is not one: it needs Windows and a
// twinBASIC install. addin-test.bat is the wrapper.
//
// ---------------------------------------------------------------- how
//
// A lane is one scenario file. The file builds the add-ins it tests into its
// lane's copy of the install and opens projects in it, one IDE at a time,
// through scripts/lib/tb-lane.mjs; this script only hands each file its lane
// (TB_ADDIN_LANE), runs the files a few at a time, and owns what they share:
//
//   * THE REGISTRY. One process owns it per run (lib/tb-registry.mjs). This
//     one records it before the first lane starts, and the lanes inherit
//     TB_REGISTRY_OWNER and leave it alone. Once every lane has ended it
//     puts back the IDE's lists, the .twinproj association and the build
//     targets the IDE remembers, then checks that nothing under the lanes'
//     folders is left.
//   * THE ADD-INS' OWN SETTINGS. An add-in's SaveSetting writes under
//     HKCU\Software\VB and VBA Program Settings\<app>, the same key as any
//     installed copy of that add-in. A lane names the applications its
//     add-ins save settings for (`settings` in lanes.mjs); their keys are
//     recorded before the first lane starts, deleted before each lane that
//     names them, so that its add-ins start from their defaults, and put back
//     at the end. Lanes that name the same application never run at once.
//
// Not %APPDATA%\twinBASIC\addins. The compiler loads the add-ins there too
// (P6 in WIP.HelpAddin.md), but the IDE makes that folder's path from its own
// environment, and every IDE a lane starts has an APPDATA inside the lane's
// work folder (lib/tb-lane.mjs). So an add-in the user keeps there loads into
// none of them, and the run has no need to refuse while one is there.
//
// Ctrl+C ends the lanes and still puts the registry back.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { removeTree } from "./lib/tb-ide-copy.mjs";
import { wantShow } from "./lib/tb-ide.mjs";
import { buildNumber, findIde } from "./lib/tb-install.mjs";
import { LANE_ENV } from "./lib/tb-lane.mjs";
import { deleteSettings, finishTidy, ideLists, restoreKeys, SETTINGS_ROOT, settingsKey, snapshotKeys,
         startTidy, subkeyNames, sweepArchitectureMemory } from "./lib/tb-registry.mjs";

const REPO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUITE = path.join(REPO, "test", "addin");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const die = (code, msg) => { console.error(msg); process.exit(code); };

if (flag("help")) {
  die(2, "usage: node scripts/addin_test.mjs [--only REGEX] [--port N] [--jobs N] " +
         "[--timeout S] [--ide <twinBASIC.exe>] [--show|--hide]");
}
const only = opt("only", null) ? new RegExp(opt("only")) : null;
const basePort = Number(opt("port", 9560));
const jobs = Math.max(1, Number(opt("jobs", 2)));
const laneTimeout = Number(opt("timeout", 600)) * 1000;
const show = wantShow({ show: flag("show"), hide: flag("hide") });

// ---------------------------------------------------------------- refusals

const ide = findIde(opt("ide", undefined));
if (!ide || !existsSync(ide)) {
  die(2, "no twinBASIC IDE found: pass --ide <twinBASIC.exe>, set TB_IDE, " +
         "or unpack a twinBASIC_IDE_BETA_<n> folder on your Desktop");
}

const manifest = (await import(pathToFileURL(path.join(SUITE, "lanes.mjs")).href)).default;
const lanes = manifest
  .map((l) => ({ ...l, name: l.name ?? path.basename(l.file).replace(/\.test\.mjs$/, "") }))
  .filter((l) => !only || only.test(l.name))
  .map((l, i) => ({ ...l, settings: l.settings ?? [], port: basePort + i,
                    work: path.join(tmpdir(), "tbaddin", String(basePort + i)) }));
if (!lanes.length) die(2, `no lane in ${path.join(SUITE, "lanes.mjs")} matches ${only}`);
for (const l of lanes) {
  if (!existsSync(path.join(SUITE, l.file))) die(2, `lane ${l.name}: no file ${path.join(SUITE, l.file)}`);
  try { l.settings.forEach(settingsKey); } catch (e) { die(2, `lane ${l.name}: ${e.message}`); }
}

// ---------------------------------------------------------------- the registry

// startTidy leaves the registry to a live owner that is not this process, and
// such an owner would tidy only its own folders, not the lanes'.
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const owner = Number(process.env.TB_REGISTRY_OWNER);
if (owner && owner !== process.pid && alive(owner)) {
  die(2, `process ${owner} already owns the registry for a run (TB_REGISTRY_OWNER); ` +
         "run the add-in tests on their own");
}
for (const l of lanes) {
  try { removeTree(l.work); } catch (e) {
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
  // named: an add-in saving settings nobody told the runner about.
  appsBefore = subkeyNames(SETTINGS_ROOT).map((n) => n.toLowerCase());
} catch (e) {
  finishTidy(tidy);
  die(2, `could not record the add-ins' settings: ${e.message}`);
}

// ---------------------------------------------------------------- the lanes

console.log(`addin-test: BETA ${buildNumber(ide) ?? "?"}, ${lanes.length} lane(s) on ports ` +
            `${basePort}-${basePort + lanes.length - 1}, ${Math.min(jobs, lanes.length)} at a time`);

let interrupted = false;
const children = new Set();
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
      cwd: REPO, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
      env: { ...process.env,
             [LANE_ENV]: JSON.stringify({ name: l.name, port: l.port, work: l.work, ide, show }) },
    });
    children.add(child);
    let out = "", timedOut = false;
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, laneTimeout);
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
// settings: each deletes the key before it starts, and its add-ins read it.
async function runAll() {
  const results = [];
  const pending = [...lanes];
  const running = new Map();
  const clash = (a, b) => a.settings.some((s) => b.settings.includes(s));
  while ((pending.length && !interrupted) || running.size) {
    for (let i = 0; i < pending.length && running.size < jobs && !interrupted;) {
      const l = pending[i];
      if ([...running.keys()].some((r) => clash(l, r))) { i++; continue; }
      pending.splice(i, 1);
      running.set(l, runLane(l).then((r) => { results.push(r); running.delete(l); }));
    }
    if (running.size) await Promise.race(running.values());
  }
  return results;
}

const results = await runAll();

// ---------------------------------------------------------------- putting it back

const problems = [];
const tidied = finishTidy(tidy);
if (!tidied) problems.push("the IDE's registry entries could not be put back (see the warning above)");
try {
  if (apps.length) restoreKeys(settingsBefore);
} catch (e) {
  problems.push(`the add-ins' settings could not be put back: ${e.message}`);
}

// The check that the run left nothing: an entry naming a lane's folder in the
// IDE's lists, a build target remembered for one, or an add-in's settings that
// differ from what was recorded. Another session's IDE that is open meanwhile
// can write its own copy of the recent list back, which is the one way an
// entry could return (WIP.Harness.md).
const norm = (p) => String(p).split("/").join("\\").toLowerCase();
const folders = lanes.map((l) => norm(l.work) + "\\");
try {
  const lists = ideLists();
  const left = [...lists.projectState, ...lists.recentlyOpened]
    .filter((p) => p && folders.some((f) => norm(p).startsWith(f)));
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
  const created = subkeyNames(SETTINGS_ROOT)
    .filter((n) => !appsBefore.includes(n.toLowerCase()) && !named.includes(n.toLowerCase()));
  if (created.length) {
    problems.push(`HKCU\\${SETTINGS_ROOT} gained ${created.map((n) => `"${n}"`).join(", ")} during the ` +
      "run, which no lane names in test/addin/lanes.mjs. An add-in under test that saves settings " +
      "must be named there, or its settings stay behind; the key is left as it is");
  }
} catch (e) {
  problems.push(`could not check the registry: ${e.message}`);
}

// A folder that will not delete is held open by a process that outlived its
// lane, which is worth hearing about (WIP.Harness.md, The IDE runs inside a job).
for (const l of lanes) {
  try { removeTree(l.work); }
  catch (e) { problems.push(`${l.work} could not be deleted (${e.code}): is a process of its lane still running?`); }
}

const failed = results.filter((r) => r.code !== 0);
const settingsNote = apps.length ? `, and the settings of ${apps.join(", ")} as found` : "";
console.log("");
console.log(problems.length
  ? `registry and work folders: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`
  : `registry: put back (${tidied.projectState} project-state, ${tidied.recentlyOpened} recent-list ` +
    `and ${tidied.association ?? "no"} association writes); nothing names the lanes' folders${settingsNote}`);
console.log(`${results.length} of ${lanes.length} lane(s) ran: ${results.length - failed.length} passed` +
            (failed.length ? `, ${failed.length} failed (${failed.map((r) => r.lane.name).join(", ")})` : "") +
            (interrupted ? "; interrupted" : ""));
process.exit(problems.length ? 2 : failed.length || interrupted ? 1 : 0);
