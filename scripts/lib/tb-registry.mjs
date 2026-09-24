// What a harness run leaves in the user's registry, and putting it back.
//
// Every IDE a harness starts writes to the same HKCU keys as the user's own
// IDE. It records each project it opens under
// `VB and VBA Program Settings\twinBASIC_IDE\ProjectState` (open tabs, watch
// expressions, DEBUG CONSOLE history) and puts it at the top of
// `...\RecentlyOpened`. Measured on 2026-09-23, before this module existed,
// 318 of 424 ProjectState values were harness temp projects, and all 21 slots
// of the recent list were: the user's own recent projects had been pushed out
// of the IDE entirely. An IDE started from an install the association does not
// point at also re-points `.twinproj` at itself, which matters once a harness
// runs private copies of the IDE (WIP.HelpAddin.md, Stage 1 item 2).
//
// The rule is: leave everything as it was found.
//
//   * A project the run opened that had no entry before loses the entry. One
//     that had an entry -- tbbuild pointed at the user's own project -- gets
//     its old state back, and its old place in the recent list. Deleting
//     that one would throw away somebody's open tabs and watches.
//   * Everything under a folder the harness owns (its own temp work folders)
//     is deleted by prefix, which also catches what an earlier run left when
//     it died before tidying.
//   * The association keys are put back value by value, and only where they
//     differ, so an untouched key is never written.
//   * The build target the IDE remembers for each project path is deleted for
//     every path under those folders, before the run and after it
//     (sweepArchitectureMemory says why).
//
// ONE PROCESS OWNS THIS PER RUN. check_examples starts many tbbuild processes
// at once; each snapshotting and restoring on its own would put back whichever
// state it happened to see, in whichever order the lanes finished. The first
// process to call startTidy sets TB_REGISTRY_OWNER, the children inherit it and
// leave the registry alone, and the owner sweeps once at the end.
//
// The work is done by .NET's registry API through PowerShell, and not by
// reg.exe. reg.exe prints value names in the console code page when its output
// is piped, so a path with a character outside that code page -- an accented
// user name in %TEMP% is enough -- comes back mangled, and a value cannot be
// deleted by a name that no longer matches it. The request goes in on stdin as
// UTF-8 JSON, because a project's saved state can reach 34 KB and an
// environment variable stops at 32 K characters; the answer comes back on
// stdout the same way. Like tb-launch.ps1 and tbrun's process snapshot, it is
// passed with -EncodedCommand, so no execution policy is involved.

import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

export const IDE_SETTINGS_KEY = "Software\\VB and VBA Program Settings\\twinBASIC_IDE";
export const ASSOCIATION_KEYS = [
  "Software\\Classes\\.twinproj",
  "Software\\Classes\\twinBASIC.ProjectFile",
];

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
  $ro = $hk.OpenSubKey($root + $SEP + 'RecentlyOpened')
  $recent = @()
  if ($ro) { $recent = @(@(Slots $ro) | ForEach-Object { [string]$ro.GetValue($_) } | Where-Object { $_ }) }
  foreach ($p in @($paths)) {
    if (-not $p) { continue }
    $want = Norm $p
    $e = [ordered]@{ path = [string]$p; name = $null; state = $null; recentIndex = -1; recentValue = $null }
    if ($ps) {
      foreach ($n in $ps.GetValueNames()) {
        if ((Norm $n) -eq $want) { $e.name = $n; $e.state = [string]$ps.GetValue($n); break }
      }
    }
    for ($i = 0; $i -lt $recent.Count; $i++) {
      if ((Norm $recent[$i]) -eq $want) { $e.recentIndex = $i; $e.recentValue = $recent[$i]; break }
    }
    $entries += $e
  }
  if ($ps) { $ps.Close() }
  if ($ro) { $ro.Close() }
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
  $recentWrites = 0

  $k = $hk.OpenSubKey($root + $SEP + 'ProjectState', $true)
  if ($k) {
    foreach ($n in $k.GetValueNames()) {
      if (-not (& $hit $n)) { continue }
      $e = $exact[(Norm $n)]
      # An entry that existed before the run keeps its own name and gets its
      # old state back; any other spelling of the same path is the run's.
      if ($e -and $e.name -and ($n -ceq [string]$e.name)) { continue }
      # $false: a concurrent run may have deleted it between the listing and
      # here, which once threw and abandoned the whole tidy, recent list and all.
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

  $k = $hk.OpenSubKey($root + $SEP + 'RecentlyOpened', $true)
  if ($k) {
    $slots = @(Slots $k)
    $vals = @($slots | ForEach-Object { [string]$k.GetValue($_) })
    $list = New-Object System.Collections.ArrayList
    foreach ($v in $vals) { if ($v -and -not (& $hit $v)) { [void]$list.Add($v) } }
    $back = @($entries | Where-Object { [int]$_.recentIndex -ge 0 } | Sort-Object { [int]$_.recentIndex })
    foreach ($e in $back) {
      $list.Insert([Math]::Min([int]$e.recentIndex, $list.Count), [string]$e.recentValue)
    }
    $changed = $false
    for ($i = 0; $i -lt $slots.Count; $i++) {
      $v = ''
      if ($i -lt $list.Count) { $v = [string]$list[$i] }
      if ($v -cne $vals[$i]) { $changed = $true }
    }
    if ($changed) {
      for ($i = 0; $i -lt $slots.Count; $i++) {
        $v = ''
        if ($i -lt $list.Count) { $v = [string]$list[$i] }
        if ($v -cne $vals[$i]) { $k.SetValue($slots[$i], $v, $String); $recentWrites++ }
      }
    }
    $k.Close()
  }
  return [ordered]@{ projectState = $stateWrites; recentlyOpened = $recentWrites }
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

# Written only if the value still holds what the caller read, so that a value
# an IDE saved in the meantime is never overwritten with an older copy.
function WriteValueIf([string]$path, [string]$name, [string]$expected, [string]$data) {
  $k = $hk.OpenSubKey($path, $true)
  if (-not $k) { return [ordered]@{ written = $false } }
  $same = (@($k.GetValueNames()) -contains $name) -and ([string]$k.GetValue($name) -ceq $expected)
  if ($same) { $k.SetValue($name, $data, $String) }
  $k.Close()
  return [ordered]@{ written = $same }
}

try {
  $req = [Console]::In.ReadToEnd() | ConvertFrom-Json
  switch ([string]$req.op) {
    'lists'            { $result = Lists ([string]$req.root) }
    'readValue'        { $result = ReadValue ([string]$req.key) ([string]$req.name) }
    'writeValueIf'     {
      $result = WriteValueIf ([string]$req.key) ([string]$req.name) ([string]$req.expected) ([string]$req.data)
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
      input: JSON.stringify(req), encoding: "utf8", windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
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

/** The IDE's project-state names and its recent list, most recent first. */
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
 * the given folders.
 *
 * @param {string[]} [o.prefixes]  folders inside the OS temp folder; anything
 *   else is refused, so that a caller passing the wrong folder cannot sweep
 *   away the state of the user's real projects
 * @returns {{projectState: number, recentlyOpened: number}} values written or deleted
 */
export function restoreProjects(snapshot, { prefixes = [] } = {}) {
  return request({ op: "restoreProjects", snapshot, prefixes: prefixes.map(asTempFolder) });
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

const ARCH_MEMORY = "targetArchitectureMemory";
const norm = (p) => String(p).split("/").join("\\").toLowerCase();

/**
 * Delete the build target the IDE remembers for every project under these
 * folders.
 *
 * The IDE keeps the target it last built each project for, win32 or win64, in
 * one IDESettings value holding a JSON object keyed by project path, and a
 * project it opens again starts in that target. A harness project's path is
 * used run after run -- tbrun's work folder is keyed to its port -- so an
 * entry one run leaves, when somebody switches a --keep IDE to win64, sets the
 * target of every later run on that path, and nothing says so. On 2026-09-24
 * tbrun on ports 9372 and 9373 built 64-bit for that reason.
 *
 * Entries for any other path are left alone, the user's own projects among
 * them. Opening a project only reads its entry, so tbbuild on the user's
 * project writes nothing here; an entry is written when somebody changes the
 * target of a project that is open.
 *
 * The object is edited here rather than in PowerShell, and written back with
 * JSON.stringify, which is how the IDE writes it, so the other entries keep
 * their exact text and order. The write is refused if the value changed after
 * it was read, and the sweep is then repeated on what is there now.
 *
 * @param {string[]} prefixes     folders inside the OS temp folder, as for restoreProjects
 * @param {object} [o]
 * @param {string} [o.root]       the IDE's settings key
 * @returns {number} entries deleted
 */
export function sweepArchitectureMemory(prefixes = [], { root = IDE_SETTINGS_KEY } = {}) {
  const pre = prefixes.map((p) => norm(asTempFolder(p)));
  if (!pre.length) return 0;
  const key = `${root}\\IDESettings`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const now = request({ op: "readValue", key, name: ARCH_MEMORY });
    if (!now.exists) return 0;
    let memory;
    try { memory = JSON.parse(now.data); } catch { return 0; }   // not the harness's to repair
    if (!memory || typeof memory !== "object" || Array.isArray(memory)) return 0;
    const drop = Object.keys(memory).filter((p) => pre.some((x) => norm(p).startsWith(x)));
    if (!drop.length) return 0;
    for (const p of drop) delete memory[p];
    const w = request({ op: "writeValueIf", key, name: ARCH_MEMORY,
                        expected: now.data, data: JSON.stringify(memory) });
    if (w.written) return drop.length;
  }
  throw new Error(`the IDE's ${ARCH_MEMORY} kept changing while it was being tidied`);
}

// Restoring a key deletes whatever the snapshot does not list, so a key near
// the root -- `Software`, `Software\Classes` -- would take everything under it.
// Three segments is the shallowest key this has any business restoring.
function deepEnough(key) {
  if (String(key ?? "").split("\\").filter(Boolean).length < 3) {
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

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
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
 */
export function startTidy({ paths = [], prefixes = [] } = {}) {
  const owner = Number(process.env.TB_REGISTRY_OWNER);
  if (owner && owner !== process.pid && alive(owner)) return null;
  process.env.TB_REGISTRY_OWNER = String(process.pid);
  let tidy;
  try {
    if (prefixes.length) restoreProjects({ root: IDE_SETTINGS_KEY, entries: [] }, { prefixes });
    tidy = { projects: snapshotProjects(paths), keys: snapshotKeys(), prefixes };
  } catch (e) {
    console.error(`warning: the IDE's registry entries will not be tidied after this run: ${e.message}`);
    return null;
  }
  sweepTargets(prefixes);
  return tidy;
}

/**
 * Put the registry back as startTidy found it. Call it only once every IDE of
 * the run has exited -- shutdownIde waits for that.
 *
 * @returns {{projectState: number, recentlyOpened: number, association: number,
 *            architecture: number | null} | null}
 */
export function finishTidy(tidy) {
  if (!tidy) return null;
  let done;
  try {
    const p = restoreProjects(tidy.projects, { prefixes: tidy.prefixes });
    done = { ...p, association: restoreKeys(tidy.keys) };
  } catch (e) {
    console.error(`warning: could not tidy the IDE's registry entries after this run: ${e.message}`);
    return null;
  }
  return { ...done, architecture: sweepTargets(tidy.prefixes) };
}

// With a warning of its own, so that failing here costs only this part of the tidy.
function sweepTargets(prefixes) {
  try {
    return sweepArchitectureMemory(prefixes);
  } catch (e) {
    console.error(`warning: could not tidy the build targets the IDE remembers: ${e.message}`);
    return null;
  }
}
