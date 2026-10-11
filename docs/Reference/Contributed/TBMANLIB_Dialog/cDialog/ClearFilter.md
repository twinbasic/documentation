---
title: ClearFilter
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/ClearFilter
has_toc: false
---

# ClearFilter
{: .no_toc }

Empties the [**Filter**](Filter) of the Open and Save As dialogs.

Syntax: *object*.**ClearFilter**

*object*
: *required* An object expression that evaluates to a **cDialog**.

## Remarks

**ClearFilter** sets **Filter** to an empty string, as `dlg.Filter = ""` does. The four `Set...Filters` methods call it first, so each of them replaces the filter.

## Example

```tb check_build check_run
Dim dlg As New cDialog
dlg.AddFilter "Text Files (*.txt)", "*.txt"
Debug.Print Len(dlg.Filter) > 0   ' True

dlg.ClearFilter
Debug.Print Len(dlg.Filter)       ' 0
```

## See Also

- [Filter](Filter) property -- the whole list as one string
- [AddFilter](AddFilter) method -- appends a pair
- [Reset](Reset) method -- clears the filter along with every other property
- [cDialog](.) class -- overview
