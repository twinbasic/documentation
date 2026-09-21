# Launch a process on a private, non-visible Windows desktop, and print its pid.
#
# Not run as a file. scripts/tbbuild.mjs reads this text and hands it to
# powershell through -EncodedCommand, so no execution policy is involved and
# nothing has to be marked runnable. Inputs arrive as environment variables
# for the same reason: there is no argument quoting to get wrong.
#
#   TBBUILD_EXE      the executable
#   TBBUILD_ARG      its single argument
#   TBBUILD_DESKTOP  desktop name to create
#
# Why a desktop at all: the twinBASIC IDE calls HostForceFocus() from its own
# window.onload, so it takes the keyboard whatever window style it is started
# with. `start /min` was tried and does not help. A process on another desktop
# has no foreground to take, which is the only thing that stops it -- and the
# IDE compiles there perfectly well, since nothing about the compile needs to
# be on screen.
#
# This is the one piece of the harness that cannot be JavaScript: it is two
# Win32 calls, and Node has no FFI without a native addon.

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

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern IntPtr CreateDesktop(string name, IntPtr device, IntPtr devmode,
    int flags, uint access, IntPtr sa);

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CreateProcess(string app, string cmd, IntPtr pa, IntPtr ta,
    bool inherit, uint flags, IntPtr env, string cwd,
    ref STARTUPINFO si, out PROCESS_INFORMATION pi);
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

$si = New-Object TbLaunch+STARTUPINFO
$si.cb = [Runtime.InteropServices.Marshal]::SizeOf($si)
$si.lpDesktop = $desktop

# The command line is assembled here rather than by Start-Process, which
# appends a trailing space -- parseCommandLine() in ide/main2.js reads that as an
# empty second file argument and refuses the launch with "Bad command line
# syntax."
$cmd = '"' + $exe + '" "' + $arg + '"'

$pi = New-Object TbLaunch+PROCESS_INFORMATION
if (-not [TbLaunch]::CreateProcess($exe, $cmd, [IntPtr]::Zero, [IntPtr]::Zero, $false,
      0, [IntPtr]::Zero, [IO.Path]::GetDirectoryName($exe), [ref]$si, [ref]$pi)) {
  Fail "CreateProcess"
}

Write-Output $pi.dwProcessId

try { (Get-Process -Id $pi.dwProcessId).WaitForExit() } catch { }
