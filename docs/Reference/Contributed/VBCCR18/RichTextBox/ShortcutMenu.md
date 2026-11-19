---
title: Shortcut Menus
parent: RichTextBox
grand_parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/RichTextBox/ShortcutMenu
has_toc: false
---

# Shortcut Menus
{: .no_toc }

Shows a menu when the user clicks a [**RichTextBox**](.) with the right mouse button: the control's own menu of editing commands, or a menu that the program makes.

```tb check_build
RichTextBox1.AutoVerbMenu = True     ' Undo, Redo, Cut, Copy, Paste and the like
```

* TOC
{:toc}

## Asking for a menu

<!-- test: RichTextBoxMenuTests.ContextMenu_RaisedBeforeOLEGetContextMenu -->
When the user asks for a shortcut menu, with the right mouse button, with Shift+F10 or with the menu key, the control raises [**ContextMenu**](#contextmenu) first. A handler that sets its *Handled* to **True** shows a menu of its own, or none, and the control does nothing more. Otherwise the control raises [**OLEGetContextMenu**](#olegetcontextmenu), in which the program can give it a menu to show.
<!-- /test -->

With [**AutoVerbMenu**](#autoverbmenu) set to **True** the control shows a menu of its own instead of raising **OLEGetContextMenu**: Undo, Redo, Cut, Copy, Paste, Paste as plain text, Paste Special and Delete, each available when the command can be done now. The names are in the language of Windows, or in English for a language that the package does not have. The control carries out the command that the user picks.

With **AutoVerbMenu** **False**, the default, and no menu given in **OLEGetContextMenu**, the control shows no menu.

## A menu of the program's own

The handler of **OLEGetContextMenu** makes a popup menu with the functions of Windows, and sets *hMenu* to it. The control shows it and destroys it afterwards. When the user picks an item, the control raises [**OLEContextMenuClick**](#olecontextmenuclick) with the item's identifier.

```tb hidden
Public Declare PtrSafe Function RtbCreatePopupMenu Lib "user32" Alias "CreatePopupMenu" () As LongPtr
Public Declare PtrSafe Function RtbAppendMenu Lib "user32" Alias "AppendMenuW" (ByVal hMenu As LongPtr, ByVal uFlags As Long, ByVal uIDNewItem As LongPtr, ByVal lpNewItem As LongPtr) As Long
```

```tb check_build
Private Sub RichTextBox1_OLEGetContextMenu(ByVal SelType As Integer, ByVal LpOleObject As LongPtr, ByVal SelStart As Long, ByVal SelEnd As Long, hMenu As LongPtr)
    If SelEnd > SelStart Then                ' only for a selection
        hMenu = RtbCreatePopupMenu()
        RtbAppendMenu hMenu, 0, 1, StrPtr("Upper case")
        RtbAppendMenu hMenu, 0, 2, StrPtr("Lower case")
    End If
End Sub

Private Sub RichTextBox1_OLEContextMenuClick(ByVal ID As Long)
    Select Case ID
        Case 1: RichTextBox1.SelText = UCase$(RichTextBox1.SelText)
        Case 2: RichTextBox1.SelText = LCase$(RichTextBox1.SelText)
    End Select
End Sub
```

**RtbCreatePopupMenu** and **RtbAppendMenu** in this sample are the Windows functions **CreatePopupMenu** and **AppendMenuW**, declared by the program.

Properties
----------

### AutoVerbMenu
{: .no_toc }

Whether the control shows its own menu of editing commands. **Boolean**. Default: **False**. See [Asking for a menu](#asking-for-a-menu).

Events
------

### ContextMenu
{: .no_toc }

Raised when the user asks for a shortcut menu, before the control shows a menu or raises [**OLEGetContextMenu**](#olegetcontextmenu).

Syntax: *object*\_**ContextMenu**( *Handled* **As Boolean**, **ByVal** *X* **As Single**, **ByVal** *Y* **As Single** )

*Handled*
: **False** when the event is raised. A handler that sets it to **True** keeps the control from showing a menu.

*X*, *Y*
: The place of the click, measured from the top left corner of the box in the scale units of the control's container. Both are -1 when the user asked with the keyboard.

### OLEContextMenuClick
{: .no_toc }

Raised when the user picks an item of the menu that a handler of [**OLEGetContextMenu**](#olegetcontextmenu) gave the control.

Syntax: *object*\_**OLEContextMenuClick**( **ByVal** *ID* **As Long** )

*ID*
: The identifier that the program gave the item.

### OLEGetContextMenu
{: .no_toc }

Raised when the control needs a shortcut menu, while [**AutoVerbMenu**](#autoverbmenu) is **False**.

Syntax: *object*\_**OLEGetContextMenu**( **ByVal** *SelType* **As Integer**, **ByVal** *LpOleObject* **As LongPtr**, **ByVal** *SelStart* **As Long**, **ByVal** *SelEnd* **As Long**, *hMenu* **As LongPtr** )

*SelType*
: What the selection holds, a sum of the members of [**RtfSelTypeConstants**](Selection#rtfseltypeconstants).

*LpOleObject*
: The address of the **IOleObject** interface of the selected [OLE object](OLEObjects), or 0 when no object is selected.

*SelStart*, *SelEnd*
: The place of the first selected character and the place after the last, as in [**SelChange**](Selection#selchange).

*hMenu*
: 0 when the event is raised. A handler sets it to the handle of a popup menu for the control to show; with 0 the control shows none.

## See Also

- [RichTextBox](.) control
- [Clipboard and Undo](ClipboardAndUndo) -- the commands of the control's own menu
