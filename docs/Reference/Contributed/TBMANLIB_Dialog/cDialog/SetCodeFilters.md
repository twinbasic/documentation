---
title: SetCodeFilters
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/SetCodeFilters
has_toc: false
---

# SetCodeFilters
{: .no_toc }

Replaces the [**Filter**](Filter) with pairs for source code files.

Syntax: *object*.**SetCodeFilters**

*object*
: *required* An object expression that evaluates to a **cDialog**.

## Remarks

<!-- test: CDialogPropertyTests.SetCodeFilters_HasNinePairs -->
**SetCodeFilters** calls [**ClearFilter**](ClearFilter), so any earlier filter is lost, and then [**AddFilter**](AddFilter) for each pair:

| Description | Pattern |
|---|---|
| `Basic Files (*.bas;*.vba)` | `*.bas;*.vba` |
| `C/C++ Files (*.c;*.cpp;*.h;*.hpp)` | `*.c;*.cpp;*.h;*.hpp` |
| `C# Files (*.cs)` | `*.cs` |
| `Java Files (*.java)` | `*.java` |
| `Python Files (*.py)` | `*.py` |
| `JavaScript Files (*.js)` | `*.js` |
| `HTML Files (*.html;*.htm)` | `*.html;*.htm` |
| `XML Files (*.xml)` | `*.xml` |
| `All Files (*.*)` | `*.*` |

The descriptions are fixed English text. To show other text, build the filter with [**AddFilter**](AddFilter). The first pair, Basic Files, is the one that the dialog selects when it opens. A call of **AddFilter** after **SetCodeFilters** appends a pair after All Files.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Dim parts() As String
Dim pairCount As Long

dlg.SetCodeFilters
parts = Split(dlg.Filter, "|")
pairCount = (UBound(parts) + 1) \ 2
Debug.Print pairCount   ' 9
Debug.Print parts(0)    ' Basic Files (*.bas;*.vba)
Debug.Print parts(1)    ' *.bas;*.vba
```

This example appends a pair for twinBASIC source files to the list.

```tb check_build check_run
Dim dlg As New cDialog
Dim parts() As String

dlg.SetCodeFilters
dlg.AddFilter "twinBASIC Files (*.twin)", "*.twin"
parts = Split(dlg.Filter, "|")
Debug.Print parts(UBound(parts) - 1)   ' twinBASIC Files (*.twin)
Debug.Print parts(UBound(parts))       ' *.twin
```

## See Also

- [SetCommonFilters](SetCommonFilters) method -- text files
- [SetImageFilters](SetImageFilters) method -- image files
- [SetDocumentFilters](SetDocumentFilters) method -- office documents
- [Filter](Filter) property -- the whole list as one string
- [cDialog](.) class -- overview
