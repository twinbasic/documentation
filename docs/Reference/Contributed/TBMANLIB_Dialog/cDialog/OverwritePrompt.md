---
title: OverwritePrompt
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/OverwritePrompt
has_toc: false
---

# OverwritePrompt
{: .no_toc }

Returns or sets whether the Save As dialog asks for confirmation before it accepts the name of a file that exists.

Syntax: *object*.**OverwritePrompt** [ = *boolean* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*boolean*
: A **Boolean**. **True** sets `OFN_OVERWRITEPROMPT`. The default is **True**.

## Remarks

[**ShowSave**](ShowSave) uses the property. With **True** and a file that exists, the box *Confirm Save As* asks *name already exists. Do you want to replace it?*, with the buttons *Yes* and *No*. *Yes* returns the path. *No* leaves the Save As dialog open. With **False** there is no box, and the dialog returns the path.

The dialog only returns the name. The class does not create, replace or check a file.

[**ShowOpen**](ShowOpen) passes the flag too, and the Windows documentation describes `OFN_OVERWRITEPROMPT` for Save As only. [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores the property.

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print dlg.OverwritePrompt   ' True

dlg.OverwritePrompt = False
Debug.Print dlg.OverwritePrompt   ' False
```

This example lets the user pick the name of an existing file in the Save As dialog without being asked.

```tb check_build
Dim dlg As New cDialog
dlg.OverwritePrompt = False
dlg.DialogTitle = "Save the report"
Debug.Print dlg.ShowSave()
```

## See Also

- [ShowSave](ShowSave) method -- shows the Save As dialog
- [PathMustExist](PathMustExist) property -- the check on the folder of the name
- [cDialog](.) class -- overview
