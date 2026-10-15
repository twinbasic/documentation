---
title: SetDocumentFilters
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/SetDocumentFilters
has_toc: false
---

# SetDocumentFilters
{: .no_toc }

Replaces the [**Filter**](Filter) with pairs for office documents.

Syntax: *object*.**SetDocumentFilters**

*object*
: *required* An object expression that evaluates to a **cDialog**.

## Remarks

<!-- test: CDialogPropertyTests.SetDocumentFilters_HasSixPairs -->
**SetDocumentFilters** calls [**ClearFilter**](ClearFilter), so any earlier filter is lost, and then [**AddFilter**](AddFilter) for each pair:

| Description | Pattern |
|---|---|
| `Word Documents (*.doc;*.docx)` | `*.doc;*.docx` |
| `Excel Workbooks (*.xls;*.xlsx)` | `*.xls;*.xlsx` |
| `PowerPoint Presentations (*.ppt;*.pptx)` | `*.ppt;*.pptx` |
| `PDF Documents (*.pdf)` | `*.pdf` |
| `Text Files (*.txt)` | `*.txt` |
| `All Files (*.*)` | `*.*` |

The descriptions are fixed English text. To show other text, build the filter with [**AddFilter**](AddFilter). The first pair, Word Documents, is the one that the dialog selects when it opens.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Dim parts() As String
Dim pairCount As Long

dlg.SetDocumentFilters
parts = Split(dlg.Filter, "|")
pairCount = (UBound(parts) + 1) \ 2
Debug.Print pairCount   ' 6
Debug.Print parts(0)    ' Word Documents (*.doc;*.docx)
Debug.Print parts(1)    ' *.doc;*.docx
```

## See Also

- [SetCommonFilters](SetCommonFilters) method -- text files
- [SetImageFilters](SetImageFilters) method -- image files
- [SetCodeFilters](SetCodeFilters) method -- source code files
- [Filter](Filter) property -- the whole list as one string
- [cDialog](.) class -- overview
