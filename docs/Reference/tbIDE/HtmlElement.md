---
title: HtmlElement
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/HtmlElement
has_toc: false
---

# HtmlElement class
{: .no_toc }

One DOM element inside a tool window — every node in the rendered HTML tree is reachable as an **HtmlElement**, starting from [**ToolWindow.RootDomElement**](ToolWindow#rootdomelement) and walking down through [**ChildDomElements**](#childdomelements). Inline overlays inside a code pane (created with [**CodeEditor.AddMonacoWidget**](CodeEditor#addmonacowidget)) also surface as **HtmlElement** instances and behave identically.

```tb
With myToolWindow.RootDomElement.ChildDomElements.Add("greeting", "h1")
    With .Properties
        .style.textAlign = "center"
        .style.color     = "white"
        .innerText       = "Hello, world!"
    End With
End With
```

The element's *properties* — every CSS-style property, every DOM attribute, every custom-widget extension — live inside the [**Properties**](#properties) bag, accessed through a dynamic resolution mechanism. See [Dynamic DOM property resolution](.#dynamic-dom-property-resolution) on the package overview for the underlying mechanism that makes `.style.textAlign = "center"` work without a statically-declared `style` member.

* TOC
{:toc}

## Properties

### ChildDomElements
{: .no_toc }

The element's child-element collection. Use [**HtmlElements.Add**](HtmlElements#add) to add new children, [**Item**](HtmlElements#item) to look one up by ID. **As** [**HtmlElements**](HtmlElements). Read-only.

### Name
{: .no_toc }

The unique ID assigned to the element when it was created via [**HtmlElements.Add**](HtmlElements#add). **String**, read-only.

### Properties
{: .no_toc }

The element's dynamic property bag — every DOM property, every CSS-style property, every custom-widget extension lives here. **As** [**HtmlElementProperties**](HtmlElementProperties). **DefaultMember** — so `element.<name>` is equivalent to `element.Properties.<name>`.

The bag is [`[COMExtensible(True)]`](.#dynamic-dom-property-resolution): property names are resolved against the DOM element at run time, so the accepted set is everything the underlying tag supports — refer to MDN for standard DOM properties, and to the custom-widget documentation (Chart.js, Monaco, …) for the widget-specific surface.

## Methods

### AddEventListener
{: .no_toc }

Registers a callback to be invoked when a DOM event fires on the element.

Syntax: *element*.**AddEventListener** *DomEventName*, *CallbackFunc* [, *Data* ]

*DomEventName*
: *required* The DOM event name. **String**. Standard names (`"click"`, `"keyup"`, `"input"`, `"change"`, `"mouseenter"`, …) and custom event names raised by inline HTML (see below) both work.

*CallbackFunc*
: *required* The callback. Pass `AddressOf` a sub of signature `Sub(ByVal eventInfo As HtmlEventProperties)`. **LongPtr**.

*Data*
: *optional* An opaque value to associate with the registration. **Variant**.

```tb
With .ChildDomElements.Add("myButton", "div")
    .Properties.innerText = "Click me"
    .AddEventListener("click", AddressOf MyButtonClicked)
End With

' …
Private Sub MyButtonClicked(ByVal eventInfo As HtmlEventProperties)
    Host.DebugConsole.PrintText "clicked: " & eventInfo.target.id
End Sub
```

> [!IMPORTANT]
> For the four custom-widget tags (`"chartjs"`, `"monaco"`, `"listview"`, `"virtuallistview"`), the widget-specific events (e.g. Monaco's `onDidChangeModelContent`, the listview's `onClickItem`) are registered on the **widget object**, not on the DOM element. So:
>
> ```tb
> ' WRONG — listener is never reached:
> monacoDivElement.AddEventListener("onDidChangeModelContent", AddressOf Handler)
>
> ' CORRECT — register on .editor (or .listview / .chart for the other widgets):
> monacoDivElement.Properties.editor.AddEventListener("onDidChangeModelContent", AddressOf Handler)
> ```
>
> Standard DOM events (`"click"`, `"keyup"`, …) still attach directly to the DOM element through this method.

#### Custom event names from inline HTML
{: .no_toc }

Inline HTML rendered inside a tool window can raise arbitrary event names back to the addin through the IDE-side `raiseEvent()` JavaScript helper. The function signature on the JavaScript side is:

```js
raiseEvent(eventName, event, stopPropagation, ...customData)
```

— pass an event name (any string), the DOM `event` object, a boolean controlling propagation, and any number of trailing custom-data values. The addin then registers a listener with the same event name through **AddEventListener**, and the custom-data values arrive on the [**HtmlEventProperties**](HtmlEventProperties) as `eventInfo.customData0`, `eventInfo.customData1`, … (numerically indexed from zero). This pattern is used heavily in sample 13 (listview) and sample 15 (Global Search) to attach handlers to per-item buttons rendered inside a listview's HTML.

### Remove
{: .no_toc }

Removes the element from the DOM. Any child elements are removed with it. Any event listeners registered on this element are released.

Syntax: *element*.**Remove**
