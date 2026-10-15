---
title: SetImageFilters
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/SetImageFilters
has_toc: false
---

# SetImageFilters
{: .no_toc }

Replaces the [**Filter**](Filter) with pairs for image files.

Syntax: *object*.**SetImageFilters**

*object*
: *required* An object expression that evaluates to a **cDialog**.

## Remarks

<!-- test: CDialogPropertyTests.SetImageFilters_HasSixPairs -->
**SetImageFilters** calls [**ClearFilter**](ClearFilter), so any earlier filter is lost, and then [**AddFilter**](AddFilter) for each pair:

| Description | Pattern |
|---|---|
| `Bitmap Files (*.bmp)` | `*.bmp` |
| `JPEG Files (*.jpg;*.jpeg)` | `*.jpg;*.jpeg` |
| `PNG Files (*.png)` | `*.png` |
| `GIF Files (*.gif)` | `*.gif` |
| `All Image Files (*.bmp;*.jpg;*.jpeg;*.png;*.gif)` | `*.bmp;*.jpg;*.jpeg;*.png;*.gif` |
| `All Files (*.*)` | `*.*` |

The descriptions are fixed English text. To show other text, build the filter with [**AddFilter**](AddFilter). The file-type list of the dialog holds the six descriptions in this order. The first, Bitmap Files, is the one that is selected when the dialog opens, not All Image Files, which is the fifth.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Dim parts() As String
Dim pairCount As Long

dlg.AddFilter "Old", "*.old"
dlg.SetImageFilters

parts = Split(dlg.Filter, "|")
pairCount = (UBound(parts) + 1) \ 2
Debug.Print pairCount   ' 6
Debug.Print parts(0)    ' Bitmap Files (*.bmp)
Debug.Print parts(1)    ' *.bmp
```

## See Also

- [SetCommonFilters](SetCommonFilters) method -- text files
- [SetDocumentFilters](SetDocumentFilters) method -- office documents
- [SetCodeFilters](SetCodeFilters) method -- source code files
- [Filter](Filter) property -- the whole list as one string
- [cDialog](.) class -- overview
