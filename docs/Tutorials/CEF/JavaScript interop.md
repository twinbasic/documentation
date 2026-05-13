---
title: JavaScript interop
parent: CEF
grand_parent: Tutorials
nav_order: 6
permalink: /Tutorials/CEF/JavaScript-Interop
---

# JavaScript interop

The [**CefBrowser**](../../tB/Packages/CEF/CefBrowser/) control offers two complementary bridges between twinBASIC and the JavaScript running in the page:

1. **Messages** — push a value (string, number, …) in either direction and listen for it on the other side.
2. **Scripted calls** — call a named JavaScript function from BASIC and (optionally) wait for its return value.

> [!NOTE]
> [**WebView2**](../../tB/Packages/WebView2/WebView2/) also exposes a third bridge — *host objects*, where a BASIC class is published under `chrome.webview.hostObjects.<Name>` for the page to call into. The CEF package does not yet expose an equivalent — see the [WebView2 parity](../../tB/Packages/CEF/#webview2-parity) section of the reference.

This tutorial covers both bridges, with the matching JavaScript side shown next to each BASIC side. The worked code comes from *Sample 1b — Chromium Embedded Framework Examples* (form *Example 2*).

## Bridge 1 — Messages

Messages are values that travel in either direction. Use them for notifications and ad-hoc payloads where you don't want to define a method signature ahead of time.

### BASIC → page

[**PostWebMessage**](../../tB/Packages/CEF/CefBrowser/#postwebmessage) sends a value to the page; the page receives it through a `message` event on `window.chrome.webview`:

```tb
WebView.PostWebMessage "Hello from twinBASIC!"
```

```js
window.chrome.webview.addEventListener('message', (e) => {
    alert("Host sent: " + e.data);
});
```

Strings arrive as JavaScript strings; numerics, **Boolean**, **Null**, and **Empty** are JSON-encoded for the page. Objects and arrays are not currently supported.

If [**PostWebMessage**](../../tB/Packages/CEF/CefBrowser/#postwebmessage) is called before the renderer IPC has connected, the call is queued and dispatched once the connection comes up — there's no need to wait for [**Ready**](../../tB/Packages/CEF/CefBrowser/#ready) explicitly.

### Page → BASIC

The page calls `window.chrome.webview.postMessage(value)`; BASIC receives it as the [**JsMessage**](../../tB/Packages/CEF/CefBrowser/#jsmessage) event:

```js
function sendHostAMessage() {
    window.chrome.webview.postMessage("This is a message from JavaScript.");
}
```

```tb
Private Sub WebView_JsMessage(ByVal Message As Variant) _
        Handles WebView.JsMessage
    Debug.Print "Page sent: "; Message
End Sub
```

The two halves combine cleanly into a request / reply exchange — the page posts a query string, BASIC processes it and posts a result back:

```tb
Private Sub WebView_JsMessage(ByVal Message As Variant) _
        Handles WebView.JsMessage
    If Left$(Message, 6) = "QUERY:" Then
        WebView.PostWebMessage "ANSWER:" & LookupAnswer(Mid$(Message, 7))
    End If
End Sub
```

## Bridge 2 — Scripted calls

When the page exposes named JS functions, BASIC can call them directly. There are three variants:

| Method                                                                            | Returns                                          | Use it when                                                       |
|-----------------------------------------------------------------------------------|--------------------------------------------------|-------------------------------------------------------------------|
| [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun)                              | **Variant**, synchronously                       | You need the result inline and the JS is **pure** (no callbacks). |
| [**JsRunAsync**](../../tB/Packages/CEF/CefBrowser/#jsrunasync)                    | nothing; result via `JsAsyncResult`              | The JS may take a while and you don't want to block the UI.       |
| [**ExecuteScript**](../../tB/Packages/CEF/CefBrowser/#executescript)              | nothing (fire-and-forget)                        | You just want to trigger something — no return value needed.      |

### JsRun (synchronous)

Given a page-side function:

```js
function multiplyTheseNumbers(a, b) {
    return a * b;
}
```

BASIC can call it and read the result on the same line:

```tb
Dim product As Long = WebView.JsRun("multiplyTheseNumbers", 5, 6)
Debug.Print product   ' 30
```

The call blocks the BASIC thread until the renderer process replies.

> [!WARNING]
> If the JavaScript function calls back into BASIC during the call — via `window.chrome.webview.postMessage(...)`, for instance — the result is a deadlock. Use [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun) only for pure functions; reach for [**JsRunAsync**](../../tB/Packages/CEF/CefBrowser/#jsrunasync) the moment that's not true. See the [Re-entrancy tutorial](Re-entrancy) for the full discussion.

### JsRunAsync (asynchronous)

```tb
Private Sub btnRun_Click() Handles btnRun.Click
    WebView.JsRunAsync "multiplyTheseNumbers", 5, 6
End Sub

Private Sub WebView_JsAsyncResult( _
        ByVal Result As Variant, Token As LongLong, ErrString As String) _
        Handles WebView.JsAsyncResult
    If LenB(ErrString) = 0 Then
        Debug.Print "Async result: "; Result
    Else
        Debug.Print "Async error: "; ErrString
    End If
End Sub
```

The [**JsAsyncResult**](../../tB/Packages/CEF/CefBrowser/#jsasyncresult) event carries a *Token* parameter so a single handler can demultiplex multiple in-flight calls. *ErrString* is empty on success.

Calls made before the renderer IPC has connected are queued and dispatched once the connection comes up.

### ExecuteScript (fire-and-forget)

```tb
WebView.ExecuteScript "startTimer()"
```

No return value, no event. The simplest way to nudge the page into doing something.

## Re-entrancy

The discussion of when calling synchronous JavaScript from BASIC is safe — and what to do when it isn't — lives in its own tutorial. The short summary:

- **Pure JS** (input → output, no side effects that touch the host): [**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun) is fine.
- **JS that might post back, await a host object, or otherwise re-enter BASIC**: use [**JsRunAsync**](../../tB/Packages/CEF/CefBrowser/#jsrunasync).

See the [Re-entrancy tutorial](Re-entrancy) for the full picture.

## Where next

- [Hosting local web assets](Hosting-Local-Web-Assets) — bundle and serve the JavaScript that talks to the host.
- [Driving Monaco from twinBASIC](Driving-Monaco) — a full case study using both bridges.
- [Re-entrancy](Re-entrancy) — the deeper story behind synchronous vs. asynchronous calls.
- [CefBrowser reference](../../tB/Packages/CEF/CefBrowser/) — every property, method, and event.
