---
title: MenuEntry
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/MenuEntry
has_toc: false
---

# MenuEntry class
{: .no_toc }

One entry of a [**Menu**](Menu), added by the addin with [**Menu.AddEntry**](Menu#addentry). Held `WithEvents`, it raises [**Click**](#click) when the user chooses it, and [**BeforeShow**](#beforeshow), when asked for, each time its menu opens.

```tb check_build
Private WithEvents CompareEntry As MenuEntry

Private Sub Host_OnProjectLoaded()
    Set CompareEntry = Host.Menus.ProjectExplorerFileViewContextMenu.AddEntry("Compare")
    CompareEntry.BeforeShowEvents = True
End Sub

Private Sub CompareEntry_BeforeShow()
    ' Show the entry for a file only, not for a folder.
    On Error GoTo NotAFile
    CompareEntry.Visible = (Host.FileSystem.ResolvePath(Host.ProjectExplorer.SelectedItemPath).Type <> Folder)
    Exit Sub
NotAFile:
    CompareEntry.Visible = False
End Sub

Private Sub CompareEntry_Click()
    Host.DebugConsole.PrintText "Compare " & Host.ProjectExplorer.SelectedItemPath
End Sub
```

* TOC
{:toc}

## Properties

### BeforeShowEvents
{: .no_toc }

Whether the entry raises [**BeforeShow**](#beforeshow). **Boolean**; **False** at first. Set it to **True** for an entry that changes as its menu opens. Each such entry makes the menu wait for its handler, so leave it **False** for one that does not change.

Syntax: *entry*.**BeforeShowEvents** [ = *value* ]

### Caption
{: .no_toc }

The entry's text. **String**.

Syntax: *entry*.**Caption** [ = *value* ]

### Checked
{: .no_toc }

Whether the entry shows a tick. **Boolean**. The tick is drawn in place of the entry's [**IconData**](#icondata).

Syntax: *entry*.**Checked** [ = *value* ]

### Children
{: .no_toc }

The entry's submenu, for adding entries to it with [**AddEntry**](Menu#addentry). **As** [**Menu**](Menu), read-only. Once it holds an entry, the entry becomes a submenu: it opens when the pointer is over it, and it raises no [**Click**](#click).

### Enabled
{: .no_toc }

Whether the entry can be chosen. **Boolean**. A disabled entry is drawn grey.

Syntax: *entry*.**Enabled** [ = *value* ]

### IconData
{: .no_toc }

The entry's icon, as the text of an SVG picture that starts with `<svg`. **Variant**.

Syntax: *entry*.**IconData** [ = *value* ]

### Id
{: .no_toc }

The entry's identifier, a GUID in braces. **String**, read-only.

### Parent
{: .no_toc }

The menu the entry is in. **As** [**Menu**](Menu), read-only.

### Visible
{: .no_toc }

Whether the entry is shown. **Boolean**.

Syntax: *entry*.**Visible** [ = *value* ]

## Methods

### Remove
{: .no_toc }

Removes the entry from its menu.

Syntax: *entry*.**Remove**

## Events

### BeforeShow
{: .no_toc }

Raised each time the entry's menu opens, before it is drawn, while [**BeforeShowEvents**](#beforeshowevents) is **True**. For an entry of a submenu, it is raised as the submenu opens. What the handler changes, the [**Caption**](#caption), [**Visible**](#visible), [**Enabled**](#enabled) or [**Checked**](#checked) of any entry, shows in the menu that is opening. So does an entry it adds.

Syntax: *entry*_**BeforeShow**()

Use it to fit the entry to what was right-clicked, with [**ProjectExplorer.SelectedItemPath**](ProjectExplorer#selecteditempath), as the example above does.

### Click
{: .no_toc }

Raised when the user chooses the entry. The menu closes. An entry that has a submenu raises none.

Syntax: *entry*_**Click**()

## See Also

- [Menu](Menu) class
- [Menus](Menus) class
