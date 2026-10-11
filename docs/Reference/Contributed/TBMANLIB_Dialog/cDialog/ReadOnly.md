---
title: ReadOnly
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/ReadOnly
has_toc: false
---

# ReadOnly
{: .no_toc }

Returns or sets whether the Open dialog is given the read-only flag `OFN_READONLY`.

Syntax: *object*.**ReadOnly** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_READONLY`. The default is **False**.

## Remarks

Only [**ShowOpen**](ShowOpen) uses the property. [**ShowSave**](ShowSave) never sets `OFN_READONLY`, and [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores the property.

The Windows documentation describes `OFN_READONLY` as ticking the Read Only check box when the dialog opens. The Open dialog that Windows shows has no such check box, and **ReadOnly** **True** makes no visible difference, whether [**HideReadOnly**](HideReadOnly) is **True** or **False**. The class does not read the flags back from the dialog, so the choice that the user made with the *Open as read-only* menu item (see **HideReadOnly**) is not reported either.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.ReadOnly   ' False

dlg.ReadOnly = True
Debug.Print dlg.ReadOnly   ' True
```

This example shows the Open dialog with the read-only flag set.

```tb check_build
Dim dlg As New cDialog
dlg.HideReadOnly = False
dlg.ReadOnly = True
Debug.Print dlg.ShowOpen()
```

## See Also

- [HideReadOnly](HideReadOnly) property -- shows or hides the *Open as read-only* choice
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [cDialog](.) class -- overview
