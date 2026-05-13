---
title: CefBrowser
parent: CEF Package
permalink: /tB/Packages/CEF/CefBrowser/
has_toc: false
---

# CefBrowser class
{: .no_toc }

A **CefBrowser** is a twinBASIC control that hosts the Chromium Embedded Framework — drop one onto a [**Form**](../../VB/Form/) and Chromium renders web content inside its rectangle. Application code can navigate to URLs, run JavaScript, exchange messages with the loaded page, register virtual-host folders, and print the document to PDF.

The control spawns a separate browser process the first time it is used in a session and communicates with it across an IPC channel; many properties and methods raise *"CefBrowser control is not ready"* (run-time error 5) when called before the [**Ready**](#ready) event has fired.

```tb
Private Sub Form_Load()
    CefBrowser1.Navigate "https://www.twinbasic.com"
End Sub

Private Sub CefBrowser1_Ready()
    Debug.Print "CEF ready: runtime v" & CefBrowser1.CefMajorVersion
End Sub

Private Sub CefBrowser1_NavigationComplete( _
        ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    Debug.Print "Navigated to: " & CefBrowser1.DocumentURL
End Sub
```

The control inherits the rect-dockable surface (size, layout, **Anchors**, **Dock**) from `BaseControlRectDockable`. It does *not* inherit a focusable layer, so the keyboard / mouse / focus events you might find on [**WebView2**](../../WebView2/WebView2/) are not part of its surface — keystrokes go straight into the page once Chromium has focus.

* TOC
{:toc}

## Lifecycle

A **CefBrowser** control progresses through three distinct phases, each driven by an asynchronous step in the CEF runtime:

| Event                          | When                                                                                                              |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------|
| [**Create**](#create)          | After the container window exists, before the CEF runtime is launched. Last chance to set [**EnvironmentOptions**](#environmentoptions). |
| [**Error**](#error)            | The runtime could not be launched — typically because `libcef.dll` is missing or the user-data folder is locked. |
| [**Ready**](#ready)            | The browser process is live and IPC has connected. The control is now fully functional.                            |

Calling navigation, scripting, or setting accessors before [**Ready**](#ready) raises run-time error 5 with the message *"CefBrowser control is not ready."* Once **Ready** fires, the control auto-navigates to the [**DocumentURL**](#documenturl) field if it has a non-empty value (the design-time default is `https://www.twinbasic.com`).

The first **CefBrowser** to initialise in a process launches the shared browser helper executable; subsequent **CefBrowser** instances share that helper. Closing the last **CefBrowser** does not terminate the helper — it lingers for the life of the host process so that a future control can attach to it without re-launching.

## Deferred startup

By default the control launches the browser helper as soon as the form is loaded (the `WS_VISIBLE` style is set on the host window and the first resize event triggers the helper). Set [**CreateInitialized**](#createinitialized) to **False** before the form loads, then call [**Initialize**](#initialize) at the moment you want the browser to start — useful when several **CefBrowser** controls live on tabs and you want to defer the cost until the tab is shown.

## JavaScript interop

The control offers three families of BASIC ↔ JavaScript bridges:

- **Posting messages** — [**PostWebMessage**](#postwebmessage) sends a value to the page where it surfaces via `window.chrome.webview.addEventListener('message', …)`. The page replies with `window.chrome.webview.postMessage(…)`, which fires the [**JsMessage**](#jsmessage) event.
- **Executing script** — [**JsRun**](#jsrun) calls a named JavaScript function and waits for the result, [**JsRunAsync**](#jsrunasync) calls one and fires [**JsAsyncResult**](#jsasyncresult) when the result arrives, and [**ExecuteScript**](#executescript) fires-and-forgets a snippet without awaiting a result.

Synchronous [**JsRun**](#jsrun) blocks the BASIC thread until the renderer replies — which means that re-entrancy from the page (a JavaScript handler that posts back into BASIC during the call) can cause a UI freeze. Use [**JsRunAsync**](#jsrunasync) whenever the call is non-trivial.

## Mapping virtual hostnames

[**SetVirtualHostNameToFolderMapping**](#setvirtualhostnametofoldermapping) installs a virtual hostname that serves files from a local folder — so the page can `fetch('https://my.app/index.html')` instead of `file:///...` (avoiding the `file://` origin's CORS restrictions). [**ClearVirtualHostNameToFolderMapping**](#clearvirtualhostnametofoldermapping) removes a mapping.

Properties
----------

The control inherits the standard rect-dockable surface from `BaseControlRectDockable` — size, position, **Anchors**, **Dock**, **Container**, the design-time **Name** / **Index** / **Tag**.

### Anchors
{: .no_toc }

The container-edge anchors that drive automatic resizing when the parent **Form** is resized. Inherited from `BaseControlRectDockable`.

### CanGoBack
{: .no_toc }

Whether the browsing history has an entry behind the current document. **Boolean**. Read-only. Available after [**Ready**](#ready).

### CanGoForward
{: .no_toc }

Whether the browsing history has an entry ahead of the current document. **Boolean**. Read-only. Available after [**Ready**](#ready).

### CefMajorVersion
{: .no_toc }

The CEF runtime major-version number selected at compile time (`49`, `109`, or `145`). **Long**. Read-only. Resolves from the `CEF_VERSION` conditional-compilation argument on the compiler-package reference — see [Supported runtimes](../#supported-runtimes).

### Container
{: .no_toc }

The parent **Form** / **Frame** / **PictureBox** / **UserControl** that hosts this control. **Object**. Inherited.

### ControlType
{: .no_toc }

Always **vbCefBrowser** ([**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants)). Read-only. Inherited.

### CreateInitialized
{: .no_toc }

Whether the browser helper is launched automatically when the form first lays the control out. **Boolean**. Default: **True**. Set to **False** in code (or in the property sheet) to defer the launch until [**Initialize**](#initialize) is called.

### DocumentTitle
{: .no_toc }

The current document's `<title>` text. **String**. Read-only. Updated each time the page changes its title — the [**DocumentTitleChanged**](#documenttitlechanged) event fires on every update.

### DocumentURL
{: .no_toc }

The current document's URL. **String**. Reading returns the live URL after every navigation; assigning is equivalent to calling [**Navigate**](#navigate). The design-time default is `https://www.twinbasic.com`, used as the auto-navigation target once [**Ready**](#ready) fires.

### Dock
{: .no_toc }

How the control docks against its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants). Inherited.

### EnvironmentOptions
{: .no_toc }

The [**CefEnvironmentOptions**](EnvironmentOptions) object that configures the runtime — executable folder, user-data folder, log file, log severity. The control auto-creates one on initialization; assign to its fields before or during the [**Create**](#create) event for them to take effect.

### Height
{: .no_toc }

The control's height. **Single**. Inherited.

### hWnd
{: .no_toc }

The Win32 window handle of the *container* window that hosts the CEF surface — not the HWND of the Chromium browser tab itself, which lives in a separate process. **LongPtr**. Read-only.

### Index
{: .no_toc }

The control-array index when the control is part of an array. **Long**. Read-only. Inherited.

### Left
{: .no_toc }

The control's x-position inside its container. **Single**. Inherited.

### Name
{: .no_toc }

The design-time name of the control. **String**. Read-only at run time. Inherited.

### Parent
{: .no_toc }

The **Form** (or other container) that hosts this control. **Object**. Read-only.

### Tag
{: .no_toc }

A user-defined string carried by the control. **String**. Inherited.

### Top
{: .no_toc }

The control's y-position inside its container. **Single**. Inherited.

### UserAgent
{: .no_toc }

The `User-Agent` string Chromium sends with HTTP requests. **String**. Read/write. The design-time default is empty, in which case Chromium uses its built-in user-agent string. Assigning at run time takes effect immediately.

### Visible
{: .no_toc }

Whether the control is visible. **Boolean**, default **True**.

### Width
{: .no_toc }

The control's width. **Single**. Inherited.

### ZoomFactor
{: .no_toc }

The overall page zoom factor, where `1.0` is 100%. **Double**. Default: `1.0` (design-time default; reads as `0.0` until the browser is [**Ready**](#ready)).

> [!NOTE]
> Because the value reads as `0.0` until the browser is ready, arithmetic that multiplies the current value silently starts from zero unless the host clamps it to `1` first:
>
> ```tb
> If CefBrowser1.ZoomFactor = 0 Then CefBrowser1.ZoomFactor = 1
> CefBrowser1.ZoomFactor *= 1.1   ' 110% on first click, 121% on second, …
> ```

Methods
-------

### ClearVirtualHostNameToFolderMapping
{: .no_toc }

Removes a virtual hostname → local-folder mapping previously installed by [**SetVirtualHostNameToFolderMapping**](#setvirtualhostnametofoldermapping).

Syntax: *object*.**ClearVirtualHostNameToFolderMapping** *hostName*

*hostName*
: *required* A **String** matching the hostname passed to **SetVirtualHostNameToFolderMapping**.

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

### Initialize
{: .no_toc }

Launches the browser helper process explicitly. Only needed when [**CreateInitialized**](#createinitialized) is **False**; otherwise the helper starts automatically on the first form-layout pass.

Syntax: *object*.**Initialize**

A second call after the helper is already running is a no-op.

### JsRun
{: .no_toc }

Calls a named JavaScript function with the given arguments and returns the result synchronously. Blocks the BASIC thread until the renderer replies.

Syntax: *object*.**JsRun** ( *FuncName*, [ *args* ] ) **As Variant**

*FuncName*
: *required* A **String** naming the JavaScript function — e.g. `"document.querySelector"`.

*args*
: *optional* Any number of **Variant** arguments. Each is JSON-encoded before being passed to the function.

```tb
' Calls the page-side function `multiplyTheseNumbers(a, b)` and waits for the result.
Dim product As Long = CefBrowser1.JsRun("multiplyTheseNumbers", 5, 6)
Debug.Print product   ' 30
```

> [!WARNING]
> A page-side handler that posts back into BASIC during the call can deadlock the UI. Prefer [**JsRunAsync**](#jsrunasync) for non-trivial calls. See the [Re-entrancy tutorial](../../../../Tutorials/CEF/Re-entrancy) for the full discussion.

### JsRunAsync
{: .no_toc }

Calls a named JavaScript function asynchronously and returns immediately. When the result arrives, [**JsAsyncResult**](#jsasyncresult) fires carrying the result and an error string.

Syntax: *object*.**JsRunAsync** *FuncName*, [ *args* ]

*FuncName*
: *required* A **String** naming the JavaScript function.

*args*
: *optional* Any number of **Variant** arguments, JSON-encoded as in [**JsRun**](#jsrun).

```tb
Private Sub btnRun_Click()
    CefBrowser1.JsRunAsync "multiplyTheseNumbers", 5, 6
End Sub

Private Sub CefBrowser1_JsAsyncResult( _
        ByVal Result As Variant, Token As LongLong, ErrString As String)
    If LenB(ErrString) = 0 Then
        Debug.Print "Async result: "; Result
    Else
        Debug.Print "Async error: "; ErrString
    End If
End Sub
```

If **JsRunAsync** is called before the renderer IPC has connected, the call is queued and dispatched once the connection comes up.

### Move
{: .no_toc }

Repositions and resizes the control in a single call. Inherited.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

### Navigate
{: .no_toc }

Loads a URL into the browser. Fires [**NavigationStarting**](#navigationstarting) and then [**NavigationComplete**](#navigationcomplete). The URI must include the protocol prefix (`http://`, `https://`, `file://`, …) — there is no automatic prefix insertion.

Syntax: *object*.**Navigate** *uri*

*uri*
: *required* A **String** with the full URI to load.

### NavigateToString
{: .no_toc }

Loads the given HTML string as if it had been served from `about:blank`. Fires [**NavigationComplete**](#navigationcomplete) when the document is fully loaded.

Syntax: *object*.**NavigateToString** *html*

*html*
: *required* A **String** containing a full HTML document.

### OpenDevToolsWindow
{: .no_toc }

Opens the Chromium DevTools window for the currently loaded page in a separate top-level window.

Syntax: *object*.**OpenDevToolsWindow**

### PostWebMessage
{: .no_toc }

Sends a value to the page; it surfaces via `window.chrome.webview.addEventListener('message', …)`. The page can reply with `window.chrome.webview.postMessage(…)`, which fires the [**JsMessage**](#jsmessage) event.

Syntax: *object*.**PostWebMessage** *Message*

*Message*
: *required* A **Variant** carrying the value to send. Strings, numbers, **Boolean**, **Null**, and **Empty** are JSON-encoded for the page; objects and arrays are not currently supported.

If **PostWebMessage** is called before the renderer IPC has connected, the call is queued and dispatched once the connection comes up.

### PrintToPdf
{: .no_toc }

Writes the current document to a PDF file. Fires [**PrintToPdfCompleted**](#printtopdfcompleted) on success or [**PrintToPdfFailed**](#printtopdffailed) on failure.

Syntax: *object*.**PrintToPdf** *outputPath* [, *Orientation* [, *ScaleFactor* [, *PageWidth* [, *PageHeight* [, *MarginTop* [, *MarginBottom* [, *MarginLeft* [, *MarginRight* [, *ShouldPrintBackgrounds* [, *ShouldPrintSelectionOnly* [, *ShouldPrintHeaderAndFooter* [, *HeaderTitle* [, *FooterUri* ] ] ] ] ] ] ] ] ] ] ] ] ]

*outputPath*
: *required* A **String** with the destination path. Must be a writable absolute file path. An existing file is overwritten.

*Orientation*
: *optional* A member of [**cefPrintOrientation**](../Enumerations/cefPrintOrientation). Default: **cefPrintPortrait**.

*ScaleFactor*
: *optional* A **Variant** containing the print scaling factor (e.g. `1.0` for 100%). When omitted, the CEF runtime's default is used.

*PageWidth*
: *optional* A **Variant** with the page width in microns. When omitted, the CEF runtime's default is used.

*PageHeight*
: *optional* A **Variant** with the page height in microns. When omitted, the CEF runtime's default is used.

*MarginTop* / *MarginBottom* / *MarginLeft* / *MarginRight*
: *optional* **Variant** values for the page margins in microns. When omitted, the runtime's defaults are used.

*ShouldPrintBackgrounds*
: *optional* A **Boolean** controlling whether CSS background colors and images are included in the output. Default: **False**.

*ShouldPrintSelectionOnly*
: *optional* A **Boolean** that limits the output to the current selection. Default: **False**.

*ShouldPrintHeaderAndFooter*
: *optional* A **Boolean** controlling whether the page header (title) and footer (URL) are rendered. Default: **True**.

*HeaderTitle*
: *optional* A **Variant** **String**. When provided, overrides the document title in the header. Otherwise the document's `<title>` is used.

*FooterUri*
: *optional* A **Variant** **String**. When provided, overrides the URL printed in the footer. Otherwise the live document URL is used.

```tb
Private Sub btnPDF_Click()
    Dim outputPath As String
    outputPath = Environ$("USERPROFILE") & "\Documents\cefDemo.pdf"
    CefBrowser1.PrintToPdf outputPath
End Sub

Private Sub CefBrowser1_PrintToPdfCompleted()
    MsgBox "PDF saved.", vbInformation
End Sub
```

### Reload
{: .no_toc }

Reloads the current document, equivalent to pressing **F5** in the browser.

Syntax: *object*.**Reload**

### SetVirtualHostNameToFolderMapping
{: .no_toc }

Installs a virtual hostname that serves files from a local folder, so the page can reference local content over an `https://` origin instead of `file://`.

Syntax: *object*.**SetVirtualHostNameToFolderMapping** *hostName*, *folderPath*

*hostName*
: *required* A **String** with the hostname to install (e.g. `"my.app"`).

*folderPath*
: *required* A **String** with the absolute path of the folder whose contents should be served under that hostname. Must end with a trailing path separator.

```tb
Private Sub CefBrowser1_Ready()
    CefBrowser1.SetVirtualHostNameToFolderMapping _
        "my.app", App.Path & "\web\"
    CefBrowser1.Navigate "https://my.app/index.html"
End Sub
```

Events
------

### Create
{: .no_toc }

Raised after the container window exists but before the CEF runtime is launched. The host's last chance to populate [**EnvironmentOptions**](#environmentoptions).

Syntax: *object*\_**Create**( )

### DocumentTitleChanged
{: .no_toc }

Raised when the document changes its title — typically right after a navigation, but also when client-side JavaScript writes to `document.title`. Read [**DocumentTitle**](#documenttitle) for the new value.

Syntax: *object*\_**DocumentTitleChanged**( )

### DOMContentLoaded
{: .no_toc }

Raised when the page reaches the `DOMContentLoaded` lifecycle event — the DOM tree is built and JavaScript can safely walk it, but external resources may still be loading.

Syntax: *object*\_**DOMContentLoaded**( )

### Error
{: .no_toc }

Raised when the CEF runtime fails to launch — most commonly because `libcef.dll` was not found at the configured location, or because the user-data folder is locked by another process.

Syntax: *object*\_**Error**( *code* **As Long**, *msg* **As String** )

```tb
Private Sub CefBrowser1_Error(ByVal code As Long, ByVal msg As String)
    MsgBox "CEF error " & Hex$(code) & ": " & msg, vbExclamation, "CEF"
End Sub
```

### JsAsyncResult
{: .no_toc }

Raised when an earlier [**JsRunAsync**](#jsrunasync) call returns. *ErrString* is a description of any runtime error, or an empty string on success.

Syntax: *object*\_**JsAsyncResult**( *Result* **As Variant**, *Token* **As LongLong**, *ErrString* **As String** )

### JsMessage
{: .no_toc }

Raised when JavaScript on the page calls `window.chrome.webview.postMessage(value)`.

Syntax: *object*\_**JsMessage**( *Message* **As Variant** )

```tb
Private Sub CefBrowser1_JsMessage(ByVal Message As Variant)
    Debug.Print "From page: "; Message
    CefBrowser1.PostWebMessage "Hello from BASIC"
End Sub
```

### NavigationComplete
{: .no_toc }

Raised after a navigation initiated by [**Navigate**](#navigate), [**NavigateToString**](#navigatetostring), or by user interaction in the page has finished.

Syntax: *object*\_**NavigationComplete**( *IsSuccess* **As Boolean**, *WebErrorStatus* **As Long** )

> [!NOTE]
> *IsSuccess* and *WebErrorStatus* are part of the event signature but currently return placeholder values (`True` and `0`) — the underlying CEF callbacks that would populate them have not yet been wired in. Use the document state ([**DocumentURL**](#documenturl), [**CanGoBack**](#cangoback)) to determine the outcome.

### NavigationStarting
{: .no_toc }

Raised before a navigation begins. Set *Cancel* to **True** to abort the navigation; leave it **False** to let it proceed.

Syntax: *object*\_**NavigationStarting**( *Uri* **As String**, *IsUserInitiated* **As Boolean**, *IsRedirected* **As Boolean**, *RequestHeaders* **As Object**, *Cancel* **As Boolean** )

*Uri*
: The destination URI.

*IsUserInitiated*
: **True** when the navigation was triggered by a user gesture (click, **Enter** in the address bar); **False** when it was script-initiated.

*IsRedirected*
: **True** when this navigation is a server-side redirect from a previous one.

*RequestHeaders*
: **Object**. Currently typed as **Object** (the underlying `CefRequestHeaders` collection is a placeholder reserved for future use).

*Cancel*
: Set to **True** to abort the navigation.

```tb
Private Sub CefBrowser1_NavigationStarting( _
        ByVal Uri As String, ByVal IsUserInitiated As Boolean, _
        ByVal IsRedirected As Boolean, ByVal RequestHeaders As Object, _
        Cancel As Boolean)
    If InStr(Uri, "ads.example.com") > 0 Then Cancel = True
End Sub
```

### PrintToPdfCompleted
{: .no_toc }

Raised when an earlier [**PrintToPdf**](#printtopdf) call finishes writing the PDF.

Syntax: *object*\_**PrintToPdfCompleted**( )

### PrintToPdfFailed
{: .no_toc }

Raised when an earlier [**PrintToPdf**](#printtopdf) call fails — e.g. because the output path was not writable.

Syntax: *object*\_**PrintToPdfFailed**( )

### Ready
{: .no_toc }

Raised after the browser helper process has launched, its IPC channel is connected, and the control is ready to accept navigation and scripting commands. If [**DocumentURL**](#documenturl) has a non-empty value when **Ready** fires (the design-time default is `https://www.twinbasic.com`), the control auto-navigates to it.

Syntax: *object*\_**Ready**( )

### SourceChanged
{: .no_toc }

Raised when [**DocumentURL**](#documenturl) has been updated — typically after a navigation. Used to keep an address-bar control in sync with the browser.

Syntax: *object*\_**SourceChanged**( *IsNewDocument* **As Boolean** )

*IsNewDocument*
: **True** when the change reflects a fresh document load (rather than a same-document fragment / `history.pushState` update).

```tb
Private Sub CefBrowser1_SourceChanged(ByVal IsNewDocument As Boolean)
    AddressBar.Text = CefBrowser1.DocumentURL
End Sub
```

### See Also

- [CefEnvironmentOptions](EnvironmentOptions) -- pre-creation configuration carried by [**EnvironmentOptions**](#environmentoptions)
- [CefLogSeverity](../Enumerations/CefLogSeverity), [cefPrintOrientation](../Enumerations/cefPrintOrientation) -- the package's two user-facing enumerations
- [WebView2](../../WebView2/WebView2/) -- the WebView2-runtime counterpart with a larger feature surface
- [WebView2 parity](../#webview2-parity) -- features available on **WebView2** that are not yet exposed on **CefBrowser**
- [ControlTypeConstants](../../VBRUN/Constants/ControlTypeConstants) -- where **vbCefBrowser** lives
