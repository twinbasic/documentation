---
title: Editing Labels
parent: ListView
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ListView/LabelEditing
has_toc: false
symbols:
  - LvwLabelEditConstants
---

# Editing Labels
{: .no_toc }

Lets the user of a [**ListView**](.) change the text of an item in place, in an edit box over it, and lets the program refuse or check the new text.

```tb check_build
Private Sub ListView1_BeforeLabelEdit(Cancel As Boolean)
    If ListView1.SelectedItem.Key = "system" Then Cancel = True    ' this one keeps its name
End Sub

Private Sub ListView1_AfterLabelEdit(Cancel As Boolean, NewString As String)
    If Len(Trim$(NewString)) = 0 Then Cancel = True                ' no empty names
End Sub
```

* TOC
{:toc}

## Starting and ending an edit

With [**LabelEdit**](#labeledit) **LvwLabelEditAutomatic**, the user starts an edit by clicking the text of the item that has the focus, or by pressing F2. With **LvwLabelEditManual** only the program starts one, with [**StartLabelEdit**](#startlabeledit), for example from a menu; with **LvwLabelEditDisabled** there is none. The edit box is [**hWndLabelEdit**](#hwndlabeledit) while it is open.

Every start raises [**BeforeLabelEdit**](#beforelabeledit), in which the program can refuse it. The user ends the edit with Enter, or by clicking elsewhere, and that raises [**AfterLabelEdit**](#afterlabeledit) with the new text, in which the program can refuse the text: the item then keeps its old one. Esc ends the edit and leaves the text as it was, and so does [**EndLabelEdit**](#endlabeledit); neither raises **AfterLabelEdit**.

Properties
----------

### hWndLabelEdit
{: .no_toc }

The handle of the edit box while an item's text is being edited, and 0 at other times. **LongPtr**, read-only.

### IMEMode
{: .no_toc }

The state of the Input Method Editor while the control, the edit box of a label or the filter box of a column has the focus. A member of [**CCIMEModeConstants**](../Common#ccimemodeconstants). Default: **CCIMEModeNoControl**.

<!-- test: ListViewTests.IMEMode_NotAMember_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

### LabelEdit
{: .no_toc }

How an edit of an item's text starts. A member of [**LvwLabelEditConstants**](#lvwlabeleditconstants). Default: **LvwLabelEditAutomatic**.

<!-- test: ListViewTests.LabelEdit_NotAMember_Raises380 -->
Another value raises run-time error 380.
<!-- /test -->

Methods
-------

### EndLabelEdit
{: .no_toc }

Ends the edit of an item's text as the Esc key does: the item keeps the text it had.

Syntax: *object*.**EndLabelEdit**

### StartLabelEdit
{: .no_toc }

Opens the edit box over the item that has the focus, the [**SelectedItem**](Selection#selecteditem), while [**LabelEdit**](#labeledit) is **LvwLabelEditAutomatic** or **LvwLabelEditManual**. The control must have the focus.

Syntax: *object*.**StartLabelEdit**

Events
------

### AfterLabelEdit
{: .no_toc }

Raised when the user ends an edit of an item's text with Enter or by clicking elsewhere.

Syntax: *object*\_**AfterLabelEdit**( *Cancel* **As Boolean**, *NewString* **As String** )

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the old text.

*NewString*
: The text the user typed.

### BeforeLabelEdit
{: .no_toc }

Raised when an edit of the text of the [**SelectedItem**](Selection#selecteditem) starts, by the user or by [**StartLabelEdit**](#startlabeledit).

Syntax: *object*\_**BeforeLabelEdit**( *Cancel* **As Boolean** )

*Cancel*
: **False** when the event is raised. A handler that sets it to **True** keeps the edit box closed.

## LvwLabelEditConstants
{: #lvwlabeleditconstants }

The values of [**LabelEdit**](#labeledit).

| Member | Value | Description |
|---|---|---|
| **LvwLabelEditAutomatic**{: #LvwLabelEditConstants_LvwLabelEditAutomatic } | 0 | The user starts an edit with a click on the text of the focused item, or with F2, and the program with **StartLabelEdit**. |
| **LvwLabelEditManual**{: #LvwLabelEditConstants_LvwLabelEditManual } | 1 | Only the program starts an edit, with **StartLabelEdit**. |
| **LvwLabelEditDisabled**{: #LvwLabelEditConstants_LvwLabelEditDisabled } | 2 | No edit starts. |

## See Also

- [ListView](.) control
- [LvwListItem](LvwListItem) class -- the **Text** of an item
