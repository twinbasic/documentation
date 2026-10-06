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
//   * a user's project the run opened, whose saved state the IDE overwrote and
//     whose place in the recent list moved: both must come back exactly;
//   * a project the run created, which must disappear;
//   * entries under a harness temp folder, in both separators, and a folder
//     whose name merely starts the same way (9346 against 93460), which must
//     survive;
//   * a path with a character outside every console code page, which is why
//     the module goes through .NET rather than reg.exe;
//   * what the IDE itself does to the recent list while a run is on it: a
//     short list's empty slots filled with copies of its last entry, a full
//     list's oldest entries pushed off the end, and, to be kept, a project the
//     user opened meanwhile and copies that were there before; and another
//     run's entry that its own tidy removed, which must not come back;
//   * the association keys: a value changed, one added, one deleted, a subkey
//     added, and a key that did not exist before created by the run;
//   * that a second restore writes nothing at all;
//   * the build targets the IDE remembers: the entries under a harness temp
//     folder, in both separators, deleted; the user's, the lookalike folder's
//     and the rest kept, in their order and in the IDE's own JSON; a value
//     that is not JSON left alone; and a named project's target that the run
//     switched, saved under another spelling of its path, put back in its
//     place, with an entry for a project that had none deleted;
//   * the IDE's theme, colorTheme in its GENERAL options: put back, with
//     every other option left as it is now; removed when the run set one
//     where there was none; options that are not JSON left alone;
//   * an association that named the temp folder when the run began, which is
//     another run's IDE copy's and is left alone, against one that did not,
//     which is put back;
//   * two runs at once: the one that ends first puts nothing back, the last
//     one removes both runs' entries, which an IDE wrote back after the first
//     ended, and gives the user's list back; a run that died is swept by the
//     next one to start;
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
  assert.equal(user.recentIndex, 3);
  assert.equal(snap.entries.find((e) => e.path === NEWPROJ).name, null);

  // ------------------------------------------------ what a run does
  setValues(ROOT + "\\ProjectState", {
    [USER]: "RUN-STATE", // the IDE rewrote it
    [NEWPROJ]: "NEW", // the run created it
    [TEMPDIR + "\\tbrun-probe.twinproj"]: "T1",
    [TEMPDIR.split("\\").join("/") + "/src/x.twinproj"]: "T2", // forward slashes
    [LOOKALIKE]: "NOT-MINE",
  });
  setValues(
    ROOT + "\\RecentlyOpened",
    slots([
      TEMPDIR + "\\tbrun-probe.twinproj",
      NEWPROJ,
      USER,
      "D:\\a.twinproj",
      "D:\\b.twinproj",
      OTHER,
      "D:\\c.twinproj",
    ]),
  );
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
    Object.values(slots(recentBefore)),
    "the recent list is exactly as it was, padded to 21 slots",
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
  assert.deepEqual(R.restoreProjects(snap, { prefixes: [TEMPDIR] }), { projectState: 0, recentlyOpened: 0 });
  assert.equal(R.restoreKeys(keys), 0);

  // ------------------------------------------------ what the IDE does to the recent list
  // Each case: the list as found, the list after the run, the list put back.
  const PROBE1 = TEMPDIR + "\\p1.twinproj",
    PROBE2 = TEMPDIR + "\\p2.twinproj";
  const OTHERRUN = path.join(tmpdir(), "tbharness-selftest-Łukasz", "tbrun", "9999", "o.twinproj");
  const full = Array.from({ length: 21 }, (_, i) => `D:\\full\\p${i}.twinproj`);
  // biome-ignore format: a table, one entry per line
  const recentCases = [
    ["a short list's empty slots filled with copies of its last entry",
      ["D:\\x.twinproj"], [PROBE2, PROBE1, ...Array(19).fill("D:\\x.twinproj")], ["D:\\x.twinproj"]],
    ["a full list's oldest entries pushed off the end",
      full, [PROBE2, PROBE1, ...full.slice(0, 19)], full],
    ["a project the user opened meanwhile kept on top, and moved one kept where it went",
      ["D:\\a.twinproj", "D:\\b.twinproj", "D:\\c.twinproj"],
      [PROBE1, "D:\\new.twinproj", "D:\\c.twinproj", "D:\\a.twinproj", "D:\\b.twinproj",
       ...Array(16).fill("D:\\b.twinproj")],
      ["D:\\new.twinproj", "D:\\c.twinproj", "D:\\a.twinproj", "D:\\b.twinproj"]],
    ["copies that were there before kept, as many as there were",
      ["D:\\a.twinproj", "D:\\b.twinproj", "D:\\b.twinproj"],
      [PROBE1, "D:\\a.twinproj", ...Array(19).fill("D:\\b.twinproj")],
      ["D:\\a.twinproj", "D:\\b.twinproj", "D:\\b.twinproj"]],
    ["another run's entry that its own tidy removed meanwhile not brought back",
      ["D:\\a.twinproj", OTHERRUN, "D:\\b.twinproj"], [PROBE1, "D:\\a.twinproj", "D:\\b.twinproj"],
      ["D:\\a.twinproj", "D:\\b.twinproj"]],
  ];
  for (const [what, found, afterRun, expected] of recentCases) {
    setValues(ROOT + "\\RecentlyOpened", slots(found));
    const s = R.snapshotProjects([], { root: ROOT });
    setValues(ROOT + "\\RecentlyOpened", slots(afterRun));
    R.restoreProjects(s, { prefixes: [TEMPDIR] });
    assert.deepEqual(R.ideLists({ root: ROOT }).recentlyOpened, Object.values(slots(expected)), what);
    assert.equal(R.restoreProjects(s, { prefixes: [TEMPDIR] }).recentlyOpened, 0, `${what}: idempotent`);
  }
  // A sweep with no list in hand, as startTidy makes first, only deletes.
  setValues(ROOT + "\\RecentlyOpened", slots([PROBE1, "D:\\x.twinproj", "D:\\x.twinproj"]));
  R.restoreProjects({ root: ROOT, entries: [] }, { prefixes: [TEMPDIR] });
  assert.deepEqual(
    R.ideLists({ root: ROOT }).recentlyOpened,
    Object.values(slots(["D:\\x.twinproj", "D:\\x.twinproj"])),
    "a sweep with no snapshot only deletes",
  );

  // ------------------------------------------------ remembered build targets
  const SETTINGS = ROOT + "\\IDESettings";
  const MEMORY = "targetArchitectureMemory";
  const PROBE = TEMPDIR + "\\tbrun-probe.twinproj";
  const PROBE_FWD = TEMPDIR.split("\\").join("/") + "/src/x.twinproj";
  const memory = { [USER]: "win64", [PROBE]: "win64", [LOOKALIKE]: "win64", [PROBE_FWD]: "win32", [OTHER]: "win32" };
  setValues(SETTINGS, { [MEMORY]: JSON.stringify(memory) });
  assert.equal(
    R.sweepArchitectureMemory([TEMPDIR], { root: ROOT }),
    2,
    "both of the run's entries are deleted, whichever separator they use",
  );
  assert.equal(
    readValue(SETTINGS, MEMORY),
    JSON.stringify({ [USER]: "win64", [LOOKALIKE]: "win64", [OTHER]: "win32" }),
    "every other entry is kept, in its order, written as the IDE writes it",
  );
  assert.equal(R.sweepArchitectureMemory([TEMPDIR], { root: ROOT }), 0, "a second sweep deletes nothing");
  setValues(SETTINGS, { [MEMORY]: "{not json" });
  assert.equal(R.sweepArchitectureMemory([TEMPDIR], { root: ROOT }), 0);
  assert.equal(readValue(SETTINGS, MEMORY), "{not json", "a value that is not JSON is left alone");
  deleteValues(SETTINGS, [MEMORY]);
  assert.equal(R.sweepArchitectureMemory([TEMPDIR], { root: ROOT }), 0, "no value, nothing to do");
  assert.throws(() => R.sweepArchitectureMemory(["C:\\"], { root: ROOT }), /outside/);

  // A named project's target, which a run switches: tbbuild --arch on the
  // user's own project. The IDE saves the switch under the path as it was
  // given, which need not be spelled as the user's IDE spelled it.
  const kept = { [OTHER]: "win32", [USER]: "win64", "D:\\z.twinproj": "win64" };
  setValues(SETTINGS, { [MEMORY]: JSON.stringify(kept) });
  const targets = R.snapshotArchitectureMemory([USER, NEWPROJ], { root: ROOT });
  setValues(SETTINGS, {
    [MEMORY]: JSON.stringify({ ...kept, [USER]: "win32", [NEWPROJ]: "win64", [USER.toLowerCase()]: "win32" }),
  });
  assert.equal(
    R.restoreArchitectureMemory(targets),
    3,
    "the user's entry gets its value back; the run's other spelling of it, and its new project's, go",
  );
  assert.equal(readValue(SETTINGS, MEMORY), JSON.stringify(kept), "every entry as it was, in its order");
  assert.equal(R.restoreArchitectureMemory(targets), 0, "a second restore writes nothing");
  setValues(SETTINGS, { [MEMORY]: JSON.stringify({ [OTHER]: "win32", "D:\\z.twinproj": "win64" }) });
  assert.equal(R.restoreArchitectureMemory(targets), 1);
  assert.deepEqual(JSON.parse(readValue(SETTINGS, MEMORY)), kept, "an entry the run deleted comes back");
  // ...and the same through the whole tidy.
  setValues(SETTINGS, { [MEMORY]: JSON.stringify(kept) });
  const named = R.startTidy({ root: ROOT, keys: [ASSOC], paths: [USER] });
  setValues(SETTINGS, { [MEMORY]: JSON.stringify({ ...kept, [USER]: "win32" }) });
  assert.equal(R.finishTidy(named).architecture, 1);
  assert.equal(readValue(SETTINGS, MEMORY), JSON.stringify(kept), "finishTidy puts a named project's target back");

  // ------------------------------------------------ the theme
  // The IDE's options, written as the IDE writes them; a run switches the
  // theme, and the user changes another option meanwhile, which is kept.
  const asIde = (o) => JSON.stringify(o, undefined, "\t");
  const options = { colorTheme: "Dark", fontSize: 14 };
  setValues(SETTINGS, { GENERAL: asIde(options) });
  const themed = R.startTidy({ root: ROOT, keys: [ASSOC] });
  setValues(SETTINGS, { GENERAL: asIde({ colorTheme: "light", fontSize: 16 }) });
  assert.equal(R.finishTidy(themed).theme, 1);
  assert.equal(readValue(SETTINGS, "GENERAL"), asIde({ colorTheme: "Dark", fontSize: 16 }), "the theme comes back");
  assert.equal(R.restoreTheme(themed.theme), 0, "a second restore writes nothing");
  setValues(SETTINGS, { GENERAL: asIde({ fontSize: 14 }) });
  const unset = R.snapshotTheme({ root: ROOT });
  setValues(SETTINGS, { GENERAL: asIde({ fontSize: 14, colorTheme: "light" }) });
  assert.equal(R.restoreTheme(unset), 1);
  assert.equal(readValue(SETTINGS, "GENERAL"), asIde({ fontSize: 14 }), "a theme the run set where none was goes");
  setValues(SETTINGS, { GENERAL: "{not json" });
  assert.equal(R.restoreTheme(themed.theme), 0);
  assert.equal(readValue(SETTINGS, "GENERAL"), "{not json", "options that are not JSON are left alone");
  deleteValues(SETTINGS, ["GENERAL"]);

  // ------------------------------------------------ an association another run's copy held
  // startTidy and finishTidy, the whole tidy, on the scratch keys.
  const COMMAND = ASSOC + "\\shell\\open\\command";
  const REAL = '"C:\\IDE\\twinBASIC.exe" "%1"';
  const COPY = `"${path.join(tmpdir(), "tbaddin", "9870", "ide", "twinBASIC.exe")}" "%1"`;
  setValues(COMMAND, { "": COPY }); // another run's copy has it
  const dirty = R.startTidy({ root: ROOT, keys: [ASSOC] });
  setValues(COMMAND, { "": REAL }); // an IDE from a real install takes it back
  assert.equal(R.finishTidy(dirty).association, null);
  assert.equal(readValue(COMMAND, ""), REAL, "an association naming the temp folder is never put back");
  const clean = R.startTidy({ root: ROOT, keys: [ASSOC] });
  setValues(COMMAND, { "": COPY }); // this run's copy takes it
  assert.ok(R.finishTidy(clean).association >= 1);
  assert.equal(readValue(COMMAND, ""), REAL, "one that did not is put back");

  // ------------------------------------------------ two runs at once
  // Run A starts on the user's list; run B starts while A runs and ends first,
  // so it puts nothing back. A's IDE, still open, writes B's entry back after
  // that -- the IDE writes its whole list from memory. A ends last and puts
  // back for both.
  const RUNS = path.join(tmpdir(), "tbharness-selftest-Łukasz", "tbide");
  const DIR_A = path.join(RUNS, "9661");
  const DIR_B = path.join(RUNS, "9662");
  const IN_A = path.join(DIR_A, "project.twinproj");
  const IN_B = path.join(DIR_B, "project.twinproj");
  const RECENT = ROOT + "\\RecentlyOpened";
  const runsLeft = () => {
    const lists = R.ideLists({ root: ROOT });
    return [...lists.projectState, ...lists.recentlyOpened].filter((p) => p?.startsWith(RUNS));
  };
  setValues(RECENT, slots([USER, OTHER]));
  const runA = R.startTidy({ root: ROOT, keys: [ASSOC], prefixes: [DIR_A] });
  const runB = R.startTidy({ root: ROOT, keys: [ASSOC], prefixes: [DIR_B] });
  setValues(RECENT, slots([IN_B, IN_A, USER, OTHER]));
  setValues(ROOT + "\\ProjectState", { [IN_A]: "{}", [IN_B]: "{}" });
  const deferred = R.finishTidy(runB);
  assert.deepEqual(deferred, { deferred: [process.pid] }, "a run that ends while another runs puts nothing back");
  assert.equal(R.finishTidy(runB), deferred, "a second finishTidy returns what the first did");
  assert.deepEqual(runsLeft().sort(), [IN_A, IN_A, IN_B, IN_B].sort(), "so both runs' entries are still there");
  const last = R.finishTidy(runA);
  assert.ok(last && !last.deferred, "the last run to end puts back");
  assert.deepEqual(runsLeft(), [], "for both runs");
  assert.deepEqual(
    R.ideLists({ root: ROOT }).recentlyOpened.filter(Boolean),
    [USER, OTHER],
    "the user's list as found",
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
  setValues(RECENT, slots([IN_B, USER, OTHER]));
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
