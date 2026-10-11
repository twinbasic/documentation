---
title: HideReadOnly
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/HideReadOnly
has_toc: false
---

# HideReadOnly
{: .no_toc }

Returns or sets whether the Open dialog hides its read-only choice.

Syntax: *object*.**HideReadOnly** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_HIDEREADONLY`. The default is **True**.

## Remarks

[**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) both pass the flag, and Windows describes it as hiding the Read Only check box. [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores it.

The Open dialog that Windows shows has no Read Only check box. With **HideReadOnly** **False**, its *Open* button is a split button whose menu holds *Open* and *Open as read-only*. With the default **True**, it is a plain button. The class does not read the flags back from the dialog, so the choice that the user made is not reported.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.HideReadOnly   ' True

dlg.HideReadOnly = False
Debug.Print dlg.HideReadOnly   ' False
```

This example shows the Open dialog with the *Open as read-only* choice.

```tb check_build
Dim dlg As New cDialog
dlg.HideReadOnly = False
Debug.Print dlg.ShowOpen()
```

## See Also

- [ReadOnly](ReadOnly) property -- sets the read-only flag of the Open dialog
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [cDialog](.) class -- overview
