---
title: JavaScript interop
parent: WebView2
grand_parent: Tutorials
nav_order: 6
permalink: /Tutorials/WebView2/JavaScript-Interop
---

# JavaScript interop

The [**WebView2**](../../tB/Packages/WebView2/WebView2/) control offers three complementary bridges between twinBASIC and the JavaScript running in the page:

1. **Host objects** — publish a BASIC COM object to the page so JavaScript can call its methods and read its properties as if it were any other JS object.
2. **Messages** — push a value (string, number, array, …) in either direction and listen for it on the other side.
3. **Scripted calls** — call a named JavaScript function from BASIC and (optionally) wait for its return value.

This tutorial covers all three, with the matching JavaScript side shown next to each BASIC side. The worked code comes from *Sample 0 — WebView2 Examples* (form *Example 2*).

## Bridge 1 — Host objects

[**AddObject**](../../tB/Packages/WebView2/WebView2/#addobject) publishes a BASIC class instance under `chrome.webview.hostObjects.<Name>`. Define a small class with public methods or properties:

```tb
Class MyCalculator
    Public Function MultiplyByTen(ByVal Value As Long) As Long
        Return Value * 10
    End Function
End Class
```

Register it once the control is ready:

```tb
Private Sub WebView_Ready() Handles WebView.Ready
    WebView.AddObject "myCalculator", New MyCalculator
End Sub
```

JavaScript can now call into it — but the proxy is asynchronous, so the call must be `await`ed inside an `async` function:

```js
async function testHostCalculator() {
    let value = Math.floor(Math.random() * 100000);
    let result = await chrome.webview.hostObjects.myCalculator.MultiplyByTen(value);
    alert(`BASIC said ${value} × 10 = ${result}`);
}
```

To trigger the JS function from BASIC, call [**ExecuteScript**](../../tB/Packages/WebView2/WebView2/#executescript):

```tb
Private Sub btnTest_Click() Handles btnTest.Click
    WebView.ExecuteScript("testHostCalculator()")
End Sub
```

Requires [**AreHostObjectsAllowed**](../../tB/Packages/WebView2/WebView2/#arehostobjectsallowed) (default **True**). See [Re-entrancy](Re-entrancy) for the trade-off between synchronous calls (default) and the **UseDeferredInvoke:=True** variant.

## Bridge 2 — Messages

Messages are values that travel in either direction. Use them for notifications and ad-hoc payloads where you don't want to define a method signature ahead of time.

### BASIC → page

[**PostWebMessage**](../../tB/Packages/WebView2/WebView2/#postwebmessage) sends a value to the page; the page receives it through a `message` event on `window.chrome.webview`:

```tb
WebView.PostWebMessage "Hello from twinBASIC!"
```

```js
window.chrome.webview.addEventListener('message', (e) => {
    alert("Host sent: " + e.data);
});
```

Strings arrive as JavaScript strings; every other type is JSON-encoded before transit. If you already have serialised JSON, [**PostWebMessageJSON**](../../tB/Packages/WebView2/WebView2/#postwebmessagejson) sends it through verbatim.

### Page → BASIC

The page calls `window.chrome.webview.postMessage(value)`; BASIC receives it as the [**JsMessage**](../../tB/Packages/WebView2/WebView2/#jsmessage) event:

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

Both directions require [**IsWebMessageEnabled**](../../tB/Packages/WebView2/WebView2/#iswebmessageenabled) (default **True**).

## Bridge 3 — Scripted calls

When the page exposes named JS functions, BASIC can call them directly. There are three variants:

| Method                                                                            | Returns                                          | Use it when                                                       |
|-----------------------------------------------------------------------------------|--------------------------------------------------|-------------------------------------------------------------------|
| [**JsRun**](../../tB/Packages/WebView2/WebView2/#jsrun)                           | **Variant**, synchronously                       | You need the result inline and the JS is quick.                   |
| [**JsRunAsync**](../../tB/Packages/WebView2/WebView2/#jsrunasync)                 | **LongLong** token; result via `JsAsyncResult`   | The JS may take a while and you don't want to block the UI.       |
| [**ExecuteScript**](../../tB/Packages/WebView2/WebView2/#executescript)           | nothing (fire-and-forget)                        | You just want to trigger something — no return value needed.      |

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

The call blocks for up to [**JsCallTimeOutSeconds**](../../tB/Packages/WebView2/WebView2/#jscalltimeoutseconds) (default 0 — wait forever).

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

The return value of [**JsRunAsync**](../../tB/Packages/WebView2/WebView2/#jsrunasync) is a token; the [**JsAsyncResult**](../../tB/Packages/WebView2/WebView2/#jsasyncresult) event includes the same token so a single handler can demultiplex multiple in-flight calls.

### ExecuteScript (fire-and-forget)

```tb
WebView.ExecuteScript "startTimer()"
```

No return value, no event. The simplest way to nudge the page into doing something.

## Re-entrancy

The Edge runtime forbids host code from calling back into the WebView2 object model while a host-object method is still executing — re-entry deadlocks the browser process. The control protects most events by deferring them through the BASIC message loop ([**UseDeferredEvents**](../../tB/Packages/WebView2/WebView2/#usedeferredevents)), but host-object method calls are synchronous by default.

The full discussion lives in the [Re-entrancy tutorial](Re-entrancy); the short summary is:

- **`AddObject(name, obj)`** — synchronous calls; the page can read return values but the BASIC method **must not** call back into the WebView2 control.
- **`AddObject(name, obj, UseDeferredInvoke:=True)`** — asynchronous calls; the BASIC method is free to call any WebView2 member but the page cannot read a return value.

## Where next

- [Hosting local web assets](Hosting-Local-Web-Assets) — bundle and serve the JavaScript that talks to the host.
- [Driving Monaco from twinBASIC](Driving-Monaco) — a full case study using all three bridges.
- [Re-entrancy](Re-entrancy) — the deeper story behind **UseDeferredInvoke**.
- [WebView2 reference](../../tB/Packages/WebView2/WebView2/) — every property, method, and event.
