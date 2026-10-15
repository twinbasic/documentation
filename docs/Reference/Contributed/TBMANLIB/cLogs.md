---
title: cLogs
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/cLogs
has_toc: false
---

# cLogs class
{: .no_toc }

A **cLogs** writes log lines. [**Save**](#save) appends a line to a log file, in a folder and a file name that follow a rule the program chooses, and can send the same line to a list box ([**FormView**](#formview)), to a debugging tool ([**DbgView**](#dbgview)) and to a web page ([**WebView**](#webview)). The level of each line and the level that the object is set to decide which lines are kept.

An object is created with `Dim Logs As New cLogs`. The package also keeps one ready-made instance, [**TBMAN.Logs**](TBMAN#logs), which every part of a program shares.

```tb check_build check_run
Dim Logs As New cLogs
Dim Line As String

Logs.LogDir = Environ$("TEMP") & "\tbmanlib-docs-logs"
Logs.LogFileNameRule = EnumLogFileNameRule.byUser
Logs.LogSubDir = "app"
Logs.LogFileNameByUer = "demo.log"

Line = Logs.Save("started")
Debug.Print Right$(Line, 14)
Debug.Print Dir(Logs.LogDir & "\app\demo.log")

Logs.LogLevelControl = EnumLogLevel.Warn
Debug.Print "[" & Logs.Save("quiet", EnumLogLevel.Info) & "]"
Debug.Print Right$(Logs.Save("loud", EnumLogLevel.Danger), 13)

CreateObject("Scripting.FileSystemObject").DeleteFolder Logs.LogDir
' Output:
' [INFO] started
' demo.log
' []
' [DANGER] loud
```

The enumerations are declared inside the class. A program names their members with the name of the enumeration in front, as in the sample, or by the member alone, such as `Warn`. The name of the class cannot be put in front: `cLogs.EnumLogLevel.Warn` is refused with TB5079, *Unrecognized symbol 'cLogs'*.

* TOC
{:toc}

## Log lines

<!-- test: LogsTests.Save_ByDay_AppendsTheLineToTheFileOfTheDay, LogsTests.Save_BelowLogLevelControl_DoesNothingButSetTheDefaults -->
A line is made of the time, the level and the text: `[10/12/2026 3:04:05 PM] [WARN] disk is almost full`. The time is the value of `Now` converted to text with the settings of the system, so its form changes from one computer to another. The level is `INFO`, `WARN`, `DANGER` or `ERROR`, the names of the first four members of [**EnumLogLevel**](#enumloglevel). [**Save**](#save), [**FormView**](#formview), [**WebView**](#webview) and [**DbgView**](#dbgview) all make the line the same way, and each returns it.

A level is kept when it is equal to or greater than [**LogLevelControl**](#loglevelcontrol). Below that, the member does nothing and returns an empty string.
<!-- /test -->

<!-- test: LogsTests.Save_DebuggerLevel_WritesALine, LogsTests.Save_CustomLevel_WritesALine -->
> [!NOTE] 1.0.0.29
> The levels **Debugger** and **Custom** have no name for the line: a call with either of them raises error 9, *Subscript out of range*, because the table of names has only four entries. Nothing is written.

```tb check_build check_run
Dim Logs As New cLogs
Dim Line As String
On Error Resume Next
Line = Logs.Save("x", EnumLogLevel.Debugger)
Debug.Print Err.Number
Err.Clear
Line = Logs.Save("x", EnumLogLevel.Custom)
Debug.Print Err.Number
' Output:
' 9
' 9
```

## Where a log file goes

<!-- test: LogsTests.Save_ByDay_AppendsTheLineToTheFileOfTheDay, LogsTests.Save_ByMonth_AppendsTheLineToTheFileOfTheMonth, LogsTests.Save_ByUser_UsesTheNameTheProgramGives, LogsTests.Save_ByUser_MissingFolderInTheFileName_FailsWithUnspecifiedError -->
[**Save**](#save) builds the path from the properties below. `<root>` is [**LogDir**](#logdir), or the folder of the program (`App.Path`) when **LogDir** is empty. `<sub>` is [**LogSubDir**](#logsubdir).

| [**LogFileNameRule**](#logfilenamerule) | File |
|:---|:---|
| **ByDay** | `<root>\logs\<sub>\<yyyy>\<MM>\<yyyyMMdd>.txt` |
| **ByMonth** | `<root>\logs\<sub>\<yyyy>\<yyyyMM>.txt` |
| **byUser** | `<root>\<sub>\<LogFileNameByUer>` |

The year, month and day come from `Now`. The folders that the path names are created if they are missing. For **byUser**, the file name may hold folders, but only the folder part made from `<root>` and `<sub>` is created, so a missing folder inside **LogFileNameByUer** makes the call fail with the error *Unspecified error* (-2147467259).
<!-- /test -->

```tb check_build check_run
Dim Logs As New cLogs
Dim LogName As String

Logs.LogDir = Environ$("TEMP") & "\tbmanlib-docs-logs2"
Logs.Save "hello"

LogName = Format$(Now, "yyyyMMdd") & ".txt"
Debug.Print Dir(Logs.LogDir & "\logs\system\" & Format$(Now, "yyyy") & "\" & Format$(Now, "MM") & "\" & LogName) = LogName

CreateObject("Scripting.FileSystemObject").DeleteFolder Logs.LogDir
' Output:
' True
```

Some paths come out with a doubled backslash, such as `<root>\\logs\system`; Windows accepts the path as it is. The file is opened for appending, and each line is written with the **Print #** statement, so the file is ANSI text, in the code page of the system. A character that the code page does not have is not stored as written. On a system whose code page is Western, the letter *e* with an acute accent, `ChrW(233)`, is stored as the byte E9, and a Chinese character such as `ChrW(&H4E2D)` is stored as a question mark.

## Properties

### DebugPring
{: .no_toc }

A **Boolean**, **False** by default. The name is spelled with the letters *Pring*. When it is **True** and `App.LogMode` is 0 (**vbLogAuto**), every line that is made is also printed to the Debug Console with **Debug.Print**, which in a debug run shows it there.

### FormListBox
{: .no_toc }

A [**ListBox**](../../VB/ListBox/) of a form, to which [**FormView**](#formview) adds the lines. A field, **Nothing** by default. Assign it with **Set**: `Set Logs.FormListBox = List1`.

### FormListBoxMaxItem
{: .no_toc }

A **Long**, the number of lines that [**FormView**](#formview) keeps in the list. The default is 0, and any value below 9 is replaced by 999 the first time a line is added: the property is then 999.

### LogDir
{: .no_toc }

A **String**, the folder under which [**Save**](#save) puts its files. When it is empty, the folder of the program is used. The folder need not exist.

### LogFileNameByUer
{: .no_toc }

A **String**, the file name for the rule **byUser**, with a path under the sub-folder if the program wants one. The name is spelled with the letters *Uer*. When it is empty, [**Save**](#save) sets it to `vb.txt`.

### LogFileNameRule
{: .no_toc }

An [**EnumLogFileNameRule**](#enumlogfilenamerule), the rule that decides the path of the file. The default is **None**, and [**Save**](#save) changes **None** to **ByDay** the first time it runs, so the property is **ByDay** afterwards.

### LogLevelControl
{: .no_toc }

An [**EnumLogLevel**](#enumloglevel), the lowest level that is kept. The default is **Info**, so every line is kept. A higher value means fewer lines.

### LogSubDir
{: .no_toc }

A **String**, a folder under the root that separates the logs of one part of the program from those of another. When it is empty, [**Save**](#save) sets it to `system`.

### SendToDbgView
{: .no_toc }

A **Boolean**, **False** by default. When it is **True**, [**Save**](#save) also calls [**DbgView**](#dbgview) for every line. The *ToDbgView* argument of **Save** has the same effect for one call.

### SendToFormView
{: .no_toc }

A **Boolean**, **False** by default. When it is **True**, [**Save**](#save) also calls [**FormView**](#formview) for every line. The *ToFormView* argument of **Save** has the same effect for one call.

### SendToWebView
{: .no_toc }

A **Boolean**, **False** by default. When it is **True**, [**Save**](#save) also calls [**WebView**](#webview) for every line. The *ToWebView* argument of **Save** has the same effect for one call.

### WebUserCode
{: .no_toc }

A **String**, the code that identifies the program's log on the web page. [**WebView**](#webview) sends nothing while it is empty. The class's comments say that the code can be any string made of letters and digits.

## Methods

### DbgView
{: .no_toc }

Sends a log line to a debugging tool.

Syntax: *object*.**DbgView** ( *LogStr* [ **,** *LogLevel* ] ) **As String**

*LogStr*
: *required* A **String**, the text of the line.

*LogLevel*
: *optional* An [**EnumLogLevel**](#enumloglevel), the level of the line. The default is **Info**.

<!-- test: LogsTests.DbgView_ReturnsTheLineOrAnEmptyStringBelowTheLevel -->
The line is passed to the Windows function **OutputDebugString**, with the text `[TBMAN-LOG]` and a full-width colon in front of it, so a tool that shows debugging output, such as DebugView, can filter the lines of the class by that prefix. Returns the line, or an empty string if its level is below [**LogLevelControl**](#loglevelcontrol).
<!-- /test -->

### FormView
{: .no_toc }

Adds a log line to a list box.

Syntax: *object*.**FormView** ( *LogStr* [ **,** *LogLevel* ] ) **As String**

*LogStr*
: *required* A **String**, the text of the line.

*LogLevel*
: *optional* An [**EnumLogLevel**](#enumloglevel), the level of the line. The default is **Info**.

<!-- test: LogsTests.FormView_NoListBox_ReturnsAnEmptyString -->
The line is added at the top of [**FormListBox**](#formlistbox), where it is the first item, and the oldest lines are removed so that the list holds at most [**FormListBoxMaxItem**](#formlistboxmaxitem) lines. If **FormListBox** is **Nothing**, nothing happens and the result is an empty string. Otherwise the result is the line, or an empty string if its level is below [**LogLevelControl**](#loglevelcontrol).
<!-- /test -->

```tb check_build
Dim Logs As New cLogs
Set Logs.FormListBox = List1
Logs.FormListBoxMaxItem = 200
Logs.FormView "Ready", EnumLogLevel.Info
```

### Save
{: .no_toc }

Appends a log line to the log file, and returns the line.

Syntax: *object*.**Save** ( *LogStr* [ **,** *LogLevel* ] [ **,** *ToFormView* ] [ **,** *ToDbgView* ] [ **,** *ToWebView* ] ) **As String**

*LogStr*
: *required* A **String**, the text of the line.

*LogLevel*
: *optional* An [**EnumLogLevel**](#enumloglevel), the level of the line. The default is **Info**.

*ToFormView*, *ToDbgView*, *ToWebView*
: *optional* **Boolean** values, **False** by default. Each sends the line to [**FormView**](#formview), [**DbgView**](#dbgview) or [**WebView**](#webview) as well, for this call. The properties [**SendToFormView**](#sendtoformview), [**SendToDbgView**](#sendtodbgview) and [**SendToWebView**](#sendtowebview) do the same for every call.

The method first sets [**LogSubDir**](#logsubdir), [**LogFileNameByUer**](#logfilenamebyuer) and [**LogFileNameRule**](#logfilenamerule) to their working values if they are empty, and that stays so even if the line is then dropped for its level. It makes the line, creates the folders and appends the line to the file as described in [Where a log file goes](#where-a-log-file-goes). Then it calls the three other members in the order **DbgView**, **WebView**, **FormView**, for each output that is switched on. A file error, such as a path that cannot be created, is raised to the caller.

Returns the line, or an empty string if its level is below [**LogLevelControl**](#loglevelcontrol).

<!-- test: LogsTests.Save_OtherOutputs_KeepTheLevelOfTheLine -->
> [!WARNING] 1.0.0.29
> The calls to the three other members do not pass the level of the line. They make the line again at the level **Info**. A line sent to a list box, a debugging tool or a web page is therefore labelled `INFO` whatever level **Save** was given, and when **LogLevelControl** is above **Info** it is not sent at all. The result of **Save** is the text that was made last: the `INFO` line, when one of the outputs sent it.

```tb check_build check_run
Dim Logs As New cLogs
Dim Line As String
Logs.LogDir = Environ$("TEMP") & "\tbmanlib-docs-logs3"

Line = Logs.Save("x", EnumLogLevel.Warn, , True)
Debug.Print InStr(Line, "[INFO] x") > 0

Logs.LogLevelControl = EnumLogLevel.Warn
Line = Logs.Save("x", EnumLogLevel.Warn, , True)
Debug.Print InStr(Line, "[WARN] x") > 0

CreateObject("Scripting.FileSystemObject").DeleteFolder Logs.LogDir
' Output:
' True
' True
```

### WebView
{: .no_toc }

Sends a log line to a web page.

Syntax: *object*.**WebView** ( *LogStr* [ **,** *LogLevel* ] ) **As String**

*LogStr*
: *required* A **String**, the text of the line.

*LogLevel*
: *optional* An [**EnumLogLevel**](#enumloglevel), the level of the line. The default is **Info**.

<!-- test: LogsTests.WebView_NoUserCode_SendsNothingAndReturnsAnEmptyString -->
If [**WebUserCode**](#webusercode) is empty, nothing happens and the result is an empty string.
<!-- /test -->

Otherwise the line is sent in an asynchronous HTTP POST request, made with the late-bound object `WinHttp.WinHttpRequest.5.1`, to `http://log.vb6.pro/submit?code=` followed by **WebUserCode**, with the body `log=` followed by the line. The call does not wait for the answer and does not report whether the request worked. The result is the line, or an empty string if its level is below [**LogLevelControl**](#loglevelcontrol).

> [!IMPORTANT] 1.0.0.29
> The request uses `http`, not `https`, and goes to a web site that is not part of the package: the code and the text of every line can be read by any computer on the way. Neither the code nor the line is URL-encoded, so a `&`, an `=`, a `%` or a `+` in the line changes what the site receives. Do not send lines that hold private data.

```tb check_build
Dim Logs As New cLogs
Logs.WebUserCode = "abc123"
Logs.WebView "service started", EnumLogLevel.Info
```

## Enumerations

### EnumLogFileNameRule
{: .no_toc }

How [**Save**](#save) names its files.

| Member | Value | Meaning |
|:-------|------:|:--------|
| **None** | 0 | The default. **Save** changes it to **ByDay**. |
| **ByMonth** | 1 | One file for each month. |
| **ByDay** | 2 | One file for each day, in a folder for each month. |
| **byUser** | 3 | The file named by [**LogFileNameByUer**](#logfilenamebyuer). |

### EnumLogLevel
{: .no_toc }

The level of a log line.

| Member | Value | Label in the line |
|:-------|------:|:------------------|
| **Info** | 0 | `INFO` |
| **Warn** | 1 | `WARN` |
| **Danger** | 2 | `DANGER` |
| **Error** | 3 | `ERROR` |
| **Debugger** | 4 | none: raises error 9 |
| **Custom** | 5 | none: raises error 9 |

## See Also

- [TBMAN](TBMAN) module -- the shared instance **TBMAN.Logs**
- [cTimeuse](cTimeuse) class -- measures the time a part of a program takes
- [TBMANLIB](.) package -- overview
