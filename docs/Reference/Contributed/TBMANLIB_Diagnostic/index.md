---
title: TBMANLIB_Diagnostic Package
parent: Experimental Packages
has_toc: false
exclude_from_docs:
  - WinAPI
  - WinAPIStructures
  - DelegatesModule
  - RefreshModeModule
indexed_from: 1.0.0.1
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/
---

# TBMANLIB_Diagnostic Package
{: .no_toc }

**Author:** woeoio. **Version:** 1.0.0.1

The **TBMANLIB_Diagnostic** contributed package makes a diagnostic report of a Windows computer and of the processes that run on it, and writes the report as text, JSON or HTML. The package has three parts. A [**DiagnosticEngine**](DiagnosticEngine) runs *collectors*, classes that each find one kind of information (the operating system, the processor and its load, the memory, the disks, the network, the running processes, the regional settings, the environment variables, the installed runtimes and the uptime), and each returns a [**DiagnosticResult**](DiagnosticResult), a list of pairs of text. A *formatter* turns the results into one string. [**FileHelper**](FileHelper) can save the string as a UTF-8 file. The package is written in twinBASIC and calls the Windows API directly. It uses no other library, and none of its collectors asks for administrator rights.

The package is the reusable part of woeoio's entry for [twinBASIC Monthly Challenge #1](../../../../Challenges/1), *Self-Contained Diagnostic Tool*. The entry is a console program that shows the values on a live screen, or writes a report when it is started with an argument such as `/json`. That program is not in the package; [**FormatterFactory.CreateFormatterFromArg**](FormatterFactory#createformatterfromarg) reads such an argument.

This section documents version 1.0.0.1, published on TWINSERV on 3 February 2026 under the MIT licence. The package compiles in BETA 1005, as a 32-bit and as a 64-bit program. The repository [woeoio/tbman](https://github.com/woeoio/tbman), the toolkit of the same author whose package is [**TBMANLIB**](../TBMANLIB/), does not hold the code of this package.

The package has defects: the **Dictionary** class cannot be used, and several members give a wrong result without an error. [Known problems in version 1.0.0.1](#known-problems-in-version-1001) lists them. The sample below uses the parts that work.

```tb check_build check_run
Dim engine As New DiagnosticEngine
engine.RegisterCollector New OSInfoCollector
engine.RegisterCollector New MemoryInfoCollector
engine.RegisterCollector New UptimeCollector

Dim formatter As IOutputFormatter
Set formatter = FormatterFactory.CreateFormatter("json")

Dim report As String
report = FormatterFactory.FormatResults(engine.RunAll(), formatter)

Dim path As String
path = Environ$("TEMP") & "\diag-report" & formatter.FileExtension
Debug.Print FileHelper.WriteFile(report, path)
Debug.Print FileHelper.GetFileSize(path) > 0
Debug.Print Left$(report, 1)
Debug.Print InStr(report, """memory"": {") > 0
FileHelper.DeleteFile path
' Output:
' True
' True
' {
' True
```

* TOC
{:toc}

## How a report is made

1. **Register collectors.** A new [**DiagnosticEngine**](DiagnosticEngine) has none. A program registers an object of each collector class that it wants with [**RegisterCollector**](DiagnosticEngine#registercollector). The order of registration is the order of the report. The [eleven collectors](Collectors) of the package are classes with names such as **OSInfoCollector** and **MemoryInfoCollector**, and a program can write its own, see [**IDiagnosticCollector**](IDiagnosticCollector).
2. **Run them.** [**RunAll**](DiagnosticEngine#runall) runs every collector and returns a list of results. [**RunCategory**](DiagnosticEngine#runcategory) runs one by its name, and [**RunByRefreshMode**](DiagnosticEngine#runbyrefreshmode) runs those that change at one rate. The engine raises events and calls callbacks while it works, so a program can show the progress or cancel.
3. **Format.** [**FormatterFactory.CreateFormatter**](FormatterFactory#createformatter) makes a [formatter](Formatters) from the name `text`, `json` or `html`, and [**FormatResults**](FormatterFactory#formatresults) returns the report as a string. A formatter only builds the string.
4. **Save.** [**FileHelper.WriteFile**](FileHelper#writefile) writes the string, and the formatter's **FileExtension** property gives the extension for the file name.

A result can also be read directly, without a formatter. Each [item](KeyValuePair) has a key and a value, both text: the key is the label of the line, such as `Total Physical`, and the value is its text, such as `15.9 GB`.

## Summary reports

[**RunAll**](DiagnosticEngine#runall) takes an argument that asks for the short form. Four collectors have one: [**EnvironmentCollector**](Collectors#environmentcollector), [**RuntimesCollector**](Collectors#runtimescollector), [**ProcessInfoCollector**](Collectors#processinfocollector) and [**NetworkInfoCollector**](Collectors#networkinfocollector). For the process list it gives the counts instead of every process, and for the environment only three variables. The other seven collectors return their full data also in a summary run.

## What a report contains
{: #what-a-report-contains }

<!-- test: ReportContentTests.FullReport_OperatingSystem_NamesTheUserAndTheComputer, ReportContentTests.FullReport_Environment_NamesTheProfileFolderAndThePath, ReportContentTests.FullReport_Processes_ListsEveryRunningProgram, ReportContentTests.FullReport_Disks_ListsTheSystemDrive, ReportContentTests.FullReport_Network_NamesTheHostAndTheFirstAdapterWithItsAddress, ReportContentTests.FullReport_RunAll_HasOneResultForEachCollector -->
> [!NOTE] timeless
> A full report names the user and the computer, the folders in the environment variables such as `USERPROFILE` and `PATH`, every running program, the drives, and the names and IPv4 addresses of the network adapters. Read a report before it goes to someone else.

## Failures

A collector never ends a run. An error that a collector raises, and a failure that it reports itself, give a result with [**Success**](DiagnosticResult#success) set to **False** and a message, and the run goes on; see [A collector that raises an error](DiagnosticEngine#a-collector-that-raises-an-error). A formatter prints such a result as one line with the key `Error`. The functions of [**FileHelper**](FileHelper) that write and read return a text that describes the failure and do not raise an error, and [**List**](List), [**StringBuilder**](StringBuilder) and [**RegisterCollector**](DiagnosticEngine#registercollector) raise run-time errors, which their pages list.

## The Windows functions and the registry

The package declares the Windows functions it calls, in a module of its own, and uses no component that has to be installed. Its references are the OLE Automation library and the **App** object that every twinBASIC project has. These are the libraries and the functions the collectors and the helpers call:

| Library | Functions |
|:--------|:----------|
| `kernel32.dll` | `GetNativeSystemInfo`, `GetComputerNameW`, `GlobalMemoryStatusEx`, `GetSystemTimes`, `GetTickCount64`, `GetLogicalDrives`, `GetDriveTypeW`, `GetDiskFreeSpaceExW`, `CreateToolhelp32Snapshot`, `Process32FirstW`, `Process32NextW`, `CloseHandle`, `GetCurrentProcessId`, `GetTimeZoneInformation`, `GetACP`, `GetOEMCP`, `GetUserDefaultLCID`, `GetLocaleInfoW`, `RtlMoveMemory` |
| `ntdll.dll` | `RtlGetVersion` |
| `advapi32.dll` | `GetUserNameW`, `RegOpenKeyExW`, `RegQueryValueExW`, `RegCloseKey` |
| `shell32.dll` | `IsUserAnAdmin` |
| `iphlpapi.dll` | `GetAdaptersInfo` |
| `ws2_32.dll` | `WSAStartup`, `gethostname`, `WSACleanup` |

The registry is read, never written, with the access `KEY_READ`. The keys are named on the page of the collector that reads them: [CPUInfoCollector](Collectors#cpuinfocollector) and [RuntimesCollector](Collectors#runtimescollector).

## Using the package with the Scripting Runtime

The package declares a generic class named **Dictionary**, and the Scripting Runtime (`scrrun.dll`) has a class of that name. The package's class is written with its two type arguments, as in `Dictionary(Of String, Long)`, and the Scripting Runtime's has none. The name with type arguments is the package's class in a project that references both libraries, whichever is listed first. A name without type arguments depends on the order of the references:

| Declaration | Scripting Runtime listed first | Package listed first |
|:------------|:-------------------------------|:---------------------|
| `Dim a As New Dictionary` | the class of the Scripting Runtime | error TB5136, *Unable to bind to generic class 'Dictionary'; no generic specifiers given* |
| `Dim b As Dictionary(Of String, Long)` | the class of the package | the class of the package |
| `Dim c As New Scripting.Dictionary` | the class of the Scripting Runtime | the class of the Scripting Runtime |
| `Dim d As New TBMANLIB_Diagnostic.Dictionary(Of String, Long)` | the class of the package | the class of the package |

A project that wants the Scripting Runtime's class writes `Scripting.Dictionary`, which does not depend on the order. The package's class cannot be created in version 1.0.0.1 (see [**Dictionary**](Dictionary)), so a project has no reason to write its name. A project with only the package, which has no `Scripting` library, shows the first row of the table:

```tb check_build expect-error=TB5136
Dim a As New Dictionary
```

```tb check_build
Dim b As Dictionary(Of String, Long)
Dim d As TBMANLIB_Diagnostic.Dictionary(Of String, Long)
```

The modules of the package are public, so a project that references it can use their names without the name of the module: `GetTickCount64`, `FILETIME` and `KEY_READ` of the **WinAPI** modules are visible, and so is `FileTimeToLongLong`. Where a name is declared in the project as well, such as its own `Declare` of `CloseHandle`, its own `Type FILETIME` or its own `Const KEY_READ`, written **Private** or **Public**, the project compiles and uses its own declaration. A call of **FormatDateTime** without the module name reaches the function of the runtime library, not the one of [**FormatHelper**](FormatHelper#formatdatetime). Write the name of the module before a name of the package that another declaration has too, as in `WinAPIStructures.KEY_READ` and `FormatHelper.FormatDateTime`.

## Types that have no page

The package has four modules whose contents a program has no need for:

- **WinAPI** declares the Windows functions that the package calls, eight console and registry functions that it does not call (`GetStdHandle`, `SetConsoleCursorPosition`, `SetConsoleTextAttribute`, `GetConsoleScreenBufferInfo`, `SetConsoleCtrlHandler`, `FillConsoleOutputCharacterW`, `FillConsoleOutputAttribute` and `RegEnumKeyExW`), and four helper procedures: `MakeCOORD`, `FileTimeToLongLong`, `GetStringFromBuffer` and `GetStringFromByteBuffer`. [The WinAPI helpers](Collectors#the-winapi-helpers) describes the two that matter to the results.
- **WinAPIStructures** declares the record types and the constants of those functions: `OSVERSIONINFOEXW`, `SYSTEM_INFO`, `MEMORYSTATUSEX`, `FILETIME`, `PROCESSENTRY32W`, `IP_ADDR_STRING`, `IP_ADAPTER_INFO`, `TIME_ZONE_INFORMATION`, `SYSTEMTIME`, `COORD`, `SMALL_RECT` and `CONSOLE_SCREEN_BUFFER_INFO`.
- **DelegatesModule** declares the four delegate types. Three are the types of the callbacks of the engine, see [Delegates](DiagnosticEngine#delegates), and the fourth is [**FormatterFactoryDelegate**](FormatterFactory#formatterfactorydelegate).
- **RefreshModeModule** holds only the enumeration [**RefreshMode**](RefreshMode).

## Known problems in version 1.0.0.1

<!-- test: ListTests.Insert_InMiddle_PutsItemAtIndex, ListTests.Insert_AtZero_PutsItemFirst, ListTests.SetItem_AtZero_ReplacesFirstItem, ListTests.SetItem_AtZeroOnOneItemList_ReplacesTheItem, FileHelperTests.WriteFile_OverExistingLongerFile_ShortensIt, FileHelperTests.ReadFile_MissingFile_DoesNotCreateIt, FileHelperTests.ReadFile_MissingFile_ReturnsErrorText, FileHelperTests.GetFileSize_MissingFile_ReturnsMinusOne, FileHelperTests.GetFileSize_MissingFile_DoesNotCreateIt, FileHelperTests.ReadFile_WrittenText_IsReadBackAsWritten, FileHelperTests.ReadFile_WrittenText_HasNoByteOrderMark, FilePathTests.NormalizePath_UncPath_KeepsItsTwoBackslashes, FilePathTests.GetFullPath_UncPath_StaysAUncPath, FormatHelperTests.EscapeJson_ControlCharacters_AreEscaped, FormatterTests.JsonFormatter_ControlCharacterInValue_IsEscaped, FormatterTests.JsonFormatter_ControlCharacterInKey_IsEscaped, FormatHelperTests.FormatBytes_NoDecimals_LeavesNoDecimalSeparator, CollectorTests.CPUInfoCollector_PageSize_HasNoDecimalSeparator, CollectorTests.NetworkInfoCollector_FullReport_ListsEveryAdapter -->
> [!WARNING] 1.0.0.1
> The package gives a wrong result without an error, or loses data, in these cases.
>
> - **[List.Insert](List#insert) puts the new item one place too late**, and **[List.SetItem](List#setitem) with the index 0 puts it in the second place.** `SetItem` with the index 0 on a list of one item removes the item and then raises error 5, so the list is empty afterwards.
> - **[FileHelper.WriteFile](FileHelper#writefile) does not shorten an existing file.** The bytes after the new content stay: writing `ab` over a file of 13 bytes leaves a file of 13 bytes.
> - **[ReadFile](FileHelper#readfile) and [GetFileSize](FileHelper#getfilesize) create a file that does not exist.** **ReadFile** returns an empty string and **GetFileSize** returns 0, as for an empty file, so a missing file is not told from an empty one.
> - **ReadFile does not decode UTF-8 or remove the byte-order mark that WriteFile writes.** The text `café` written with **WriteFile** is read back as 8 characters.
> - **[NormalizePath](FileHelper#normalizepath) and [GetFullPath](FileHelper#getfullpath) turn a UNC path into a relative one.** `\\server\share\f.txt` becomes `server\share\f.txt`, and the file functions then open a file of that relative name.
> - **[EscapeJson](FormatHelper#escapejson) leaves the control characters 1 to 31, other than line feed, carriage return and tab, unescaped**, so [**JsonFormatter**](Formatters#jsonformatter) can write JSON that a parser rejects.
> - **[FormatBytes](FormatHelper#formatbytes) with no decimals leaves the decimal separator in the text**, as in `4. KB`. The `Page Size` item of [**CPUInfoCollector**](Collectors#cpuinfocollector) is written this way.
> - **[NetworkInfoCollector](Collectors#networkinfocollector) lists the first adapter only in a 64-bit program.** It reads the adapters in steps of 640 bytes, and the records are 704 bytes apart in a 64-bit program. The summary may then have no `Primary IP`. A 32-bit program lists every adapter.

<!-- test: none -- the defect shows only while daylight saving time is in effect, so no case gives the same verdict all year -->
> [!WARNING] 1.0.0.1
> **[LocaleCollector](Collectors#localecollector) reports the offset of standard time as `Timezone` all year.** In summer time the item is behind the clock by the daylight saving offset: `UTC+1` where the clock is at UTC+2, as in Central European Summer Time.

<!-- test: DictionaryTests.New_CreatesAnEmptyDictionary, ListTests.Contains_Object_FindsIt, ListTests.IndexOf_Object_ReturnsItsPosition, ListTests.Remove_Object_RemovesIt, ListTests.Insert_AtZeroOnEmptyList_AddsItem, FileHelperTests.WriteFile_MissingParentFolders_CreatesThem, FileHelperTests.AppendFile_MissingParentFolders_CreatesThem -->
> [!NOTE] 1.0.0.1
> The package has these other problems. Each raises an error.
>
> - **A [Dictionary](Dictionary) cannot be created.** `New Dictionary(Of TKey, TValue)` raises run-time error 91, *Object variable or With block variable not set*.
> - **[List.Contains](List#contains), [IndexOf](List#indexof) and [Remove](List#remove) raise error 438**, *Object doesn't support this property or method*, for a list of objects of a class that has no default member.
> - **[List.Insert](List#insert) with the index 0 raises error 5 on an empty list.**
> - **[WriteFile](FileHelper#writefile) and [AppendFile](FileHelper#appendfile) make only the last folder of a path.** For a path whose parent folder is missing they return the error text `Error -2147467259: Unspecified error` and the path. The **Open** statement raises error 76, *Path not found*, for it in VB6.

<!-- test: CollectorTests.CPULoadCollector_FirstReading_IsZero, FormatterTests.JsonFormatter_EveryValue_IsAString, FormatterTests.JsonFormatter_NamesInCapitals_KeepTheirCapitals -->
Two behaviours follow from the code and can look like defects. [**CPULoadCollector**](Collectors#cpuloadcollector) reports 0 for its first reading, because it measures between two calls. [**JsonFormatter**](Formatters#jsonformatter) writes every value as a string and turns `PATH` into `pATH`.
<!-- /test -->

## Pages

**Engine and results**

- [DiagnosticEngine](DiagnosticEngine) -- registers collectors, runs them, and raises events and callbacks
- [DiagnosticResult](DiagnosticResult) -- the items, the time and the success of one collection
- [KeyValuePair](KeyValuePair) -- one key with one value
- [RefreshMode](RefreshMode) -- how often the data of a collector changes

**Collectors**

- [IDiagnosticCollector](IDiagnosticCollector) -- the contract of a collector
- [Collectors](Collectors) -- the eleven collectors of the package, what each reports and which Windows functions it calls

**Formatters**

- [IOutputFormatter](IOutputFormatter) -- the contract of a formatter
- [Formatters](Formatters) -- the text, JSON and HTML formatters
- [FormatterFactory](FormatterFactory) -- creates a formatter by name, and formats a list of results

**Helpers**

- [FormatHelper](FormatHelper) -- formats sizes, durations, percentages, dates and text, and escapes text for JSON and HTML
- [FileHelper](FileHelper) -- writes, appends to and reads text files, tests for files and folders, and takes paths apart
- [List](List) -- a list with a 0-based index
- [Dictionary](Dictionary) -- values found by a key; it cannot be created in version 1.0.0.1
- [StringBuilder](StringBuilder) -- builds a long string from parts

## See Also

- [TBMANLIB](../TBMANLIB/) package -- the toolkit of the same author
- [VBA_JSON](../VBA_JSON/) package -- reads JSON, such as the report that **JsonFormatter** writes
- [Importing a package from TWINSERV](../../../../Features/Packages/Importing-TWINSERV) -- adding a published package to a project

## Test cases

The notes and warnings of this section are checked by the test cases in [TBMANLIB_Diagnostic-tests.twinproj](TBMANLIB_Diagnostic-tests.twinproj), a twinBASIC project. It uses TBMANLIB_Diagnostic as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
