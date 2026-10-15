---
title: DefaultExt
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/DefaultExt
has_toc: false
---

# DefaultExt
{: .no_toc }

Returns or sets the extension that Windows adds to a file name that the user types without one.

Syntax: *object*.**DefaultExt** [ = *string* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*string*
: A **String**, an extension written without a period, such as `txt`. The default is an empty string.

## Remarks

<!-- test: CDialogDialogTests.ShowSave_DefaultExtIsAddedToANameTypedWithoutOne, CDialogDialogTests.ShowSave_DefaultExtWithAPeriodGivesTwoPeriods, CDialogDialogTests.ShowSave_NoDefaultExtAddsNothing -->
[**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) pass the text as the `lpstrDefExt` member of `OPENFILENAME`. [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores it.

Windows appends the extension to a name that the user types without one. Write the extension without a period. The class does not change the text, and does not take an extension from the selected pair of [**Filter**](Filter).

In the Save As dialog, with the user typing `out`:

| **DefaultExt** | **ShowSave** returns |
|---|---|
| `txt` | `<dir>\out.txt` |
| `.txt` | `<dir>\out..txt` |
| An empty string | `<dir>\out` |

`<dir>` is the folder of the dialog. A period in **DefaultExt** is kept, and gives a name with two periods. An empty **DefaultExt** appends nothing.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
Debug.Print "[" & dlg.DefaultExt & "]"   ' []

dlg.DefaultExt = "txt"
Debug.Print dlg.DefaultExt               ' txt
```

This example shows the Save As dialog and adds `.txt` to a name typed without an extension.

```tb check_build
Dim dlg As New cDialog
dlg.DefaultExt = "txt"
dlg.SetCommonFilters
Debug.Print dlg.ShowSave()
```

## See Also

- [Filter](Filter) property -- the file-type list, which does not set the extension
- [ShowSave](ShowSave) method -- shows the Save As dialog
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [cDialog](.) class -- overview
