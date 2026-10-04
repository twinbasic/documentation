# Launch a process on a private, non-visible Windows desktop, inside a job
# object, and print its pid.
#
# Not run as a file. scripts/lib/tb-ide.mjs reads this text and hands it to
# powershell through -EncodedCommand, so no execution policy is involved and
# nothing has to be marked runnable. Inputs arrive as environment variables
# for the same reason: there is no argument quoting to get wrong.
#
#   TBBUILD_EXE      the executable
#   TBBUILD_ARG      its single argument, or empty for none
#   TBBUILD_DESKTOP  desktop name to create
#   TBBUILD_JOB      "0" for no job -- a --keep IDE, which must outlive the run
#
# Optional, and without them nothing below changes:
#
#   TBBUILD_ARGS     more of the command line, already quoted, added after
#                    TBBUILD_ARG: for a program that takes several arguments.
#   TBBUILD_STDOUT   a file path: the process's standard output goes to that file.
#   TBBUILD_STDERR   the same for standard error. When either is set the process
#                    gets standard handles of its own: stdin is the null device,
#                    and an output left unset is the null device too.
#   TBBUILD_DIALOGS  "close": while the process runs, every 250 ms, look for
#                    visible #32770 dialog boxes on the private desktop that
#                    belong to the process or to anything in its job. Each one
#                    seen for the first time is reported as a line
#                    `dialog <base64 of UTF-8 JSON {"title":...,"text":...}>`,
#                    text being its Static children's texts joined by a space,
#                    and is then closed: BM_CLICK on its OK button, else on its
#                    first button, else WM_CLOSE. A compiler that is given a
#                    damaged project opens a modal message box and waits on it
#                    for ever; on a private desktop nobody can answer it.
#
# The output is the pid on a line of its own, then any dialog lines, then
# `exit <n>`.
#
# A launch that fails prints no pid, and its cause as one line on stderr.
#
# Why a desktop at all: the twinBASIC IDE calls HostForceFocus() from its own
# window.onload, so it takes the keyboard whatever window style it is started
# with. `start /min` was tried and does not help. A process on another desktop
# has no foreground to take, which is the only thing that stops it -- and the
# IDE compiles there perfectly well, since nothing about the compile needs to
# be on screen.
#
# Why a job: killing the IDE's process tree is a race. The IDE restarts its
# compiler after a crash, and a compiler started while taskkill /T walks the
# tree is not in the tree it walked: it outlives the kill, orphaned, with its
# native debugger attached, holding the install's files open. Observed once in
# about a dozen crash-fixture runs, as the one process left behind. Every
# process the IDE starts inherits its job, and the job is created with
# KILL_ON_JOB_CLOSE, so when this launcher's handle to it closes -- the launcher
# ends when the IDE does, when tb-ide's shutdownIde kills it, and when the Node
# process that started it ends -- Windows ends whatever is still in the job,
# all at once and with nothing to race. A --keep IDE gets no job, because it
# has to outlive the run that started it.
#
# This is the one piece of the harness that cannot be JavaScript: it is Win32
# calls, and Node has no FFI without a native addon.

$ErrorActionPreference = "Stop"

# With its streams redirected, PowerShell writes to stderr in CLIXML: the
# progress record Add-Type makes ("Preparing modules for first use"), and any
# error. A failed launch then read "#< CLIXML" rather than its cause. So
# progress is silenced, and a failure is written here as plain text, in UTF-8,
# which is how tb-ide.mjs reads it.
$ProgressPreference = "SilentlyContinue"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
trap {
  [Console]::Error.WriteLine($_.Exception.GetBaseException().Message)
  exit 1
}

$exe = $env:TBBUILD_EXE
$arg = $env:TBBUILD_ARG
$desktop = if ($env:TBBUILD_DESKTOP) { $env:TBBUILD_DESKTOP } else { "tbbuild" }

# Each Win32 call is made, and its error read, in C#. PowerShell makes calls of
# its own before a script's next statement, and they replace the error: read
# from PowerShell, a CreateProcess that had set 3, "The system cannot find the
# path specified", was reported as 203, "The system could not find the
# environment option that was entered".
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class TbLaunch {
  [StructLayout(LayoutKind.Sequential)]
  public struct SECURITY_ATTRIBUTES {
    public int nLength; public IntPtr lpSecurityDescriptor; public int bInheritHandle;
  }
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  public class Dialog { public string Title, Text; }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct STARTUPINFO {
    public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
    public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute;
    public int dwFlags; public short wShowWindow; public short cbReserved2;
    public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_INFORMATION {
    public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit, PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass, SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct IO_COUNTERS {
    public ulong ReadOps, WriteOps, OtherOps, ReadBytes, WriteBytes, OtherBytes;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION Basic;
    public IO_COUNTERS Io;
    public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
  }

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern IntPtr CreateDesktop(string name, IntPtr device, IntPtr devmode,
    int flags, uint access, IntPtr sa);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool CreateProcess(string app, string cmd, IntPtr pa, IntPtr ta,
    bool inherit, uint flags, IntPtr env, string cwd,
    ref STARTUPINFO si, out PROCESS_INFORMATION pi);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern IntPtr CreateJobObject(IntPtr sa, string name);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool SetInformationJobObject(IntPtr job, int infoClass,
    ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint length);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern uint ResumeThread(IntPtr thread);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool TerminateProcess(IntPtr process, uint exitCode);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern uint WaitForSingleObject(IntPtr handle, uint ms);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool GetExitCodeProcess(IntPtr process, out int exitCode);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern IntPtr CreateFile(string name, uint access, uint share,
    ref SECURITY_ATTRIBUTES sa, uint disp, uint flags, IntPtr tmpl);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool IsProcessInJob(IntPtr process, IntPtr job, out bool result);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool CloseHandle(IntPtr h);

  [DllImport("user32.dll", SetLastError = true)]
  static extern bool EnumDesktopWindows(IntPtr desk, EnumProc cb, IntPtr lp);

  [DllImport("user32.dll", SetLastError = true)]
  static extern bool EnumChildWindows(IntPtr parent, EnumProc cb, IntPtr lp);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetClassName(IntPtr h, StringBuilder sb, int max);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetWindowText(IntPtr h, StringBuilder sb, int max);

  [DllImport("user32.dll")]
  static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);

  [DllImport("user32.dll")]
  static extern bool IsWindowVisible(IntPtr h);

  [DllImport("user32.dll")]
  static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);

  [DllImport("user32.dll")]
  static extern IntPtr GetDlgItem(IntPtr dlg, int id);

  // The error of the call just made, with its text. Nothing may come between
  // that call and this one.
  static Exception Failed(string what) {
    int code = Marshal.GetLastWin32Error();
    return new Exception(what + " failed: " + new Win32Exception(code).Message);
  }

  // GENERIC_ALL (0x10000000).
  public static IntPtr Desktop(string name) {
    IntPtr desk = CreateDesktop(name, IntPtr.Zero, IntPtr.Zero, 0, 0x10000000, IntPtr.Zero);
    if (desk == IntPtr.Zero) throw Failed("CreateDesktop");
    return desk;
  }

  // KILL_ON_JOB_CLOSE (0x2000), set through JobObjectExtendedLimitInformation,
  // which is information class 9.
  public static IntPtr KillOnCloseJob() {
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw Failed("CreateJobObject");
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    info.Basic.LimitFlags = 0x2000;
    if (!SetInformationJobObject(job, 9, ref info, (uint)Marshal.SizeOf(info))) {
      throw Failed("SetInformationJobObject");
    }
    return job;
  }

  public static PROCESS_INFORMATION Start(string exe, string cmd, string cwd, string desktop,
                                          uint flags) {
    STARTUPINFO si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(si);
    si.lpDesktop = desktop;
    PROCESS_INFORMATION pi;
    if (!CreateProcess(exe, cmd, IntPtr.Zero, IntPtr.Zero, false, flags, IntPtr.Zero, cwd,
                       ref si, out pi)) {
      throw Failed("CreateProcess");
    }
    return pi;
  }

  // Ends the process, still suspended, when it cannot go into the job.
  public static void Assign(IntPtr job, PROCESS_INFORMATION pi) {
    if (AssignProcessToJobObject(job, pi.hProcess)) return;
    Exception failed = Failed("AssignProcessToJobObject");
    TerminateProcess(pi.hProcess, 1);
    throw failed;
  }

  public static void Resume(PROCESS_INFORMATION pi) {
    ResumeThread(pi.hThread);
  }

  // Waits for the process to end, through the handle CreateProcess returned,
  // which stays valid however soon it ends; returns its exit code.
  public static int Wait(PROCESS_INFORMATION pi) {
    WaitForSingleObject(pi.hProcess, 0xFFFFFFFF);
    int code;
    if (!GetExitCodeProcess(pi.hProcess, out code)) throw Failed("GetExitCodeProcess");
    return code;
  }

  // An inheritable handle: for writing, a file created or truncated, or the null
  // device when the path is "NUL"; for reading, the null device.
  public static IntPtr OpenInheritable(string path, bool write) {
    SECURITY_ATTRIBUTES sa = new SECURITY_ATTRIBUTES();
    sa.nLength = Marshal.SizeOf(sa);
    sa.bInheritHandle = 1;
    bool device = !write || path == "NUL";
    // a device is opened with OPEN_EXISTING (3), a file with CREATE_ALWAYS (2)
    IntPtr h = CreateFile(device ? "NUL" : path, write ? 0x40000000u : 0x80000000u, 3, ref sa,
                          device ? 3u : 2u, 0x80, IntPtr.Zero);
    if (h == new IntPtr(-1)) throw Failed("CreateFile " + (device ? "NUL" : path));
    return h;
  }

  // Start with the standard handles given (STARTF_USESTDHANDLES). The handles
  // must be inheritable, which makes CreateProcess inherit them.
  public static PROCESS_INFORMATION StartWithHandles(string exe, string cmd, string cwd,
                                                     string desktop, uint flags,
                                                     IntPtr hIn, IntPtr hOut, IntPtr hErr) {
    STARTUPINFO si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(si);
    si.lpDesktop = desktop;
    si.dwFlags = 0x100;
    si.hStdInput = hIn;
    si.hStdOutput = hOut;
    si.hStdError = hErr;
    PROCESS_INFORMATION pi;
    if (!CreateProcess(exe, cmd, IntPtr.Zero, IntPtr.Zero, true, flags, IntPtr.Zero, cwd,
                       ref si, out pi)) {
      throw Failed("CreateProcess");
    }
    return pi;
  }

  // Waits up to ms; true when the process has ended, with its exit code.
  public static bool WaitMs(PROCESS_INFORMATION pi, uint ms, out int code) {
    code = 0;
    if (WaitForSingleObject(pi.hProcess, ms) != 0) return false;
    if (!GetExitCodeProcess(pi.hProcess, out code)) throw Failed("GetExitCodeProcess");
    return true;
  }

  static string Cls(IntPtr h) {
    StringBuilder sb = new StringBuilder(256); GetClassName(h, sb, 256); return sb.ToString();
  }
  static string Txt(IntPtr h) {
    StringBuilder sb = new StringBuilder(4096); GetWindowText(h, sb, 4096); return sb.ToString();
  }

  // Whether a window's process is the launched one or is in its job (job is
  // IntPtr.Zero when there is none).
  static bool Belongs(IntPtr hwnd, uint pid, IntPtr job) {
    uint owner;
    GetWindowThreadProcessId(hwnd, out owner);
    if (owner == pid) return true;
    if (job == IntPtr.Zero) return false;
    // PROCESS_QUERY_LIMITED_INFORMATION
    IntPtr p = OpenProcess(0x1000, false, owner);
    if (p == IntPtr.Zero) return false;
    bool inJob;
    bool ok = IsProcessInJob(p, job, out inJob);
    CloseHandle(p);
    return ok && inJob;
  }

  // The visible dialog boxes (#32770) on the desktop that belong to the launched
  // process or to its job and are not in `seen`: each is read, then closed. A
  // window is forgotten once it is gone, since window handles are reused.
  public static List<Dialog> NewDialogs(IntPtr desk, IntPtr job, int pid, HashSet<long> seen) {
    List<IntPtr> top = new List<IntPtr>();
    EnumDesktopWindows(desk, delegate(IntPtr h, IntPtr l) { top.Add(h); return true; }, IntPtr.Zero);
    HashSet<long> now = new HashSet<long>();
    List<Dialog> found = new List<Dialog>();
    foreach (IntPtr h in top) {
      now.Add(h.ToInt64());
      if (seen.Contains(h.ToInt64())) continue;
      if (!IsWindowVisible(h) || Cls(h) != "#32770") continue;
      if (!Belongs(h, (uint)pid, job)) continue;
      List<string> texts = new List<string>();
      IntPtr first = IntPtr.Zero;
      EnumChildWindows(h, delegate(IntPtr c, IntPtr l) {
        string cls = Cls(c);
        if (cls == "Static") {
          string t = Txt(c);
          if (t.Length > 0) texts.Add(t);
        } else if (cls == "Button" && first == IntPtr.Zero) {
          first = c;
        }
        return true;
      }, IntPtr.Zero);
      Dialog d = new Dialog();
      d.Title = Txt(h);
      d.Text = string.Join(" ", texts.ToArray());
      found.Add(d);
      seen.Add(h.ToInt64());
      // IDOK is control id 1.
      IntPtr ok = GetDlgItem(h, 1);
      IntPtr btn = (ok != IntPtr.Zero && Cls(ok) == "Button") ? ok : first;
      if (btn != IntPtr.Zero) PostMessage(btn, 0xF5, IntPtr.Zero, IntPtr.Zero);  // BM_CLICK
      else PostMessage(h, 0x10, IntPtr.Zero, IntPtr.Zero);                         // WM_CLOSE
    }
    seen.IntersectWith(now);
    return found;
  }
}
'@

# The desktop lives as long as this handle does, which is as long as this
# process does -- hence the wait at the end.
$hDesk = [TbLaunch]::Desktop($desktop)

# The job. KILL_ON_JOB_CLOSE is the whole point; breakaway is not allowed, so
# nothing the IDE starts can leave it. Its one handle is this process's, which
# closes when this process ends, however it ends.
$useJob = $env:TBBUILD_JOB -ne "0"
if ($useJob) { $job = [TbLaunch]::KillOnCloseJob() }

# The command line is assembled here rather than by Start-Process, which
# appends a trailing space -- parseCommandLine() in ide/main2.js reads that as an
# empty second file argument and refuses the launch with "Bad command line
# syntax."
$cmd = '"' + $exe + '"'
if ($arg) { $cmd += ' "' + $arg + '"' }
if ($env:TBBUILD_ARGS) { $cmd += ' ' + $env:TBBUILD_ARGS }

# CREATE_SUSPENDED (0x4): the IDE goes into the job before it runs a single
# instruction, so there is no moment in which it could start a child outside.
$flags = if ($useJob) { 0x4 } else { 0 }
if ($env:TBBUILD_STDOUT -or $env:TBBUILD_STDERR) {
  $hIn = [TbLaunch]::OpenInheritable("NUL", $false)
  $hOut = [TbLaunch]::OpenInheritable($(if ($env:TBBUILD_STDOUT) { $env:TBBUILD_STDOUT } else { "NUL" }), $true)
  $hErr = [TbLaunch]::OpenInheritable($(if ($env:TBBUILD_STDERR) { $env:TBBUILD_STDERR } else { "NUL" }), $true)
  $pi = [TbLaunch]::StartWithHandles($exe, $cmd, [IO.Path]::GetDirectoryName($exe), $desktop, $flags, $hIn, $hOut, $hErr)
} else {
  $pi = [TbLaunch]::Start($exe, $cmd, [IO.Path]::GetDirectoryName($exe), $desktop, $flags)
}
if ($useJob) {
  # An IDE that cannot go into the job is ended, still suspended, rather than
  # resumed: the caller gets no pid from a failed launch, so an IDE resumed
  # here would be one nothing ever kills.
  [TbLaunch]::Assign($job, $pi)
  [TbLaunch]::Resume($pi)
}

Write-Output $pi.dwProcessId

# The process's exit code, on a line of its own once it ends: tbrun's --exe
# reads it for the probe's exe.
if ($env:TBBUILD_DIALOGS -eq "close") {
  $jobHandle = if ($useJob) { $job } else { [IntPtr]::Zero }
  $seen = New-Object 'System.Collections.Generic.HashSet[long]'
  $code = 0
  while ($true) {
    foreach ($d in [TbLaunch]::NewDialogs($hDesk, $jobHandle, $pi.dwProcessId, $seen)) {
      $json = ([ordered]@{ title = $d.Title; text = $d.Text } | ConvertTo-Json -Compress)
      Write-Output ("dialog " + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)))
    }
    if ([TbLaunch]::WaitMs($pi, 250, [ref]$code)) { break }
  }
  Write-Output ("exit " + $code)
} else {
  Write-Output ("exit " + [TbLaunch]::Wait($pi))
}
