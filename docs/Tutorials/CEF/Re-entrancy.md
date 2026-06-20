---
title: Re-entrancy
parent: CEF
grand_parent: Tutorials
nav_order: 3
permalink: /Tutorials/CEF/Re-entrancy
---

# Re-entrancy

The Chromium Embedded Framework runs the browser and renderer in *separate processes*, with cross-process IPC sitting between BASIC and the page. That model is fundamentally different from an in-process API, and it forces a particular discipline on host code: while a CEF callback is executing on the BASIC thread, the browser / renderer process is waiting for it to return --- and calling *back* into the [**CefBrowser**](../../tB/Packages/CEF/CefBrowser/) control during that wait can deadlock.

For the most part you don't have to think about any of this. The control raises every event onto the BASIC message loop via a posted message, so a handler that runs in response to a CEF callback has already returned control to the browser process by the time your code runs. The one place the rule still applies is [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun) --- the *synchronous* JavaScript bridge.

## How the control protects you

When the browser or renderer process raises a CEF callback that needs to appear in BASIC, the control:

1. Captures the callback's arguments into a `Type` instance.
2. Calls `PostMessageW` to push a custom message onto the main thread's message queue.
3. Returns immediately --- the browser process is unblocked.
4. Later, when the form's message loop receives the posted message, the control raises the event on the BASIC side.

The handler runs *outside* the original CEF callback. By the time it executes, the browser process has moved on; the handler is free to call any [**CefBrowser**](../../tB/Packages/CEF/CefBrowser/) method or property --- [**Navigate**](../../tB/Packages/CEF/CefBrowser/#navigate), [**ExecuteScript**](../../tB/Packages/CEF/CefBrowser/#executescript), [**JsRunAsync**](../../tB/Packages/CEF/CefBrowser/#jsrunasync), even another [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun) --- without any re-entrancy concern.

This covers every event the control raises today:

- [**Create**](../../tB/Packages/CEF/CefBrowser/#create), [**Ready**](../../tB/Packages/CEF/CefBrowser/#ready), [**Error**](../../tB/Packages/CEF/CefBrowser/#error)
- [**NavigationComplete**](../../tB/Packages/CEF/CefBrowser/#navigationcomplete), [**SourceChanged**](../../tB/Packages/CEF/CefBrowser/#sourcechanged), [**DocumentTitleChanged**](../../tB/Packages/CEF/CefBrowser/#documenttitlechanged), [**DOMContentLoaded**](../../tB/Packages/CEF/CefBrowser/#domcontentloaded)
- [**PrintToPdfCompleted**](../../tB/Packages/CEF/CefBrowser/#printtopdfcompleted), [**PrintToPdfFailed**](../../tB/Packages/CEF/CefBrowser/#printtopdffailed)
- [**JsAsyncResult**](../../tB/Packages/CEF/CefBrowser/#jsasyncresult), [**JsMessage**](../../tB/Packages/CEF/CefBrowser/#jsmessage)

## The NavigationStarting exception

[**NavigationStarting**](../../tB/Packages/CEF/CefBrowser/#navigationstarting) is the one event that *cannot* be fully deferred --- its `Cancel` parameter is **ByRef**, so the BASIC handler has to set it *before* the browser process can decide whether to proceed with the navigation. The control still uses `SendMessageW` (synchronous) rather than `PostMessageW` to deliver this event, which means the handler runs while the browser process is blocked waiting for the answer.

The control adds an extra safety net for one specific case: if the renderer-IPC channel happens to be busy connecting at the same moment **NavigationStarting** fires (which can happen in older CEF versions during early page loads), a straight `SendMessageW` would deadlock --- BASIC is waiting on the renderer; the renderer is waiting on BASIC. The control detects the situation and uses an interrupt-style mechanism to dispatch *just* the **NavigationStarting** handler on the UI thread without waiting for the renderer IPC.

The practical consequence: **NavigationStarting** handlers should keep their work small --- read [**Uri**](../../tB/Packages/CEF/CefBrowser/#navigationstarting), make a decision, set or leave [**Cancel**](../../tB/Packages/CEF/CefBrowser/#navigationstarting), return. Avoid synchronous round-trips of any kind from inside the handler --- including [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun), [**MsgBox**](../../tB/Modules/Interaction/MsgBox), and file dialogs.

## JsRun --- the explicit warning

[**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun) is the synchronous JavaScript bridge:

```tb
Dim product As Long = CefBrowser1.JsRun("multiplyTheseNumbers", 5, 6)
```

The call blocks the BASIC thread until the renderer process replies with the result. During that block, the renderer is running JavaScript; if that JavaScript calls back into BASIC --- via `window.chrome.webview.postMessage(...)`, or via any host-object call that arrives on the BASIC thread --- there is no thread available to *receive* the call. The renderer waits on BASIC; BASIC waits on the renderer. Deadlock.

The control's source includes this warning directly on the method:

> **!!!WARNING!!!** be careful not to introduce re-entrancy when using this synchronous function, otherwise UI freezes can occur.

The safe rule of thumb:

- Use [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun) for **pure** JavaScript functions --- ones that take inputs, compute, and return a value. No `postMessage`, no host-object calls, no `await` of anything that touches the host.
- Use [**JsRunAsync**](../../tB/Packages/CEF/CefBrowser/#jsrunasync) for anything else --- anywhere the JavaScript side might end up wanting to talk to BASIC during the call.

```tb
' Safe — pure JavaScript: takes two numbers, returns one number.
Dim html As String = CefBrowser1.JsRun("renderMarkdownToHtml", source)

' Prefer JsRunAsync when the JS could call back into BASIC.
CefBrowser1.JsRunAsync "uploadAndReturnUrl", filePath
' ... result arrives later via JsAsyncResult event.
```

## Why the model is simpler than WebView2's

[**WebView2**](../../tB/Packages/WebView2/WebView2/) supports `AddObject` --- publishing a BASIC COM object that JavaScript can call directly. That feature has its own re-entrancy story ([**UseDeferredInvoke**](../../tB/Packages/WebView2/WebView2/#addobject)) because page-initiated host-object calls must end up somewhere.

CEF's host-object equivalent isn't exposed yet --- see the [WebView2 parity](../../tB/Packages/CEF/#webview2-parity) section of the reference. The only synchronous BASIC ↔ JavaScript boundary CEF currently offers is **JsRun**, so the entire re-entrancy story reduces to *"don't post messages back to BASIC from inside a **JsRun** target"*.

## See also

- [JavaScript interop](JavaScript-Interop) -- practical patterns for choosing between [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun), [**JsRunAsync**](../../tB/Packages/CEF/CefBrowser/#jsrunasync), and the message bridge.
- [CefBrowser reference](../../tB/Packages/CEF/CefBrowser/) -- every property, method, and event.
- [WebView2 Re-entrancy tutorial](../WebView2/Re-entrancy) -- the parallel story for the [**WebView2**](../../tB/Packages/WebView2/WebView2/) control, including the **AddObject** trade-off CEF doesn't yet have.
