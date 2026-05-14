---
title: ToolWindow
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/ToolWindow
has_toc: false
---

# ToolWindow class
{: .no_toc }

A dockable / floating IDE pane whose contents are rendered as HTML. Created by [**ToolWindows.Add**](ToolWindows#add); the addin populates its DOM through the [**RootDomElement**](#rootdomelement) — an [**HtmlElement**](HtmlElement) at the root of the pane — and shows the pane by setting [**Visible**](#visible) = **True** (tool windows start out invisible).

```tb
Private WithEvents myWindow As ToolWindow

Private Sub Button1_OnClick()
    Set myWindow = Host.ToolWindows.Add("MyAddIn.MyWindow", "MyAddIn.MyWindowPosition")
    With myWindow
        .Title = "Hello from My AddIn"
        With .RootDomElement
            .Properties.suggestedWidth  = "400px"
            .Properties.suggestedHeight = "300px"
            With .ChildDomElements.Add("greeting", "h1")
                .Properties.innerText = "Hello, world!"
            End With
        End With
        .Visible = True
    End With
End Sub
```

Use the `WithEvents` reference to receive [**OnClose**](#onclose) when the user dismisses the pane — typically the addin uses that event to release any per-window state (timers, references to DOM elements …).

* TOC
{:toc}

## Tool-window default member — jQuery-style child lookup

[**RootDomElement**](#rootdomelement) is the **DefaultMember** of the **ToolWindow** interface — so `myToolWindow.(...)` is equivalent to `myToolWindow.RootDomElement.Properties.(...)`. Because [**HtmlElementProperties**](HtmlElementProperties) is `[COMExtensible(True)]`, a string passed in parenthesis-syntax is resolved against the DOM at run time. The IDE treats CSS-style selectors specially, so:

```tb
' Find the descendant element whose id is "dataEntry" and read its .Value:
Dim entered As String = myToolWindow("#dataEntry").Value
```

Useful for grabbing a single child element by ID without holding a separate `As HtmlElement` reference for it.

## Suggested initial size

[**RootDomElement**](#rootdomelement) accepts `.Properties.suggestedWidth` and `.Properties.suggestedHeight` (CSS-length strings like `"400px"`). These are *one-shot* hints — used the **first time** the tool window opens as a floating pane; once the user resizes (or after position persistence kicks in through [**ToolWindows.Add**](ToolWindows#add)'s persistence ID), the IDE remembers the user's chosen size and the suggested values are ignored.

> [!NOTE]
> Set `suggestedWidth` / `suggestedHeight` before the first time the pane becomes visible. If the pane has previously been opened by this user (and a persistence ID was supplied to [**ToolWindows.Add**](ToolWindows#add)), the IDE-remembered size wins.

* TOC
{:toc}

## Properties

### Name
{: .no_toc }

The internal name supplied to [**ToolWindows.Add**](ToolWindows#add). **String**, read-only.

### Resizable
{: .no_toc }

Whether the user is allowed to resize the pane. **Boolean**, read / write. Default **True**.

Syntax: *toolWindow*.**Resizable** [ = *value* ]

### RootDomElement
{: .no_toc }

The root [**HtmlElement**](HtmlElement) of the pane's DOM. **DefaultMember** — see [Tool-window default member](#tool-window-default-member--jquery-style-child-lookup) above.

Syntax: *toolWindow*.**RootDomElement** **As** [**HtmlElement**](HtmlElement)

### Title
{: .no_toc }

The pane's title-bar text. **String**, read / write. Update at any time to reflect changing state (selection counts, dirty markers, …).

Syntax: *toolWindow*.**Title** [ = *value* ]

### Visible
{: .no_toc }

Whether the pane is shown. **Boolean**, read / write. Default **False** — newly-created tool windows are invisible until the addin sets this to **True**.

Syntax: *toolWindow*.**Visible** [ = *value* ]

## Methods

### ApplyCss
{: .no_toc }

Injects a `<style>` block into the pane's DOM that applies to every element inside the pane. Useful for global CSS — class selectors, custom-element styling, hover effects — that would be awkward to set element-by-element through [**HtmlElementProperties**](HtmlElementProperties).

Syntax: *toolWindow*.**ApplyCss** *styles*

*styles*
: *required* The CSS text. **String**.

```tb
' Load CSS from an embedded resource:
Dim css As String = StrConv(LoadResData("styles.css", "STYLESHEETS"), VbStrConv.vbFromUTF8)
myToolWindow.ApplyCss css
```

### Close
{: .no_toc }

Closes the pane. The matching [**OnClose**](#onclose) event fires before the call returns.

Syntax: *toolWindow*.**Close**

## Events

### OnClose
{: .no_toc }

Fires when the pane is closed — either by the user dismissing it or by the addin calling [**Close**](#close). Use this to release any per-window state (timers, references to DOM elements, …).

Syntax: *toolWindow*_**OnClose**()
