---
title: Reset
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/Reset
has_toc: false
---

# Reset
{: .no_toc }

Restores every property of the **cDialog** to the value it had when the object was created.

Syntax: *object*.**Reset**

*object*
: *required* An object expression that evaluates to a **cDialog**.

## Remarks

**Reset** empties [**DialogTitle**](DialogTitle), [**InitialDir**](InitialDir), [**DefaultExt**](DefaultExt), [**FileName**](FileName) and [**Filter**](Filter), sets [**MultiSelect**](MultiSelect), [**ReadOnly**](ReadOnly), [**NoChangeDir**](NoChangeDir) and [**CreatePrompt**](CreatePrompt) to **False**, and sets [**OverwritePrompt**](OverwritePrompt), [**PathMustExist**](PathMustExist), [**FileMustExist**](FileMustExist), [**HideReadOnly**](HideReadOnly) and [**NewDialogStyle**](NewDialogStyle) to **True**. These are the starting values listed on the page of the [class](.#defaults).

A confirmed [**ShowOpen**](ShowOpen) or [**ShowSave**](ShowSave) leaves its path in **FileName**, and a confirmed [**ShowBrowseForFolder**](ShowBrowseForFolder) leaves the folder in **InitialDir**. **Reset** clears both, along with the other properties.

## Example

```tb check_build check_run
Dim dlg As New cDialog
dlg.DialogTitle = "Pick a file"
dlg.AddFilter "All Files (*.*)", "*.*"
dlg.MultiSelect = True
dlg.OverwritePrompt = False

dlg.Reset
Debug.Print "[" & dlg.DialogTitle & "]"   ' []
Debug.Print Len(dlg.Filter)               ' 0
Debug.Print dlg.MultiSelect               ' False
Debug.Print dlg.OverwritePrompt           ' True
```

## See Also

- [cDialog](.) class -- overview, with the starting values
- [FileName](FileName) property -- set by a confirmed Open or Save As dialog
- [InitialDir](InitialDir) property -- set by a confirmed Browse For Folder dialog
