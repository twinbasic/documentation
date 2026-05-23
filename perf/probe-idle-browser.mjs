// Measure the private bytes of a freshly-launched Chromium with
// nothing loaded (just about:blank on the default page). Probes a few
// states: post-launch, post-newPage, post-goto(about:blank).
//
// Usage:
//   node probe-idle-browser.mjs

import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer';

const fmtMB = (b) => (b / 1024 / 1024).toFixed(0).padStart(5) + ' MB';

function sampleTree(rootPid) {
  // One CIM query for the whole process table, then walk the tree
  // rooted at rootPid in PowerShell. Returns parsed JSON.
  const ps = `
$root = ${rootPid}
$all = Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,Name,CommandLine
$byParent = @{}
foreach ($p in $all) {
  $pp = [int]$p.ParentProcessId
  if (-not $byParent.ContainsKey($pp)) { $byParent[$pp] = @() }
  $byParent[$pp] += $p
}
$queue = New-Object System.Collections.Queue
$queue.Enqueue($root)
$rows = @()
while ($queue.Count -gt 0) {
  $id = $queue.Dequeue()
  $entry = $all | Where-Object { [int]$_.ProcessId -eq $id }
  if ($null -ne $entry) {
    $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
    if ($null -ne $proc) {
      $role = if ([string]::IsNullOrEmpty($entry.CommandLine)) {
        'browser'
      } elseif ($entry.CommandLine -match '--type=([^\\s"]+)') {
        if ($Matches[1] -eq 'utility' -and $entry.CommandLine -match '--utility-sub-type=([^\\s"]+)') {
          'utility:' + $Matches[1]
        } else {
          $Matches[1]
        }
      } else {
        'browser'
      }
      $rows += [ordered]@{ pid = $id; role = $role; private = [int64]$proc.PrivateMemorySize64; ws = [int64]$proc.WorkingSet64 }
    }
  }
  if ($byParent.ContainsKey($id)) {
    foreach ($c in $byParent[$id]) { $queue.Enqueue([int]$c.ProcessId) }
  }
}
$rows | ConvertTo-Json -Compress -Depth 5
`;
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('powershell stderr:', r.stderr);
    throw new Error(`powershell failed (status ${r.status})`);
  }
  const txt = r.stdout.trim();
  if (!txt) return [];
  const parsed = JSON.parse(txt);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function report(label, rows) {
  const total = rows.reduce((s, r) => s + r.private, 0);
  const wsTotal = rows.reduce((s, r) => s + r.ws, 0);
  console.log(`\n=== ${label} ===  total private ${fmtMB(total)}  ws ${fmtMB(wsTotal)}  (${rows.length} procs)`);
  const sorted = [...rows].sort((a, b) => b.private - a.private);
  for (const r of sorted) {
    console.log(`  ${String(r.role).padEnd(22)} pid=${String(r.pid).padEnd(6)} ${fmtMB(r.private)} private  ${fmtMB(r.ws)} ws`);
  }
}

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    '--disable-gpu',
    '--disable-software-rasterizer',
  ],
});
const rootPid = browser.process().pid;
console.log(`[probe] browser pid: ${rootPid}`);

// 1. Post-launch (browser created, no page yet).
// Puppeteer creates an initial about:blank target automatically, so
// even this state has one renderer.
report('post-launch', sampleTree(rootPid));

// 2. Post-newPage (force a fresh blank page).
const page = await browser.newPage();
report('post-newPage', sampleTree(rootPid));

// 3. Post-goto(about:blank) explicitly.
await page.goto('about:blank', { waitUntil: 'load' });
report('post-goto(about:blank)', sampleTree(rootPid));

// 4. Settle a moment, sample again to see if anything's still warming up.
await new Promise((r) => setTimeout(r, 2000));
report('after 2s settle', sampleTree(rootPid));

await browser.close();
