# Probe helper for llvm-cache-probe.mjs (question 2: jobs). Not a tool.
#   -Mode info                       prints whether this process is in a job and the job's limit flags
#   -Mode run -Script <child.mjs> -ChildArgs "<args>" [-Node <node.exe>]
#         creates a job object with KILL_ON_JOB_CLOSE and NO breakaway, starts node in it, waits for it to end, then closes the job
#         and says whether the server pid the child printed is alive before and after the job closed. Ends that pid itself.
param(
  [string]$Mode = "info",
  [string]$Node = "node",
  [string]$Script = "",
  [string]$ChildArgs = ""
)
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class Jb {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateJobObjectW(IntPtr a, string n);
  [DllImport("kernel32.dll")] public static extern bool SetInformationJobObject(IntPtr j, int c, IntPtr p, int l);
  [DllImport("kernel32.dll")] public static extern bool AssignProcessToJobObject(IntPtr j, IntPtr p);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll")] public static extern bool IsProcessInJob(IntPtr p, IntPtr j, out bool r);
  [DllImport("kernel32.dll")] public static extern bool QueryInformationJobObject(IntPtr j, int c, IntPtr p, int l, IntPtr ret);
}
"@

if ($Mode -eq "info") {
  $r = $false
  [Jb]::IsProcessInJob([System.Diagnostics.Process]::GetCurrentProcess().Handle, [IntPtr]::Zero, [ref]$r) | Out-Null
  $buf = [Runtime.InteropServices.Marshal]::AllocHGlobal(144)
  for ($i = 0; $i -lt 144; $i += 8) { [Runtime.InteropServices.Marshal]::WriteInt64($buf, $i, 0) }
  $ok = [Jb]::QueryInformationJobObject([IntPtr]::Zero, 9, $buf, 144, [IntPtr]::Zero)
  $flags = [Runtime.InteropServices.Marshal]::ReadInt32($buf, 16)
  "inJob=$r queryOk=$ok limitFlags=0x{0:X}" -f $flags
  "KILL_ON_JOB_CLOSE=$(($flags -band 0x2000) -ne 0) BREAKAWAY_OK=$(($flags -band 0x800) -ne 0) SILENT_BREAKAWAY_OK=$(($flags -band 0x1000) -ne 0)"
  exit 0
}

$job = [Jb]::CreateJobObjectW([IntPtr]::Zero, $null)
$buf = [Runtime.InteropServices.Marshal]::AllocHGlobal(144)
for ($i = 0; $i -lt 144; $i += 8) { [Runtime.InteropServices.Marshal]::WriteInt64($buf, $i, 0) }
[Runtime.InteropServices.Marshal]::WriteInt32($buf, 16, 0x2000)
if (-not [Jb]::SetInformationJobObject($job, 9, $buf, 144)) { throw "SetInformationJobObject failed" }
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $Node
$psi.Arguments = "`"$Script`" $ChildArgs"
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.CreateNoWindow = $true
$p = [System.Diagnostics.Process]::Start($psi)
if (-not [Jb]::AssignProcessToJobObject($job, $p.Handle)) { throw "AssignProcessToJobObject failed (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))" }
$p.WaitForExit()
$out = $p.StandardOutput.ReadToEnd().Trim()
"child output: $out"
$srv = 0
if ($out -match 'serverpid=(\d+)') { $srv = [int]$Matches[1] }
if ($srv -eq 0) { "no server pid printed"; exit 1 }
$before = [bool](Get-Process -Id $srv -ErrorAction SilentlyContinue)
"server alive after the child ended, job still open: $before"
[Jb]::CloseHandle($job) | Out-Null
Start-Sleep -Milliseconds 2000
$after = [bool](Get-Process -Id $srv -ErrorAction SilentlyContinue)
"server alive after the job closed: $after"
if ($after) { Stop-Process -Id $srv -Force; "ended the server by pid $srv" }
