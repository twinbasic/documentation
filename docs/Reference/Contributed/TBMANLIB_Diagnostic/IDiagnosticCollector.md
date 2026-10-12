---
title: IDiagnosticCollector
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/IDiagnosticCollector
has_toc: false
---

# IDiagnosticCollector interface
{: .no_toc }

The contract of a collector: an object that finds one kind of information, such as the memory or the disks, and returns it as a [**DiagnosticResult**](DiagnosticResult). A [**DiagnosticEngine**](DiagnosticEngine) runs objects of this type. The eleven classes of [Collectors](Collectors) implement it, and a class of a program can implement it too.

The interface has five properties that describe the collector and two methods that collect.

```tb check_build slot=file projname=diag-collector
Class ToolCollector
    Implements IDiagnosticCollector

    Private Property Get IDiagnosticCollector_CategoryName() As String
        Return "Tool"
    End Property

    Private Property Get IDiagnosticCollector_Description() As String
        Return "Fixed values of the program"
    End Property

    Private Property Get IDiagnosticCollector_RefreshMode() As RefreshMode
        Return RefreshMode.Static
    End Property

    Private Property Get IDiagnosticCollector_RequiresElevation() As Boolean
        Return False
    End Property

    Private Property Get IDiagnosticCollector_SupportsSummary() As Boolean
        Return True
    End Property

    Private Function IDiagnosticCollector_Collect() As DiagnosticResult(Of KeyValuePair(Of String, String))
        Dim result As DiagnosticResult(Of KeyValuePair(Of String, String))
        Set result = New DiagnosticResult(Of KeyValuePair(Of String, String))("Tool")
        result.AddItem New KeyValuePair(Of String, String)("Name", "Sample")
        result.AddItem New KeyValuePair(Of String, String)("Version", "1.2")
        Return result
    End Function

    Private Function IDiagnosticCollector_CollectSummary() As DiagnosticResult(Of KeyValuePair(Of String, String))
        Dim result As DiagnosticResult(Of KeyValuePair(Of String, String))
        Set result = New DiagnosticResult(Of KeyValuePair(Of String, String))("Tool")
        result.IsSummary = True
        result.AddItem New KeyValuePair(Of String, String)("Version", "1.2")
        Return result
    End Function
End Class
```

```tb check_build check_run projname=diag-collector
Dim engine As New DiagnosticEngine
engine.RegisterCollector New ToolCollector

Dim full As DiagnosticResult(Of KeyValuePair(Of String, String))
Dim brief As DiagnosticResult(Of KeyValuePair(Of String, String))
Set full = engine.RunCategory("Tool")
Set brief = engine.RunCategory("Tool", True)

Debug.Print full.ItemCount & " " & full.IsSummary
Debug.Print brief.ItemCount & " " & brief.IsSummary
' Output:
' 2 False
' 1 True
```

A collector can be run on its own, without an engine; see [Calling a collector directly](Collectors#calling-a-collector-directly).

* TOC
{:toc}

## What the engine reads

The engine reads **CategoryName**, **RefreshMode**, **SupportsSummary**, **Collect** and **CollectSummary**. It does not read **Description** or **RequiresElevation**; they are there for the program. The category name of a collector should be the same text as the **Category** of the result that it returns, because a formatter prints the **Category** of the result, and the engine finds a collector by its **CategoryName**. The engine does not check that they agree.

## Properties

### CategoryName
{: .no_toc }

The name that identifies the collector.

Syntax: *collector*.**CategoryName** **As String**

Read-only. The engine refuses two collectors with the same name, finds a collector by it in [**RunCategory**](DiagnosticEngine#runcategory) and [**UnregisterCollector**](DiagnosticEngine#unregistercollector), and passes it to the events. The built-in collectors return fixed names such as `Operating System` and `CPU Info`; see [Collectors](Collectors).

### Description
{: .no_toc }

A sentence that says what the collector collects.

Syntax: *collector*.**Description** **As String**

Read-only. Nothing in the package reads it.

### RefreshMode
{: .no_toc }

How often the data of the collector changes.

Syntax: *collector*.**RefreshMode** **As** [**RefreshMode**](RefreshMode)

Read-only. [**RunByRefreshMode**](DiagnosticEngine#runbyrefreshmode) selects the collectors by it.

### RequiresElevation
{: .no_toc }

Whether the collector needs administrator rights.

Syntax: *collector*.**RequiresElevation** **As Boolean**

Read-only. The engine does not read it, and does not skip a collector that returns **True**. All the collectors of the package return **False**. A program can compare it with [**IsElevated**](DiagnosticEngine#iselevated).

### SupportsSummary
{: .no_toc }

Whether the collector has a short form of its data.

Syntax: *collector*.**SupportsSummary** **As Boolean**

Read-only. The engine asks a collector for **CollectSummary** only when this is **True** and the run is a summary run. A collector that returns **False** still has to implement **CollectSummary**; the collectors of the package return the result of **Collect** from it.

## Methods

### Collect
{: .no_toc }

Collects the data and returns it.

Syntax: *collector*.**Collect** **As DiagnosticResult(Of KeyValuePair(Of String, String))**

Returns a result that holds the items in the order of the report. A collector reports a failure by [**SetError**](DiagnosticResult#seterror) on the result it returns, or by raising a run-time error, which the engine turns into the same kind of result, see [A collector that raises an error](DiagnosticEngine#a-collector-that-raises-an-error). It returns a result, never **Nothing**: the engine reads the result's **Success** and **ItemCount**, and a **Nothing** makes [**RunAll**](DiagnosticEngine#runall) raise run-time error 91 out of the engine. The run stops at that collector, and [**IsRunning**](DiagnosticEngine#isrunning) stays **True**.

### CollectSummary
{: .no_toc }

Collects the short form of the data.

Syntax: *collector*.**CollectSummary** **As DiagnosticResult(Of KeyValuePair(Of String, String))**

Returns a result with the most important items only. A collector that supports it sets [**IsSummary**](DiagnosticResult#issummary) to **True** on the result.

## See Also

- [DiagnosticEngine](DiagnosticEngine) class -- registers and runs collectors
- [DiagnosticResult](DiagnosticResult) class -- what a collector returns
- [RefreshMode](RefreshMode) enumeration -- the type of **RefreshMode**
- [Collectors](Collectors) -- the eleven collectors of the package
- [**Implements**](../../../Core/Implements) statement -- how a class takes on an interface
