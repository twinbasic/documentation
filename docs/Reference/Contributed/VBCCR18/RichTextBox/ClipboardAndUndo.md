---
title: Clipboard and Undo
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/ClipboardAndUndo
has_toc: false
symbols:
  - RtfActionTypeConstants
---

# Clipboard and Undo
{: .no_toc }

Cuts, copies and pastes the selection of a [**RichTextBox**](.), and takes changes back and puts them back again.

```tb hidden
Public Declare PtrSafe Function RtbUndoSendMessage Lib "user32" Alias "SendMessageW" (ByVal hWnd As LongPtr, ByVal wMsg As Long, ByVal wParam As LongPtr, ByVal lParam As LongPtr) As LongPtr
```

<!-- test: RichTextBoxUndoTests.Undo_TakesBackTheTyping, RichTextBoxUndoTests.Redo_PutsBackWhatUndoTookBack, RichTextBoxUndoTests.UndoType_AfterTyping_IsTyping -->
```tb check_build check_run arch=win32,win64
RichTextBox1.Text = "ab"
RichTextBox1.SelStart = 2
RtbUndoSendMessage RichTextBox1.hWnd, &H102, AscW("c"), 0   ' WM_CHAR, as a key would
RtbUndoSendMessage RichTextBox1.hWnd, &H102, AscW("d"), 0
Debug.Print RichTextBox1.Text; RichTextBox1.UndoType = RtfActionTypeTyping
RichTextBox1.Undo
Debug.Print RichTextBox1.Text; RichTextBox1.CanRedo
RichTextBox1.Redo
Debug.Print RichTextBox1.Text
' Output:
' abcdTrue
' abTrue
' abcd
```
<!-- /test -->

**RtbUndoSendMessage** in the samples of this page is the Windows function **SendMessageW**, declared by the program.

* TOC
{:toc}

## The clipboard

[**Copy**](#copy), [**Cut**](#cut), [**Paste**](#paste) and [**Clear**](#clear) do to the selection what they do in a [**TextBoxW**](../TextBoxW#the-selection-the-clipboard-and-undo), with the formatting: what the control copies is in the Rich Text Format and as plain text, and what it pastes keeps its format when the clipboard holds RTF. [**CanPaste**](#canpaste) says whether the clipboard holds something that the control can paste.

[**PasteSpecial**](#pastespecial) pastes the clipboard in one format of the program's choice, such as **vbCFText** for the text without its formatting. [**PasteSpecialDlg**](#pastespecialdlg) shows the *Paste Special* dialog box of Windows, in which the user chooses the format. The user has the same two with the keys: Ctrl+Shift+V pastes the text without its formatting, and Ctrl+Alt+V shows the dialog box.

```tb check_build
If RichTextBox1.CanPaste(vbCFText) Then
    RichTextBox1.PasteSpecial vbCFText      ' the text, not its fonts and colors
End If
```

## Undo and redo

[**Undo**](#undo) takes back the last action, and [**Redo**](#redo) puts back what **Undo** took back. Unlike the undo of a **TextBoxW**, the control keeps many actions, up to [**UndoLimit**](#undolimit), and takes them back one after the other. [**UndoType**](#undotype) and [**RedoType**](#redotype) say what kind of action the next **Undo** and **Redo** would take back or put back, and [**CanUndo**](#canundo) and [**CanRedo**](#canredo) whether there is one.

<!-- test: RichTextBoxUndoTests.StopUndoAction_SplitsTheTyping -->
Characters typed one after the other are one action. [**StopUndoAction**](#stopundoaction) ends that action, so that what is typed after it is taken back on its own.
<!-- /test -->

```tb check_build check_run arch=win32,win64
RichTextBox1.Text = ""
RtbUndoSendMessage RichTextBox1.hWnd, &H102, AscW("a"), 0
RtbUndoSendMessage RichTextBox1.hWnd, &H102, AscW("b"), 0
RichTextBox1.StopUndoAction
RtbUndoSendMessage RichTextBox1.hWnd, &H102, AscW("c"), 0
RichTextBox1.Undo
Debug.Print RichTextBox1.Text           ' "c" is taken back alone
' Output:
' ab
```

Properties
----------

### RedoType
{: .no_toc }

The kind of action that [**Redo**](#redo) would put back. A member of [**RtfActionTypeConstants**](#rtfactiontypeconstants), read-only. It has a meaning while [**CanRedo**](#canredo) returns **True**.

### UndoLimit
{: .no_toc }

The greatest number of actions that [**Undo**](#undo) can take back. **Long**. Default: 100. A value greater than 1000 sets 1000.

<!-- test: RichTextBoxUndoTests.UndoLimit_Zero_LeavesNothingToUndo, RichTextBoxUndoTests.UndoLimit_Above1000_Is1000, RichTextBoxUndoTests.UndoLimit_Negative_Raises380 -->
With 0 the control keeps no action, so there is nothing to take back. A negative value raises run-time error 380.
<!-- /test -->

### UndoType
{: .no_toc }

The kind of action that [**Undo**](#undo) would take back. A member of [**RtfActionTypeConstants**](#rtfactiontypeconstants), read-only. It has a meaning while [**CanUndo**](#canundo) returns **True**.

Methods
-------

### CanPaste
{: .no_toc }

Returns whether the clipboard holds something that the control can paste.

Syntax: *object*.**CanPaste**( [ *wFormat* ] ) **As Boolean**

*wFormat*
: *optional* A **Long**: a format of the clipboard, such as a member of [**ClipboardConstants**](../../../VBRUN/Constants/ClipboardConstants), to ask about that format alone. With 0, the default, any format that the control can paste counts.

### CanRedo
{: .no_toc }

Returns whether [**Redo**](#redo) has an action to put back.

Syntax: *object*.**CanRedo** **As Boolean**

### CanUndo
{: .no_toc }

Returns whether [**Undo**](#undo) has an action to take back.

Syntax: *object*.**CanUndo** **As Boolean**

### Clear
{: .no_toc }

Deletes the selection.

Syntax: *object*.**Clear**

### Copy
{: .no_toc }

Copies the selection to the clipboard, as RTF and as plain text.

Syntax: *object*.**Copy**

### Cut
{: .no_toc }

Copies the selection to the clipboard and deletes it from the box.

Syntax: *object*.**Cut**

### Paste
{: .no_toc }

Puts what the clipboard holds in place of the selection, or at the insertion point.

Syntax: *object*.**Paste**

### PasteSpecial
{: .no_toc }

Puts what the clipboard holds in one format in place of the selection, or at the insertion point.

Syntax: *object*.**PasteSpecial** *wFormat*

*wFormat*
: *required* A **Long**: the format, such as **vbCFText**, **vbCFRTF** or **vbCFBitmap**, members of [**ClipboardConstants**](../../../VBRUN/Constants/ClipboardConstants), or 13 for Unicode text.

### PasteSpecialDlg
{: .no_toc }

Shows the *Paste Special* dialog box of Windows with the formats of the clipboard that the control can paste, and pastes in the format that the user chooses. The names of the formats are in the language of Windows. Nothing is pasted when the user cancels.

Syntax: *object*.**PasteSpecialDlg**

### Redo
{: .no_toc }

Puts back the last action that [**Undo**](#undo) took back.

Syntax: *object*.**Redo**

### ResetUndoQueue
{: .no_toc }

<!-- test: RichTextBoxUndoTests.ResetUndoQueue_LeavesNothingToUndo -->
Forgets the actions that [**Undo**](#undo) and [**Redo**](#redo) would take back and put back, so that [**CanUndo**](#canundo) returns **False**.
<!-- /test -->

Syntax: *object*.**ResetUndoQueue**

### StopUndoAction
{: .no_toc }

Ends the action of typing that is going on, so that what is typed next is an action of its own. See [Undo and redo](#undo-and-redo).

Syntax: *object*.**StopUndoAction**

### Undo
{: .no_toc }

Takes back the last action: what the user typed, deleted, pasted or dragged, or an assignment to [**SelText**](Selection#seltext).

Syntax: *object*.**Undo**

## RtfActionTypeConstants
{: #rtfactiontypeconstants }

The values of [**UndoType**](#undotype) and [**RedoType**](#redotype).

| Member | Value | Description |
|---|---|---|
| **RtfActionTypeUnknown**{: #RtfActionTypeConstants_RtfActionTypeUnknown } | 0 | Another kind of action, or none. |
| **RtfActionTypeTyping**{: #RtfActionTypeConstants_RtfActionTypeTyping } | 1 | Typing. |
| **RtfActionTypeDelete**{: #RtfActionTypeConstants_RtfActionTypeDelete } | 2 | Deleting. |
| **RtfActionTypeDragDrop**{: #RtfActionTypeConstants_RtfActionTypeDragDrop } | 3 | Dragging and dropping. |
| **RtfActionTypeCut**{: #RtfActionTypeConstants_RtfActionTypeCut } | 4 | Cutting. |
| **RtfActionTypePaste**{: #RtfActionTypeConstants_RtfActionTypePaste } | 5 | Pasting. |
| **RtfActionTypeAutoTable**{: #RtfActionTypeConstants_RtfActionTypeAutoTable } | 6 | A table that the control made itself as the user typed. |

## See Also

- [RichTextBox](.) control
- [Selection](Selection) -- what the clipboard methods work on
- [ClipboardConstants](../../../VBRUN/Constants/ClipboardConstants) -- the formats of the clipboard
