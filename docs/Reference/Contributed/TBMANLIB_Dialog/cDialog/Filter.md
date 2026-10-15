---
title: Filter
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/Filter
has_toc: false
---

# Filter
{: .no_toc }

Returns or sets the file-type list of the Open and Save As dialogs.

Syntax: *object*.**Filter** [ = *string* ]

*object*
: *required* An object expression that evaluates to a **cDialog**.

*string*
: A **String** of pairs, each a description and a pattern, separated by `|`: `description|pattern|description|pattern`. The default is an empty string, which is a list with no pairs. With an empty filter the dialog has no file-type list: there is no *Files of type* box.

## Remarks

<!-- test: CDialogDialogTests.ShowOpen_FilterFillsTheFileTypeList -->
The syntax is that of the **Filter** property of VB6's **CommonDialog** control. A pattern is a file name pattern with wildcards, such as `*.txt`. Several patterns of one pair are separated by semicolons: `*.jpg;*.jpeg`.

[**ShowOpen**](ShowOpen) and [**ShowSave**](ShowSave) replace every `|` with a null character and add one more null character at the end, which is the layout of the `lpstrFilter` member of `OPENFILENAME`. The file-type list holds the descriptions in the order of the pairs, and the first pair is selected when the dialog opens (`nFilterIndex` is 1). The class does not report the pair that the user chooses. [**ShowBrowseForFolder**](ShowBrowseForFolder) ignores the property.

The class does not check the string. A `|` inside a description or a pattern starts a new element, and moves every later element one place, so the pairs no longer fit. [**AddFilter**](AddFilter) and the four `Set...Filters` methods build the string in pairs, unless an argument of **AddFilter** contains a `|`.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
dlg.Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*"
Debug.Print dlg.Filter   ' Text Files (*.txt)|*.txt|All Files (*.*)|*.*

Dim parts() As String
parts = Split(dlg.Filter, "|")
Debug.Print UBound(parts) + 1   ' 4
```

This example offers two kinds of file in the Open dialog.

```tb check_build
Dim dlg As New cDialog
dlg.Filter = "Pictures (*.png;*.jpg)|*.png;*.jpg|All Files (*.*)|*.*"
Debug.Print dlg.ShowOpen()
```

## See Also

- [AddFilter](AddFilter) method -- appends a pair
- [ClearFilter](ClearFilter) method -- empties the filter
- [SetCommonFilters](SetCommonFilters) method -- replaces the filter with a ready-made list
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [cDialog](.) class -- overview
