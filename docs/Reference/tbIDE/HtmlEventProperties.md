---
title: HtmlEventProperties
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/HtmlEventProperties
has_toc: false
---

# HtmlEventProperties class
{: .no_toc }

The dynamic event-payload bag passed to every [**HtmlElement.AddEventListener**](HtmlElement#addeventlistener) callback. Conceptually the IDE-side equivalent of the JavaScript `Event` object — fields like `.key`, `.target.id`, `.target.value`, `.index` are accessed dynamically through the bag's `[COMExtensible(True)]` resolution.

```tb
Private Sub MyButtonClicked(ByVal eventInfo As HtmlEventProperties)
    Host.DebugConsole.PrintText "clicked: " & eventInfo.target.id
End Sub

Private Sub MyKeyUp(ByVal eventInfo As HtmlEventProperties)
    If eventInfo.key = "Enter" Then ProcessEntered(eventInfo.target.value)
End Sub
```

> [!IMPORTANT]
> This interface is **`[COMExtensible(True)]`**. Field names are resolved against the underlying event object at run time. The standard DOM event surface (`.target` → the element that fired the event; `.key`, `.code`, `.altKey`, `.ctrlKey`, `.shiftKey` for keyboard events; `.clientX`, `.clientY` for mouse events; `.index` for the IDE's listview events; …) is forwarded as-is to the JavaScript-side event object. See MDN's DOM Event documentation for the standard fields.

* TOC
{:toc}

## Custom-data fan-out from `raiseEvent()`

When inline HTML inside a tool window calls the IDE-side `raiseEvent(eventName, event, stopPropagation, ...customData)` helper, the trailing *customData* values flow through to the addin's listener as `eventInfo.customData0`, `eventInfo.customData1`, …, numerically indexed from zero. This is the mechanism the listview / virtual listview use to attach per-row context (file path, line number, …) to their item events.

```tb
' Inline HTML — sample 15:
'   <div class="match" onclick="raiseEvent('onClickMatch', event, true, 'C:/file.twin', 42, 8)">…</div>

Private Sub OnClickMatch(ByVal eventInfo As HtmlEventProperties)
    Dim filePath As String = eventInfo.customData0
    Dim lineNum  As Long   = eventInfo.customData1
    Dim colNum   As Long   = eventInfo.customData2
    Host.ActiveEditors.Open filePath, lineNum, colNum
End Sub
```

## Asynchronous events (`setAsyncResult`)

Some events — notably the virtual listview's `onAsyncGetItemHTML` — are *asynchronous*: the IDE asks the addin to produce content for a specific argument and expects the answer back through the event object itself. The argument arrives on the event as `eventInfo.asyncArgument`, and the listener responds by calling `eventInfo.setAsyncResult(answer)`:

```tb
Private Sub OnAsyncGetItemHTML(ByVal eventInfo As HtmlEventProperties)
    Dim itemIndex As Long = eventInfo.asyncArgument
    eventInfo.setAsyncResult("<div>Row " & itemIndex & "</div>")
End Sub
```

This is the standard `[COMExtensible(True)]` resolution at work — `setAsyncResult` is not declared on the interface, it is dispatched through the dynamic mechanism just like `.key` or `.target` would be. See sample 14 (`WaynesVirtualListViewAddIn`) for the full pattern, including the cache-invalidation companion call `listview.notifyChangedItem(idx)`.

## Default member

The interface's **DefaultMember** is [**Item**](#item) — so `eventInfo("target")` is equivalent to `eventInfo.Item("target")`. The `.target.id` shorthand desugars accordingly.

## Properties

### Item
{: .no_toc }

Looks up a field by name. Returns an [**HtmlEventProperty**](HtmlEventProperty), which carries the field's value plus a nested [**Properties**](HtmlEventProperty#properties) for further drill-down.

Syntax: *eventInfo*( *DomPropertyName* ) **As** [**HtmlEventProperty**](HtmlEventProperty)

*DomPropertyName*
: *required* The field name. **String**.
