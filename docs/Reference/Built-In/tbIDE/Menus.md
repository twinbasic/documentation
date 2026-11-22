---
title: Menus
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Menus
has_toc: false
---

# Menus class
{: .no_toc }

The IDE's menus, for an addin to add commands to. Reached through [**Host.Menus**](Host#menus). Each property returns one of the IDE's menus as a [**Menu**](Menu); [**Menu.AddEntry**](Menu#addentry) adds a command to it. [**AddCustom**](#addcustom) adds a menu of the addin's own.

```tb check_build
Private WithEvents CompareEntry As MenuEntry

Private Sub Host_OnProjectLoaded()
    With Host.Menus.ProjectExplorerFileViewContextMenu
        .AddEntry                                   ' a separator
        Set CompareEntry = .AddEntry("Compare with...")
    End With
End Sub

Private Sub CompareEntry_Click()
    Host.DebugConsole.PrintText "Compare " & Host.ProjectExplorer.SelectedItemPath
End Sub
```

An addin's entries last as long as the addin. A restart of the compiler removes them all, and loads the addin again: the entries it adds as it loads, in its [**OnProjectLoaded**](Host#onprojectloaded) for one, come back, and an entry it added later does not.

* TOC
{:toc}

## Properties

Every property is read-only and returns a [**Menu**](Menu). The menu's [**Id**](Menu#id) is the property's name.

### The menu bar
{: .no_toc }

**FileMenu**, **EditMenu**, **ViewMenu**, **ProjectMenu**, **FormatMenu**, **DebugMenu**, **RunMenu**, **ToolsMenu**, **AddinsMenu**, **WindowMenu** and **HelpMenu** are the menus of the IDE's [menu bar](../../IDE/Reference/Menu).

### Submenus of the menu bar
{: .no_toc }

| Property | The submenu |
|---|---|
| **FormatAlignSubMenu**, **FormatMakeSameSizeSubMenu**, **FormatHorizontalSpacingSubMenu**, **FormatVerticalSpacingSubMenu** | **Format → Align**, **Make Same Size**, **Horizontal Spacing** and **Vertical Spacing**. The same submenus of the form designer's right-click menu show the addin's entries too. |
| **DebugDebuggerOptionsSubMenu** | The debugger options under **Debug**. |
| **WindowPanelLayoutsSubMenu**, **WindowPanelFeaturesSubMenu**, **WindowKeyboardShortcutsSubMenu**, **WindowLanguageSubMenu** | The submenus of **Window**: the panel layouts, the panel features, the keyboard shortcuts and the language. |

### Menus that open from a panel
{: .no_toc }

| Property | Opens on |
|---|---|
| **CodeEditorContextMenu** | A right-click in the code editor. |
| **CodeEditorOptionsMenu** | The code editor's options button. |
| **CodeEditorTabsListMenu**, **CodeEditorTabsListRecentlyClosedSubMenu** | The list of the editor's open tabs, and its submenu of tabs closed recently. |
| **EditorTabsContextMenu** | A right-click on an editor tab. |
| **DebugConsoleContextMenu**, **DebugConsoleOptionsMenu** | A right-click in the DEBUG CONSOLE, and its options button. |
| **ProjectExplorerFileViewContextMenu** | A right-click in the **Project Explorer**, in its view of the files. |
| **ProjectExplorerObjectViewContextMenu** | A right-click in the **Project Explorer**, in its view of the objects. |
| **ProjectExplorerAddMenu** | The **Add** submenu of the **Project Explorer**. |
| **FormDesignerContextMenu** | A right-click in the form designer. |
| **DiagnosticsContextMenu** | A right-click in the PROBLEMS panel. |
| **ToolboxOptionsMenu** | The options button of the TOOLBOX. |
| **PropertySheetCopyToContextMenu**, **PropertySheetSystemColorsContextMenu** | The property sheet's menu that copies a value to other controls, and its menu of system colours. |
| **ShellProcessPopupMenu** | A click on a running program's box in the status bar. |
| **WebpageOptionsMenu** | The options button of the webpage panel. |
| **ThemesPopupMenu** | The toolbar's theme button. |

## Methods

### AddCustom
{: .no_toc }

Adds a menu of the addin's own and returns it. In a project that references the VB package, declare the variable that holds it `As tbIDE.Menu`: there, **Menu** alone is the VB package's control.

Syntax: *menus*.**AddCustom**( *Caption* [, *IsVisible* ] [, *RelativeToCommand* ] [, *RelativePriority* ] ) **As** [**Menu**](Menu)

*Caption*
: *required* The menu's name on the menu bar. **String**.

*IsVisible*
: *optional* **True** to show the menu on the menu bar. **Boolean**. A menu that is not shown there can still be opened with [**Menu.ShowPopup**](Menu#showpopup), as a right-click menu inside a [**ToolWindow**](ToolWindow) or a designer.

*RelativeToCommand*, *RelativePriority*
: *optional* Accepted, and not used: the menu goes on the menu bar after **Help**, and after the custom menus added before it.

<!-- test: bug addcustom-first-menu-dead, lane addin:menus -->
> [!NOTE] BETA 1045
> When **AddCustom** is the first call by which the addin adds to a menu, the menu it makes shows on the menu bar but does not open, and its [**Caption**](Menu#caption) and [**Visible**](Menu#visible) do not change it. A restart of the compiler leaves it there, beside the one the addin makes again. Add the addin's other entries first, or add one entry to an IDE menu before calling **AddCustom**.

### RemoveAllAddedEntries
{: .no_toc }

Is meant to remove every entry this addin has added, from every menu.

Syntax: *menus*.**RemoveAllAddedEntries**

<!-- test: bug menus-removealladdedentries-noop, lane addin:menus -->
> [!NOTE] BETA 1045
> **RemoveAllAddedEntries** removes nothing. Call [**Menu.RemoveAllAddedEntries**](Menu#removealladdedentries) on each menu the addin added to, or [**MenuEntry.Remove**](MenuEntry#remove) on each entry.

## See Also

- [Menu](Menu) class
- [MenuEntry](MenuEntry) class
- [Host.Menus](Host#menus) property
