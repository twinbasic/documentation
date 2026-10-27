// Running VBA modules in 64-bit Office VBA, for scripts/errors.mjs: the runtime that
// twinBASIC's 64-bit build is compared with, as VB6 is the one its 32-bit build is.
//
// ----------------------------------------------------- what had to be learned
//
//  1. VBA HAS NO HOST BUT AN OFFICE APPLICATION. VBE7.DLL holds the compiler and the
//     runtime, but only a host starts it, and the SDK that lets a program be one is
//     licensed to vendors only. Its exported runtime functions called directly would skip
//     what is being compared: the compiled code's own conversions, how a Variant is
//     passed, how an error reaches Err. So the module runs in Access.
//  2. ACCESS, NOT EXCEL. Excel imports a module only with "Trust access to the VBA project
//     object model" switched on, a security setting that is the user's. Access has no such
//     setting: through automation it creates a database, its VBE imports the module, and
//     Application.Run runs `Main`. Automation runs code with its AutomationSecurity low, so
//     no Trust Center setting or trusted location comes into it either.
//  3. A POWERSHELL DRIVER, STARTED ON A PRIVATE DESKTOP. Node cannot call COM. The driver
//     travels as -EncodedCommand, so no script file runs and the execution policy never
//     comes into it, and is started by launchOnDesktop: Access, a local server DCOM starts
//     for it, opens its windows on the driver's desktop, never on the user's. Access is not
//     in the launcher's job, so the driver waits for it to end before it ends itself, and the
//     desktop is not given back with Access still on it; Node ends Access by the pid the
//     driver writes first whenever it gives up on it.
//  4. ONE ACCESS FOR A WHOLE RUN. Access.Application starts a new MSACCESS.EXE for every
//     CreateObject, so COM keeps nothing running between probes: the session does. Its driver
//     holds one Access and takes jobs from a file, job.txt, naming a folder; each job is a new
//     database in that folder, closed when Main returns. A session that has lost its Access
//     (a box it could not get past, a time limit) is started again for the next job.
//  5. A COMPILE ERROR IS A BOX. VBA compiles a procedure when it is first called, so the
//     cases before the one it refuses have run and reported; then the VBE opens its
//     "Compile error:" box and Run waits on it. The box is read from the desktop's windows
//     (it belongs to Access's pid), and the refused case is the first one that did not report.
//     Run does not return once the box is answered, since the VBE stays in break mode waiting
//     for a person, so that Access is ended and the next job starts another. An error in the module's declarations stops it before
//     Main's first line, which the probe reports as `start`, so the two cannot be confused.
//     A box ends Access only when it is seen at two polls in a row: the dialog harness
//     (errors/harnesses/dialog.bas) answers the box MsgBox or InputBox shows as soon as it
//     is activated, and a poll may catch it in that instant. A compile error's box stays.
//  6. THE MODULE IS READ IN THE ANSI CODE PAGE, as VB6 reads its own, and out.txt is
//     written in it.

import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { desktopWindows, killTree, launchOnDesktop, sleep } from "./tb-ide.mjs";
import { decodeAnsi, encodeAnsi, splitLines } from "./vb6.mjs";

export const NO_VBA64 =
  "errors: no 64-bit Access: the vba64 runtime runs its probe in 64-bit Microsoft Access, through automation";

/** The module and its output in a job's folder. */
export const VBA_MODULE = "Module1.bas";
export const VBA_OUT = "out.txt";
const PID_FILE = "access.pid";
const LOG_FILE = "driver.log";
const JOB_FILE = "job.txt";
const QUIT_FILE = "quit.txt";
const RESULT_FILE = "result.txt";

// The machine field of a PE file's header: 0x8664 for x64.
function peMachine(file) {
  const fd = openSync(file, "r");
  try {
    const head = Buffer.alloc(4096);
    readSync(fd, head, 0, head.length, 0);
    const pe = head.readUInt32LE(0x3c);
    return head.toString("latin1", pe, pe + 4) === "PE\0\0" ? head.readUInt16LE(pe + 4) : null;
  } finally {
    closeSync(fd);
  }
}

const regDefault = (key) => {
  try {
    const out = execFileSync("reg", ["query", key, "/ve"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return /REG_(?:EXPAND_)?SZ\s+(.*)$/m.exec(out)?.[1].trim() ?? null;
  } catch {
    return null;
  }
};

/**
 * The 64-bit MSACCESS.EXE that automation starts, or null: Access.Application's local server
 * as the registry gives it, when that file is an x64 program.
 */
export function findAccess64() {
  const clsid = regDefault("HKCR\\Access.Application\\CLSID");
  if (!clsid) return null;
  const server = regDefault(`HKCR\\CLSID\\${clsid}\\LocalServer32`);
  // The path may be quoted, or not though it has spaces, and may be followed by switches.
  const exe = server && (/^"([^"]+)"/.exec(server)?.[1] ?? /^(.*?\.exe)(?:\s|$)/i.exec(server)?.[1]);
  if (!exe || !existsSync(exe)) return null;
  try {
    return peMachine(exe) === 0x8664 ? exe : null;
  } catch {
    return null;
  }
}

// The driver (3, 4). It writes Access's pid, then takes each job.txt as it appears: the job's
// folder, where it writes result.txt once the database is closed again (`ran`, or what went
// wrong). quit.txt ends it. Every step is a line of driver.log; it ends only once Access has.
const DRIVER = String.raw`
$ErrorActionPreference = 'Stop'
$dir = $env:ERRORS_VBA_DIR
$log = Join-Path $dir '${LOG_FILE}'
$jobFile = Join-Path $dir '${JOB_FILE}'
$quitFile = Join-Path $dir '${QUIT_FILE}'
function L($s) { Add-Content -LiteralPath $log -Value $s }
function Msg($e) { ($e.Exception.Message -replace '\s+', ' ').Trim() }
Add-Type -Namespace ErrorsVba -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint pid);'
$app = $null; $accessPid = 0
try {
  $app = New-Object -ComObject Access.Application
  [void][ErrorsVba.U]::GetWindowThreadProcessId([IntPtr]$app.hWndAccessApp(), [ref]$accessPid)
  Set-Content -LiteralPath (Join-Path $dir '${PID_FILE}') -Value $accessPid
  L "access $accessPid"
  $app.AutomationSecurity = 1
  while (-not (Test-Path -LiteralPath $quitFile)) {
    if (-not (Test-Path -LiteralPath $jobFile)) { Start-Sleep -Milliseconds 50; continue }
    $job = (Get-Content -LiteralPath $jobFile -Raw).Trim()
    Remove-Item -LiteralPath $jobFile
    L "job $job"
    $result = 'ran'
    $comp = $null
    try {
      $app.NewCurrentDatabase((Join-Path $job 'Probe.accdb'))
      $comp = $app.VBE.ActiveVBProject.VBComponents.Import((Join-Path $job '${VBA_MODULE}'))
      $app.Run('Main')
    } catch { $result = "run: $(Msg $_)" }
    # A module left in the database makes Access ask whether to save it as the database closes.
    try { if ($comp) { $app.VBE.ActiveVBProject.VBComponents.Remove($comp) } } catch { $result = "$result; remove: $(Msg $_)" }
    try { $app.CloseCurrentDatabase() } catch { $result = "$result; close: $(Msg $_)" }
    L $result
    Set-Content -LiteralPath (Join-Path $job '${RESULT_FILE}') -Value $result
  }
  $app.Quit(2)
} catch {
  L "error: $(Msg $_)"
}
if ($app) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) } catch {} }
$app = $null
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
if ($accessPid) {
  $p = Get-Process -Id $accessPid -ErrorAction SilentlyContinue
  if ($p -and -not $p.WaitForExit(15000)) { Stop-Process -Id $accessPid -Force -ErrorAction SilentlyContinue; L "ended access" }
}
`;

const POWERSHELL = path.join(
  process.env.SystemRoot ?? "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe",
);

// The boxes Access shows on `desktop`: each visible #32770 window of process `pid`, with the
// texts of its Static children joined.
async function accessBoxes(desktop, pid) {
  const w = await desktopWindows(desktop, { children: true });
  const boxes = [];
  for (let i = 0; i < w.length; i++) {
    if (w[i].depth !== 0 || w[i].pid !== pid || !w[i].visible || w[i].class !== "#32770") continue;
    const texts = [];
    for (let j = i + 1; j < w.length && w[j].depth === 1; j++) {
      if (w[j].class === "Static" && w[j].title) texts.push(w[j].title);
    }
    boxes.push({ title: w[i].title, text: texts.join(" ").replace(/\s+/g, " ").trim() });
  }
  return boxes;
}

/**
 * One 64-bit Access, started on a private desktop when the first job needs it, that runs one
 * module after another (4). `close` ends it; a run that ends without it leaves nothing behind
 * but what the launcher's lease ends with it.
 */
export class VbaSession {
  constructor({ pollMs = 1000 } = {}) {
    this.pollMs = pollMs;
    this.run = null;
    this.dir = null;
    this.jobs = 0;
  }

  get accessPid() {
    try {
      return Number(readFileSync(path.join(this.dir, PID_FILE), "utf8").trim()) || null;
    } catch {
      return null;
    }
  }

  async start() {
    this.dir = mkdtempSync(path.join(tmpdir(), "errors-vba-"));
    this.run = await launchOnDesktop({
      exe: POWERSHELL,
      args: ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(DRIVER, "utf16le").toString("base64")],
      tag: "errors vba64",
      env: { ...process.env, ERRORS_VBA_DIR: this.dir },
    });
    this.exited = false;
    this.run.exited.then(() => {
      this.exited = true;
    });
  }

  // Ends the session: politely when `polite`, else by Access's pid and the launcher's.
  async stop(polite = true) {
    const run = this.run;
    if (!run) return;
    this.run = null;
    // The driver goes on waiting for jobs after its Access is ended, until quit.txt appears.
    if (!this.exited) writeFileSync(path.join(this.dir, QUIT_FILE), "");
    if (!polite) {
      const pid = this.accessPid;
      if (pid) killTree(pid);
    }
    let timer;
    const ended = await Promise.race([
      run.finished.then(() => true),
      new Promise((r) => {
        timer = setTimeout(() => r(false), 30000);
      }),
    ]);
    clearTimeout(timer);
    if (!ended) {
      const pid = this.accessPid;
      if (pid) killTree(pid);
      killTree(run.pid);
      run.launcher.kill();
      await run.finished;
    }
    rmSync(this.dir, { recursive: true, force: true });
  }

  close() {
    return this.stop(true);
  }

  /**
   * Runs `moduleText` (a VB module whose `Main` reports with a `Report` that appends to out.txt
   * beside the database) in folder `dir`.
   *
   * @returns {Promise<{lines: string[], boxes: {title: string, text: string}[], timedOut: boolean, result: string|null}>}
   *   `lines` is what out.txt held, `boxes` what Access showed (Access is ended at the first),
   *   `result` the driver's word on the job, null when Access was lost
   */
  async runModule(dir, moduleText, { timeoutMs = 120000 } = {}) {
    if (this.run && this.exited) await this.stop(false);
    if (!this.run) await this.start();
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, VBA_MODULE), encodeAnsi(moduleText));
    const jobTmp = path.join(this.dir, `job-${++this.jobs}.tmp`);
    writeFileSync(jobTmp, dir);
    renameSync(jobTmp, path.join(this.dir, JOB_FILE));
    const resultFile = path.join(dir, RESULT_FILE);
    const boxes = [];
    const start = Date.now();
    let timedOut = false;
    let lost = false;
    let boxSeen = false;
    while (!existsSync(resultFile)) {
      await Promise.race([this.run.exited, sleep(this.pollMs)]);
      if (existsSync(resultFile)) break;
      if (this.exited) {
        lost = true;
        break;
      }
      if (Date.now() - start > timeoutMs) {
        timedOut = true;
        break;
      }
      const pid = this.accessPid;
      if (!pid) continue;
      let seen = [];
      try {
        seen = await accessBoxes(this.run.desktop, pid);
      } catch {
        // the desktop is listed again at the next poll
      }
      // Run does not return after a compile error's box is answered: the VBE stays in break
      // mode, waiting for a person. So a box ends this Access, and the next job starts one,
      // once it is seen at two polls in a row (5): a box a harness answers is gone by then.
      const shown = seen.length > 0 && boxSeen;
      boxSeen = seen.length > 0;
      if (shown) {
        boxes.push(...seen.map((b) => ({ title: b.title, text: b.text })));
        lost = true;
        break;
      }
    }
    if (timedOut || lost) await this.stop(false);
    const out = existsSync(path.join(dir, VBA_OUT)) ? readFileSync(path.join(dir, VBA_OUT)) : null;
    return {
      lines: out ? splitLines(decodeAnsi(out)) : [],
      boxes,
      timedOut,
      result: existsSync(resultFile) ? readFileSync(resultFile, "utf8").trim() : null,
    };
  }
}
