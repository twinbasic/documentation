---
title: TBMANLIB_Diagnostic Collectors
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/Collectors
has_toc: false
---

# Collectors
{: .no_toc }

The package has eleven collector classes. Each one finds one kind of information about the computer or its processes, and returns it as a [**DiagnosticResult**](DiagnosticResult) whose items are pairs of text: a key, which is the label of a line of the report, and a value. All eleven implement [**IDiagnosticCollector**](IDiagnosticCollector), so a [**DiagnosticEngine**](DiagnosticEngine) runs them in the same way, and all eleven report that they need no administrator rights. This page describes what each collector reports, the Windows functions it calls, and what it does when the information is missing.

```tb check_build check_run
Dim collectors(0 To 10) As IDiagnosticCollector
Set collectors(0) = New OSInfoCollector
Set collectors(1) = New CPUInfoCollector
Set collectors(2) = New LocaleCollector
Set collectors(3) = New EnvironmentCollector
Set collectors(4) = New RuntimesCollector
Set collectors(5) = New CPULoadCollector
Set collectors(6) = New MemoryInfoCollector
Set collectors(7) = New UptimeCollector
Set collectors(8) = New ProcessInfoCollector
Set collectors(9) = New DiskInfoCollector
Set collectors(10) = New NetworkInfoCollector

Dim i As Long
For i = 0 To 10
    Debug.Print collectors(i).CategoryName & ": " & collectors(i).RefreshMode & " " & collectors(i).SupportsSummary
Next i
' Output:
' Operating System: 0 False
' CPU Info: 0 False
' Locale: 0 False
' Environment: 0 True
' Runtimes: 0 True
' CPU Load: 1 False
' Memory: 1 False
' Uptime: 1 False
' Processes: 1 True
' Disk: 2 False
' Network: 2 True
```

* TOC
{:toc}

## Using the collectors

### Registering them

A program registers the collectors it wants in the engine. The results come back in the order of registration, which is the order of the report. This is the report of all eleven, in the order of the table below:

```tb check_build
Dim engine As New DiagnosticEngine
engine.RegisterCollector New OSInfoCollector
engine.RegisterCollector New CPUInfoCollector
engine.RegisterCollector New LocaleCollector
engine.RegisterCollector New EnvironmentCollector
engine.RegisterCollector New RuntimesCollector
engine.RegisterCollector New CPULoadCollector
engine.RegisterCollector New MemoryInfoCollector
engine.RegisterCollector New UptimeCollector
engine.RegisterCollector New ProcessInfoCollector
engine.RegisterCollector New DiskInfoCollector
engine.RegisterCollector New NetworkInfoCollector

Dim report As String
report = FormatterFactory.FormatResults(engine.RunAll(), FormatterFactory.CreateFormatter("json"))
Debug.Print report
```

| Class | Category name | [Mode](RefreshMode) | Summary | Collects |
|:------|:--------------|:--------------------|:--------|:---------|
| [**OSInfoCollector**](#osinfocollector) | `Operating System` | Static | no | Windows version, architecture, computer and user name |
| [**CPUInfoCollector**](#cpuinfocollector) | `CPU Info` | Static | no | architecture, processor count, name and frequency |
| [**LocaleCollector**](#localecollector) | `Locale` | Static | no | language, country, code pages, time zone |
| [**EnvironmentCollector**](#environmentcollector) | `Environment` | Static | yes | sixteen environment variables |
| [**RuntimesCollector**](#runtimescollector) | `Runtimes` | Static | yes | .NET Framework, .NET and Visual C++ runtimes |
| [**CPULoadCollector**](#cpuloadcollector) | `CPU Load` | Dynamic | no | the load of the processors |
| [**MemoryInfoCollector**](#memoryinfocollector) | `Memory` | Dynamic | no | physical, page file and virtual memory |
| [**UptimeCollector**](#uptimecollector) | `Uptime` | Dynamic | no | the time since the system started |
| [**ProcessInfoCollector**](#processinfocollector) | `Processes` | Dynamic | yes | the running processes |
| [**DiskInfoCollector**](#diskinfocollector) | `Disk` | SemiDynamic | no | fixed and removable drives |
| [**NetworkInfoCollector**](#networkinfocollector) | `Network` | SemiDynamic | yes | host name, adapters and addresses |

The properties other than the category name, the mode and the summary flag are the same for all eleven. **RequiresElevation** is **False**. **Description** is a sentence in English; it is quoted in each section below.

### Calling a collector directly

A collector needs no engine. A variable of the interface type calls it by the names of [**IDiagnosticCollector**](IDiagnosticCollector). The classes also declare their implementing members as **Public**, so a variable of the class type reaches them by the long names, such as `IDiagnosticCollector_Collect`. The classes do not have the short names.

```tb check_build check_run
Dim memory As New MemoryInfoCollector
Dim uptime As IDiagnosticCollector
Set uptime = New UptimeCollector

Dim a As DiagnosticResult(Of KeyValuePair(Of String, String))
Dim b As DiagnosticResult(Of KeyValuePair(Of String, String))
Set a = memory.IDiagnosticCollector_Collect()
Set b = uptime.Collect()

Dim i As Long
Dim keys As String
For i = 0 To a.ItemCount - 1
    keys = keys & IIf(i > 0, ", ", "") & a.Items.Item(i).Key
Next i
Debug.Print a.Category & ": " & keys

keys = ""
For i = 0 To b.ItemCount - 1
    keys = keys & IIf(i > 0, ", ", "") & b.Items.Item(i).Key
Next i
Debug.Print b.Category & ": " & keys
' Output:
' Memory: Memory Load, Total Physical, Available Physical, Used Physical, Total Page File, Available Page File, Total Virtual, Available Virtual
' Uptime: Uptime, Total Days, Total Hours, Total Seconds, Boot Time
```

### The values are text

Every value is a **String**. Numbers are formatted with the **Format** function, so the decimal separator is the one of the user's regional settings: a size is `1.5 GB` for one user and `1,5 GB` for another. Sizes use [**FormatBytes**](FormatHelper#formatbytes): units of 1024 bytes, named B, KB, MB, GB and TB, with one decimal place from 1 KB up.

This sample prints every item of a few collectors, to show the shape of the values. The values depend on the computer:

```tb check_build
Dim collectors(0 To 3) As IDiagnosticCollector
Set collectors(0) = New OSInfoCollector
Set collectors(1) = New CPUInfoCollector
Set collectors(2) = New MemoryInfoCollector
Set collectors(3) = New LocaleCollector

Dim r As DiagnosticResult(Of KeyValuePair(Of String, String))
Dim i As Long, j As Long
For i = 0 To 3
    Set r = collectors(i).Collect()
    Debug.Print "== " & r.Category
    For j = 0 To r.ItemCount - 1
        Debug.Print r.Items.Item(j).Key & ": " & r.Items.Item(j).Value
    Next j
Next i
```

### A collector that fails

None of the collectors raises an error for information that is missing. When a Windows function reports a failure, the collector either leaves the item out or, for the four collectors that cannot do without the function (**CPULoadCollector**, **MemoryInfoCollector**, **ProcessInfoCollector** and **DiskInfoCollector**), returns a result with [**Success**](DiagnosticResult#success) set to **False** and a message in [**ErrorMessage**](DiagnosticResult#errormessage). Each section says which. A formatter prints a failed result as one line with the key `Error`.

## OSInfoCollector
{: .no_toc }

Category `Operating System`; mode **Static**; no summary. **Description**: `Windows operating system version and build information`.

**Keys.**

| Key | Value |
|:----|:------|
| `Version` | The major and minor number of the version, such as `10.0`. |
| `Build` | The build number, such as `22631`. |
| `Name` | `Windows 11` for major version 10 with build 22000 or higher, `Windows 10` for lower builds. For major version 6, by the minor number: `Windows 8.1` (3), `Windows 8` (2), `Windows 7` (1) or `Windows Vista` (0). For major version 5: `Windows XP x64 / Server 2003` (2), `Windows XP` (1) or `Windows 2000` (0). `Windows` for any other number. |
| `Architecture` | The architecture of the computer, not of the program: `x64`, `ARM64`, `x86`, `ARM`, or `Unknown`. A 32-bit program on 64-bit Windows reports `x64`. |
| `Computer Name` | The NetBIOS name of the computer. |
| `User Name` | The name of the user who runs the program. |

The name is derived from the numbers alone, so a version of Windows Server gets the name of the client version that has the same numbers, such as `Windows 10` for a server with build 17763.

**Windows functions.** `RtlGetVersion` of `ntdll.dll`, which returns the real version and not the one that a compatibility setting of the program reports; `GetNativeSystemInfo` and `GetComputerNameW` of `kernel32.dll`; `GetUserNameW` of `advapi32.dll`.

**When the information is missing.** When `RtlGetVersion` fails, the result has the one item `Version` with the value `Unknown`, and then the architecture. `Computer Name` and `User Name` are left out when their functions fail. The result keeps **Success** set to **True**.

## CPUInfoCollector
{: .no_toc }

Category `CPU Info`; mode **Static**; no summary. **Description**: `CPU architecture and processor count`.

**Keys.**

| Key | Value |
|:----|:------|
| `Architecture` | `x64 (AMD64)`, `ARM64`, `x86 (Intel)`, `ARM`, `IA64 (Itanium)`, or `Unknown (` and the number from Windows, then `)`. |
| `Processor Count` | The number of logical processors that `GetNativeSystemInfo` reports. |
| `Processor Level` | The `wProcessorLevel` number, a decimal number whose meaning depends on the architecture. |
| `Processor Revision` | `0x` and the `wProcessorRevision` number in hexadecimal. |
| `Page Size` | The size of a memory page, written by [**FormatBytes**](FormatHelper#formatbytes) with no decimals. The text is `4. KB`, with a decimal separator after the number: see [Known problems](.#known-problems-in-version-1001). |
| `Processor Name` | The text of the registry value `ProcessorNameString`, without leading and trailing spaces. Left out when it is empty or cannot be read. |
| `Frequency` | The registry value `~MHz` and ` MHz`, such as `3600 MHz`. Left out when it cannot be read. |

**Windows functions.** `GetNativeSystemInfo` of `kernel32.dll`. For the two registry values, `RegOpenKeyExW`, `RegQueryValueExW` and `RegCloseKey` of `advapi32.dll`, on `HKEY_LOCAL_MACHINE\HARDWARE\DESCRIPTION\System\CentralProcessor\0`. Only the first processor is read, so the name and the frequency are those of processor 0.

**When the information is missing.** `Processor Name` and `Frequency` are left out. The other five items are always there.

## LocaleCollector
{: .no_toc }

Category `Locale`; mode **Static**; no summary. **Description**: `Regional settings, code pages, and timezone`.

**Keys.**

| Key | Value |
|:----|:------|
| `LCID` | The locale identifier of the user's default locale, as a decimal number, such as `1033`. |
| `Language Code` | The two-letter or three-letter ISO 639 code of the language, such as `en`. |
| `Country Code` | The ISO 3166 code of the country, such as `US`. |
| `Locale` | The two codes joined by a hyphen, such as `en-US`. Present only when both codes are. |
| `Language` | The English name of the language, such as `English`. |
| `Country` | The English name of the country, such as `United States`. |
| `ANSI Code Page` | `CP` and the number of the ANSI code page, such as `CP1252`. |
| `OEM Code Page` | `CP` and the number of the OEM code page, such as `CP437`. |
| `Timezone` | `UTC`, the sign, the hours and, when it is not a whole hour, a colon and two digits of minutes: `UTC+0`, `UTC+1`, `UTC-5`, `UTC+5:30`. |
| `Timezone Name` | The name of the time zone in standard time. Left out when empty. |

`Timezone` is built from the **Bias** field of the Windows time-zone record, which is the offset of standard time. The **DaylightBias** field is not read, and neither is the value that tells whether daylight saving time is in effect, so the offset does not change in summer, and `Timezone Name` is the standard-time name all year. On a computer in Central European Summer Time, where the clock is at UTC+2, the items are `Timezone` = `UTC+1` and `Timezone Name` = `W. Europe Standard Time`. See [Known problems](.#known-problems-in-version-1001).

**Windows functions.** All of `kernel32.dll`: `GetUserDefaultLCID`, `GetLocaleInfoW` with the four type constants for the ISO language and country codes and the English language and country names, `GetACP`, `GetOEMCP` and `GetTimeZoneInformation`.

**When the information is missing.** `Language Code`, `Country Code`, `Language` and `Country` are left out when `GetLocaleInfoW` returns nothing, and then `Locale` is too if one of the two codes is missing. `LCID`, the two code pages and `Timezone` are always there.

## EnvironmentCollector
{: .no_toc }

Category `Environment`; mode **Static**; has a summary. **Description**: `System and user environment variables`.

**Keys.** The full result has one item for each of these sixteen environment variables that is defined and not empty, in this order, with the name of the variable as the key and its value as the value:

`PATH`, `TEMP`, `TMP`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `PROGRAMFILES`, `PROGRAMFILES(X86)`, `WINDIR`, `SYSTEMROOT`, `COMPUTERNAME`, `USERNAME`, `HOMEDRIVE`, `HOMEPATH`, `PATHEXT` and `COMSPEC`.

The value of `PATH` is cut to its first 200 characters when it is longer, and `...` is added.

**Summary.** The summary result has [**IsSummary**](DiagnosticResult#issummary) set to **True** and the items for `PATH`, `TEMP` and `USERPROFILE`, when they are defined. The value of `PATH` is the number of its entries in the form `(24 entries)`, where an entry is a part between semicolons.

**Windows functions.** None. The collector reads the variables with the **Environ$** function of the runtime library.

**When the information is missing.** A variable that is not defined, or empty, has no item. A computer on which none of the variables is defined gives an empty result with **Success** set to **True**.

The environment of a user often holds names and folders that the user may not want to publish; see the note on [what a report contains](.#what-a-report-contains).

## RuntimesCollector
{: .no_toc }

Category `Runtimes`; mode **Static**; has a summary. **Description**: `Installed .NET, VC++ and other runtimes`.

**Keys.**

| Key | Value |
|:----|:------|
| `.NET Framework 4.x` | The version of .NET Framework 4, such as `4.8`, from the number in the registry value `Release`. A number below 378389 gives `4.x (Release ` and the number and `)`. |
| `.NET Framework 3.5` | `Installed`, when the registry value `Install` of version 3.5 is 1. |
| `.NET SDK` | The text of the registry value `Version` under the key `sharedhost`. |
| `VC++ Redist (x64)` | The values `Major` and `Minor` of the 64-bit Visual C++ runtime, joined by a period, such as `14.38`. Present when `Major` is above 0. |
| `VC++ Redist (x86)` | The same for the 32-bit runtime. |

The version of .NET Framework 4 is found in this table from the top: it is the first row whose number is at most the value of `Release`.

| `Release` at least | Version |
|-------------------:|:--------|
| 533320 | 4.8.1 |
| 528040 | 4.8 |
| 461808 | 4.7.2 |
| 461308 | 4.7.1 |
| 460798 | 4.7 |
| 394802 | 4.6.2 |
| 394254 | 4.6.1 |
| 393295 | 4.6 |
| 379893 | 4.5.2 |
| 378675 | 4.5.1 |
| 378389 | 4.5 |

**Summary.** The summary result has [**IsSummary**](DiagnosticResult#issummary) set to **True** and three items, each present only when the full result has the item it comes from: `.NET Framework`, the version text of `.NET Framework 4.x`; `.NET`, the value of `.NET SDK`; and `VC++ Redist`, which is the fixed text `2015-2022` whenever `Major` of the 64-bit runtime is 14 or more, and not the version.

**Windows functions.** `RegOpenKeyExW`, `RegQueryValueExW` and `RegCloseKey` of `advapi32.dll`, on keys of `HKEY_LOCAL_MACHINE` that are opened with `KEY_READ` and `KEY_WOW64_64KEY`, so a 32-bit program reads the registry of 64-bit programs. The keys are:

- `SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full`, value `Release`;
- `SOFTWARE\Microsoft\NET Framework Setup\NDP\v3.5`, value `Install`;
- `SOFTWARE\dotnet\Setup\InstalledVersions\x64\sharedhost`, value `Version`;
- `SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64`, values `Major` and `Minor`;
- `SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x86`, values `Major` and `Minor`.

The full result labels the value of the key `sharedhost` as `.NET SDK`, and the summary labels the same value `.NET`.

**When the information is missing.** Each item is left out when its key or value is not in the registry. A computer with none of them gives an empty result with **Success** set to **True**.

## CPULoadCollector
{: .no_toc }

Category `CPU Load`; mode **Dynamic**; no summary. **Description**: `Current CPU usage percentage`.

**Keys.**

| Key | Value |
|:----|:------|
| `Usage` | The load as a percentage with one decimal place, such as `12.3%`. |
| `Usage Value` | The same number without the percent sign, such as `12.3`. |

The collector measures the load between two calls. It keeps the idle, kernel and user times that `GetSystemTimes` reported the last time, and the load is `(1 - idle change / (kernel change + user change)) * 100`, limited to the range 0 to 100. The first call of a new object, and the first call after [**Reset**](#reset), has nothing to compare with and reports 0 (`0.0%`). A call in which the counters did not change also gives 0. A program that wants a reading keeps one object and calls it again after some time, as the engine does when it runs the same registered collector a second time.

```tb check_build check_run
Dim cpu As New CPULoadCollector
Dim r As DiagnosticResult(Of KeyValuePair(Of String, String))
Set r = cpu.IDiagnosticCollector_Collect()
Debug.Print r.Items.Item(0).Key & " " & r.Items.Item(0).Value
Debug.Print r.Items.Item(1).Key & " " & r.Items.Item(1).Value

' Load the processor for half a second, then read again.
Dim t As Single = Timer
Do While Timer < t + 0.5
Loop
Set r = cpu.IDiagnosticCollector_Collect()
Dim pct As Double = Val(r.Items.Item(1).Value)
Debug.Print pct >= 0 And pct <= 100
' Output:
' Usage 0.0%
' Usage Value 0.0
' True
```

**Windows functions.** `GetSystemTimes` of `kernel32.dll`. The three times are 64-bit values that the collector builds from the two halves of each `FILETIME`, with the helper [**FileTimeToLongLong**](#the-winapi-helpers) of the **WinAPI** module.

**When the information is missing.** When `GetSystemTimes` fails, the result has no items, **Success** set to **False** and the message `Failed to get system times`.

### New
{: .no_toc }

Creates a collector.

Syntax: **New** **CPULoadCollector**

The new collector has no earlier reading, so its first result reports 0.

### Reset
{: .no_toc }

Discards the earlier reading.

Syntax: *collector*.**Reset**

The next result reports 0 and starts a new measurement. It is a method of the class, not of the interface.

## MemoryInfoCollector
{: .no_toc }

Category `Memory`; mode **Dynamic**; no summary. **Description**: `Physical and virtual memory status`.

**Keys.** The result has these eight items, in this order:

| Key | Value |
|:----|:------|
| `Memory Load` | The percentage of physical memory in use, as a whole number and `%`, such as `54%`. |
| `Total Physical` | The physical memory, such as `15.9 GB`. |
| `Available Physical` | The physical memory that is available. |
| `Used Physical` | `Total Physical` less `Available Physical`. |
| `Total Page File` | The `ullTotalPageFile` value of Windows, which is the current limit for committed memory of the system or of the program, whichever is smaller. |
| `Available Page File` | The part of that limit that is available. |
| `Total Virtual` | The size of the user-mode address space of the program that runs the collector. |
| `Available Virtual` | The part of that address space that is free. |

The sizes are formatted with [**FormatBytes**](FormatHelper#formatbytes).

**Windows functions.** `GlobalMemoryStatusEx` of `kernel32.dll`.

**When the information is missing.** When the function fails, the result has no items, **Success** set to **False** and the message `Failed to get memory status`.

## UptimeCollector
{: .no_toc }

Category `Uptime`; mode **Dynamic**; no summary. **Description**: `System uptime since last boot`.

**Keys.**

| Key | Value |
|:----|:------|
| `Uptime` | The time since the system started, in the form of [**FormatUptime**](FormatHelper#formatuptime): `3d 12h 45m 32s`, with the days, hours and minutes left out while they are 0. |
| `Total Days` | The whole number of days. |
| `Total Hours` | The whole number of hours. |
| `Total Seconds` | The whole number of seconds. |
| `Boot Time` | The local time at which the system started, as `yyyy-mm-dd hh:nn:ss`. |

`Boot Time` is calculated: it is the current time less the uptime.

**Windows functions.** `GetTickCount64` of `kernel32.dll`.

**When the information is missing.** The collector has no failure path: the function returns a number in all cases.

## ProcessInfoCollector
{: .no_toc }

Category `Processes`; mode **Dynamic**; has a summary. **Description**: `Running processes information`.

**Keys.** The full result starts with two items and then has one item for each running process, in the order in which Windows lists them:

| Key | Value |
|:----|:------|
| `Total Processes` | The number of processes. |
| `Current PID` | The process identifier of the program that runs the collector. |
| `PID 4120` | The file name of the program, without a folder, and the number of its threads, such as `explorer.exe (Threads: 71)`. |

The key of a process is `PID ` and its process identifier. The process with the identifier 0 is listed as `[System Process]`.

**Summary.** The summary result has [**IsSummary**](DiagnosticResult#issummary) set to **True** and three items: `Total Processes`, `Total Threads` (the sum of the thread counts of all processes) and `Current PID`.

**Windows functions.** `CreateToolhelp32Snapshot` with `TH32CS_SNAPPROCESS`, `Process32FirstW`, `Process32NextW` and `CloseHandle`, and `GetCurrentProcessId`, all of `kernel32.dll`. The snapshot lists the processes of all users, and needs no administrator rights.

**When the information is missing.** When the snapshot cannot be made, the result has no items, **Success** set to **False** and the message `Failed to create process snapshot`. If `Process32FirstW` fails, the counts are 0.

## DiskInfoCollector
{: .no_toc }

Category `Disk`; mode **SemiDynamic**; no summary. **Description**: `Disk drives and space information`.

**Keys.** The result has four items for each fixed or removable drive, in the order of the drive letters. For drive `C`:

| Key | Value |
|:----|:------|
| `Drive C` | `Fixed` or `Removable`. |
| `C: Total` | The size of the volume, such as `465.3 GB`. |
| `C: Free` | The free space of the volume, from the field of `GetDiskFreeSpaceExW` that holds the total number of free bytes. |
| `C: Used` | The used space and, in parentheses, the percentage of the volume with one decimal place, such as `120.5 GB (25.9%)`. |

Only the drives of the types `DRIVE_FIXED` and `DRIVE_REMOVABLE` are reported. Network drives, CD-ROM drives and RAM disks have no items, although the code has names for them. A drive whose space cannot be read, such as a card reader with no card, has no items either.

**Windows functions.** `GetLogicalDrives`, `GetDriveTypeW` and `GetDiskFreeSpaceExW` of `kernel32.dll`.

**When the information is missing.** When `GetLogicalDrives` returns 0, the result has no items, **Success** set to **False** and the message `Failed to get logical drives`. A drive that fails is skipped.

## NetworkInfoCollector
{: .no_toc }

Category `Network`; mode **SemiDynamic**; has a summary. **Description**: `Network adapters and configuration`.

**Keys.** The full result starts with the host name and then lists the adapters, counted from 0:

| Key | Value |
|:----|:------|
| `Host Name` | The host name of the computer. |
| `Adapter 0` | The description of the adapter, such as `Intel(R) Ethernet Connection`. |
| `IPAddress0` | The first IPv4 address of that adapter, such as `192.168.1.20`. Left out for an adapter whose address is `0.0.0.0`. |

The keys of the next adapter are `Adapter 1` and `IPAddress1`, and so on. The key of the address has no space before the number, and the key of the adapter has one. An adapter with no description has no items.

**Summary.** The summary result has [**IsSummary**](DiagnosticResult#issummary) set to **True** and two items: `Host Name` and `Primary IP`. The primary address is the first IPv4 address of the first adapter that:

- has the type Ethernet or IEEE 802.11 (wireless);
- has no `virtual`, `vmware`, `hyper-v`, `bluetooth` or `software` in its description, in any letter case; and
- has an address that is not `0.0.0.0` or `127.0.0.1`.

**Windows functions.** `WSAStartup`, `gethostname` and `WSACleanup` of `ws2_32.dll` for the host name; `GetAdaptersInfo` of `iphlpapi.dll`, which is called twice, once for the size of the buffer and once for the data; `RtlMoveMemory` of `kernel32.dll` to copy the records. The host name and the descriptions are converted from the ANSI code page. Only IPv4 addresses are reported, because `GetAdaptersInfo` returns no others.

The collector reads the adapters one after the other in steps of 640 bytes, a fixed number that its source calls approximate. It tests the pointer that links the records of the list only for 0 and does not follow it. The size of an `IP_ADAPTER_INFO` record depends on the size of a pointer. In a 32-bit program the records are 640 bytes apart, and the collector lists every adapter. In a 64-bit program `LenB` of the package's `IP_ADAPTER_INFO` type is 696 and the records are 704 bytes apart, so the second step does not reach the second record: on a computer with several adapters the full result lists `Adapter 0` only, and the summary may have no `Primary IP`. See [Known problems](.#known-problems-in-version-1001).

**When the information is missing.** The host name is left out when Winsock cannot start or `gethostname` fails. When there are no adapters, or `GetAdaptersInfo` fails, the full result has no adapter items and the summary has no `Primary IP`. The collector has no error result.

## The WinAPI helpers

The **WinAPI** module of the package declares the Windows functions that the collectors call, and a few helper procedures. The module **WinAPIStructures** declares the record types and constants they use. Neither has a page of its own. Two helpers matter to the results of the collectors.

`WinAPI.FileTimeToLongLong` converts a `FILETIME` to a 64-bit number, and is what **CPULoadCollector** uses. It adds the high half multiplied by 2^32 to the low half, with the sign bit of the low half added back as 2147483648, so a low half with all bits set gives 4294967295:

```tb check_build check_run
Dim ft As WinAPIStructures.FILETIME
ft.dwLowDateTime = -1
Debug.Print WinAPI.FileTimeToLongLong(ft)
ft.dwHighDateTime = 3
ft.dwLowDateTime = &H90000000
Debug.Print WinAPI.FileTimeToLongLong(ft)
' Output:
' 4294967295
' 15300820992
```

`WinAPI.GetStringFromBuffer` builds a string from an array of **Integer** characters up to the first zero. It is used for the process name and the time-zone name.

## See Also

- [IDiagnosticCollector](IDiagnosticCollector) interface -- the contract that all of these implement
- [DiagnosticEngine](DiagnosticEngine) class -- runs the collectors
- [RefreshMode](RefreshMode) enumeration -- the modes of the table above
- [FormatHelper](FormatHelper) module -- the functions that format sizes, times and percentages
- [Formatters](Formatters) -- turn the results into text, JSON or HTML
