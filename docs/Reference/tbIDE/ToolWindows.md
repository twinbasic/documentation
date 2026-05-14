---
title: ToolWindows
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/ToolWindows
has_toc: false
---

# ToolWindows class
{: .no_toc }

The IDE's tool-window factory — reached through [**Host.ToolWindows**](Host#toolwindows). Use [**Add**](#add) to create a new HTML-rendered pane; populate its DOM through the returned [**ToolWindow**](ToolWindow)'s [**RootDomElement**](ToolWindow#rootdomelement); show the pane by setting [**Visible**](ToolWindow#visible) = **True**.

```tb
Set myWindow = Host.ToolWindows.Add("MyAddIn.MyWindow", "MyAddIn.MyWindowPosition")
```

## Methods

### Add
{: .no_toc }

Creates a new tool window and returns its [**ToolWindow**](ToolWindow) object. The newly-created pane starts out **Visible = False**; populate it, then flip [**Visible**](ToolWindow#visible) = **True** to show it.

Syntax: *toolWindows*.**Add**( *Name* [, *UniqueIdForPositionPersistance* ] ) **As** [**ToolWindow**](ToolWindow)

*Name*
: *required* An internal name for the tool window. **String**. Pick an addin-prefixed value so multiple addins do not collide on names.

*UniqueIdForPositionPersistance*
: *optional* A stable identifier the IDE uses to remember the pane's size, position, and dock state across IDE restarts. **String**. Omit to make the pane non-persistent — every open is sized from `suggestedWidth` / `suggestedHeight` (see [**ToolWindow**](ToolWindow#suggested-initial-size)) and positioned by the IDE's default placement logic.

```tb
' Persisted (preferred for user-visible panes):
Set myWindow = Host.ToolWindows.Add("MyAddIn.SearchPane", "MyAddIn.SearchPane.position")

' Non-persistent (for transient one-shot dialogs):
Set myWindow = Host.ToolWindows.Add("MyAddIn.QuickPrompt")
```
