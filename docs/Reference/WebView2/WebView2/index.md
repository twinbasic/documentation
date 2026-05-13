---
title: WebView2
parent: WebView2 Package
permalink: /tB/Packages/WebView2/WebView2/
has_toc: false
---

# WebView2 class
{: .no_toc }

A **WebView2** is a twinBASIC control that hosts the Microsoft Edge **WebView2** runtime — drop one onto a [**Form**](../../VB/Form/) and the running Edge engine renders web content inside its rectangle. Application code can navigate to URLs, run JavaScript, intercept HTTP requests, share BASIC objects with the page, post messages back and forth, and print the document to PDF.

The control wraps the underlying `ICoreWebView2*` COM interfaces and surfaces them as ordinary BASIC properties, methods, and events. Most of the work happens asynchronously inside the browser process — the control raises [**Ready**](#ready) once the WebView2 environment and controller have been created, and most members raise *"WebView2 control is not ready"* (run-time error 5) if called before then.

```tb
Private Sub Form_Load()
    WebView21.Navigate "https://www.twinbasic.com"
End Sub

Private Sub WebView21_Ready()
    Debug.Print "WebView2 ready: browser process " & WebView21.BrowserProcessId
End Sub

Private Sub WebView21_NavigationComplete( _
        ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    If Not IsSuccess Then
        Debug.Print "Navigation failed: " & WebErrorStatus
    End If
End Sub
```

* TOC
{:toc}

## Lifecycle

A WebView2 control passes through three distinct phases between construction and use, each driven by an asynchronous step in the Edge runtime:

| Event                                | When                                                                                                              |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| [**Create**](#create)                | After the container window exists, before the WebView2 environment is built. Last chance to set [**EnvironmentOptions**](#environmentoptions). |
| [**Error**](#error)                  | The environment or controller could not be created — typically because the WebView2 runtime is missing.            |
| [**Ready**](#ready)                  | The environment, controller, and core view are all live. The control is now fully functional.                      |

Calling navigation, scripting, or setting accessors before [**Ready**](#ready) raises run-time error 5 with the message *"WebView2 control is not ready"*. Where a setting depends on a newer runtime interface, the same error appears with *"The executing version of WebView2 does not support the requested feature"* instead — query the matching `Supports…Features` property first.

If the [**DocumentURL**](#documenturl) field has a non-empty value when [**Ready**](#ready) fires (the design-time default is `https://www.twinbasic.com`), the control auto-navigates to it.

## Deferred events

Several runtime callbacks — [**PermissionRequested**](#permissionrequested), [**NavigationStarting**](#navigationstarting), [**WebResourceRequested**](#webresourcerequested), [**ScriptDialogOpening**](#scriptdialogopening), [**DownloadStarting**](#downloadstarting), and [**NewWindowRequested**](#newwindowrequested) — are reentrant from the Edge side, meaning they fire on the WebView2 thread while it expects the host to either return synchronously or hold a *deferral* until the decision is made. Calling back into the control from inside a synchronous handler can deadlock the browser process.

When [**UseDeferredEvents**](#usedeferredevents) is **True** (the default), the control takes the runtime's deferral on the host's behalf, posts the event onto the BASIC message-loop, and completes the deferral after the handler returns. Application code is therefore safe to call any other **WebView2** method from inside these events. Set [**UseDeferredEvents**](#usedeferredevents) to **False** only if you need synchronous semantics and have arranged your own re-entrancy guard.

[**AcceleratorKeyPressed**](#acceleratorkeypressed) is always synchronous — its runtime arguments do not expose a deferral.

## JavaScript interop

The control offers three families of BASIC ↔ JavaScript bridges:

- **Host-object sharing** — [**AddObject**](#addobject) publishes a COM object to JavaScript under `chrome.webview.hostObjects.<Name>`. The page can call methods and read / write properties on the BASIC object directly. Requires [**AreHostObjectsAllowed**](#arehostobjectsallowed) (default **True**). Pass `UseDeferredInvoke:=True` if the page may call back during a BASIC operation, then accept that you cannot return values to the page.
- **Posting messages** — [**PostWebMessage**](#postwebmessage) sends a value to the page, where it shows up via `window.chrome.webview.addEventListener('message', …)`. The page replies with `window.chrome.webview.postMessage(…)`, which fires the [**JsMessage**](#jsmessage) event. Requires [**IsWebMessageEnabled**](#iswebmessageenabled) (default **True**).
- **Executing script** — [**JsRun**](#jsrun) calls a named JavaScript function and waits for the result, [**JsRunAsync**](#jsrunasync) calls one and fires [**JsAsyncResult**](#jsasyncresult) when the result arrives, [**JsProp**](#jsprop) evaluates an expression like `document.title`, and [**ExecuteScript**](#executescript) fires-and-forgets.

## Intercepting requests

To rewrite, mock, or simply observe HTTP traffic from the page, register a URL filter with [**AddWebResourceRequestedFilter**](#addwebresourcerequestedfilter) and handle [**WebResourceRequested**](#webresourcerequested). The event arguments expose a [**WebView2Request**](../WebView2Request) (read-only metadata, mutable body) and a [**WebView2Response**](../WebView2Response) — assign **StatusCode**, **ReasonPhrase**, **Headers**, and content to the response object to short-circuit the network fetch; leave it untouched to let the runtime proceed normally.

Properties
----------

The control inherits the standard size, layout, and focus surface from `BaseControlFocusableNoFont`. The bulk of the WebView2-specific surface is split between settings that map to the Edge runtime, capability-flags that probe the loaded runtime version, and runtime-only state.

### AdditionalAllowedFrameAncestors
{: .no_toc }

Additional `Content-Security-Policy: frame-ancestors` directives allowed when this control hosts the page. **String**. Default: empty. Applies on the next navigation; effective only on runtimes that implement `ICoreWebView2NavigationStartingEventArgs2`.

### Anchors
{: .no_toc }

The container-edge anchors that drive automatic resizing when the parent **Form** is resized. Inherited from `BaseControlRectDockable`.

### AreBrowserAcceleratorKeysEnabled
{: .no_toc }

Whether Edge's built-in accelerator keys are active — **F5** to reload, **Ctrl+P** to print, **Ctrl+F** to find in page, and so on. **Boolean**, default **True**. Requires [**SupportsAcceleratorKeysFeatures**](#supportsacceleratorkeysfeatures).

### AreDefaultContextMenusEnabled
{: .no_toc }

Whether Edge's right-click context menu is shown. **Boolean**, default **True**. Set to **False** and handle [**UserContextMenu**](#usercontextmenu) to draw your own menu.

### AreDefaultScriptDialogsEnabled
{: .no_toc }

Whether Edge shows its own dialogs for `alert()`, `confirm()`, `prompt()`, and the `beforeunload` confirmation. **Boolean**, default **True**. Set to **False** and handle [**ScriptDialogOpening**](#scriptdialogopening) to provide your own.

### AreDevToolsEnabled
{: .no_toc }

Whether the user can open the DevTools window from the context menu or by keyboard shortcut. **Boolean**, default **True**. Independent of [**OpenDevToolsWindow**](#opendevtoolswindow), which always works.

### AreHostObjectsAllowed
{: .no_toc }

Whether host BASIC objects can be exposed to the page through [**AddObject**](#addobject). **Boolean**, default **True**.

### BackColor
{: .no_toc }

The colour painted behind the WebView2 surface while it is still loading and in design mode. **OLE_COLOR**, default `&HA0BD95` (a pale green). Once the page is rendered, Edge owns the visible pixels.

### BrowserProcessId
{: .no_toc }

The Win32 process ID of the external `msedgewebview2.exe` host process. **Long**. Read-only. Available after [**Ready**](#ready).

### CanGoBack
{: .no_toc }

Whether the browsing history has an entry behind the current document. **Boolean**. Read-only. Available after [**Ready**](#ready).

### CanGoForward
{: .no_toc }

Whether the browsing history has an entry ahead of the current document. **Boolean**. Read-only. Available after [**Ready**](#ready).

### CausesValidation
{: .no_toc }

Whether moving focus into the control fires the **Validate** event on the previously focused control. **Boolean**, default **True**. Inherited.

### Container
{: .no_toc }

The parent **Form** / **Frame** / **PictureBox** / **UserControl** that hosts this control. Inherited.

### ControlType
{: .no_toc }

Always **vbWebView2** ([**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants)). Read-only. Inherited.

### DocumentTitle
{: .no_toc }

The current document's `<title>` text. **String**. Read-only. Updated each time the page changes its title — the [**DocumentTitleChanged**](#documenttitlechanged) event fires on every update.

### DocumentURL
{: .no_toc }

The current document's URL. **String**. Reading returns the live URL after every navigation; assigning is equivalent to calling [**Navigate**](#navigate). The design-time default is `https://www.twinbasic.com`, used as the auto-navigation target when [**Ready**](#ready) fires.

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor during a manual drag from this control. Inherited.

### DragMode
{: .no_toc }

How drag-and-drop is initiated. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1). Inherited.

### Enabled
{: .no_toc }

Whether the control accepts user input. **Boolean**, default **True**. Inherited.

### EnvironmentOptions
{: .no_toc }

The [**WebView2EnvironmentOptions**](EnvironmentOptions) object that configures the WebView2 environment — user-data folder, executable folder, locale, tracking-prevention, single-sign-on, and additional command-line arguments. The control auto-creates one on initialization; assign to its fields before or during the [**Create**](#create) event for them to take effect.

### Height
{: .no_toc }

The control's height. **Single**. Inherited.

### hWnd
{: .no_toc }

The Win32 window handle of the *container* window that hosts the WebView2 surface — not the HWND of the Edge browser tab itself, which lives in a separate process. **LongPtr**. Read-only. Overrides the inherited definition.

### Index
{: .no_toc }

The control-array index when the control is part of an array. **Long**. Read-only. Inherited.

### IsBuiltInErrorPageEnabled
{: .no_toc }

Whether Edge's default error pages (e.g. *Hmm, can't reach this page*) are shown. **Boolean**, default **True**.

### IsDefaultDownloadDialogOpen
{: .no_toc }

Whether the built-in Edge download manager dialog is currently visible. **Boolean**. Read-only. Requires [**SupportsDownloadDialogFeatures**](#supportsdownloaddialogfeatures).

### IsDocumentPlayingAudio
{: .no_toc }

Whether the current document is producing audio. **Boolean**. Read-only. Requires [**SupportsAudioFeatures**](#supportsaudiofeatures).

### IsGeneralAutoFillEnabled
{: .no_toc }

Whether Edge offers to save and autofill non-password form values (addresses, phone numbers, …). **Boolean**, default **True**. Requires [**SupportsAutoFillFeatures**](#supportsautofillfeatures).

### IsMuted
{: .no_toc }

Whether the document's audio is muted. **Boolean**, default **False**. Requires [**SupportsAudioFeatures**](#supportsaudiofeatures).

### IsPasswordAutoSaveEnabled
{: .no_toc }

Whether Edge offers to save passwords typed into the page. **Boolean**, default **True**. Requires [**SupportsAutoFillFeatures**](#supportsautofillfeatures).

### IsPinchZoomEnabled
{: .no_toc }

Whether pinch gestures on touch hardware change the zoom factor. **Boolean**, default **True**. Requires [**SupportsPinchZoomFeatures**](#supportspinchzoomfeatures).

### IsScriptEnabled
{: .no_toc }

Whether JavaScript runs in the page. **Boolean**, default **True**. Disabling also disables every JavaScript-interop feature on the control.

### IsStatusBarEnabled
{: .no_toc }

Whether Edge shows its built-in status bar for hovered links. **Boolean**, default **True**.

### IsSuspended
{: .no_toc }

Whether the WebView2 processing pipeline has been paused by a [**Suspend**](#suspend) call. **Boolean**. Read-only. Requires [**SupportsSuspendResumeFeatures**](#supportssuspendresumefeatures).

### IsSwipeNavigationEnabled
{: .no_toc }

Whether horizontal swipe gestures on touch hardware navigate back / forward in history. **Boolean**, default **True**. Requires [**SupportsSwipeNavigationFeatures**](#supportsswipenavigationfeatures).

### IsWebMessageEnabled
{: .no_toc }

Whether the [**PostWebMessage**](#postwebmessage) bridge and the [**JsMessage**](#jsmessage) event are active. **Boolean**, default **True**.

### IsZoomControlEnabled
{: .no_toc }

Whether the user can change the zoom factor with **Ctrl+** mousewheel or **Ctrl+** plus / minus. **Boolean**, default **True**.

### JsCallTimeOutSeconds
{: .no_toc }

How long [**JsRun**](#jsrun) and [**JsProp**](#jsprop) wait for a synchronous JavaScript result before raising `RPC_E_TIMEOUT`. **Double** seconds; `0` (default) waits indefinitely.

### Left
{: .no_toc }

The control's horizontal position within its container. **Double**. Inherited.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom**. Inherited.

### MousePointer
{: .no_toc }

The mouse cursor over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants). Inherited.

### Name
{: .no_toc }

The design-time name. **String**. Read-only at runtime. Inherited.

### SupportsAcceleratorKeysFeatures
{: .no_toc }

Whether the loaded WebView2 runtime supports the accelerator-key settings — i.e. exposes `ICoreWebView2Settings3`. **Boolean**. Read-only.

### SupportsAudioFeatures
{: .no_toc }

Whether the loaded runtime supports the audio settings — i.e. exposes `ICoreWebView2_8`. **Boolean**. Read-only.

### SupportsAutoFillFeatures
{: .no_toc }

Whether the loaded runtime supports the autofill settings — i.e. exposes `ICoreWebView2Settings4`. **Boolean**. Read-only.

### SupportsDownloadDialogFeatures
{: .no_toc }

Whether the loaded runtime supports controlling the download dialog — i.e. exposes `ICoreWebView2_9`. **Boolean**. Read-only.

### SupportsFolderMappingFeatures
{: .no_toc }

Whether the loaded runtime supports virtual-host-to-folder mapping — i.e. exposes `ICoreWebView2_5`. **Boolean**. Read-only.

### SupportsNavigateCustomFeatures
{: .no_toc }

Whether the loaded runtime supports the custom-request navigation feature used by [**NavigateCustom**](#navigatecustom) — i.e. exposes `ICoreWebView2_2`. **Boolean**. Read-only.

### SupportsPdfFeatures
{: .no_toc }

Whether the loaded runtime supports [**PrintToPdf**](#printtopdf) — i.e. exposes `ICoreWebView2_7`. **Boolean**. Read-only.

### SupportsPinchZoomFeatures
{: .no_toc }

Whether the loaded runtime supports the pinch-zoom setting — i.e. exposes `ICoreWebView2Settings5`. **Boolean**. Read-only.

### SupportsSuspendResumeFeatures
{: .no_toc }

Whether the loaded runtime supports [**Suspend**](#suspend) / [**Resume**](#resume) — i.e. exposes `ICoreWebView2_3`. **Boolean**. Read-only.

### SupportsSwipeNavigationFeatures
{: .no_toc }

Whether the loaded runtime supports the swipe-navigation setting — i.e. exposes `ICoreWebView2Settings6`. **Boolean**. Read-only.

### SupportsTaskManagerFeatures
{: .no_toc }

Whether the loaded runtime supports [**OpenTaskManagerWindow**](#opentaskmanagerwindow) — i.e. exposes `ICoreWebView2_6`. **Boolean**. Read-only.

### SupportsUserAgentFeatures
{: .no_toc }

Whether the loaded runtime supports the [**UserAgent**](#useragent) setting — i.e. exposes `ICoreWebView2Settings2`. **Boolean**. Read-only.

### TabIndex
{: .no_toc }

The control's position in the form's TAB-key navigation order. **Long**. Inherited.

### TabStop
{: .no_toc }

Whether the user can reach the control with the **TAB** key. **Boolean**, default **True**. Inherited.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Inherited.

### Top
{: .no_toc }

The control's vertical position within its container. **Double**. Inherited.

### UseDeferredEvents
{: .no_toc }

Whether the re-entrant runtime events ([**PermissionRequested**](#permissionrequested), [**NavigationStarting**](#navigationstarting), [**WebResourceRequested**](#webresourcerequested), [**ScriptDialogOpening**](#scriptdialogopening), [**DownloadStarting**](#downloadstarting), [**NewWindowRequested**](#newwindowrequested)) are deferred onto the BASIC message-loop before they fire. **Boolean**, default **True**. See [Deferred events](#deferred-events).

### UserAgent
{: .no_toc }

The `User-Agent` string Edge sends with each HTTP request. **String**. Setting it persists for the lifetime of the environment. Requires [**SupportsUserAgentFeatures**](#supportsuseragentfeatures).

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**. Inherited.

### Width
{: .no_toc }

The control's width. **Single**. Inherited.

### ZoomFactor
{: .no_toc }

The current zoom factor — `1.0` is 100%, `1.5` is 150%, and so on. **Double**. The design-time default is `0`, which means "do not override Edge's default of 1.0".

> [!NOTE]
> Because the design-time default is `0`, not `1.0`, arithmetic that multiplies the current value silently starts from zero unless the host clamps it to `1` first:
>
> ```tb
> If WebView21.ZoomFactor = 0 Then WebView21.ZoomFactor = 1
> WebView21.ZoomFactor *= 1.1   ' 110% on first click, 121% on second, …
> ```

Methods
-------

### AddObject
{: .no_toc }

Exposes a BASIC COM object to the page under `chrome.webview.hostObjects.<ObjName>`. The page can read and write its properties and call its methods as ordinary JavaScript objects.

Syntax: *object*.**AddObject** *ObjName*, *Object* [, *UseDeferredInvoke* ]

*ObjName*
: *required* A **String** name for the page to reference the object under.

*Object*
: *required* An **Object** to publish.

*UseDeferredInvoke*
: *optional* A **Boolean**, default **False**. When **True**, calls from the page are deferred onto the BASIC message-loop — safe to re-enter the WebView2 control from within them, but the page cannot read a return value back. Use **False** when the page needs to read return values.

```tb
Private Sub WebView21_Ready()
    WebView21.AddObject "myCalculator", New MyCalculator
End Sub

Class MyCalculator
    Public Function MultiplyByTen(ByVal Value As Long) As Long
        Return Value * 10
    End Function
End Class
```

```js
async function callHostCalculator() {
    let result = await chrome.webview.hostObjects.myCalculator.MultiplyByTen(7);
    alert("BASIC returned: " + result);   //  -> 70
}
```

Calls into the host object are asynchronous on the JavaScript side and must be `await`-ed inside an `async` function — even when *UseDeferredInvoke* is **False**. See the [Re-entrancy](../../../../Tutorials/WebView2/Re-entrancy) tutorial for when to pass **True**.

### AddScriptToExecuteOnDocumentCreated
{: .no_toc }

Registers a JavaScript snippet to be run automatically at the top of every new document the WebView2 navigates to. Takes effect on the *next* navigation — does not affect the page currently loaded.

Syntax: *object*.**AddScriptToExecuteOnDocumentCreated** *jsCode*

*jsCode*
: *required* A **String** containing the JavaScript code to inject.

### AddWebResourceRequestedFilter
{: .no_toc }

Registers a URL pattern. Requests whose URI matches the pattern fire the [**WebResourceRequested**](#webresourcerequested) event so the host can observe or override them.

Syntax: *object*.**AddWebResourceRequestedFilter** *sFilter*, *FilterContext*

*sFilter*
: *required* A **String** URL pattern. `*` and `?` are wildcards.

*FilterContext*
: *required* A member of [**wv2WebResourceContext**](../Enumerations/wv2WebResourceContext) restricting matches to a particular resource kind.

### CallDevToolsProtocolMethod
{: .no_toc }

Sends a Chrome DevTools Protocol message to the running Edge instance. When *CustomEventId* is provided, the runtime's reply fires the [**DevToolsProtocolResponse**](#devtoolsprotocolresponse) event carrying the same *CustomEventId* and the JSON response.

Syntax: *object*.**CallDevToolsProtocolMethod** *MethodName*, *ParamsAsJson* [, *CustomEventId* ]

*MethodName*
: *required* A **String** like `"Emulation.setScriptExecutionDisabled"`.

*ParamsAsJson*
: *required* A **String** with the JSON-encoded parameter object.

*CustomEventId*
: *optional* A **Variant** echoed back on [**DevToolsProtocolResponse**](#devtoolsprotocolresponse). When omitted, the reply is discarded.

### ClearVirtualHostNameToFolderMapping
{: .no_toc }

Removes a virtual hostname → local-folder mapping previously installed by [**SetVirtualHostNameToFolderMapping**](#setvirtualhostnametofoldermapping).

Syntax: *object*.**ClearVirtualHostNameToFolderMapping** *hostName*

*hostName*
: *required* A **String** matching the hostname passed to **SetVirtualHostNameToFolderMapping**.

Requires [**SupportsFolderMappingFeatures**](#supportsfoldermappingfeatures).

### CloseDefaultDownloadDialog
{: .no_toc }

Hides the built-in Edge download manager dialog.

Syntax: *object*.**CloseDefaultDownloadDialog**

Requires [**SupportsDownloadDialogFeatures**](#supportsdownloaddialogfeatures).

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation. Inherited.

Syntax: *object*.**Drag** [ *Action* ]

### ExecuteScript
{: .no_toc }

Evaluates JavaScript in the page without waiting for it to finish and without surfacing its result. Use [**JsRun**](#jsrun) or [**JsRunAsync**](#jsrunasync) when you need the value.

Syntax: *object*.**ExecuteScript** *jsCode*

*jsCode*
: *required* A **String** of JavaScript to evaluate in the page's global scope.

### GoBack
{: .no_toc }

Navigates one entry back in the browsing history. Silently does nothing when [**CanGoBack**](#cangoback) is **False**.

Syntax: *object*.**GoBack**

### GoForward
{: .no_toc }

Navigates one entry forward in the browsing history. Silently does nothing when [**CanGoForward**](#cangoforward) is **False**.

Syntax: *object*.**GoForward**

### JsProp
{: .no_toc }

Evaluates a JavaScript expression and returns the result synchronously — convenient for property reads like `document.title`. Waits up to [**JsCallTimeOutSeconds**](#jscalltimeoutseconds) for the result.

Syntax: *object*.**JsProp** ( *PropName* ) **As Variant**

*PropName*
: *required* A **String** containing the expression to evaluate.

Returns the result decoded from the JSON the runtime hands back — **Boolean**, **Double**, **String**, **Null**, or **Empty** (for `undefined`). Object and array results are not yet supported — accessing them raises run-time error 5.

### JsRun
{: .no_toc }

Calls a named JavaScript function with the given arguments and returns the result synchronously. Waits up to [**JsCallTimeOutSeconds**](#jscalltimeoutseconds) for the result.

Syntax: *object*.**JsRun** ( *FuncName*, [ *args* ] ) **As Variant**

*FuncName*
: *required* A **String** naming the JavaScript function — e.g. `"document.querySelector"`.

*args*
: *optional* Any number of **Variant** arguments. Each is JSON-encoded before being passed to the function. Strings, numerics, **Boolean**, **Null**, and **Empty** are supported.

```tb
' Calls the page-side function `multiplyTheseNumbers(a, b)` and waits for the result.
Dim product As Long = WebView21.JsRun("multiplyTheseNumbers", 5, 6)
Debug.Print product   ' 30
```

### JsRunAsync
{: .no_toc }

Calls a named JavaScript function asynchronously and returns immediately with a token. When the result arrives, [**JsAsyncResult**](#jsasyncresult) fires carrying the same token.

Syntax: *object*.**JsRunAsync** ( *FuncName*, [ *args* ] ) **As LongLong**

*FuncName*
: *required* A **String** naming the JavaScript function.

*args*
: *optional* Any number of **Variant** arguments, JSON-encoded as in [**JsRun**](#jsrun).

```tb
Private Sub btnRun_Click()
    WebView21.JsRunAsync "multiplyTheseNumbers", 5, 6
End Sub

Private Sub WebView21_JsAsyncResult( _
        ByVal Result As Variant, Token As LongLong, ErrString As String)
    If LenB(ErrString) = 0 Then
        Debug.Print "Async result: "; Result
    Else
        Debug.Print "Async error: "; ErrString
    End If
End Sub
```

### Move
{: .no_toc }

Repositions and resizes the control in a single call. Inherited.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

### MoveFocus
{: .no_toc }

Hands keyboard focus to the underlying WebView2 surface so that subsequent keystrokes are dispatched into the page. Distinct from the inherited [**SetFocus**](#setfocus), which focuses the host control window.

Syntax: *object*.**MoveFocus**

### Navigate
{: .no_toc }

Loads a URL into the WebView2. Fires [**NavigationStarting**](#navigationstarting) and then [**NavigationComplete**](#navigationcomplete). If the URI has no protocol prefix, `https://` is added automatically.

Syntax: *object*.**Navigate** *uri*

*uri*
: *required* A **String** URI such as `"https://www.twinbasic.com"` or `"file:///C:/page.html"`.

```tb
Private Sub AddressBar_KeyDown(KeyCode As Integer, Shift As Integer)
    If KeyCode = vbKeyReturn Then WebView21.Navigate AddressBar.Text
End Sub

Private Sub WebView21_NavigationComplete( _
        ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    btnBack.Enabled = WebView21.CanGoBack
    btnForward.Enabled = WebView21.CanGoForward
End Sub
```

### NavigateCustom
{: .no_toc }

Navigates with an arbitrary HTTP method, optional headers, and an optional request body — useful for POST navigation or attaching authorization headers up front. Fires [**NavigationStarting**](#navigationstarting) and [**NavigationComplete**](#navigationcomplete).

Syntax: *object*.**NavigateCustom** *uri*, *method* [, *headers* [, *postData* [, *postDataAsUTF8* ] ] ]

*uri*
: *required* A **String** URI. As with [**Navigate**](#navigate), a missing protocol prefix is patched to `https://`.

*method*
: *required* A **String** HTTP method — `"GET"`, `"POST"`, …

*headers*
: *optional* A **String** of `vbCrLf`-delimited `Header: value` lines.

*postData*
: *optional* A **Variant** carrying the body — a **String** (encoded according to *postDataAsUTF8*) or a **Byte()** array (used verbatim).

*postDataAsUTF8*
: *optional* A **Boolean**, default **True**. When **True** and *postData* is a **String**, the string is UTF-8-encoded before being sent.

Requires [**SupportsNavigateCustomFeatures**](#supportsnavigatecustomfeatures).

### NavigateToString
{: .no_toc }

Loads an HTML string directly into the WebView2 as if it were the body of an HTTP response — useful for splash screens, generated reports, or about pages. Fires [**NavigationStarting**](#navigationstarting) and [**NavigationComplete**](#navigationcomplete).

Syntax: *object*.**NavigateToString** *htmlContent*

*htmlContent*
: *required* A **String** of HTML source.

```tb
WebView21.NavigateToString "<h1>Hello, world!</h1>"
```

### OpenDefaultDownloadDialog
{: .no_toc }

Shows the built-in Edge download manager dialog.

Syntax: *object*.**OpenDefaultDownloadDialog**

Requires [**SupportsDownloadDialogFeatures**](#supportsdownloaddialogfeatures).

### OpenDevToolsWindow
{: .no_toc }

Opens the DevTools window for the page in a separate Edge window. Works independently of [**AreDevToolsEnabled**](#aredevtoolsenabled), which only governs the user-initiated path.

Syntax: *object*.**OpenDevToolsWindow**

### OpenTaskManagerWindow
{: .no_toc }

Opens Edge's browser-task manager window listing the renderer processes used by the control.

Syntax: *object*.**OpenTaskManagerWindow**

Requires [**SupportsTaskManagerFeatures**](#supportstaskmanagerfeatures).

### PostWebMessage
{: .no_toc }

Posts a value to the page. The page receives it via a `message` event on `window.chrome.webview`. **Strings** are delivered as JavaScript strings; every other type is JSON-encoded before being sent.

Syntax: *object*.**PostWebMessage** *Message*

*Message*
: *required* A **Variant** value to send.

Requires [**IsWebMessageEnabled**](#iswebmessageenabled).

```tb
WebView21.PostWebMessage "Hello from twinBASIC!"

Private Sub WebView21_JsMessage(ByVal Message As Variant)
    Debug.Print "Reply from page: "; Message
End Sub
```

```js
window.chrome.webview.addEventListener('message', (e) => {
    alert("Host sent: " + e.data);
    window.chrome.webview.postMessage("Thanks, twinBASIC!");
});
```

### PostWebMessageJSON
{: .no_toc }

Posts a literal JSON string to the page without re-encoding it — useful when the caller already has serialised JSON.

Syntax: *object*.**PostWebMessageJSON** *jsonString*

*jsonString*
: *required* A **String** of valid JSON.

Requires [**IsWebMessageEnabled**](#iswebmessageenabled).

### PrintToPdf
{: .no_toc }

Saves the current document to a PDF file. The work happens asynchronously — the result surfaces through [**PrintToPdfCompleted**](#printtopdfcompleted) or [**PrintToPdfFailed**](#printtopdffailed). Requires [**SupportsPdfFeatures**](#supportspdffeatures).

Syntax: *object*.**PrintToPdf** *outputPath* [, *Orientation* [, *ScaleFactor* [, *PageWidth* [, *PageHeight* [, *MarginTop* [, *MarginBottom* [, *MarginLeft* [, *MarginRight* [, *ShouldPrintBackgrounds* [, *ShouldPrintSelectionOnly* [, *ShouldPrintHeaderAndFooter* [, *HeaderTitle* [, *FooterUri* ] ] ] ] ] ] ] ] ] ] ] ] ]

*outputPath*
: *required* A **String** absolute path to the PDF file to write.

*Orientation*
: *optional* A member of [**wv2PrintOrientation**](../Enumerations/wv2PrintOrientation). Default **wv2PrintPortrait**.

*ScaleFactor*, *PageWidth*, *PageHeight*, *MarginTop*, *MarginBottom*, *MarginLeft*, *MarginRight*
: *optional* **Double**s describing the page layout. Omit any of them to use the runtime defaults.

*ShouldPrintBackgrounds*
: *optional* A **Boolean**, default **False**.

*ShouldPrintSelectionOnly*
: *optional* A **Boolean**, default **False**.

*ShouldPrintHeaderAndFooter*
: *optional* A **Boolean**, default **True**.

*HeaderTitle*, *FooterUri*
: *optional* **String**s overriding the default header title and footer URI.

```tb
Private Sub btnSave_Click()
    WebView21.PrintToPdf Environ$("USERPROFILE") & "\Documents\page.pdf"
End Sub

Private Sub WebView21_PrintToPdfCompleted()
    MsgBox "PDF saved.", vbInformation
End Sub
```

### Reload
{: .no_toc }

Reloads the current document — equivalent to pressing **F5**.

Syntax: *object*.**Reload**

### RemoveObject
{: .no_toc }

Removes a host object previously published with [**AddObject**](#addobject).

Syntax: *object*.**RemoveObject** *ObjName*

*ObjName*
: *required* A **String** matching the name passed to **AddObject**.

### RemoveWebResourceRequestedFilter
{: .no_toc }

Removes a URL filter previously registered with [**AddWebResourceRequestedFilter**](#addwebresourcerequestedfilter). Pass the same *sFilter* and *FilterContext* values used to register it.

Syntax: *object*.**RemoveWebResourceRequestedFilter** *sFilter*, *FilterContext*

*sFilter*
: *required* A **String** URL pattern.

*FilterContext*
: *required* A member of [**wv2WebResourceContext**](../Enumerations/wv2WebResourceContext).

### Resume
{: .no_toc }

Resumes a previously suspended WebView2 pipeline. Fires no event — read [**IsSuspended**](#issuspended) afterwards to confirm.

Syntax: *object*.**Resume**

Requires [**SupportsSuspendResumeFeatures**](#supportssuspendresumefeatures).

### SetFocus
{: .no_toc }

Moves the input focus to the host control. Inherited. To focus the *page* surface so keystrokes reach JavaScript, use [**MoveFocus**](#movefocus) instead.

Syntax: *object*.**SetFocus**

### SetVirtualHostNameToFolderMapping
{: .no_toc }

Maps a virtual hostname to a local folder so that a page can reference local files through HTTPS URLs — e.g. `https://app.local/index.html` resolves to `C:\MyApp\html\index.html`. Useful for hosting local assets without setting up an HTTP server.

Syntax: *object*.**SetVirtualHostNameToFolderMapping** *hostName*, *folderPath* [, *accessKind* ]

*hostName*
: *required* A **String** virtual hostname.

*folderPath*
: *required* A **String** local folder path.

*accessKind*
: *optional* A member of [**wv2HostResourceAccessKind**](../Enumerations/wv2HostResourceAccessKind). Default **wv2ResourceAllow**.

> [!NOTE]
> Pick the *hostName* carefully — certain DNS-resolvable hostnames cause a 2-second resolution stall before the local override kicks in. See [WebView2Feedback#2381](https://github.com/MicrosoftEdge/WebView2Feedback/issues/2381).

Requires [**SupportsFolderMappingFeatures**](#supportsfoldermappingfeatures).

```tb
Private Sub WebView21_Ready()
    Dim folderPath As String = Environ$("USERPROFILE") & "\Documents\MyApp"
    WebView21.SetVirtualHostNameToFolderMapping _
        "myapp.example", folderPath & "\", wv2ResourceAllow
    WebView21.Navigate "https://myapp.example/index.html"
End Sub
```

See the [Hosting local web assets](../../../../Tutorials/WebView2/Hosting-Local-Web-Assets) tutorial for the matching pattern of bundling the assets through the project's `Resources` folder.

### Suspend
{: .no_toc }

Pauses the WebView2 pipeline so the browser process can free memory — useful for application-style tab management. Read [**IsSuspended**](#issuspended) afterwards to confirm; the runtime hides the control while suspended.

Syntax: *object*.**Suspend**

Requires [**SupportsSuspendResumeFeatures**](#supportssuspendresumefeatures).

### ZOrder
{: .no_toc }

Brings the control to the front or back of its sibling stack. Inherited.

Syntax: *object*.**ZOrder** [ *Position* ]

Events
------

### AcceleratorKeyPressed
{: .no_toc }

Raised when Edge detects an accelerator-style keystroke — e.g. **F1**, **Alt+**, **Ctrl+**. Set *IsHandled* to **True** to swallow the keystroke so Edge doesn't act on it. Always synchronous: cannot be deferred.

Syntax: *object*\_**AcceleratorKeyPressed**( *KeyState* **As** [**wv2KeyEventKind**](../Enumerations/wv2KeyEventKind), *IsExtendedKey* **As Boolean**, *WasKeyDown* **As Boolean**, *IsKeyReleased* **As Boolean**, *IsMenuKeyDown* **As Boolean**, *RepeatCount* **As Long**, *ScanCode* **As Long**, *IsHandled* **As Boolean** )

The flags are the contents of the Win32 `WM_KEYDOWN` / `WM_KEYUP` *lParam* — see [**COREWEBVIEW2_PHYSICAL_KEY_STATUS**](../Types/COREWEBVIEW2_PHYSICAL_KEY_STATUS) for the full breakdown.

### Create
{: .no_toc }

Raised after the container window exists but before the WebView2 environment is built. The host's last chance to populate [**EnvironmentOptions**](#environmentoptions).

Syntax: *object*\_**Create**( )

### DevToolsProtocolResponse
{: .no_toc }

Raised when a previously sent [**CallDevToolsProtocolMethod**](#calldevtoolsprotocolmethod) call returns. Carries the *CustomEventId* supplied at the call site and the JSON-encoded response.

Syntax: *object*\_**DevToolsProtocolResponse**( *CustomEventId* **As Variant**, *JsonResponse* **As String** )

### DocumentTitleChanged
{: .no_toc }

Raised when the document changes its title — typically right after a navigation, but also when client-side JavaScript writes to `document.title`. Read [**DocumentTitle**](#documenttitle) for the new value.

Syntax: *object*\_**DocumentTitleChanged**( )

### DOMContentLoaded
{: .no_toc }

Raised when the page reaches the `DOMContentLoaded` lifecycle event — the DOM tree is built and JavaScript can safely walk it, but external resources may still be loading.

Syntax: *object*\_**DOMContentLoaded**( )

### DownloadStarting
{: .no_toc }

Raised when the user (or the page) starts a file download. Set *Cancel* to **True** to suppress the download; set *Handled* to **True** to suppress the runtime's default download UI when you intend to manage progress yourself. Modify *ResultFilePath* to redirect the download to a different path. Can be deferred — see [Deferred events](#deferred-events).

Syntax: *object*\_**DownloadStarting**( *ResultFilePath* **As String**, *Cancel* **As Boolean**, *Handled* **As Boolean** )

### Error
{: .no_toc }

Raised when the WebView2 environment or controller fails to initialise — most commonly because the Edge WebView2 runtime isn't installed, the user-data folder isn't writable, or the fixed-version folder is incorrect.

Syntax: *object*\_**Error**( *code* **As Long**, *msg* **As String** )

> [!NOTE]
> Code `&H80070002` (`ERROR_FILE_NOT_FOUND`) is the canonical signal that the WebView2 Evergreen runtime is missing from the machine — the right cue to prompt the user to install it.

```tb
Private Sub WebView21_Error(ByVal code As Long, ByVal msg As String)
    Const ERROR_FILE_NOT_FOUND As Long = &H80070002
    If code = ERROR_FILE_NOT_FOUND Then
        MsgBox "The WebView2 (Evergreen) runtime is not installed on this machine.", _
               vbExclamation, "WebView2"
    Else
        MsgBox "WebView2 error " & Hex$(code) & ": " & msg, _
               vbExclamation, "WebView2"
    End If
End Sub
```

### JsAsyncResult
{: .no_toc }

Raised when an earlier [**JsRunAsync**](#jsrunasync) call returns. *Token* is the value returned by **JsRunAsync** so the handler can pair replies with calls; *ErrString* is a description of any runtime error, or an empty string on success.

Syntax: *object*\_**JsAsyncResult**( *Result* **As Variant**, *Token* **As LongLong**, *ErrString* **As String** )

### JsMessage
{: .no_toc }

Raised when JavaScript on the page calls `window.chrome.webview.postMessage(value)`. Requires [**IsWebMessageEnabled**](#iswebmessageenabled).

Syntax: *object*\_**JsMessage**( *Message* **As Variant** )

### NavigationComplete
{: .no_toc }

Raised after a navigation finishes — successfully or otherwise. Inspect *IsSuccess* first; if **False**, *WebErrorStatus* is a member of [**wv2ErrorStatus**](../Enumerations/wv2ErrorStatus).

Syntax: *object*\_**NavigationComplete**( *IsSuccess* **As Boolean**, *WebErrorStatus* **As Long** )

### NavigationStarting
{: .no_toc }

Raised before each navigation begins. Set *Cancel* to **True** to block the navigation; modify *RequestHeaders* to alter the HTTP request the runtime is about to send. Can be deferred — see [Deferred events](#deferred-events).

Syntax: *object*\_**NavigationStarting**( *Uri* **As String**, *IsUserInitiated* **As Boolean**, *IsRedirected* **As Boolean**, *RequestHeaders* **As** [**WebView2RequestHeaders**](../WebView2RequestHeaders), *Cancel* **As Boolean** )

```tb
' Block any navigation to a URL outside our own virtual host.
Private Sub WebView21_NavigationStarting( _
        ByVal Uri As String, ByVal IsUserInitiated As Boolean, _
        ByVal IsRedirected As Boolean, _
        ByVal RequestHeaders As WebView2RequestHeaders, _
        Cancel As Boolean)
    If Not (Uri Like "https://myapp.example/*" Or Uri = "about:blank") Then
        MsgBox "External link blocked: " & Uri
        Cancel = True
    End If
End Sub
```

### NewWindowRequested
{: .no_toc }

Raised when the page tries to open a new window — via `window.open(…)`, `target="_blank"`, **Ctrl+** click, and so on. Set *IsHandled* to **True** to suppress the default behaviour (which opens a fresh Edge window) so the application can host the new content itself. The window-features arguments describe what the page asked for. Can be deferred — see [Deferred events](#deferred-events).

Syntax: *object*\_**NewWindowRequested**( *IsUserInitiated* **As Boolean**, *IsHandled* **As Boolean**, *Uri* **As String**, *HasPosition* **As Long**, *HasSize* **As Long**, *Left* **As Long**, *Top* **As Long**, *Width* **As Long**, *Height* **As Long**, *ShouldDisplayMenuBar* **As Long**, *ShouldDisplayStatus* **As Long**, *ShouldDisplayToolbar* **As Long**, *ShouldDisplayScrollBars* **As Long** )

### PermissionRequested
{: .no_toc }

Raised when the page asks for permission to use a device or browser capability — camera, microphone, geolocation, notifications, clipboard. Assign *State* to grant ([**wv2StateAllow**](../Enumerations/wv2PermissionState#wv2StateAllow)) or deny ([**wv2StateDeny**](../Enumerations/wv2PermissionState#wv2StateDeny)); leave it at **wv2StateDefault** to let Edge prompt the user. Can be deferred — see [Deferred events](#deferred-events).

Syntax: *object*\_**PermissionRequested**( *IsUserInitiated* **As Boolean**, *State* **As** [**wv2PermissionState**](../Enumerations/wv2PermissionState), *Uri* **As String**, *PermissionKind* **As** [**wv2PermissionKind**](../Enumerations/wv2PermissionKind) )

### PrintToPdfCompleted
{: .no_toc }

Raised when [**PrintToPdf**](#printtopdf) finishes successfully.

Syntax: *object*\_**PrintToPdfCompleted**( )

### PrintToPdfFailed
{: .no_toc }

Raised when [**PrintToPdf**](#printtopdf) fails — e.g. the output path was not writable.

Syntax: *object*\_**PrintToPdfFailed**( )

### ProcessFailed
{: .no_toc }

Raised when one of WebView2's external processes (the browser, renderer, GPU, …) exits unexpectedly. Inspect *Kind* — a [**wv2ProcessFailedKind**](../Enumerations/wv2ProcessFailedKind) — to find out which.

Syntax: *object*\_**ProcessFailed**( *Kind* **As** [**wv2ProcessFailedKind**](../Enumerations/wv2ProcessFailedKind) )

### Ready
{: .no_toc }

Raised once the WebView2 environment, controller, and core view are all live. Until this point most properties and methods raise *"WebView2 control is not ready"*.

Syntax: *object*\_**Ready**( )

### ScriptDialogOpening
{: .no_toc }

Raised when the page tries to open a script dialog — `alert()`, `confirm()`, `prompt()`, or `beforeunload`. Only fires when [**AreDefaultScriptDialogsEnabled**](#aredefaultscriptdialogsenabled) is **False**. Set *Accept* to **True** to accept the dialog (the JavaScript-side equivalent of clicking *OK*); for prompts, update *ResultText* with the text to return. Can be deferred — see [Deferred events](#deferred-events).

Syntax: *object*\_**ScriptDialogOpening**( *ScriptDialogKind* **As** [**wv2ScriptDialogKind**](../Enumerations/wv2ScriptDialogKind), *Accept* **As Boolean**, *ResultText* **As String**, *URI* **As String**, *Message* **As String**, *DefaultText* **As String** )

### SourceChanged
{: .no_toc }

Raised when [**DocumentURL**](#documenturl) changes — typically right after a navigation, but also when client-side script calls `history.pushState(…)`. *IsNewDocument* distinguishes a real navigation (**True**) from a same-document URL change (**False**).

Syntax: *object*\_**SourceChanged**( *IsNewDocument* **As Boolean** )

### SuspendCompleted
{: .no_toc }

Raised when a [**Suspend**](#suspend) request finishes successfully.

Syntax: *object*\_**SuspendCompleted**( )

### SuspendFailed
{: .no_toc }

Raised when a [**Suspend**](#suspend) request fails — typically because the page is still doing something the runtime cannot suspend.

Syntax: *object*\_**SuspendFailed**( )

### UserContextMenu
{: .no_toc }

Raised when the user right-clicks inside the control and [**AreDefaultContextMenusEnabled**](#aredefaultcontextmenusenabled) is **False**, so the application can show its own context menu.

Syntax: *object*\_**UserContextMenu**( *X* **As Single**, *Y* **As Single** )

### WebResourceRequested
{: .no_toc }

Raised when an in-flight HTTP request matches a filter previously registered with [**AddWebResourceRequestedFilter**](#addwebresourcerequestedfilter). Modify *Response* to mock or override the reply; leave it untouched to let the runtime fetch normally. Can be deferred — see [Deferred events](#deferred-events).

Syntax: *object*\_**WebResourceRequested**( *Request* **As** [**WebView2Request**](../WebView2Request), *Response* **As** [**WebView2Response**](../WebView2Response) )

## See Also

- [WebView2EnvironmentOptions](EnvironmentOptions) -- pre-creation environment configuration reached via [**EnvironmentOptions**](#environmentoptions)
- [WebView2 tutorials](../../../../Tutorials/WebView2/) -- installation, re-entrancy, and `UserDataFolder` worked examples
- [vbWebView2](../../VBRUN/Constants/ControlTypeConstants#vbWebView2) -- the **ControlTypeConstants** entry returned by [**ControlType**](#controltype)
