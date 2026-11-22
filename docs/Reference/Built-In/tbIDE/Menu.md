---
title: Menu
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Menu
has_toc: false
---

# Menu class
{: .no_toc }

One menu: one of the IDE's own, from a property of [**Menus**](Menus), a menu of the addin's own, from [**Menus.AddCustom**](Menus#addcustom), or the submenu of an entry, from [**MenuEntry.Children**](MenuEntry#children). An addin adds its commands to it with [**AddEntry**](#addentry).

```tb check_build
Private WithEvents OpenEntry As MenuEntry

Private Sub Host_OnProjectLoaded()
    Set OpenEntry = Host.Menus.ProjectExplorerFileViewContextMenu.AddEntry( _
        "Open in Hex view", RelativeToCommand:="tbProjectExplorer_SelectedItemsOpen", RelativePriority:=1)
End Sub
```

The entry goes just after the menu's **Open** command.

The VB package has a **Menu** control too. In a project that references VB, the name **Menu** alone means that control, so a variable of this class is declared `As tbIDE.Menu`.

* TOC
{:toc}

## Properties

### Caption
{: .no_toc }

The menu's name. **String**. For a menu of the addin's own, setting it renames the menu on the menu bar. For one of the IDE's menus it reads the menu's [**Id**](#id), and setting it raises error -2147467263 (`&H80004001`, *not implemented*).

Syntax: *menu*.**Caption** [ = *value* ]

### Id
{: .no_toc }

The menu's identifier. **String**, read-only. For one of the IDE's menus it is the name of the [**Menus**](Menus) property that returns it, such as `"ProjectExplorerFileViewContextMenu"`; for a menu of the addin's own, a GUID in braces; for the submenu of an entry, the parent's **Id** and the entry's, joined by a dot.

### Visible
{: .no_toc }

Whether a menu of the addin's own is shown on the menu bar. **Boolean**. Setting it to **False** hides the menu there, and [**ShowPopup**](#showpopup) can still show it. For one of the IDE's menus it is **True**.

Syntax: *menu*.**Visible** [ = *value* ]

## Methods

### AddEntry
{: .no_toc }

Adds an entry to the menu and returns it, for the addin to hold `WithEvents`.

Syntax: *menu*.**AddEntry**( [ *Caption* ] [, *IconData* ] [, *RelativeToCommand* ] [, *RelativePriority* ] ) **As** [**MenuEntry**](MenuEntry)

*Caption*
: *optional* The entry's text. **String**. Left out or empty, the entry is a separator line.

*IconData*
: *optional* The entry's icon, as the text of an SVG picture that starts with `<svg`. **Variant**.

*RelativeToCommand*
: *optional* The IDE command the entry is placed by, by its name, such as `"tbProjectExplorer_SelectedItemsOpen"` or `"tbEditor_Save"`. **String**. The names are those of [Keyboard Shortcuts](../../IDE/Reference/Keyboard-Shortcuts). Left out, or a command that is not in the menu, the entry goes at the end of the menu.

*RelativePriority*
: *optional* Where the entry goes beside that command. **Long**. A negative number puts it before the command, 0 or more after it. Entries with the same number keep the order they were added in.

An entry that the IDE hides, such as **Open** in the Project Explorer's menu on a folder, keeps the entries placed by it where they would be.

### RemoveAllAddedEntries
{: .no_toc }

Removes every entry this addin has added to this menu. Entries of other addins stay.

Syntax: *menu*.**RemoveAllAddedEntries**

### ShowPopup
{: .no_toc }

Shows a menu of the addin's own as a pop-up menu, with its top-left corner at a point of the IDE's window, and lists the addin's entries in it.

Syntax: *menu*.**ShowPopup** *ClientX*, *ClientY*

*ClientX*, *ClientY*
: *required* The point, in the pixels of the IDE's page. **Long**. The `clientX` and `clientY` of a mouse event in a [**ToolWindow**](ToolWindow) or a designer are such a point.

The menu for it is one made with `Menus.AddCustom(Caption, False)`, which does not show on the menu bar:

```tb check_build
Private PopupMenu As tbIDE.Menu

Private Sub Host_OnProjectLoaded()
    Set PopupMenu = Host.Menus.AddCustom("MyPopup", False)
    PopupMenu.AddEntry "Copy"
    PopupMenu.AddEntry "Paste"
End Sub

Private Sub OnRightClick(ByVal e As HtmlEventProperties)
    PopupMenu.ShowPopup e.clientX, e.clientY
End Sub
```

<!-- test: bug showpopup-named-menu-nothing, lane addin:menus -->
> [!NOTE] BETA 1045
> On one of the IDE's own menus, such as `Host.Menus.FileMenu`, **ShowPopup** shows nothing.

## See Also

- [Menus](Menus) class
- [MenuEntry](MenuEntry) class
