---
title: DiagnosticEngine
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/DiagnosticEngine
has_toc: false
---

# DiagnosticEngine class
{: .no_toc }

A **DiagnosticEngine** keeps a list of collectors, runs them one after another, and returns what they collected. It has no collectors of its own: a program registers each one it wants, and the order of registration is the order of the results. It writes nothing to a screen or a file. Its results are read directly or passed to a [formatter](FormatterFactory#formatresults).

```tb check_build check_run
Dim engine As New DiagnosticEngine
engine.RegisterCollector New OSInfoCollector
engine.RegisterCollector New MemoryInfoCollector
engine.RegisterCollector New UptimeCollector

Dim results As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))
Set results = engine.RunAll()

Dim i As Long
For i = 0 To results.Count - 1
    Debug.Print results.Item(i).Category & ": " & results.Item(i).Success
Next i
' Output:
' Operating System: True
' Memory: True
' Uptime: True
```

The result of every collector has the type [**DiagnosticResult**](DiagnosticResult)(Of [**KeyValuePair**](KeyValuePair)(Of String, String)), so a list of results has the type `List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))`. The syntax lines on this page write the type out. The collectors are classes that implement [**IDiagnosticCollector**](IDiagnosticCollector); the package has [eleven of them](Collectors), and a program can add its own.

* TOC
{:toc}

## How a run proceeds

[**RunAll**](#runall) takes the collectors in the order in which they were registered. For each one it does these steps:

1. It raises [**CollectorStarted**](#collectorstarted).
2. It raises [**Progress**](#progress) with the share of collectors that are already done, and the text `Collecting: ` and the collector's category name.
3. It calls the collector's **Collect** method, or its **CollectSummary** method for a summary run, and adds the result to [**Results**](#results).
4. It raises [**CollectorCompleted**](#collectorcompleted).

When the last collector is done, it raises **Progress** with 100 and the text `Complete`, and then [**AllCompleted**](#allcompleted). A run is synchronous. All of this happens inside the call, in the thread of the caller.

Each notification exists twice, as an event and as a callback that a program sets with a property: [**OnCollectorStarted**](#oncollectorstarted), [**OnProgress**](#onprogress), [**OnCollectorCompleted**](#oncollectorcompleted) and [**OnError**](#onerror). The engine raises the event first and calls the callback second, and does both when a program uses both. The callbacks are [delegates](#delegates). **AllCompleted** has no callback.

### A collector that raises an error

<!-- test: EngineTests.RunAll_CollectorRaisesError_RunGoesOnWithTheMessage -->
A collector that raises a run-time error does not stop the run. The engine takes the text of the error (**Err.Description**), replaces the collector's result with a new, empty result for the same category that holds the text as its [**ErrorMessage**](DiagnosticResult#errormessage), and goes on with the next collector. The number and the source of the error are not kept. The engine raises [**Error**](#error) for it before **CollectorCompleted**, which then reports `success` as **False** and an `itemCount` of 0. [**RunCategory**](#runcategory) and [**RunByRefreshMode**](#runbyrefreshmode) handle an error in the same way.
<!-- /test -->

A collector that fails without raising an error, such as one whose Windows call returns an error code, returns its own result with **Success** set to **False**. The engine does not call **Error** for it.

### The samples on this page

The samples use two classes of the program. **StubCollector** is a collector that returns one item and can be told to fail. **RunWatcher** prints each event of an engine.

```tb check_build slot=file projname=diag-engine
Class StubCollector
    Implements IDiagnosticCollector

    Public Category As String
    Public Fail As Boolean

    Private Property Get IDiagnosticCollector_CategoryName() As String
        Return Category
    End Property

    Private Property Get IDiagnosticCollector_Description() As String
        Return "A collector for the samples"
    End Property

    Private Property Get IDiagnosticCollector_RefreshMode() As RefreshMode
        Return RefreshMode.Static
    End Property

    Private Property Get IDiagnosticCollector_RequiresElevation() As Boolean
        Return False
    End Property

    Private Property Get IDiagnosticCollector_SupportsSummary() As Boolean
        Return False
    End Property

    Private Function IDiagnosticCollector_Collect() As DiagnosticResult(Of KeyValuePair(Of String, String))
        If Fail Then Err.Raise 5, "StubCollector", "stub failure"
        Dim result As DiagnosticResult(Of KeyValuePair(Of String, String))
        Set result = New DiagnosticResult(Of KeyValuePair(Of String, String))(Category)
        result.AddItem New KeyValuePair(Of String, String)("Answer", "42")
        Return result
    End Function

    Private Function IDiagnosticCollector_CollectSummary() As DiagnosticResult(Of KeyValuePair(Of String, String))
        Return IDiagnosticCollector_Collect()
    End Function
End Class
```

```tb check_build slot=file projname=diag-engine
Class RunWatcher
    Private WithEvents m_Engine As DiagnosticEngine

    Public Sub Attach(ByVal engine As DiagnosticEngine)
        Set m_Engine = engine
    End Sub

    Private Sub m_Engine_CollectorStarted(ByVal category As String)
        Debug.Print "started " & category
    End Sub

    Private Sub m_Engine_Progress(ByVal percent As Long, ByVal message As String)
        Debug.Print "progress " & percent & " " & message
    End Sub

    Private Sub m_Engine_Error(ByVal category As String, ByVal errorMessage As String)
        Debug.Print "error " & category & " " & errorMessage
    End Sub

    Private Sub m_Engine_CollectorCompleted(ByVal category As String, ByVal success As Boolean, ByVal itemCount As Long)
        Debug.Print "completed " & category & " " & success & " " & itemCount
    End Sub

    Private Sub m_Engine_AllCompleted(ByVal results As List(Of DiagnosticResult(Of KeyValuePair(Of String, String))))
        Debug.Print "all " & results.Count
    End Sub
End Class
```

With one collector that fails between two that do not:

```tb check_build check_run projname=diag-engine
Dim engine As New DiagnosticEngine
Dim watcher As New RunWatcher
watcher.Attach engine

Dim alpha As New StubCollector
Dim beta As New StubCollector
Dim gamma As New StubCollector
alpha.Category = "Alpha"
beta.Category = "Beta"
beta.Fail = True
gamma.Category = "Gamma"
engine.RegisterCollector alpha
engine.RegisterCollector beta
engine.RegisterCollector gamma

engine.RunAll
' Output:
' started Alpha
' progress 0 Collecting: Alpha
' completed Alpha True 1
' started Beta
' progress 33 Collecting: Beta
' error Beta stub failure
' completed Beta False 0
' started Gamma
' progress 67 Collecting: Gamma
' completed Gamma True 1
' progress 100 Complete
' all 3
```

## Properties

### CollectorCount
{: .no_toc }

The number of registered collectors.

Syntax: *engine*.**CollectorCount** **As Long**

Read-only. It is the **Count** of the list that [**Collectors**](#collectors) returns.

### Collectors
{: .no_toc }

The registered collectors, in the order of registration.

Syntax: *engine*.**Collectors** **As List(Of IDiagnosticCollector)**

Read-only. The property returns the list that the engine uses, not a copy. A collector added to the list directly is run, and the check for a duplicate category name that [**RegisterCollector**](#registercollector) makes is not made. A collector removed from it is no longer run. See [**List**](List) for the members of the list. Its index starts at 0.

### IsRunning
{: .no_toc }

Whether a run is in progress.

Syntax: *engine*.**IsRunning** **As Boolean**

<!-- test: EngineTests.IsRunning_BeforeAndAfterARun_IsFalse -->
Read-only. [**RunAll**](#runall) and [**RunByRefreshMode**](#runbyrefreshmode) set it to **True** when they start and to **False** when their loop over the collectors ends. It is therefore **True** in the handlers of **CollectorStarted**, **Error**, **CollectorCompleted** and the **Progress** events that come before a collector, and **False** in the last **Progress** event (100, `Complete`) and in **AllCompleted**. [**RunCategory**](#runcategory) sets it to **False** before it raises **CollectorCompleted**. A run that a handler starts sets it to **False** when that run ends, while the outer run goes on.
<!-- /test -->

### OnCollectorCompleted
{: .no_toc }

A callback for the end of each collector.

Syntax: *engine*.**OnCollectorCompleted** **=** **AddressOf** *procedure*

Write-only. The value is a [**DiagnosticCompleteHandler**](#diagnosticcompletehandler). The engine calls it after it raises [**CollectorCompleted**](#collectorcompleted), with the same three values.

### OnCollectorStarted
{: .no_toc }

A callback for the start of each collector.

Syntax: *engine*.**OnCollectorStarted** **=** **AddressOf** *procedure*

Write-only. The value is a [**DiagnosticCompleteHandler**](#diagnosticcompletehandler), the same delegate type as for the end of a collector. The engine calls it after it raises [**CollectorStarted**](#collectorstarted), with the category name, `success` set to **True** and `itemCount` set to 0.

### OnError
{: .no_toc }

A callback for the error of a collector.

Syntax: *engine*.**OnError** **=** **AddressOf** *procedure*

Write-only. The value is a [**DiagnosticErrorHandler**](#diagnosticerrorhandler). The engine calls it after it raises [**Error**](#error), with the same two values.

### OnProgress
{: .no_toc }

A callback for the progress of a run.

Syntax: *engine*.**OnProgress** **=** **AddressOf** *procedure*

Write-only. The value is a [**DiagnosticProgressHandler**](#diagnosticprogresshandler). The engine calls it after it raises [**Progress**](#progress), with the same two values.

The callbacks and [**Cancel**](#cancel) are shown in this example, which stops the run when it reaches the collector `Beta`. The module holds the engine in a variable of its own for the callback to reach.

```tb check_build slot=module projname=diag-engine
Public CallbackEngine As DiagnosticEngine

Public Sub StopAtBeta(ByVal percent As Long, ByVal message As String)
    Debug.Print percent & " " & message
    If message = "Collecting: Beta" Then CallbackEngine.Cancel
End Sub

Public Sub ShowCompleted(ByVal category As String, ByVal success As Boolean, ByVal itemCount As Long)
    Debug.Print "completed " & category & " " & itemCount
End Sub
```

```tb check_build check_run projname=diag-engine
Set CallbackEngine = New DiagnosticEngine
CallbackEngine.OnProgress = AddressOf StopAtBeta
CallbackEngine.OnCollectorCompleted = AddressOf ShowCompleted

Dim names() As String = Split("Alpha,Beta,Gamma", ",")
Dim c As StubCollector
Dim i As Long
For i = 0 To 2
    Set c = New StubCollector
    c.Category = names(i)
    CallbackEngine.RegisterCollector c
Next i

Dim results As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))
Set results = CallbackEngine.RunAll()
Debug.Print results.Count
' Output:
' 0 Collecting: Alpha
' completed Alpha 1
' 33 Collecting: Beta
' completed Beta 1
' 100 Complete
' 2
```

### Results
{: .no_toc }

The results of the last [**RunAll**](#runall).

Syntax: *engine*.**Results** **As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))**

<!-- test: EngineTests.RunAll_NextRun_EmptiesTheEarlierList, EngineTests.RunAll_ResultsAreInOrderOfRegistration -->
Read-only. It is the list that **RunAll** fills and returns, not a copy of it. **RunAll** empties it when it starts, so a variable that holds the result of an earlier run is empty or refilled once the next run has started. [**RunCategory**](#runcategory) and [**RunByRefreshMode**](#runbyrefreshmode) do not add to it. Copy the items to a list of the program to keep them.
<!-- /test -->

```tb check_build check_run
Dim engine As New DiagnosticEngine
engine.RegisterCollector New UptimeCollector

Dim first As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))
Set first = engine.RunAll()
Debug.Print first Is engine.Results   ' True
Debug.Print first.Count               ' 1

engine.UnregisterCollector "Uptime"
engine.RunAll
Debug.Print first.Count               ' 0
' Output:
' True
' 1
' 0
```

## Methods

### Cancel
{: .no_toc }

Asks a run to stop before its next collector.

Syntax: *engine*.**Cancel**

Sets a flag that [**RunAll**](#runall) and [**RunByRefreshMode**](#runbyrefreshmode) read before they start each collector. The collector that is running finishes. A run is synchronous, so the call can come only from code that runs during the run, which is a handler of an event or a callback. The two methods clear the flag when they start, so a call that comes before a run has no effect. **RunAll** still raises **Progress** with 100 and `Complete` and then **AllCompleted** after a cancel, with the results of the collectors that ran. [**RunCategory**](#runcategory) does not read the flag. See the example under [**OnProgress**](#onprogress).

### IsElevated
{: .no_toc }

Whether the program runs with administrator rights.

Syntax: *engine*.**IsElevated** **As Boolean**

Calls `IsUserAnAdmin` of `shell32.dll` and returns **True** when the result is not zero. The engine does not use the value: it never reads the [**RequiresElevation**](IDiagnosticCollector#requireselevation) property of its collectors, and the collectors of the package all return **False** for it.

### New
{: .no_toc }

Creates an engine.

Syntax: **New** **DiagnosticEngine**

The engine starts with no collectors, no results, no callbacks and **IsRunning** set to **False**.

### RegisterCollector
{: .no_toc }

Adds a collector to the engine.

Syntax: *engine*.**RegisterCollector** ( *collector* )

*collector*
: *required* An object that implements [**IDiagnosticCollector**](IDiagnosticCollector).

<!-- test: EngineTests.RegisterCollector_SameCategory_Raises5, EngineTests.RegisterCollector_Nothing_Raises5, EngineTests.RegisterCollector_CategoryNames_AreCaseSensitive -->
The collector goes to the end of the list. Registering the same collector twice, or two collectors with the same [**CategoryName**](IDiagnosticCollector#categoryname), is an error.

The method raises error 5 (*Invalid procedure call or argument*) in these cases, with the source `DiagnosticEngine.RegisterCollector`:

- *collector* is **Nothing**. The text is `Collector cannot be Nothing`.
- A registered collector has the same category name. The text is `Collector already exists: ` and the name. The names are compared with the `=` operator, and the package has no **Option Compare** statement, so the comparison is binary and the letter case matters: `Alpha` and `ALPHA` are two names.
<!-- /test -->

```tb check_build check_run projname=diag-engine
Dim engine As New DiagnosticEngine
Dim a As New StubCollector
a.Category = "Alpha"
engine.RegisterCollector a

On Error Resume Next
engine.RegisterCollector a
Debug.Print Err.Number & " " & Err.Source & ": " & Err.Description
Err.Clear
engine.RegisterCollector Nothing
Debug.Print Err.Number & " " & Err.Source & ": " & Err.Description
Debug.Print engine.CollectorCount
' Output:
' 5 DiagnosticEngine.RegisterCollector: Collector already exists: Alpha
' 5 DiagnosticEngine.RegisterCollector: Collector cannot be Nothing
' 1
```

### RunAll
{: .no_toc }

Runs every collector and returns the results.

Syntax: *engine*.**RunAll** [ ( *useSummary* ) ] **As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))**

*useSummary*
: *optional* A **Boolean**. When **True**, a collector whose **SupportsSummary** property is **True** is asked for **CollectSummary**, and the others for **Collect**. Default: **False**.

Returns the list [**Results**](#results), which holds one result for each collector, in the order of registration. [How a run proceeds](#how-a-run-proceeds) describes the steps and the events. A run with no collector raises **Progress** with 100 and `Complete` and then **AllCompleted** with an empty list.

<!-- test: EngineTests.RunAll_Summary_AsksSummaryCollectorsForTheirSummary -->
A summary result has [**IsSummary**](DiagnosticResult#issummary) set to **True** when the collector sets it, as the built-in collectors that support a summary do.
<!-- /test -->

```tb check_build check_run
Dim engine As New DiagnosticEngine
engine.RegisterCollector New CPUInfoCollector
engine.RegisterCollector New EnvironmentCollector

Dim results As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))
Set results = engine.RunAll(True)
Debug.Print results.Item(0).Category & " " & results.Item(0).IsSummary
Debug.Print results.Item(1).Category & " " & results.Item(1).IsSummary
' Output:
' CPU Info False
' Environment True
```

### RunByRefreshMode
{: .no_toc }

Runs the collectors that have one refresh mode.

Syntax: *engine*.**RunByRefreshMode** ( *mode* [ , *useSummary* ] ) **As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))**

*mode*
: *required* A [**RefreshMode**](RefreshMode) member. Only the collectors whose **RefreshMode** property is equal to it run.

*useSummary*
: *optional* A **Boolean**, as for [**RunAll**](#runall). Default: **False**.

<!-- test: EngineTests.RunByRefreshMode_RunsOnlyTheCollectorsOfThatMode -->
Returns a new list with one result for each collector that ran, in the order of registration. The list is not [**Results**](#results), which this method does not change. The method raises **CollectorStarted**, **CollectorCompleted** and **Error** for each collector, and neither **Progress** nor **AllCompleted**. It clears the flag of [**Cancel**](#cancel) when it starts and reads it before each collector, as **RunAll** does.
<!-- /test -->

```tb check_build check_run
Dim engine As New DiagnosticEngine
engine.RegisterCollector New OSInfoCollector
engine.RegisterCollector New MemoryInfoCollector
engine.RegisterCollector New LocaleCollector
engine.RegisterCollector New UptimeCollector

Dim changing As List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))
Set changing = engine.RunByRefreshMode(RefreshMode.Dynamic)

Dim i As Long
For i = 0 To changing.Count - 1
    Debug.Print changing.Item(i).Category
Next i
Debug.Print engine.Results.Count
' Output:
' Memory
' Uptime
' 0
```

### RunCategory
{: .no_toc }

Runs the collector with one category name.

Syntax: *engine*.**RunCategory** ( *categoryName* [ , *useSummary* ] ) **As DiagnosticResult(Of KeyValuePair(Of String, String))**

*categoryName*
: *required* A **String**, the [**CategoryName**](IDiagnosticCollector#categoryname) of a registered collector. The first collector with that name runs.

*useSummary*
: *optional* A **Boolean**, as for [**RunAll**](#runall). Default: **False**.

<!-- test: EngineTests.RunCategory_Known_RunsThatCollectorOnly, EngineTests.RunCategory_Unknown_ReturnsAFailedResult -->
Returns the result of the collector. The result is not added to [**Results**](#results). The method raises **CollectorStarted**, **CollectorCompleted** and **Error**, and neither **Progress** nor **AllCompleted**.

When no collector has the name, the method raises no error and no event. It returns a result for *categoryName* with **Success** set to **False** and the message `Collector not found: ` and the name.
<!-- /test -->

```tb check_build check_run
Dim engine As New DiagnosticEngine
engine.RegisterCollector New UptimeCollector

Dim r As DiagnosticResult(Of KeyValuePair(Of String, String))
Set r = engine.RunCategory("Uptime")
Debug.Print r.Category & " " & r.Success & " " & r.ItemCount

Set r = engine.RunCategory("Nothing here")
Debug.Print r.Category & " " & r.Success & " " & r.ErrorMessage
' Output:
' Uptime True 5
' Nothing here False Collector not found: Nothing here
```

### UnregisterCollector
{: .no_toc }

Removes a collector from the engine.

Syntax: *engine*.**UnregisterCollector** ( *categoryName* )

*categoryName*
: *required* A **String**, the category name of the collector to remove.

<!-- test: EngineTests.UnregisterCollector_RemovesTheFirstWithThatName -->
Removes the first collector with that name. A name that no collector has is ignored without an error. The names are compared as in [**RegisterCollector**](#registercollector), so the letter case matters.
<!-- /test -->

## Events

### AllCompleted
{: .no_toc }

Raised when [**RunAll**](#runall) has run its last collector.

Syntax: **Event** **AllCompleted** ( *results* )

*results*
: The [**Results**](#results) list, as a `List(Of DiagnosticResult(Of KeyValuePair(Of String, String)))`.

It follows the last **Progress** event. A run that was cancelled raises it too. There is no callback for it.

### CollectorCompleted
{: .no_toc }

Raised after a collector has returned its result.

Syntax: **Event** **CollectorCompleted** ( *category*, *success*, *itemCount* )

*category*
: A **String**, the category name of the collector.

*success*
: A **Boolean**, the **Success** property of the result. It is **False** when the collector raised an error, and when it reported a failure itself.

*itemCount*
: A **Long**, the **ItemCount** property of the result.

### CollectorStarted
{: .no_toc }

Raised before a collector is run.

Syntax: **Event** **CollectorStarted** ( *category* )

*category*
: A **String**, the category name of the collector.

### Error
{: .no_toc }

Raised when a collector raised a run-time error.

Syntax: **Event** **Error** ( *category*, *errorMessage* )

*category*
: A **String**, the category name of the collector.

*errorMessage*
: A **String**, the **Err.Description** of the error.

It is raised before **CollectorCompleted** for the same collector. It is not raised for a result that a collector returns with **Success** set to **False**, or for a category name that no collector has. A handler is written as `m_Engine_Error` for a variable `m_Engine` declared with **WithEvents**.

### Progress
{: .no_toc }

Raised before each collector of a [**RunAll**](#runall), and at its end.

Syntax: **Event** **Progress** ( *percent*, *message* )

*percent*
: A **Long**. Before a collector it is the number of collectors that are already done, times 100, divided by the number of collectors, and converted with **CLng**: with three collectors the values are 0, 33 and 67. At the end it is 100.

*message*
: A **String**. Before a collector it is `Collecting: ` and the category name of the collector. At the end it is `Complete`.

**RunCategory** and **RunByRefreshMode** do not raise it.

## Delegates

The three delegate types are declared in a module of the package, **DelegatesModule**, which has no page of its own. They are the types of the callback properties. A procedure for a callback is written with the same arguments, and passed with **AddressOf**.

### DiagnosticCompleteHandler
{: .no_toc }

The type of [**OnCollectorStarted**](#oncollectorstarted) and [**OnCollectorCompleted**](#oncollectorcompleted).

Syntax: **Delegate Sub** **DiagnosticCompleteHandler** ( **ByVal** *category* **As String**, **ByVal** *success* **As Boolean**, **ByVal** *itemCount* **As Long** )

The arguments are those of [**CollectorCompleted**](#collectorcompleted). When the engine calls a procedure of this type for the start of a collector, *success* is **True** and *itemCount* is 0.

### DiagnosticErrorHandler
{: .no_toc }

The type of [**OnError**](#onerror).

Syntax: **Delegate Sub** **DiagnosticErrorHandler** ( **ByVal** *category* **As String**, **ByVal** *errorMessage* **As String** )

The arguments are those of [**Error**](#error).

### DiagnosticProgressHandler
{: .no_toc }

The type of [**OnProgress**](#onprogress).

Syntax: **Delegate Sub** **DiagnosticProgressHandler** ( **ByVal** *percent* **As Long**, **ByVal** *message* **As String** )

The arguments are those of [**Progress**](#progress).

## See Also

- [IDiagnosticCollector](IDiagnosticCollector) interface -- the contract of a collector
- [Collectors](Collectors) -- the eleven collectors of the package
- [DiagnosticResult](DiagnosticResult) class -- what a collector returns
- [RefreshMode](RefreshMode) enumeration -- the modes that **RunByRefreshMode** selects by
- [FormatterFactory](FormatterFactory) module -- turns a list of results into text
- [**On Error**](../../../Core/On-Error) statement -- handles the errors that **RegisterCollector** raises
