---
title: DiagnosticResult
parent: TBMANLIB_Diagnostic Package
permalink: /tB/Packages/Contributed/TBMANLIB_Diagnostic/DiagnosticResult
has_toc: false
---

# DiagnosticResult class
{: .no_toc }

A **DiagnosticResult** holds what one collector found: the category name, the list of items, the time, and whether the collection worked. It is a generic class, **DiagnosticResult(Of T)**, where *T* is the type of an item. The engine, the collectors and the formatters all use `DiagnosticResult(Of KeyValuePair(Of String, String))`, so each item is a [**KeyValuePair**](KeyValuePair) of a key and a value that are both text.

```tb check_build check_run
Dim r As DiagnosticResult(Of KeyValuePair(Of String, String))
Set r = New DiagnosticResult(Of KeyValuePair(Of String, String))("Demo")
r.AddItem New KeyValuePair(Of String, String)("Answer", "42")

Debug.Print r.Category & " " & r.Success & " " & r.ItemCount
Debug.Print r.Items.Item(0).Key & "=" & r.Items.Item(0).Value

r.SetError "disk not ready"
Debug.Print r.Success & " " & r.ErrorMessage & " " & r.ItemCount
Debug.Print Abs(DateDiff("s", r.CollectedAt, Now)) < 5
' Output:
' Demo True 1
' Answer=42
' False disk not ready 1
' True
```

A program creates a result when it writes a collector of its own, see [**IDiagnosticCollector**](IDiagnosticCollector), or builds results by hand to give a formatter, see [**FormatterFactory.FormatResults**](FormatterFactory#formatresults). The built-in collectors create theirs with the category name as the argument, and add the items in the order in which they appear in a report.

* TOC
{:toc}

## Properties

### Category
{: .no_toc }

The category name of the result.

Syntax: *result*.**Category** [ **=** *value* ]

A **String**. It is the argument of the constructor, or an empty string for a result made without one. The formatters print it as the title of the group of items, so it should be the [**CategoryName**](IDiagnosticCollector#categoryname) of the collector. The engine does not check that it is.

### CollectedAt
{: .no_toc }

The time at which the result was created.

Syntax: *result*.**CollectedAt** [ **=** *value* ]

A **Date**, the local time of the constructor (**Now**). It does not change when items are added. A collector creates its result at the start of its work, so the value is the time at which the collection began. No formatter prints it.

### ErrorMessage
{: .no_toc }

The text of the failure.

Syntax: *result*.**ErrorMessage** [ **=** *value* ]

A **String**, empty for a result that did not fail. [**SetError**](#seterror) sets it. A formatter that finds **Success** set to **False** prints this text as the only item of the category, under the key `Error`.

### IsSummary
{: .no_toc }

Whether the result is the short form of a collection.

Syntax: *result*.**IsSummary** [ **=** *value* ]

A **Boolean**, **False** for a new result. The collectors that support a summary set it to **True** in the result of **CollectSummary**. Nothing reads it in the package, and no formatter prints it. A program can read it to tell the two forms apart.

### ItemCount
{: .no_toc }

The number of items.

Syntax: *result*.**ItemCount** **As Long**

Read-only. It is the **Count** of [**Items**](#items).

### Items
{: .no_toc }

The items of the result.

Syntax: *result*.**Items** **As List(Of T)**

Read-only. The property returns the list that the result uses, not a copy, so a program can change the list directly. Its index starts at 0, see [**List**](List). The list is empty when the result is new and when the collection failed before it added anything.

### Success
{: .no_toc }

Whether the collection worked.

Syntax: *result*.**Success** [ **=** *value* ]

A **Boolean**, **True** for a new result. [**SetError**](#seterror) sets it to **False**. The engine reports it as the *success* argument of [**CollectorCompleted**](DiagnosticEngine#collectorcompleted).

## Methods

### AddItem
{: .no_toc }

Adds an item at the end of the list.

Syntax: *result*.**AddItem** ( *item* )

*item*
: *required* A value of type *T*.

The method does not check the item and does not look for a key that is already there.

### New
{: .no_toc }

Creates a result.

Syntax: **New** **DiagnosticResult(Of T)** [ ( *categoryName* ) ]

*categoryName*
: *optional* A **String**, the value of [**Category**](#category). Without it, **Category** is an empty string.

The new result has no items, **Success** set to **True**, an empty **ErrorMessage**, **IsSummary** set to **False**, and **CollectedAt** set to the time of the call.

### SetError
{: .no_toc }

Marks the result as failed.

Syntax: *result*.**SetError** ( *errMsg* )

*errMsg*
: *required* A **String**, the text for [**ErrorMessage**](#errormessage).

Sets **Success** to **False** and **ErrorMessage** to *errMsg*. The items that are already in the list stay, and the formatters leave them out of the report.

## See Also

- [KeyValuePair](KeyValuePair) class -- the type of the items
- [List](List) class -- the type of **Items**
- [IDiagnosticCollector](IDiagnosticCollector) interface -- the functions that return a result
- [DiagnosticEngine](DiagnosticEngine) class -- runs collectors and returns lists of results
