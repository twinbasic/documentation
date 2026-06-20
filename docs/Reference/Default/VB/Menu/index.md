---
title: Menu
parent: VB Package
permalink: /tB/Packages/VB/Menu/
has_toc: false
---

# Menu class
{: .no_toc }

A **Menu** is an item in a Win32 native menu --- either a top-level entry on a [**Form**](../Form/)'s or [**MDIForm**](../MDIForm/)'s menu bar, an entry in a drop-down sub-menu, or a separator bar between groups of related commands. Menus are a non-windowed control: they have no [**Left**](#) / [**Top**](#) / [**Width**](#) / [**Height**](#), no font, and no mouse or keyboard events of their own --- they are populated, structured, and bound to handlers at design time through the form's menu editor.

The default property is [**Enabled**](#enabled) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    mnuFileSave.Enabled = False     ' grey out until there is something to save
End Sub

Private Sub mnuFileSave_Click()
    SaveDocument
End Sub

Private Sub mnuViewToolbar_Click()
    mnuViewToolbar.Checked = Not mnuViewToolbar.Checked
    Toolbar1.Visible = mnuViewToolbar.Checked
End Sub
```

* TOC
{:toc}

## Caption and separators

[**Caption**](#caption) supplies the text drawn for the menu item. Two Caption values have special meaning:

- An ampersand (`&`) marks the next character as a keyboard mnemonic --- pressing **Alt + that letter** while the menu is open invokes the item, and the letter is underlined in the rendered menu. Use `&&` to display a literal ampersand.
- A Caption consisting of a single hyphen (`"-"`) renders the item as a horizontal separator bar between the surrounding entries. Separator items still receive their own [**Click**](#click) events if invoked programmatically, but the user cannot reach them with the keyboard or mouse.

```tb
mnuFileNew.Caption    = "&New"          ' Alt+N while File is open
mnuFileSep1.Caption   = "-"             ' separator bar
mnuFileSaveAs.Caption = "Save &As..."   ' Alt+A
```

## Shortcut keys

[**ShortcutId**](#shortcutid) binds a keyboard accelerator to the menu item. It is typed as [**ShortcutConstants**](../../VBRUN/Constants/ShortcutConstants) --- **vbShortcutNone** disables the accelerator, **vbShortcutCtrlS** binds **Ctrl+S**, and so on across the function-key, **Shift+**, and **Ctrl+** ranges. When set, the Win32 runtime appends the corresponding text after a tab character in the rendered Caption --- `Save\tCtrl+S` --- so the shortcut appears right-aligned in the menu, the conventional way.

```tb
mnuFileSave.ShortcutId = vbShortcutCtrlS
mnuFilePrint.ShortcutId = vbShortcutCtrlP
```

> [!NOTE]
> The hidden [**Shortcut**](#shortcut) **String** property exists only to round-trip the raw text imported from VB6 `.frm` files; it is not consulted at run time. New code should use [**ShortcutId**](#shortcutid).

## Menu icons

twinBASIC extends the classic VB6 menu with optional 16×16 (or arbitrary-sized) icons drawn beside the caption. Assign a **StdPicture** to [**Picture**](#picture) and the bitmap is rendered to the left of the caption text. When the supplied picture is a multi-resolution `.ico`, [**IconSizeX**](#iconsizex) and [**IconSizeY**](#iconsizey) pick which embedded image to use; left at `0` (the default), the picture is loaded at its natural size.

```tb
Set mnuFileSave.Picture = LoadResPicture("MNU_SAVE", vbResBitmap)
mnuFileSave.IconSizeX = 16
mnuFileSave.IconSizeY = 16
```

## Control arrays

A control array of menus is the standard way to build a *most-recently-used* file list, a dynamic *Window* sub-menu, or a list of plug-in commands. The array is declared at design time on the first item; further items are added at run time with **Load** and removed with **Unload**, exactly as for a windowed control. Inside a [**Click**](#click) handler shared by every item in the array, [**Index**](#index) identifies which one was picked.

```tb
Private Sub mnuRecent_Click(Index As Integer)
    OpenDocument mnuRecent(Index).Tag       ' Tag holds the file path
End Sub
```

[**Index**](#index) raises run-time error 343 (*Object not an array*) when read on a menu that is not part of a control array.

## Window list (MDI)

When the form hosting the menu is an [**MDIForm**](../MDIForm/), setting [**WindowList**](#windowlist) to **True** at design time turns this menu into the application's *Window* sub-menu --- the runtime auto-populates it with one entry per open MDI child, marks the active child with a checkmark, and routes a click on any of those entries to **SetFocus** on the corresponding child. The application typically combines this with an explicit *Cascade* / *Tile* sub-menu that calls [**Arrange**](../MDIForm/#arrange) on the parent.

## Properties

### Caption
{: .no_toc }

The text drawn for the menu item. **String**. An ampersand marks the next character as a mnemonic; `&&` produces a literal ampersand. A Caption of `"-"` renders the item as a horizontal separator. Assignments are reflected immediately in any visible menu bar or pop-up.

Syntax: *object*.**Caption** [ = *string* ]

### Checked
{: .no_toc }

Whether a checkmark is drawn next to the item. **Boolean**, default **False**. Setting it on a top-level (menu-bar) item is supported but visually unusual; the conventional use is on drop-down items that toggle a setting.

Syntax: *object*.**Checked** [ = *boolean* ]

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a menu. Always **vbMenuControl**.

### Enabled
{: .no_toc }

Whether the user can pick the item. A disabled menu item is drawn greyed out and ignores mouse and keyboard activation, including its [**ShortcutId**](#shortcutid) accelerator. **Boolean**, default **True**. **Default property.**

Syntax: *object*.**Enabled** [ = *boolean* ]

Disabling a top-level menu-bar item disables its entire drop-down. The runtime rebuilds the menu state when **Enabled** changes, so the change is visible immediately.

### HelpContextID
{: .no_toc }

> [!NOTE]
> Reserved for VB6 compatibility; not currently implemented in twinBASIC.

A **Long** that, in VB6, identified a topic in the application's help file shown when the user pressed **F1** with the menu item highlighted.

### IconSizeX
{: .no_toc }

When [**Picture**](#picture) is a multi-resolution `.ico`, the horizontal size in pixels of the embedded image to load. **Long**, default `0` (use the picture's natural size). Pair with [**IconSizeY**](#iconsizey).

### IconSizeY
{: .no_toc }

The vertical counterpart to [**IconSizeX**](#iconsizex). **Long**, default `0`.

### Index
{: .no_toc }

When the menu is part of a control array, the **Long** zero-based index of this instance within the array. Read-only at run time. Raises run-time error 343 (*Object not an array*) on a menu that is not part of an array.

### Name
{: .no_toc }

The unique design-time name of the menu on its parent form. **String**, read-only at run time. Inherited from the base control class.

### NegotiatePosition
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6's ActiveX-document menu negotiation feature; not currently implemented in twinBASIC.

Typed as [**NegotiatePositionConstants**](../../VBRUN/Constants/NegotiatePositionConstants) (**vbNoNegotiate**, **vbLeft**, **vbMiddle**, **vbRight**) --- VB6 used this to decide where a top-level menu should appear in the host application's menu bar when an ActiveX document was activated.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or [**MDIForm**](../MDIForm/) / **UserControl**) that contains this menu. Read-only.

### Picture
{: .no_toc }

A **StdPicture** drawn to the left of the caption. **twinBASIC extension** --- VB6 menus could not display icons. Assigning **Nothing** removes the icon. Icons are converted to bitmaps internally; pass a bitmap directly to skip the conversion. Pair with [**IconSizeX**](#iconsizex) / [**IconSizeY**](#iconsizey) for multi-resolution `.ico` files.

Syntax:
- *object*.**Picture** [ = *picture* ]
- **Set** *object*.**Picture** = *picture*

### Shortcut
{: .no_toc }

> [!NOTE]
> Hidden, read-only, and unused at run time --- exists only to round-trip the raw shortcut text imported from VB6 `.frm` files. Use [**ShortcutId**](#shortcutid) to bind an accelerator.

### ShortcutId
{: .no_toc }

The keyboard accelerator bound to this menu item. A member of [**ShortcutConstants**](../../VBRUN/Constants/ShortcutConstants) --- **vbShortcutNone** (no accelerator, default), **vbShortcutCtrlA** through **vbShortcutCtrlZ**, **vbShortcutF1** through **vbShortcutF12**, and the **Shift+**, **Ctrl+**, and **Shift+Ctrl+** function-key variants. When set, the matching shortcut text is appended to [**Caption**](#caption) (after a tab) when the menu is rendered.

Syntax: *object*.**ShortcutId** [ = *value* ]

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the menu item. Ignored by the framework. Inherited from the base control class. Useful for control arrays --- e.g. holding the file path that an MRU-list entry should open.

### Visible
{: .no_toc }

Whether the menu item is shown. **Boolean**, default **True**. Setting it to **False** removes the entry from the menu without unloading it; setting it back to **True** restores it in its original position. Hiding a top-level menu-bar item rebuilds the menu bar so the surrounding items close the gap.

Syntax: *object*.**Visible** [ = *boolean* ]

### WindowList
{: .no_toc }

When **True** on a menu hosted by an [**MDIForm**](../MDIForm/), turns this menu into the application's *Window* sub-menu --- the runtime auto-populates it with one entry per open MDI child and routes the resulting click to **SetFocus** on the corresponding child. **Boolean**, read-only at run time --- set at design time. At most one menu per MDI form should have **WindowList** set.

## Methods

### Container
{: .no_toc }

Returns a reference to the **Control** that hosts this menu --- typically the [**Form**](../Form/) or [**MDIForm**](../MDIForm/) that owns the menu structure. Equivalent to traversing [**Parent**](#parent) for a top-level menu, but defined on every menu (including sub-items) so it can be called uniformly.

Syntax: *object*.**Container**

## Events

### Click
{: .no_toc }

Raised when the user picks the menu item --- by clicking it, pressing its mnemonic while the menu is open, or pressing its [**ShortcutId**](#shortcutid) accelerator. Also raised when [**PopUpMenu**](../Form/#popupmenu) selects an item. **Default event.**

Syntax: *object*\_**Click**( )

For a menu that is part of a control array, the handler receives the array [**Index**](#index) of the picked item:

Syntax: *object*\_**Click**( *Index* **As Integer** )
