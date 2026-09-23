# Launch a process on a private, non-visible Windows desktop, inside a job
# object, and print its pid.
#
# Not run as a file. scripts/lib/tb-ide.mjs reads this text and hands it to
# powershell through -EncodedCommand, so no execution policy is involved and
# nothing has to be marked runnable. Inputs arrive as environment variables
# for the same reason: there is no argument quoting to get wrong.
#
#   TBBUILD_EXE      the executable
#   TBBUILD_ARG      its single argument
#   TBBUILD_DESKTOP  desktop name to create
#   TBBUILD_JOB      "0" for no job -- a --keep IDE, which must outlive the run
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

$exe = $env:TBBUILD_EXE
$arg = $env:TBBUILD_ARG
$desktop = if ($env:TBBUILD_DESKTOP) { $env:TBBUILD_DESKTOP } else { "tbbuild" }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class TbLaunch {
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
  public static extern IntPtr CreateDesktop(string name, IntPtr device, IntPtr devmode,
    int flags, uint access, IntPtr sa);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CreateProcess(string app, string cmd, IntPtr pa, IntPtr ta,
    bool inherit, uint flags, IntPtr env, string cwd,
    ref STARTUPINFO si, out PROCESS_INFORMATION pi);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern IntPtr CreateJobObject(IntPtr sa, string name);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool SetInformationJobObject(IntPtr job, int infoClass,
    ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION info, uint length);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern uint ResumeThread(IntPtr thread);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool TerminateProcess(IntPtr process, uint exitCode);
}
'@

function Fail($what) {
  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "$what failed: $(([ComponentModel.Win32Exception]::new($code)).Message)"
}

# GENERIC_ALL. The desktop lives as long as this handle does, which is as long
# as this process does -- hence the wait at the end.
$hDesk = [TbLaunch]::CreateDesktop($desktop, [IntPtr]::Zero, [IntPtr]::Zero, 0, 0x10000000, [IntPtr]::Zero)
if ($hDesk -eq [IntPtr]::Zero) { Fail "CreateDesktop" }

# The job. KILL_ON_JOB_CLOSE (0x2000) is the whole point; breakaway is not
# allowed, so nothing the IDE starts can leave it. Its one handle is this
# process's, which closes when this process ends, however it ends.
# JobObjectExtendedLimitInformation is information class 9. The nested struct
# is copied out, changed and put back: assigning through $info.Basic.LimitFlags
# would change a copy PowerShell makes of a value type, and set nothing.
$useJob = $env:TBBUILD_JOB -ne "0"
if ($useJob) {
  $job = [TbLaunch]::CreateJobObject([IntPtr]::Zero, $null)
  if ($job -eq [IntPtr]::Zero) { Fail "CreateJobObject" }
  $info = New-Object TbLaunch+JOBOBJECT_EXTENDED_LIMIT_INFORMATION
  $basic = $info.Basic
  $basic.LimitFlags = 0x2000
  $info.Basic = $basic
  if (-not [TbLaunch]::SetInformationJobObject($job, 9, [ref]$info,
        [Runtime.InteropServices.Marshal]::SizeOf($info))) { Fail "SetInformationJobObject" }
}

$si = New-Object TbLaunch+STARTUPINFO
$si.cb = [Runtime.InteropServices.Marshal]::SizeOf($si)
$si.lpDesktop = $desktop

# The command line is assembled here rather than by Start-Process, which
# appends a trailing space -- parseCommandLine() in ide/main2.js reads that as an
# empty second file argument and refuses the launch with "Bad command line
# syntax."
$cmd = '"' + $exe + '" "' + $arg + '"'

# CREATE_SUSPENDED (0x4): the IDE goes into the job before it runs a single
# instruction, so there is no moment in which it could start a child outside.
$pi = New-Object TbLaunch+PROCESS_INFORMATION
$flags = if ($useJob) { 0x4 } else { 0 }
if (-not [TbLaunch]::CreateProcess($exe, $cmd, [IntPtr]::Zero, [IntPtr]::Zero, $false,
      $flags, [IntPtr]::Zero, [IO.Path]::GetDirectoryName($exe), [ref]$si, [ref]$pi)) {
  Fail "CreateProcess"
}
if ($useJob) {
  if (-not [TbLaunch]::AssignProcessToJobObject($job, $pi.hProcess)) {
    # End the suspended IDE rather than resume it: the caller gets no pid from a
    # failed launch, so an IDE resumed here would be one nothing ever kills.
    $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    [void][TbLaunch]::TerminateProcess($pi.hProcess, 1)
    throw "AssignProcessToJobObject failed: $(([ComponentModel.Win32Exception]::new($err)).Message)"
  }
  [void][TbLaunch]::ResumeThread($pi.hThread)
}

Write-Output $pi.dwProcessId

try { (Get-Process -Id $pi.dwProcessId).WaitForExit() } catch { }
