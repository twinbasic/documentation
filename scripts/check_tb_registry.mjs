// Self-test for scripts/lib/tb-registry.mjs, the harness's registry tidy.
//
//     node scripts/check_tb_registry.mjs
//
// Exit: 0 every assertion held, 1 one did not.
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
//   * the association keys: a value changed, one added, one deleted, a subkey
//     added, and a key that did not exist before created by the run;
//   * that a second restore writes nothing at all;
//   * the guards: a key near the root and a sweep outside the temp folder
//     refused, and an error raised inside PowerShell arriving as a sentence;
//   * the ownership rule: a dead owner does not block tidying, a live one makes
//     a child defer.

import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as R from "./lib/tb-registry.mjs";

const BASE = "Software\\tbharness-selftest";
const ROOT = BASE + "\\twinBASIC_IDE";
const ASSOC = BASE + "\\Classes\\twinBASIC.ProjectFile";
const ABSENT = BASE + "\\Classes\\.notthere";

// Setup and teardown through .NET, the request on stdin, so the test data can
// hold the same characters the module has to survive.
function ps(script, input) {
  const enc = Buffer.from("$ErrorActionPreference='Stop';$ProgressPreference='SilentlyContinue';" +
    "$u=New-Object System.Text.UTF8Encoding $false;[Console]::InputEncoding=$u;" +
    "$in=[Console]::In.ReadToEnd()|ConvertFrom-Json;" +
    "$hk=[Microsoft.Win32.Registry]::CurrentUser;" + script, "utf16le").toString("base64");
  execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", enc],
    { input: JSON.stringify(input ?? {}), stdio: ["pipe", "ignore", "inherit"] });
}
const wipe = () => ps("if ($hk.OpenSubKey($in.base)) { $hk.DeleteSubKeyTree($in.base) }", { base: BASE });
// Pairs rather than an object: PowerShell 5.1's ConvertFrom-Json refuses an
// empty property name, and a key's default value is named by the empty string.
const setValues = (key, values) => ps(
  "$k=$hk.CreateSubKey($in.key); foreach ($p in @($in.pairs)) " +
  "{ $k.SetValue([string]$p.n, [string]$p.v, 'String') }; $k.Close()",
  { key, pairs: Object.entries(values).map(([n, v]) => ({ n, v })) });
const deleteValues = (key, names) => ps(
  "$k=$hk.OpenSubKey($in.key, $true); foreach ($n in $in.names) { $k.DeleteValue($n) }; $k.Close()",
  { key, names });

const USER = "D:\\work\\Real Project\\Mine.twinproj";
const OTHER = "D:\\work\\Other\\Other.twinproj";
const NEWPROJ = "D:\\work\\Scratch\\Made By Run.twinproj";
// Inside the real temp folder -- the module refuses to sweep anywhere else --
// under a name outside every console code page.
const TEMPDIR = path.join(tmpdir(), "tbharness-selftest-Łukasz", "tbrun", "9346");
const LOOKALIKE = path.join(tmpdir(), "tbharness-selftest-Łukasz", "tbrun", "93460", "y.twinproj");
const slots = (list) => Object.fromEntries(
  Array.from({ length: 21 }, (_, i) => [String(i), list[i] ?? ""]));

wipe();
try {
  // ------------------------------------------------ before the "run"
  setValues(ROOT + "\\ProjectState", { [USER]: "USER-STATE", [OTHER]: "OTHER-STATE" });
  const recentBefore = ["D:\\a.twinproj", "D:\\b.twinproj", OTHER, USER, "D:\\c.twinproj"];
  setValues(ROOT + "\\RecentlyOpened", slots(recentBefore));
  setValues(ASSOC, { "": "twinBASIC Project" });
  setValues(ASSOC + "\\shell\\open\\command", { "": "\"C:\\IDE\\twinBASIC.exe\" \"%1\"" });
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
    [USER]: "RUN-STATE",                                         // the IDE rewrote it
    [NEWPROJ]: "NEW",                                            // the run created it
    [TEMPDIR + "\\tbrun-probe.twinproj"]: "T1",
    [TEMPDIR.split("\\").join("/") + "/src/x.twinproj"]: "T2",   // forward slashes
    [LOOKALIKE]: "NOT-MINE",
  });
  setValues(ROOT + "\\RecentlyOpened", slots([
    TEMPDIR + "\\tbrun-probe.twinproj", NEWPROJ, USER,
    "D:\\a.twinproj", "D:\\b.twinproj", OTHER, "D:\\c.twinproj",
  ]));
  setValues(ASSOC + "\\shell\\open\\command", { "": "\"C:\\Temp\\copy\\twinBASIC.exe\" \"%1\"" });
  setValues(ASSOC, { Extra: "added by run" });
  deleteValues(ASSOC + "\\DefaultIcon", [""]);
  setValues(ASSOC + "\\ShellNew", { FileName: "C:\\Temp\\copy\\x.twinproj" });
  setValues(ABSENT, { "": "created by run" });

  // ------------------------------------------------ put it back
  R.restoreProjects(snap, { prefixes: [TEMPDIR] });
  const writes = R.restoreKeys(keys);
  const after = R.ideLists({ root: ROOT });
  assert.deepEqual(after.recentlyOpened, Object.values(slots(recentBefore)),
    "the recent list is exactly as it was, padded to 21 slots");
  assert.deepEqual(after.projectState.slice().sort(), [OTHER, USER, LOOKALIKE].sort(),
    "the run's entries are gone; the user's, and a lookalike folder's, are kept");
  assert.equal(R.snapshotProjects([USER], { root: ROOT }).entries[0].state, "USER-STATE",
    "the user's project has its old state back");
  assert.deepEqual(R.snapshotKeys([ASSOC, ABSENT]), keys, "the association keys are as they were");
  assert.ok(writes >= 5, `association writes counted (${writes})`);

  // Idempotent: nothing is left to put back, so nothing may be written.
  assert.deepEqual(R.restoreProjects(snap, { prefixes: [TEMPDIR] }), { projectState: 0, recentlyOpened: 0 });
  assert.equal(R.restoreKeys(keys), 0);

  // ------------------------------------------------ the guards
  assert.throws(() => R.restoreKeys([{ path: "Software", snap: null }]), /close to the root/);
  assert.throws(() => R.snapshotKeys(["Software\\Classes"]), /close to the root/);
  assert.throws(() => R.restoreProjects({ root: ROOT, entries: [] }, { prefixes: ["C:\\"] }),
    /outside/);
  assert.throws(() => R.restoreProjects({ root: ROOT, entries: [] }, { prefixes: [tmpdir()] }),
    /outside/, "the temp folder itself is not a sweepable prefix");
  assert.throws(
    () => R.restoreKeys([{ path: BASE + "\\Classes\\bad",
      snap: { values: [{ name: "x", kind: "NotAKind", data: "1" }], keys: [] } }]),
    (e) => /registry restoreKeys failed: .*NotAKind/.test(e.message) && !/CLIXML/.test(e.message));

  // ------------------------------------------------ the ownership rule
  // Pid 1 is never a live process on Windows, so it stands for a dead owner.
  // startTidy with no paths and no prefixes only reads the real IDE keys.
  process.env.TB_REGISTRY_OWNER = "1";
  assert.ok(R.startTidy(), "a dead owner does not block tidying");
  assert.equal(process.env.TB_REGISTRY_OWNER, String(process.pid));
  const lib = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)),
    "lib", "tb-registry.mjs")).href;
  const child = execFileSync(process.execPath, ["-e",
    `import(${JSON.stringify(lib)}).then(m => console.log(m.startTidy() === null ? "deferred" : "took over"))`],
    { encoding: "utf8", env: process.env }).trim();
  assert.equal(child, "deferred", "a child of a live owner leaves the registry alone");

  console.log("check_tb_registry: every assertion holds");
} catch (e) {
  console.error(`check_tb_registry: ${e.message}`);
  process.exitCode = 1;
} finally {
  wipe();
}
