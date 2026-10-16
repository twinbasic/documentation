// What a harness run leaves in the user's registry, and putting it back.
//
// Every IDE a harness starts is given `--no-save-ide-settings` and
// `--no-update-recent-files` (IDE_FLAGS in tb-ide.mjs; BETA 1007 and later),
// which keep it from writing its options, its recent list, its panel layouts,
// the build target it remembers for a project and the licence answers to the
// same HKCU keys as the user's own IDE. Two kinds of write are not guarded,
// and this module puts those back:
//
//   * The IDE records each project it opens under
//     `VB and VBA Program Settings\twinBASIC_IDE\ProjectState` (open tabs, watch
//     expressions, DEBUG CONSOLE history). Left alone, harness temp projects
//     fill ProjectState.
//   * An IDE started from an install the association does not point at
//     re-points `.twinproj` at itself, which matters once a harness runs
//     private copies of the IDE (WIP.HelpAddin.md, Stage 1 item 2).
//
// The rule is: leave everything as it was found.
//
//   * A project the run opened that had no entry before loses the entry. One
//     that had an entry -- tbbuild pointed at the user's own project -- gets
//     its old state back. Deleting that one would throw away somebody's open
//     tabs and watches.
//   * Everything under a folder the harness owns (its own temp work folders)
//     is deleted by prefix, which also catches what an earlier run left when
//     it died before tidying.
//   * The association keys are put back value by value, and only where they
//     differ, so an untouched key is never written --- unless they named the
//     temp folder when the run began, because then they were another run's
//     IDE copy's, and putting them back would point at a deleted folder. They
//     are then put back pointing at the newest install on the Desktop
//     (findIde; owner, 2026-10-10), and left as they are only when there is none.
//
// The recent list, the remembered build targets and the theme are not put
// back: the flags keep the IDE from writing them. ideLists and
// rememberedTargets read them, for the lane runner's check that the flags did
// their work.
//
// ONE PROCESS OWNS THIS PER RUN. check_examples and sweep_attributes build many
// projects at once, in one process (lib/tb-build.mjs, which never tidies); each
// snapshotting and restoring on its own would put back whichever state it
// happened to see, in whichever order the lanes finished. The first process to
// call startTidy sets TB_REGISTRY_OWNER, which a child process inherits, so a
// tbbuild started from it would leave the registry alone too; the owner sweeps
// once at the end.
//
// THE LAST RUN PUTS BACK FOR EVERY RUN. Two runs at once -- two ide_test, or a
// tbrun beside a lane run -- cannot each put back on their own: the association
// a run found may be another run's IDE copy's, and one run's IDE that is still
// open writes its project's state after the other run removed it. So the runs
// share one record, in %TEMP%\tb-registry\<key>: the first run to start writes
// what it finds (base.json: the association keys), each run adds its own
// folders and named projects (<pid>-<n>.json), and a run that ends while
// another is still running only marks its own record finished. The last one to
// end puts back for all of them, once no IDE of any of them is running. A
// record whose process ended without finishing is the trace of a run that died:
// the next run to start alone deletes what is under its folders, and nothing
// else, since its record of the association may be days old.
// Runs read and write the folder one at a time, holding its `busy` folder.
//
// The work is done by .NET's registry API through PowerShell, and not by
// reg.exe. reg.exe prints value names in the console code page when its output
// is piped, so a path with a character outside that code page -- an accented
// user name in %TEMP% is enough -- comes back mangled, and a value cannot be
// deleted by a name that no longer matches it. The request goes in on stdin as
// UTF-8 JSON, because a project's saved state can reach 34 KB and an
// environment variable stops at 32 K characters; the answer comes back on
// stdout the same way. Like tb-launch.ps1, it is passed with -EncodedCommand
// rather than run as a file, so no execution policy is involved.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findIde } from "./tb-install.mjs";

export const IDE_SETTINGS_KEY = "Software\\VB and VBA Program Settings\\twinBASIC_IDE";
export const ASSOCIATION_KEYS = ["Software\\Classes\\.twinproj", "Software\\Classes\\twinBASIC.ProjectFile"];

// No `${` and no backtick anywhere in this script: it is a JavaScript template
// literal, and either one would end or splice it. A registry path separator is
// $SEP rather than a backslash typed into a path for the same reason: String.raw
// keeps backslashes, but a separator spelled once is harder to get wrong.
//
// Progress is silenced because with its streams redirected PowerShell writes
// progress records to stderr as CLIXML ("Preparing modules for first use"), and
// a failure is answered as {"error": ...} on stdout for the same reason: an
// error on stderr arrives wrapped in that XML, and its first line reads
// "#< CLIXML" rather than anything a person can act on.
const SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$utf8 = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$hk = [Microsoft.Win32.Registry]::CurrentUser
$SEP = [string][char]92
$String = [Microsoft.Win32.RegistryValueKind]::String

function Norm([string]$p) { return $p.Replace('/', $SEP).ToLowerInvariant() }

function Slots($k) {
  return @($k.GetValueNames() | Where-Object { $_ -match '^\d+$' } | Sort-Object { [int]$_ })
}

function Lists([string]$root) {
  $out = [ordered]@{ projectState = @(); recentlyOpened = @() }
  $k = $hk.OpenSubKey($root + $SEP + 'ProjectState')
  if ($k) { $out.projectState = @($k.GetValueNames() | Sort-Object); $k.Close() }
  $k = $hk.OpenSubKey($root + $SEP + 'RecentlyOpened')
  if ($k) {
    $out.recentlyOpened = @(@(Slots $k) | ForEach-Object { [string]$k.GetValue($_) })
    $k.Close()
  }
  return $out
}

function SnapProjects([string]$root, $paths) {
  $entries = @()
  $ps = $hk.OpenSubKey($root + $SEP + 'ProjectState')
  foreach ($p in @($paths)) {
    if (-not $p) { continue }
    $want = Norm $p
    $e = [ordered]@{ path = [string]$p; name = $null; state = $null }
    if ($ps) {
      foreach ($n in $ps.GetValueNames()) {
        if ((Norm $n) -eq $want) { $e.name = $n; $e.state = [string]$ps.GetValue($n); break }
      }
    }
    $entries += $e
  }
  if ($ps) { $ps.Close() }
  return [ordered]@{ root = $root; entries = $entries }
}

function RestoreProjects($snap, $prefixes) {
  $root = [string]$snap.root
  $entries = @($snap.entries)
  $exact = @{}
  foreach ($e in $entries) { $exact[(Norm ([string]$e.path))] = $e }
  $pre = @(@($prefixes) | Where-Object { $_ } | ForEach-Object { Norm ([string]$_) })
  $hit = {
    param([string]$p)
    if (-not $p) { return $false }
    $n = Norm $p
    if ($exact.ContainsKey($n)) { return $true }
    foreach ($x in $pre) { if ($n.StartsWith($x)) { return $true } }
    return $false
  }
  $stateWrites = 0

  $k = $hk.OpenSubKey($root + $SEP + 'ProjectState', $true)
  if ($k) {
    foreach ($n in $k.GetValueNames()) {
      if (-not (& $hit $n)) { continue }
      $e = $exact[(Norm $n)]
      # An entry that existed before the run keeps its own name and gets its
      # old state back; any other spelling of the same path is the run's.
      if ($e -and $e.name -and ($n -ceq [string]$e.name)) { continue }
      # $false: a concurrent run may have deleted it between the listing and
      # here, which once threw and abandoned the whole tidy.
      $k.DeleteValue($n, $false); $stateWrites++
    }
    foreach ($e in $entries) {
      if (-not $e.name) { continue }
      $name = [string]$e.name
      $had = @($k.GetValueNames()) -contains $name
      if (-not $had -or ([string]$k.GetValue($name) -cne [string]$e.state)) {
        $k.SetValue($name, [string]$e.state, $String); $stateWrites++
      }
    }
    $k.Close()
  }

  return [ordered]@{ projectState = $stateWrites }
}

function SnapKey([string]$path) {
  $k = $hk.OpenSubKey($path)
  if (-not $k) { return $null }
  $values = @(foreach ($n in $k.GetValueNames()) {
    $kind = $k.GetValueKind($n).ToString()
    $data = $k.GetValue($n, $null, 'DoNotExpandEnvironmentNames')
    if ($kind -eq 'Binary') { $data = [Convert]::ToBase64String([byte[]]$data) }
    [ordered]@{ name = $n; kind = $kind; data = $data }
  })
  $keys = @(foreach ($s in $k.GetSubKeyNames()) {
    [ordered]@{ name = $s; snap = (SnapKey ($path + $SEP + $s)) }
  })
  $k.Close()
  return [ordered]@{ values = $values; keys = $keys }
}

function SameData([string]$kind, $a, $b) {
  if ($kind -eq 'MultiString') { return ((@($a) -join [char]0) -ceq (@($b) -join [char]0)) }
  return ([string]$a -ceq [string]$b)
}

function RestoreKey([string]$path, $snap) {
  # Restoring deletes every value and subkey the snapshot does not list, so a
  # path near the root would be a disaster rather than a no-op. The JavaScript
  # side refuses one too; this is the check that cannot be bypassed from there.
  if (@($path.Split($SEP) | Where-Object { $_ }).Count -lt 3) {
    throw ('refusing to restore a key this close to the root: "' + $path + '"')
  }
  $existing = $hk.OpenSubKey($path)
  if ($null -eq $snap) {
    if ($existing) { $existing.Close(); $hk.DeleteSubKeyTree($path, $false); $script:changes++ }
    return
  }
  if ($existing) { $existing.Close() } else { $script:changes++ }
  $k = $hk.CreateSubKey($path)
  $want = @{}
  foreach ($v in @($snap.values)) { $want[[string]$v.name] = $true }
  foreach ($n in $k.GetValueNames()) {
    if (-not $want.ContainsKey($n)) { $k.DeleteValue($n, $false); $script:changes++ }
  }
  $names = @($k.GetValueNames())
  foreach ($v in @($snap.values)) {
    $name = [string]$v.name
    $kind = [string]$v.kind
    $data = $v.data
    if ($kind -eq 'Binary') { $data = [Convert]::FromBase64String([string]$v.data) }
    elseif ($kind -eq 'MultiString') { $data = [string[]]@($v.data) }
    elseif ($kind -eq 'DWord') { $data = [int]$v.data }
    elseif ($kind -eq 'QWord') { $data = [long]$v.data }
    $same = $false
    if ($names -contains $name) {
      $curKind = $k.GetValueKind($name).ToString()
      $cur = $k.GetValue($name, $null, 'DoNotExpandEnvironmentNames')
      $cmp = $data
      if ($curKind -eq 'Binary') { $cur = [Convert]::ToBase64String([byte[]]$cur); $cmp = [string]$v.data }
      $same = ($curKind -eq $kind) -and (SameData $kind $cur $cmp)
    }
    if (-not $same) {
      $k.SetValue($name, $data, [Microsoft.Win32.RegistryValueKind]$kind); $script:changes++
    }
  }
  $wantKeys = @{}
  foreach ($s in @($snap.keys)) { $wantKeys[[string]$s.name] = $true }
  foreach ($s in $k.GetSubKeyNames()) {
    if (-not $wantKeys.ContainsKey($s)) { $k.DeleteSubKeyTree($s, $false); $script:changes++ }
  }
  $k.Close()
  foreach ($s in @($snap.keys)) { RestoreKey ($path + $SEP + [string]$s.name) $s.snap }
}

function ReadValue([string]$path, [string]$name) {
  $out = [ordered]@{ exists = $false; data = $null }
  $k = $hk.OpenSubKey($path)
  if (-not $k) { return $out }
  if (@($k.GetValueNames()) -contains $name) { $out.exists = $true; $out.data = [string]$k.GetValue($name) }
  $k.Close()
  return $out
}

try {
  $req = [Console]::In.ReadToEnd() | ConvertFrom-Json
  switch ([string]$req.op) {
    'lists'            { $result = Lists ([string]$req.root) }
    'readValue'        { $result = ReadValue ([string]$req.key) ([string]$req.name) }
    'subkeys'          {
      $result = @()
      $k = $hk.OpenSubKey([string]$req.key)
      if ($k) { $result = @($k.GetSubKeyNames() | Sort-Object); $k.Close() }
    }
    'snapshotProjects' { $result = SnapProjects ([string]$req.root) $req.paths }
    'restoreProjects'  { $result = RestoreProjects $req.snapshot $req.prefixes }
    'snapshotKeys'     {
      $result = @(foreach ($p in @($req.keys)) { [ordered]@{ path = [string]$p; snap = (SnapKey ([string]$p)) } })
    }
    'restoreKeys'      {
      $script:changes = 0
      foreach ($e in @($req.snapshot)) { RestoreKey ([string]$e.path) $e.snap }
      $result = [ordered]@{ changes = $script:changes }
    }
    default            { throw ('unknown op: ' + [string]$req.op) }
  }
  ConvertTo-Json -InputObject ([ordered]@{ result = $result }) -Depth 16 -Compress
} catch {
  ConvertTo-Json -InputObject ([ordered]@{ error = $_.Exception.Message }) -Compress
}
`;

const ENCODED = Buffer.from(SCRIPT, "utf16le").toString("base64");

function request(req) {
  let out;
  try {
    out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", ENCODED], {
      input: JSON.stringify(req),
      encoding: "utf8",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    // PowerShell itself failed to run the script; the script's own errors come
    // back as {"error"} below.
    throw new Error(`registry ${req.op} failed: ${e.message.split(/\r?\n/)[0]}`);
  }
  // A byte-order mark would make JSON.parse refuse the answer; the script asks
  // for UTF-8 without one, and this makes sure.
  const answer = JSON.parse(out.replace(/^﻿/, ""));
  if (answer.error !== undefined) throw new Error(`registry ${req.op} failed: ${answer.error}`);
  return answer.result;
}

/**
 * The IDE's project-state names and its recent list, most recent first. Read
 * only: nothing here puts the recent list back, because an IDE started with
 * IDE_FLAGS does not write it.
 */
export function ideLists({ root = IDE_SETTINGS_KEY } = {}) {
  return request({ op: "lists", root });
}

/**
 * Record what the IDE holds for these projects now, so restoreProjects can put
 * it back. A project with no entry is recorded as having none.
 */
export function snapshotProjects(paths = [], { root = IDE_SETTINGS_KEY } = {}) {
  return request({ op: "snapshotProjects", root, paths: paths.map((p) => path.resolve(p)) });
}

/**
 * Put the snapshot's projects back as they were, and delete every entry under
 * the given folders. A snapshot of `{ root, entries: [] }` only deletes.
 *
 * @param {string[]} [o.prefixes]  folders inside the OS temp folder; anything
 *   else is refused, so that a caller passing the wrong folder cannot sweep
 *   away the state of the user's real projects
 * @returns {{projectState: number}} values written or deleted
 */
export function restoreProjects(snapshot, { prefixes = [] } = {}) {
  return request({ op: "restoreProjects", snapshot, prefixes: prefixes.map(asTempFolder) });
}

/** The names of a key's subkeys, sorted, and nothing else from under it; empty when there is no such key. */
export function subkeyNames(key) {
  return [].concat(request({ op: "subkeys", key }) ?? []);
}

/** Everything under these keys, values and subkeys, for restoreKeys. */
export function snapshotKeys(keys = ASSOCIATION_KEYS) {
  for (const k of keys) deepEnough(k);
  return request({ op: "snapshotKeys", keys });
}

/** Put the keys back as snapshotted, writing only what differs; returns the number of writes. */
export function restoreKeys(snapshot) {
  for (const e of snapshot) deepEnough(e.path);
  return request({ op: "restoreKeys", snapshot }).changes;
}

/** Where SaveSetting keeps every application's settings, an add-in's included. */
export const SETTINGS_ROOT = "Software\\VB and VBA Program Settings";

/**
 * The key SaveSetting writes an application's settings under. An add-in's
 * SaveSetting writes here too, so its settings are shared with any installed
 * copy of the same add-in, and a test that changes one changes the user's.
 *
 * The IDE's own application name is refused. That key holds all of the IDE's
 * settings, which a run's IDEs do not write (IDE_FLAGS in tb-ide.mjs); the
 * part of it they do write, ProjectState, is put back by startTidy and
 * finishTidy, never as a whole.
 */
export function settingsKey(app) {
  const name = String(app ?? "");
  if (!name || /[\\/]/.test(name)) throw new Error(`not a SaveSetting application name: "${name}"`);
  if (name.toLowerCase() === "twinbasic_ide") {
    throw new Error(
      "refusing the IDE's own settings key: a run's IDEs do not write it, " +
        "and the tidy puts back the project state they do",
    );
  }
  return `${SETTINGS_ROOT}\\${name}`;
}

/**
 * What SaveSetting has stored for an application, as `{ section: { name: value } }`,
 * or null when it has stored nothing.
 */
export function savedSettings(app) {
  const [entry] = snapshotKeys([settingsKey(app)]);
  if (!entry?.snap) return null;
  const out = {};
  for (const s of [].concat(entry.snap.keys ?? [])) {
    out[s.name] = Object.fromEntries([].concat(s.snap?.values ?? []).map((v) => [v.name, v.data]));
  }
  return out;
}

/**
 * Delete what SaveSetting has stored for these applications, so that their
 * next GetSetting returns its default. Snapshot the keys first
 * (`snapshotKeys(apps.map(settingsKey))`) to put them back afterwards.
 *
 * @returns {number} the number of writes
 */
export function deleteSettings(apps) {
  return restoreKeys(apps.map((a) => ({ path: settingsKey(a), snap: null })));
}

const ARCH_MEMORY = "targetArchitectureMemory";

/** A path as the harness compares those the IDE stores: backslashed and lower case. */
export const norm = (p) => String(p).split("/").join("\\").toLowerCase();

// An IDESettings value holding a JSON object, as that object, or null when
// there is no value or it is not a JSON object.
function readSettingObject(root, name) {
  const now = request({ op: "readValue", key: `${root}\\IDESettings`, name });
  if (!now.exists) return null;
  let object;
  try {
    object = JSON.parse(now.data);
  } catch {
    return null;
  }
  if (!object || typeof object !== "object" || Array.isArray(object)) return null;
  return { data: now.data, object };
}

/**
 * The project paths the IDE remembers a build target for, win32 or win64, in
 * its IDESettings\targetArchitectureMemory, optionally only those under these
 * folders. Read only: an IDE started with IDE_FLAGS does not write it, so the
 * lane runner uses this to check that none names a lane's folder.
 *
 * @param {string[]} [prefixes]  folders inside the OS temp folder, as for restoreProjects
 * @param {object} [o]
 * @param {string} [o.root]      the IDE's settings key
 * @returns {string[]}
 */
export function rememberedTargets(prefixes = null, { root = IDE_SETTINGS_KEY } = {}) {
  const pre = prefixes?.map((p) => norm(asTempFolder(p)));
  const paths = Object.keys(readSettingObject(root, ARCH_MEMORY)?.object ?? {});
  return pre ? paths.filter((p) => pre.some((x) => norm(p).startsWith(x))) : paths;
}

// Restoring a key deletes whatever the snapshot does not list, so a key near
// the root -- `Software`, `Software\Classes` -- would take everything under it.
// Three segments is the shallowest key this has any business restoring.
function deepEnough(key) {
  if (
    String(key ?? "")
      .split("\\")
      .filter(Boolean).length < 3
  ) {
    throw new Error(`refusing to snapshot or restore a key this close to the root: "${key}"`);
  }
}

// A folder prefix has to end in a separator, or tbrun's %TEMP%\tbrun\9346 would
// also claim %TEMP%\tbrun\93460. And it has to be inside the temp folder, which
// is the only place the harness creates projects.
function asTempFolder(p) {
  const r = path.resolve(p);
  const tmp = path.resolve(tmpdir());
  const rel = path.relative(tmp, r);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`refusing to sweep project entries outside ${tmp}: "${r}"`);
  }
  return r.endsWith(path.sep) ? r : r + path.sep;
}

/** Whether process.kill(pid, 0) finds a running process with this id. */
export function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Take charge of the registry for this run: record what is there, and clear
 * out what an earlier run on the same folders left behind.
 *
 * Returns null when another live process already owns the run -- a tbbuild
 * started by check_examples -- because the owner tidies for everybody. An
 * owner that is no longer running does not count: a variable left set in a
 * shell would otherwise switch tidying off for good.
 *
 * Never throws. Tidying is hygiene, and failing a compile over it would be
 * worse than the leftovers; a failure is said on stderr and the run goes on.
 *
 * @param {object} [o]
 * @param {string[]} [o.paths]     projects the run opens that may be the
 *                                 user's own, restored rather than deleted
 * @param {string[]} [o.prefixes]  folders only the harness writes to; every
 *                                 entry under them is deleted
 * @param {string} [o.root]        the IDE's settings key (default IDE_SETTINGS_KEY)
 * @param {string[]} [o.keys]      the association keys (default ASSOCIATION_KEYS);
 *                                 the self-test passes scratch keys for both
 */
export function startTidy({ paths = [], prefixes = [], root = IDE_SETTINGS_KEY, keys = ASSOCIATION_KEYS } = {}) {
  const owner = Number(process.env.TB_REGISTRY_OWNER);
  if (owner && owner !== process.pid && alive(owner)) return null;
  process.env.TB_REGISTRY_OWNER = String(process.pid);
  const dir = stateDir(root, keys);
  const tidy = { dir, file: path.join(dir, `${process.pid}-${++records}.json`), root };
  try {
    return oneAtATime(dir, () => {
      const others = readRecords(dir);
      const alone = !others.some((r) => r.live);
      if (alone) {
        const dead = [...new Set(others.flatMap((r) => r.prefixes ?? []))];
        if (dead.length) restoreProjects({ root, entries: [] }, { prefixes: dead });
        for (const r of others) rmSync(r.file, { force: true });
      }
      if (alone || !existsSync(path.join(dir, BASE))) {
        const base = { keys: snapshotKeys(keys) };
        base.keysInTemp = namesTempFolder(base.keys);
        writeFileSync(path.join(dir, BASE), JSON.stringify(base));
      }
      if (prefixes.length) restoreProjects({ root, entries: [] }, { prefixes });
      const record = { pid: process.pid, started: Date.now(), prefixes, finished: false };
      record.projects = snapshotProjects(paths, { root }).entries;
      writeFileSync(tidy.file, JSON.stringify(record));
      return tidy;
    });
  } catch (e) {
    console.error(`warning: the IDE's registry entries will not be tidied after this run: ${e.message}`);
    return null;
  }
}

/**
 * Put the registry back as startTidy found it, for this run and for every run
 * that ended while this one was running -- or, while another run is still
 * running, leave that to the last of them. Call it only once every IDE of the
 * run has exited -- shutdownIde waits for that. A second call returns what the
 * first did.
 *
 * @returns {{projectState: number, association: number | null}
 *           | {deferred: number[]} | null} what was written, or the pids of the
 *           runs still running, one of which will put it back; null on a failure,
 *           which is warned about
 */
export function finishTidy(tidy) {
  if (!tidy) return null;
  if (tidy.done !== undefined) return tidy.done;
  try {
    tidy.done = oneAtATime(tidy.dir, () => {
      const all = readRecords(tidy.dir);
      const waiting = all.filter((r) => r.live && r.file !== tidy.file);
      const mine = all.find((r) => r.file === tidy.file);
      if (mine) writeRecord({ ...mine, finished: true });
      if (waiting.length) return { deferred: [...new Set(waiting.map((r) => r.pid))] };
      const done = putBackAll(tidy, all);
      if (done) {
        for (const r of all) rmSync(r.file, { force: true });
        rmSync(path.join(tidy.dir, BASE), { force: true });
      }
      return done;
    });
  } catch (e) {
    console.error(`warning: could not tidy the IDE's registry entries after this run: ${e.message}`);
    tidy.done = null;
  }
  return tidy.done;
}

// What finishTidy does as the last run: every run's folders swept, every
// run's named projects put back -- the oldest record of a project is the one
// made before any run touched it -- and the association as the first run found
// it. Null when they could not be put back; the records are then kept, and the
// next run to start alone sweeps their folders.
function putBackAll(tidy, all) {
  let base = null;
  try {
    base = JSON.parse(readFileSync(path.join(tidy.dir, BASE), "utf8"));
  } catch {
    // no record of how the first run found it: the folders are still swept
  }
  const prefixes = [...new Set(all.flatMap((r) => r.prefixes ?? []))];
  const seen = new Set();
  const entries = [];
  for (const e of all.flatMap((r) => r.projects ?? [])) {
    if (seen.has(norm(e.path))) continue;
    seen.add(norm(e.path));
    entries.push(e);
  }
  let done;
  try {
    const p = restoreProjects({ root: tidy.root, entries }, { prefixes });
    // An association that named the temp folder when the run began belonged to
    // another run's copy of the IDE (tb-ide-copy.mjs), which will be deleted:
    // putting it back would point .twinproj files at nothing. It is put back
    // pointing at the newest install instead, which is what that install's IDE
    // would write when next started; with no install found it is left as the
    // IDEs set it.
    let keys = base?.keys;
    if (base?.keysInTemp) {
      keys = repointAtInstall(base.keys, findIde());
      console.error(
        keys
          ? "note: the .twinproj association pointed into the temp folder when this run " +
              "began, at another run's copy of the IDE; it now points at the newest install"
          : "note: the .twinproj association pointed into the temp folder when this run " +
              "began, at another run's copy of the IDE, and no install was found, so it is left as it is now",
      );
    }
    done = { ...p, association: keys ? restoreKeys(keys) : null };
  } catch (e) {
    console.error(`warning: could not tidy the IDE's registry entries after this run: ${e.message}`);
    return null;
  }
  return done;
}

const STATE = path.join(tmpdir(), "tb-registry");
const BASE = "base.json";
// A put-back is a few PowerShell starts, seconds at most, so a busy folder this
// old was left by a run that ended while it held it.
const BUSY_STALE_MS = 120_000;
let records = 0;

// The shared record's folder. The self-test's scratch keys get one of their
// own, so it never joins a real run.
function stateDir(root, keys) {
  const key = createHash("sha1")
    .update([root, ...keys].join("\0"))
    .digest("hex")
    .slice(0, 12);
  return path.join(STATE, key);
}

// Runs fn while no other run reads or writes the shared record. Synchronous,
// as startTidy and finishTidy are, so it waits with Atomics.wait.
function oneAtATime(dir, fn) {
  mkdirSync(dir, { recursive: true });
  const busy = path.join(dir, "busy");
  for (;;) {
    try {
      mkdirSync(busy);
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    try {
      if (Date.now() - statSync(busy).mtimeMs > BUSY_STALE_MS) rmSync(busy, { recursive: true, force: true });
    } catch {
      // removed since
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  try {
    return fn();
  } finally {
    rmSync(busy, { recursive: true, force: true });
  }
}

// Every run's record, oldest first, with the file it is in and whether its run
// is still running: not finished, and its process alive. One that will not
// parse was being written when its run died, and only its file is kept.
function readRecords(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (!/^\d+-\d+\.json$/.test(name)) continue;
    const file = path.join(dir, name);
    try {
      const r = JSON.parse(readFileSync(file, "utf8"));
      out.push({ ...r, file, live: !r.finished && alive(r.pid) });
    } catch {
      out.push({ file, live: false, started: 0 });
    }
  }
  return out.sort((a, b) => a.started - b.started);
}

function writeRecord({ file, live, ...record }) {
  writeFileSync(file, JSON.stringify(record));
}

// Whether any value in a key snapshot names a path inside the temp folder.
function namesTempFolder(snapshot) {
  const tmp = norm(path.resolve(tmpdir())) + "\\";
  const named = (snap) =>
    !!snap &&
    ([].concat(snap.values ?? []).some((v) => [].concat(v?.data ?? []).some((d) => norm(d).includes(tmp))) ||
      [].concat(snap.keys ?? []).some((k) => named(k?.snap)));
  return [].concat(snapshot ?? []).some((e) => named(e?.snap));
}

// The association snapshot with every path to an IDE copy in the temp folder
// (`...\Temp\...\twinBASIC.exe`) replaced by `exe`, another value left as it is.
// Null when there is no install, or when it is itself in the temp folder (TB_IDE
// naming a copy).
export function repointAtInstall(snapshot, exe) {
  const tmp = norm(path.resolve(tmpdir())) + "\\";
  if (!exe || norm(path.resolve(exe)).includes(tmp)) return null;
  const fix = (d) => {
    if (typeof d !== "string") return d;
    const at = norm(d).indexOf(tmp);
    if (at < 0) return d;
    const end = d.toLowerCase().indexOf("\\twinbasic.exe", at);
    return end < 0 ? d : d.slice(0, at) + exe + d.slice(end + "\\twinbasic.exe".length);
  };
  const snap = (s) =>
    s && {
      ...s,
      ...(s.values
        ? { values: s.values.map((v) => ({ ...v, data: Array.isArray(v.data) ? v.data.map(fix) : fix(v.data) })) }
        : {}),
      ...(s.keys ? { keys: s.keys.map((k) => ({ ...k, snap: snap(k.snap) })) } : {}),
    };
  return snapshot.map((e) => ({ ...e, snap: snap(e.snap) }));
}
