// Self-test for scripts/lib/tb-registry.mjs, the harness's registry tidy.
//
//     node scripts/check_tb_registry.mjs
//
// Exit: 0 every assertion held, 1 one did not, 2 a refused command line, or
// something else threw, such as PowerShell failing, so the test could not run to its
// end.
//
// NOT A GATE, and it must not join test.bat: it needs Windows and a real
// registry, and the CI runners are Ubuntu while the rule for test.bat is that
// CI runs every gate in it. Run it by hand after changing tb-registry.mjs, the
// same arrangement examples.bat has. It writes only under
// HKCU\Software\tbharness-selftest and deletes that key when it ends; its
// ownership check reads the real IDE keys and changes nothing in them.
//
// What it plays out, on a scratch copy of the IDE's keys:
//
//   * a user's project the run opened, whose saved state the IDE overwrote:
//     it must come back exactly, and the recent list, which an IDE started
//     with the harness's flags does not write, must be left as it is;
//   * a project the run created, which must disappear;
//   * entries under a harness temp folder, in both separators, and a folder
//     whose name merely starts the same way (9346 against 93460), which must
//     survive;
//   * a path with a character outside every console code page, which is why
//     the module goes through .NET rather than reg.exe;
//   * the association keys: a value changed, one added, one deleted, a subkey
//     added, and a key that did not exist before created by the run;
//   * that a second restore writes nothing at all;
//   * the window geometry (the Window key): values changed, added and deleted
//     put back with one write each, an untouched key not written, a key the
//     run created deleted, and a key left as it is when a run of the group
//     passed `window: false` (try_help_addin, whose IDE is the user's to move);
//   * the build targets the IDE remembers, read and never written: the entries
//     under a harness temp folder, in both separators, listed; the user's and
//     the lookalike folder's not; a value that is not JSON, and no value,
//     listing nothing;
//   * an association that named the temp folder when the run began, which is
//     another run's IDE copy's and is pointed at the newest install, or left
//     alone when there is none, against one that did not, which is put back;
//   * two runs at once: the one that ends first puts nothing back, the last
//     one removes both runs' entries, which an IDE wrote after the first
//     ended; a run that died is swept by the next one to start;
//   * the guards: a key near the root and a sweep outside the temp folder
//     refused, and an error raised inside PowerShell arriving as a sentence;
//   * the ownership rule: a dead owner does not block tidying, a live one makes
//     a child defer.

import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { exitOnCrash, parseCli, printHelpAndExit, withUsageError } from "../lib/cli.mjs";
import * as R from "./lib/tb-registry.mjs";

// A crash exits 2; the catch below passes on everything but a failed assertion.
exitOnCrash();

const USAGE = `usage: node scripts/check_tb_registry.mjs [-h, --help]

Tests the harness's registry tidy in scripts/lib/tb-registry.mjs, under
HKCU\\Software\\tbharness-selftest. Windows only, and not a gate.

  -h, --help  print this text and exit

Exit codes:
  0  every assertion held
  1  an assertion failed
  2  the test could not run to its end: a refused command line, PowerShell failing,
     or a crash`;

if (
  withUsageError(() =>
    parseCli(process.argv.slice(2), {
      options: { help: { type: "boolean", short: "h" } },
      stopAt: ["help"],
    }),
  ).values.help
)
  printHelpAndExit(USAGE);

const BASE = "Software\\tbharness-selftest";
const ROOT = BASE + "\\twinBASIC_IDE";
const ASSOC = BASE + "\\Classes\\twinBASIC.ProjectFile";
const ABSENT = BASE + "\\Classes\\.notthere";

// Setup and teardown through .NET, the request on stdin, so the test data can
// hold the same characters the module has to survive.
function ps(script, input) {
  const enc = Buffer.from(
    "$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';" +
      "$u=New-Object System.Text.UTF8Encoding $false;[Console]::InputEncoding=$u;" +
      "[Console]::OutputEncoding=$u;$in=[Console]::In.ReadToEnd()|ConvertFrom-Json;" +
      "$hk=[Microsoft.Win32.Registry]::CurrentUser;" +
      script,
    "utf16le",
  ).toString("base64");
  return execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", enc], {
    input: JSON.stringify(input ?? {}),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
}
const wipe = () => ps("if ($hk.OpenSubKey($in.base)) { $hk.DeleteSubKeyTree($in.base) }", { base: BASE });
// Pairs rather than an object: PowerShell 5.1's ConvertFrom-Json refuses an
// empty property name, and a key's default value is named by the empty string.
const setValues = (key, values) =>
  ps(
    "$k=$hk.CreateSubKey($in.key); foreach ($p in @($in.pairs)) " +
      "{ $k.SetValue([string]$p.n, [string]$p.v, 'String') }; $k.Close()",
    { key, pairs: Object.entries(values).map(([n, v]) => ({ n, v })) },
  );
const deleteValues = (key, names) =>
  ps("$k=$hk.OpenSubKey($in.key, $true); foreach ($n in $in.names) { $k.DeleteValue($n) }; $k.Close()", { key, names });
const readValue = (key, name) =>
  JSON.parse(
    ps(
      "$k=$hk.OpenSubKey($in.key); $v=$k.GetValue($in.name); $k.Close(); " + "ConvertTo-Json -InputObject $v -Compress",
      { key, name },
    ).replace(/^﻿/, ""),
  );

const USER = "D:\\work\\Real Project\\Mine.twinproj";
const OTHER = "D:\\work\\Other\\Other.twinproj";
const NEWPROJ = "D:\\work\\Scratch\\Made By Run.twinproj";
// Inside the real temp folder -- the module refuses to sweep anywhere else --
// under a name outside every console code page.
const TEMPDIR = path.join(tmpdir(), "tbharness-selftest-Łukasz", "tbrun", "9346");
const LOOKALIKE = path.join(tmpdir(), "tbharness-selftest-Łukasz", "tbrun", "93460", "y.twinproj");
const slots = (list) => Object.fromEntries(Array.from({ length: 21 }, (_, i) => [String(i), list[i] ?? ""]));

wipe();
try {
  // ------------------------------------------------ before the "run"
  setValues(ROOT + "\\ProjectState", { [USER]: "USER-STATE", [OTHER]: "OTHER-STATE" });
  const recentBefore = ["D:\\a.twinproj", "D:\\b.twinproj", OTHER, USER, "D:\\c.twinproj"];
  setValues(ROOT + "\\RecentlyOpened", slots(recentBefore));
  setValues(ASSOC, { "": "twinBASIC Project" });
  setValues(ASSOC + "\\shell\\open\\command", { "": '"C:\\IDE\\twinBASIC.exe" "%1"' });
  setValues(ASSOC + "\\DefaultIcon", { "": "C:\\IDE\\twinBASIC.exe" });

  const snap = R.snapshotProjects([USER, NEWPROJ], { root: ROOT });
  const keys = R.snapshotKeys([ASSOC, ABSENT]);
  assert.deepEqual(R.ideLists({ root: ROOT }).recentlyOpened.filter(Boolean), recentBefore);
  const user = snap.entries.find((e) => e.path === USER);
  assert.equal(user.state, "USER-STATE");
  assert.equal(snap.entries.find((e) => e.path === NEWPROJ).name, null);

  // ------------------------------------------------ what a run does
  setValues(ROOT + "\\ProjectState", {
    [USER]: "RUN-STATE", // the IDE rewrote it
    [NEWPROJ]: "NEW", // the run created it
    [TEMPDIR + "\\tbrun-probe.twinproj"]: "T1",
    [TEMPDIR.split("\\").join("/") + "/src/x.twinproj"]: "T2", // forward slashes
    [LOOKALIKE]: "NOT-MINE",
  });
  // The user opens another project in his own IDE meanwhile, which is his to keep.
  const recentMeanwhile = ["D:\\new.twinproj", ...recentBefore];
  setValues(ROOT + "\\RecentlyOpened", slots(recentMeanwhile));
  setValues(ASSOC + "\\shell\\open\\command", { "": '"C:\\Temp\\copy\\twinBASIC.exe" "%1"' });
  setValues(ASSOC, { Extra: "added by run" });
  deleteValues(ASSOC + "\\DefaultIcon", [""]);
  setValues(ASSOC + "\\ShellNew", { FileName: "C:\\Temp\\copy\\x.twinproj" });
  setValues(ABSENT, { "": "created by run" });

  // ------------------------------------------------ put it back
  R.restoreProjects(snap, { prefixes: [TEMPDIR] });
  const writes = R.restoreKeys(keys);
  const after = R.ideLists({ root: ROOT });
  assert.deepEqual(
    after.recentlyOpened,
    Object.values(slots(recentMeanwhile)),
    "the recent list is not the tidy's to put back: it is left exactly as it is",
  );
  assert.deepEqual(
    after.projectState.slice().sort(),
    [OTHER, USER, LOOKALIKE].sort(),
    "the run's entries are gone; the user's, and a lookalike folder's, are kept",
  );
  assert.equal(
    R.snapshotProjects([USER], { root: ROOT }).entries[0].state,
    "USER-STATE",
    "the user's project has its old state back",
  );
  assert.deepEqual(R.snapshotKeys([ASSOC, ABSENT]), keys, "the association keys are as they were");
  assert.ok(writes >= 5, `association writes counted (${writes})`);

  // Idempotent: nothing is left to put back, so nothing may be written.
  assert.deepEqual(R.restoreProjects(snap, { prefixes: [TEMPDIR] }), { projectState: 0 });
  assert.equal(R.restoreKeys(keys), 0);

  // A sweep with no snapshot only deletes, and a recent list that names a harness folder is read, not changed.
  const PROBE1 = TEMPDIR + "\\p1.twinproj";
  setValues(ROOT + "\\RecentlyOpened", slots([PROBE1, "D:\\x.twinproj"]));
  setValues(ROOT + "\\ProjectState", { [PROBE1]: "T3" });
  R.restoreProjects({ root: ROOT, entries: [] }, { prefixes: [TEMPDIR] });
  assert.deepEqual(
    R.ideLists({ root: ROOT }).projectState.filter((n) => n === PROBE1),
    [],
    "the entry is swept",
  );
  assert.deepEqual(
    R.ideLists({ root: ROOT }).recentlyOpened,
    Object.values(slots([PROBE1, "D:\\x.twinproj"])),
    "and the recent list, which names it, is the lane runner's to report",
  );
  setValues(ROOT + "\\RecentlyOpened", slots(recentBefore));

  // ------------------------------------------------ remembered build targets
  // Read only: an IDE started with the harness's flags does not write them.
  const SETTINGS = ROOT + "\\IDESettings";
  const MEMORY = "targetArchitectureMemory";
  const PROBE = TEMPDIR + "\\tbrun-probe.twinproj";
  const PROBE_FWD = TEMPDIR.split("\\").join("/") + "/src/x.twinproj";
  const memory = { [USER]: "win64", [PROBE]: "win64", [LOOKALIKE]: "win64", [PROBE_FWD]: "win32", [OTHER]: "win32" };
  setValues(SETTINGS, { [MEMORY]: JSON.stringify(memory) });
  assert.deepEqual(
    R.rememberedTargets([TEMPDIR], { root: ROOT }).sort(),
    [PROBE, PROBE_FWD].sort(),
    "both of the run's entries are listed, whichever separator they use",
  );
  assert.deepEqual(
    R.rememberedTargets(null, { root: ROOT }).sort(),
    Object.keys(memory).sort(),
    "without folders, every entry",
  );
  assert.equal(readValue(SETTINGS, MEMORY), JSON.stringify(memory), "and nothing is written");
  setValues(SETTINGS, { [MEMORY]: "{not json" });
  assert.deepEqual(R.rememberedTargets([TEMPDIR], { root: ROOT }), []);
  assert.equal(readValue(SETTINGS, MEMORY), "{not json", "a value that is not JSON is left alone");
  deleteValues(SETTINGS, [MEMORY]);
  assert.deepEqual(R.rememberedTargets([TEMPDIR], { root: ROOT }), [], "no value, nothing listed");
  assert.throws(() => R.rememberedTargets(["C:\\"], { root: ROOT }), /outside/);

  // The whole tidy leaves the options, the build targets and the recent list as they are,
  // and puts the window geometry back value by value.
  const asIde = (o) => JSON.stringify(o, undefined, "\t");
  const WINDOW = R.windowKey(ROOT);
  assert.equal(WINDOW, ROOT + "\\Window");
  const geometry = { RealTitlebar: "0", Left: "846", Top: "407", Width: "1200", Height: "900", State: "0" };
  setValues(WINDOW, geometry);
  const windowBefore = R.snapshotKeys([WINDOW]);
  setValues(SETTINGS, { [MEMORY]: JSON.stringify(memory), GENERAL: asIde({ colorTheme: "Dark" }) });
  const whole = R.startTidy({ root: ROOT, keys: [ASSOC], paths: [USER], prefixes: [TEMPDIR] });
  setValues(ROOT + "\\ProjectState", { [USER]: "RUN-STATE", [PROBE]: "T4" });
  setValues(SETTINGS, {
    [MEMORY]: JSON.stringify({ ...memory, [USER]: "win32" }),
    GENERAL: asIde({ colorTheme: "light" }),
  });
  // A resize writes the four numbers; an options change writes RealTitlebar.
  setValues(WINDOW, { Left: "100", Top: "100", Width: "1600", Height: "1200", RealTitlebar: "1", Extra: "added" });
  deleteValues(WINDOW, ["State"]);
  const done = R.finishTidy(whole);
  assert.deepEqual(Object.keys(done).sort(), ["association", "projectState", "window"]);
  assert.equal(R.snapshotProjects([USER], { root: ROOT }).entries[0].state, "USER-STATE", "a named project's state");
  assert.equal(readValue(SETTINGS, MEMORY), JSON.stringify({ ...memory, [USER]: "win32" }), "targets are not touched");
  assert.equal(readValue(SETTINGS, "GENERAL"), asIde({ colorTheme: "light" }), "options are not touched");
  assert.deepEqual(R.snapshotKeys([WINDOW]), windowBefore, "the window geometry is as it was found");
  assert.equal(done.window, 7, "one write for each value changed, added or deleted, and none for the rest");
  deleteValues(SETTINGS, [MEMORY, "GENERAL"]);

  // A window key nobody touched is not written; one the run created goes; one a
  // run whose IDE is the user's to move (window: false) leaves is kept, whichever
  // run of the group ends last.
  const untouched = R.startTidy({ root: ROOT, keys: [ASSOC] });
  assert.equal(R.finishTidy(untouched).window, 0, "an untouched window key is not written");
  ps("$hk.DeleteSubKeyTree($in.key)", { key: WINDOW });
  const created = R.startTidy({ root: ROOT, keys: [ASSOC] });
  setValues(WINDOW, geometry);
  assert.equal(R.finishTidy(created).window, 1);
  assert.deepEqual(R.snapshotKeys([WINDOW]), [{ path: WINDOW, snap: null }], "a window key the run created goes");
  setValues(WINDOW, geometry);
  const lanes = R.startTidy({ root: ROOT, keys: [ASSOC] });
  const tryIt = R.startTidy({ root: ROOT, keys: [ASSOC], window: false });
  setValues(WINDOW, { Width: "1600" });
  assert.ok(R.finishTidy(tryIt).deferred, "the user's run ends first");
  assert.equal(R.finishTidy(lanes).window, null, "the last run leaves the geometry the user's IDE left");
  assert.equal(readValue(WINDOW, "Width"), "1600");
  setValues(WINDOW, geometry);

  // ------------------------------------------------ an association another run's copy held
  // startTidy and finishTidy, the whole tidy, on the scratch keys. TB_IDE stands in for the
  // newest install on the Desktop, which findIde would find.
  const COMMAND = ASSOC + "\\shell\\open\\command";
  const REAL = '"C:\\IDE\\twinBASIC.exe" "%1"';
  const COPY_EXE = path.join(tmpdir(), "tbaddin", "9870", "ide", "twinBASIC.exe");
  const COPY = `"${COPY_EXE}" "%1"`;
  const tbIde = process.env.TB_IDE;
  try {
    process.env.TB_IDE = "C:\\IDE\\twinBASIC.exe";
    setValues(COMMAND, { "": COPY }); // another run's copy has it
    const dirty = R.startTidy({ root: ROOT, keys: [ASSOC] });
    assert.ok(R.finishTidy(dirty).association >= 1);
    assert.equal(readValue(COMMAND, ""), REAL, "an association naming the temp folder points at the install");
    process.env.TB_IDE = COPY_EXE; // no install outside the temp folder
    setValues(COMMAND, { "": COPY });
    const noInstall = R.startTidy({ root: ROOT, keys: [ASSOC] });
    assert.equal(R.finishTidy(noInstall).association, null);
    assert.equal(readValue(COMMAND, ""), COPY, "with no install it is left as the IDEs set it");
  } finally {
    if (tbIde === undefined) delete process.env.TB_IDE;
    else process.env.TB_IDE = tbIde;
  }
  setValues(COMMAND, { "": REAL });
  const clean = R.startTidy({ root: ROOT, keys: [ASSOC] });
  setValues(COMMAND, { "": COPY }); // this run's copy takes it
  assert.ok(R.finishTidy(clean).association >= 1);
  assert.equal(readValue(COMMAND, ""), REAL, "one that did not is put back");

  // ------------------------------------------------ two runs at once
  // Run A starts; run B starts while A runs and ends first, so it puts nothing
  // back. A's IDE, still open, writes B's project state after that. A ends last
  // and puts back for both.
  const RUNS = path.join(tmpdir(), "tbharness-selftest-Łukasz", "tbide");
  const DIR_A = path.join(RUNS, "9661");
  const DIR_B = path.join(RUNS, "9662");
  const IN_A = path.join(DIR_A, "project.twinproj");
  const IN_B = path.join(DIR_B, "project.twinproj");
  const RECENT = ROOT + "\\RecentlyOpened";
  const runsLeft = () => R.ideLists({ root: ROOT }).projectState.filter((p) => p?.startsWith(RUNS));
  setValues(RECENT, slots([USER, OTHER]));
  const runA = R.startTidy({ root: ROOT, keys: [ASSOC], prefixes: [DIR_A] });
  const runB = R.startTidy({ root: ROOT, keys: [ASSOC], prefixes: [DIR_B] });
  setValues(ROOT + "\\ProjectState", { [IN_A]: "{}", [IN_B]: "{}" });
  const deferred = R.finishTidy(runB);
  assert.deepEqual(deferred, { deferred: [process.pid] }, "a run that ends while another runs puts nothing back");
  assert.equal(R.finishTidy(runB), deferred, "a second finishTidy returns what the first did");
  assert.deepEqual(runsLeft().sort(), [IN_A, IN_B].sort(), "so both runs' entries are still there");
  const last = R.finishTidy(runA);
  assert.ok(last && !last.deferred, "the last run to end puts back");
  assert.deepEqual(runsLeft(), [], "for both runs");
  assert.deepEqual(
    R.ideLists({ root: ROOT }).recentlyOpened.filter(Boolean),
    [USER, OTHER],
    "and leaves the recent list as it is",
  );
  assert.deepEqual(readdirSync(runA.dir), [], "and the shared record goes");
  // A run that died: its record is left, and the next run to start alone
  // deletes what is under its folder.
  const lib = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), "lib", "tb-registry.mjs")).href;
  const { TB_REGISTRY_OWNER: _, ...noOwner } = process.env;
  execFileSync(
    process.execPath,
    ["-e", `import(${JSON.stringify(lib)}).then(m => m.startTidy(JSON.parse(process.env.TIDY)))`],
    { env: { ...noOwner, TIDY: JSON.stringify({ root: ROOT, keys: [ASSOC], prefixes: [DIR_B] }) } },
  );
  setValues(ROOT + "\\ProjectState", { [IN_B]: "{}" });
  const nextRun = R.startTidy({ root: ROOT, keys: [ASSOC] });
  assert.deepEqual(runsLeft(), [], "a dead run's entries are deleted by the next run");
  assert.ok(!R.finishTidy(nextRun).deferred);

  // ------------------------------------------------ the guards
  assert.throws(() => R.restoreKeys([{ path: "Software", snap: null }]), /close to the root/);
  assert.throws(() => R.snapshotKeys(["Software\\Classes"]), /close to the root/);
  assert.throws(() => R.restoreProjects({ root: ROOT, entries: [] }, { prefixes: ["C:\\"] }), /outside/);
  assert.throws(
    () => R.restoreProjects({ root: ROOT, entries: [] }, { prefixes: [tmpdir()] }),
    /outside/,
    "the temp folder itself is not a sweepable prefix",
  );
  assert.throws(
    () =>
      R.restoreKeys([
        { path: BASE + "\\Classes\\bad", snap: { values: [{ name: "x", kind: "NotAKind", data: "1" }], keys: [] } },
      ]),
    (e) => /registry restoreKeys failed: .*NotAKind/.test(e.message) && !/CLIXML/.test(e.message),
  );

  // ------------------------------------------------ the ownership rule
  // Pid 1 is never a live process on Windows, so it stands for a dead owner.
  // The child defers before it reads anything, so it is given the real keys.
  process.env.TB_REGISTRY_OWNER = "1";
  const owned = R.startTidy({ root: ROOT, keys: [ASSOC] });
  assert.ok(owned, "a dead owner does not block tidying");
  assert.equal(process.env.TB_REGISTRY_OWNER, String(process.pid));
  const child = execFileSync(
    process.execPath,
    ["-e", `import(${JSON.stringify(lib)}).then(m => console.log(m.startTidy() === null ? "deferred" : "took over"))`],
    { encoding: "utf8", env: process.env },
  ).trim();
  assert.equal(child, "deferred", "a child of a live owner leaves the registry alone");
  R.finishTidy(owned);

  console.log("check_tb_registry: every assertion holds");
} catch (e) {
  // A failed assertion is the finding; anything else is a crash.
  if (!(e instanceof assert.AssertionError)) throw e;
  console.error(`check_tb_registry: ${e.message}`);
  process.exitCode = 1;
} finally {
  wipe();
}
