# Poll memory for a process tree rooted at $RootPid, emitting one JSON
# sample per tick on stdout. Used by probe-memory.mjs to watch the
# Chromium tree puppeteer spawns during a book-PDF render.
#
# Each sample:
#   { "t": <iso ts>, "n": <proc count>, "total_private": <bytes>,
#     "total_ws": <bytes>, "rows": [{pid,name,role,private,ws}, ...] }
#
# When the root process is gone, emits one final {"done":true} and exits.
#
# Usage:
#   powershell -NoProfile -File sample-mem.ps1 -RootPid <pid> [-IntervalMs 500]
param(
    [Parameter(Mandatory)][int]$RootPid,
    [int]$IntervalMs = 500
)
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Get-TreeProcesses {
    param([int]$rootPid)
    # One CIM query for the whole process table, then walk parent->children.
    $all = Get-CimInstance -Class Win32_Process `
        -Property ProcessId,ParentProcessId,Name,CommandLine
    $byId = @{}
    foreach ($p in $all) { $byId[[int]$p.ProcessId] = $p }
    $byParent = @{}
    foreach ($p in $all) {
        $parentId = [int]$p.ParentProcessId
        if (-not $byParent.ContainsKey($parentId)) {
            $byParent[$parentId] = New-Object Collections.Generic.List[object]
        }
        [void]$byParent[$parentId].Add($p)
    }
    $stack = New-Object Collections.Generic.Stack[int]
    $stack.Push($rootPid)
    $tree = New-Object Collections.Generic.List[object]
    $seen = @{}
    while ($stack.Count -gt 0) {
        $id = $stack.Pop()
        if ($seen.ContainsKey($id)) { continue }
        $seen[$id] = $true
        if ($byId.ContainsKey($id)) { [void]$tree.Add($byId[$id]) }
        if ($byParent.ContainsKey($id)) {
            foreach ($c in $byParent[$id]) { $stack.Push([int]$c.ProcessId) }
        }
    }
    return $tree
}

function Get-ChromeRole {
    param([string]$cmdline)
    # The browser parent process has no --type arg. Children pass --type=X
    # (renderer, gpu-process, utility, crashpad-handler, ...).
    if ([string]::IsNullOrEmpty($cmdline)) { return 'browser' }
    if ($cmdline -match '--type=([^\s"]+)') {
        $role = $Matches[1]
        # Utility subprocesses pass --utility-sub-type too; surface that.
        if ($role -eq 'utility' -and $cmdline -match '--utility-sub-type=([^\s"]+)') {
            return 'utility:' + $Matches[1]
        }
        return $role
    }
    return 'browser'
}

while ($true) {
    try {
        $descendants = Get-TreeProcesses -rootPid $RootPid
    } catch {
        Start-Sleep -Milliseconds $IntervalMs
        continue
    }

    if ($descendants.Count -eq 0) {
        Write-Output '{"done":true}'
        break
    }

    $totalPrivate = 0L
    $totalWS = 0L
    $rows = New-Object Collections.Generic.List[object]
    foreach ($d in $descendants) {
        $procId = [int]$d.ProcessId
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($null -eq $proc) { continue }
        $priv = [int64]$proc.PrivateMemorySize64
        $ws   = [int64]$proc.WorkingSet64
        $totalPrivate += $priv
        $totalWS += $ws
        [void]$rows.Add([ordered]@{
            pid     = $procId
            name    = $proc.ProcessName
            role    = Get-ChromeRole -cmdline $d.CommandLine
            private = $priv
            ws      = $ws
        })
    }

    if ($rows.Count -eq 0) {
        Write-Output '{"done":true}'
        break
    }

    $sample = [ordered]@{
        t             = (Get-Date).ToString("o")
        n             = $rows.Count
        total_private = $totalPrivate
        total_ws      = $totalWS
        rows          = $rows
    }
    Write-Output ($sample | ConvertTo-Json -Compress -Depth 5)
    Start-Sleep -Milliseconds $IntervalMs
}
