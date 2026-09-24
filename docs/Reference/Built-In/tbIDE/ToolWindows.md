---
title: ToolWindows
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/ToolWindows
has_toc: false
---

# ToolWindows class
{: .no_toc }

The IDE's tool-window factory --- reached through [**Host.ToolWindows**](Host#toolwindows). Call [**Add**](#add) to create a new HTML-rendered pane; populate its DOM through the returned [**ToolWindow**](ToolWindow)'s [**RootDomElement**](ToolWindow#rootdomelement); show the pane by setting [**Visible**](ToolWindow#visible) = **True**.

```tb check_build
Set myWindow = Host.ToolWindows.Add("MyAddIn.MyWindow", "MyAddIn.MyWindowPosition")
```

## Methods

### Add
{: .no_toc }

Creates a tool window and returns its [**ToolWindow**](ToolWindow) object. A new pane starts out **Visible = False**; populate it, then flip [**Visible**](ToolWindow#visible) = **True** to show it.

Syntax: *toolWindows*.**Add**( *Name* [, *UniqueIdForPositionPersistance* ] ) **As** [**ToolWindow**](ToolWindow)

*Name*
: *required* An internal name for the tool window. **String**. Pick an addin-prefixed value.

*UniqueIdForPositionPersistance*
: *optional* The pane's id, which the IDE also uses to remember the pane's size, position, and dock state across IDE restarts. **String**. The IDE keeps one pane for each id: **Add** with an id it already has returns that pane, emptied, rather than a new one. That is how an addin gets its pane back after a compiler restart, which loads the addin again (see [Building and loading an addin](.#building-and-loading-an-addin)).

> [!IMPORTANT]
> Give every pane an id of its own. Every pane created without one is the same pane: a second **Add** without an id empties the first pane and returns it, whichever addin made either call, and both **ToolWindow** objects then act on the one pane.

```tb check_build
' A pane the user keeps open:
Set myWindow = Host.ToolWindows.Add("MyAddIn.SearchPane", "MyAddIn.SearchPane")

' A short-lived pane has an id of its own as well:
Set myWindow = Host.ToolWindows.Add("MyAddIn.QuickPrompt", "MyAddIn.QuickPrompt")
```
