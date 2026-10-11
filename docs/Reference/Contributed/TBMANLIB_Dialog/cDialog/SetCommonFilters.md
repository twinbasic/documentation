---
title: SetCommonFilters
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/SetCommonFilters
has_toc: false
---

# SetCommonFilters
{: .no_toc }

Replaces the [**Filter**](Filter) with the pairs Text Files and All Files.

Syntax: *object*.**SetCommonFilters**

*object*
: *required* An object expression that evaluates to a **cDialog**.

## Remarks

**SetCommonFilters** calls [**ClearFilter**](ClearFilter), so any earlier filter is lost, and then [**AddFilter**](AddFilter) for each pair:

| Description | Pattern |
|---|---|
| `Text Files (*.txt)` | `*.txt` |
| `All Files (*.*)` | `*.*` |

The descriptions are fixed English text. To show other text, build the filter with **AddFilter**. The first pair, Text Files, is the one that the dialog selects when it opens. A call of **AddFilter** after **SetCommonFilters** appends a pair at the end.

## Example

```tb check_build check_run
Dim dlg As New cDialog
dlg.Filter = "Old|*.old"
dlg.SetCommonFilters
Debug.Print dlg.Filter   ' Text Files (*.txt)|*.txt|All Files (*.*)|*.*

dlg.AddFilter "Logs (*.log)", "*.log"
Debug.Print dlg.Filter   ' Text Files (*.txt)|*.txt|All Files (*.*)|*.*|Logs (*.log)|*.log
```

## See Also

- [SetDocumentFilters](SetDocumentFilters) method -- office documents
- [SetImageFilters](SetImageFilters) method -- image files
- [SetCodeFilters](SetCodeFilters) method -- source code files
- [Filter](Filter) property -- the whole list as one string
- [cDialog](.) class -- overview
