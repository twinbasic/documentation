---
title: AddFilter
parent: cDialog
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialog/AddFilter
has_toc: false
---

# AddFilter
{: .no_toc }

Appends a description and a pattern to the [**Filter**](Filter) of the Open and Save As dialogs.

Syntax: *object*.**AddFilter** ( *strDescription*, *strExtension* )

*object*
: *required* An object expression that evaluates to a **cDialog**.

*strDescription*
: *required* A **String**, the text that the dialog shows for the pair, such as `Text Files (*.txt)`.

*strExtension*
: *required* A **String**, the pattern that selects the files, such as `*.txt`. Several patterns are separated by semicolons: `*.jpg;*.jpeg`.

## Remarks

<!-- test: CDialogPropertyTests.AddFilter_JoinsPairsWithPipes, CDialogPropertyTests.AddFilter_PipeInArgumentAddsAnElement -->
**AddFilter** appends `description|pattern` to the text of **Filter**, with a `|` in front of it when **Filter** is not empty. The first pair added is the one that the dialog selects when it opens.

A filter with one pair gives a file-type list with one item. Despite its name, *strExtension* is a pattern, and the class uses the text as it is: it adds no `*.` in front. Write the pattern in the form that the Windows documentation of `OPENFILENAME` gives, such as `*.txt`.

The class does not check the arguments. A `|` in either one adds an element, so the later elements are no longer paired correctly.
<!-- /test -->

## Example

```tb check_build check_run
Dim dlg As New cDialog
dlg.AddFilter "Text Files (*.txt)", "*.txt"
dlg.AddFilter "Pictures", "*.png;*.jpg"
Debug.Print dlg.Filter   ' Text Files (*.txt)|*.txt|Pictures|*.png;*.jpg
```

A `|` in a description makes three elements out of two:

```tb check_build check_run
Dim dlg As New cDialog
dlg.AddFilter "Text|Notes", "*.txt"
Debug.Print UBound(Split(dlg.Filter, "|")) + 1   ' 3
```

## See Also

- [Filter](Filter) property -- the whole list as one string
- [ClearFilter](ClearFilter) method -- empties the filter
- [SetCommonFilters](SetCommonFilters) method -- replaces the filter with a ready-made list
- [ShowOpen](ShowOpen) method -- shows the Open dialog
- [cDialog](.) class -- overview
