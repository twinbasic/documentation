---
title: WebView2 Control
parent: WebView2 Package
nav_order: 4
---

# WebView2 Control

`WebView2` control is the core component of twinBASIC WebView2 package, providing complete functionality for embedding Microsoft Edge WebView2 controls in Windows applications.

## Class Information

| Property        | Value                                  |
| --------------- | -------------------------------------- |
| Class Name      | `WebView2`                             |
| Base Class      | `ControlAlt`                           |
| Interface       | `IWindowsControl`                      |
| COM Creatable   | Yes                                    |
| Access Modifier | `Public`                               |
| Icon            | `/miscellaneous/ICONS/WebView2_48.png` |

## Overview

WebView2 control is based on Microsoft Edge (Chromium) kernel, providing:

- 🌐 Modern web content rendering
- 🔄 Bidirectional communication with JavaScript
- 📊 Complete encapsulation of WebView2 API
- 🎯 Simple and easy-to-use event-driven model
- 🚀 High-performance web application integration

## Quick Start

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
    ' WebView21.DocumentURL = "https://www.twinbasic.com"
End Sub

Private Sub WebView21_Ready()
    ' Set initial URL
    WebView21.DocumentURL = "https://www.twinbasic.com"
    Debug.Print "WebView2 is ready!"
End Sub

Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    If IsSuccess Then
        Debug.Print "Navigation successful: " & WebView21.DocumentURL
    Else
        Debug.Print "Navigation failed: " & WebErrorStatus
    End If
End Sub
```

## Properties Overview

### Navigation Related

| Property        | Type                | Description            |
| --------------- | ------------------- | ---------------------- |
| `DocumentURL`   | String (Read-only)  | Current document URL   |
| `DocumentTitle` | String (Read-only)  | Current document title |
| `CanGoBack`     | Boolean (Read-only) | Can go back            |
| `CanGoForward`  | Boolean (Read-only) | Can go forward         |

### Display Related

| Property     | Type      | Description                   |
| ------------ | --------- | ----------------------------- |
| `ZoomFactor` | Double    | Zoom factor (1.5 = 150%)      |
| `IsMuted`    | Boolean   | Whether audio is muted        |
| `BackColor`  | OLE_COLOR | Background color when loading |

### Configuration Related

| Property                         | Type                       | Description                                |
| -------------------------------- | -------------------------- | ------------------------------------------ |
| `EnvironmentOptions`             | WebView2EnvironmentOptions | Environment options configuration          |
| `UseDeferredEvents`              | Boolean                    | Whether to use deferred events             |
| `IsScriptEnabled`                | Boolean                    | Whether to enable JavaScript               |
| `IsWebMessageEnabled`            | Boolean                    | Whether to enable Web messages             |
| `AreDefaultScriptDialogsEnabled` | Boolean                    | Whether to enable default script dialogs   |
| `AreDevToolsEnabled`             | Boolean                    | Whether to allow opening DevTools          |
| `AreDefaultContextMenusEnabled`  | Boolean                    | Whether to enable default right-click menu |
| `IsZoomControlEnabled`           | Boolean                    | Whether to allow zooming                   |
| `UserAgent`                      | String                     | UserAgent string                           |

### Feature Support Properties

| Property                         | Description                            |
| -------------------------------- | -------------------------------------- |
| `SupportsNavigateCustomFeatures` | Whether custom navigation is supported |
| `SupportsSuspendResumeFeatures`  | Whether suspend/resume is supported    |
| `SupportsAudioFeatures`          | Whether audio control is supported     |
| `SupportsPdfFeatures`            | Whether PDF export is supported        |
| `SupportsTaskManagerFeatures`    | Whether task manager is supported      |

> 💡 **Tip**: For detailed descriptions of all properties, please refer to [WebView2 Properties Complete Documentation](./WebView2-Properties.md).

## Methods Overview

### Navigation Methods

| Method                                           | Description                    |
| ------------------------------------------------ | ------------------------------ |
| `Navigate(uri)`                                  | Navigate to specified URL      |
| `NavigateCustom(uri, method, headers, postData)` | Custom HTTP request navigation |
| `NavigateToString(html)`                         | Load HTML string               |
| `GoBack()`                                       | Go back                        |
| `GoForward()`                                    | Go forward                     |
| `Reload()`                                       | Refresh                        |

### JavaScript Interaction

| Method                           | Description                     |
| -------------------------------- | ------------------------------- |
| `ExecuteScript(code)`            | Execute JavaScript code         |
| `JsRun(funcName, args())`        | Synchronously call JS function  |
| `JsRunAsync(funcName, args())`   | Asynchronously call JS function |
| `JsProp(propName)`               | Get JS property value           |
| `PostWebMessage(message)`        | Send message to JavaScript      |
| `AddObject(name, obj, deferred)` | Expose COM object to JavaScript |
| `RemoveObject(name)`             | Remove exposed object           |

### Resource Management

| Method                                  | Description                 |
| --------------------------------------- | --------------------------- |
| `AddWebResourceRequestedFilter()`       | Add resource request filter |
| `RemoveWebResourceRequestedFilter()`    | Remove filter               |
| `AddScriptToExecuteOnDocumentCreated()` | Add page load script        |

### Advanced Features

| Method                                | Description                   |
| ------------------------------------- | ----------------------------- |
| `OpenDevToolsWindow()`                | Open developer tools          |
| `CallDevToolsProtocolMethod()`        | Call DevTools protocol method |
| `Suspend()`                           | Suspend WebView2              |
| `Resume()`                            | Resume WebView2               |
| `PrintToPdf()`                        | Export to PDF                 |
| `SetVirtualHostNameToFolderMapping()` | Set virtual host mapping      |

> 💡 **Tip**: For detailed descriptions and examples of all methods, please refer to [WebView2 Methods Complete Documentation](./WebView2-Methods.md).

## Events

### Lifecycle Events

| Event      | Description                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| `Create()` | Fired before WebView2 control is created, used to configure EnvironmentOptions |
| `Ready()`  | Fired after WebView2 control creation completes and is ready                   |
| `Error()`  | Fired when an error occurs during initialization                               |

### Navigation Events

| Event                    | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `NavigationStarting()`   | Fired before navigation starts, can cancel navigation |
| `NavigationComplete()`   | Fired after navigation completes                      |
| `SourceChanged()`        | Fired when DocumentURL property is updated            |
| `DocumentTitleChanged()` | Fired when document title is updated                  |
| `DOMContentLoaded()`     | Fired after DOM document is fully loaded              |

### User Interaction Events

| Event                     | Description                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| `PermissionRequested()`   | Fired when web page requests permissions                                        |
| `AcceleratorKeyPressed()` | Fired when shortcut key is pressed                                              |
| `UserContextMenu()`       | Fired when user right-clicks (requires `AreDefaultContextMenusEnabled = False`) |

### Script and Message Events

| Event                   | Description                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `ScriptDialogOpening()` | Fired when script dialog opens (requires `AreDefaultScriptDialogsEnabled = False`) |
| `JsAsyncResult()`       | Asynchronous JavaScript call returns result                                        |
| `JsMessage()`           | Fired when JavaScript sends message (via `window.chrome.webview.postMessage`)      |

### Resource and Download Events

| Event                    | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `WebResourceRequested()` | Fired when matching Web resource request occurs       |
| `DownloadStarting()`     | Fired when download starts, can modify path or cancel |

### System Events

| Event                        | Description                        |
| ---------------------------- | ---------------------------------- |
| `ProcessFailed()`            | Fired when external process fails  |
| `NewWindowRequested()`       | Fired when new window is requested |
| `SuspendCompleted()`         | Suspend successful completion      |
| `SuspendFailed()`            | Suspend failed                     |
| `PrintToPdfCompleted()`      | PDF print successful               |
| `PrintToPdfFailed()`         | PDF print failed                   |
| `DevToolsProtocolResponse()` | DevTools protocol response         |

> 💡 **Tip**: For detailed parameter and usage descriptions of each event, please refer to [WebView2 Events Complete Documentation](./WebView2-Events.md).

## Usage Examples

### Basic Usage

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Set initial URL
    WebView21.DocumentURL = "https://www.twinbasic.com"
    Debug.Print "WebView2 is ready!"
End Sub

Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    If IsSuccess Then
        Debug.Print "Navigation successful: " & WebView21.DocumentURL
    Else
        Debug.Print "Navigation failed: " & WebErrorStatus
    End If
End Sub
```

### JavaScript Interaction

```vb
' Execute JavaScript code
WebView21.ExecuteScript "alert('Hello from VB6!')"

' Synchronously call JavaScript function
Dim title As String
title = WebView21.JsProp("document.title")
Me.Caption = title

' Asynchronously call JavaScript function
Dim token As LongLong
token = WebView21.JsRunAsync("fetchData", "api/data")

Private Sub WebView21_JsAsyncResult(ByVal Result As Variant, Token As LongLong, ErrString As String)
    If Token = token Then
        Debug.Print "Async return result: " & Result
    End If
End Sub
```

### Receive JavaScript Messages

```vb
Private Sub WebView21_JsMessage(ByVal Message As Variant)
    If VarType(Message) = vbObject Then
        Dim msg As Object
        Set msg = Message
        If msg.Exists("type") And msg("type") = "alert" Then
            MsgBox msg("message")
        End If
    End If
End Sub
```

JavaScript side:

```javascript
window.chrome.webview.postMessage({
  type: "alert",
  message: "Hello from JavaScript!",
});
```

### Intercept Web Requests

```vb
Private Sub WebView21_Ready()
    ' Add resource filter
    WebView21.AddWebResourceRequestedFilter "*.js", wv2WebResourceContext.wv2All
End Sub

Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
                                          ByVal Response As WebView2Response)
    ' Block specific script
    If InStr(Request.Uri, "analytics.js") > 0 Then
        Response.StatusCode = 404
        Response.ReasonPhrase = "Not Found"
    End If
End Sub
```

### PDF Export

```vb
Private Sub cmdExportPDF_Click()
    If WebView21.SupportsPdfFeatures Then
        WebView21.PrintToPdf "C:\Documents\export.pdf", _
                           wv2PrintOrientation.wv2PrintPortrait, _
                           , , , , , , , True
    Else
        MsgBox "PDF export not supported"
    End If
End Sub

Private Sub WebView21_PrintToPdfCompleted()
    MsgBox "PDF export successful!"
End Sub
```

## Notes

1. **Runtime Requirement**: System needs to have WebView2 Runtime (Evergreen) installed
2. **Ready Event**: Can only call most methods after `Ready` event is triggered
3. **Thread Safety**: Use `UseDeferredEvents` to avoid re-entrancy problems
4. **Memory Management**: Release COM objects in time to avoid memory leaks
5. **Error Handling**: Properly handle initialization failures in `Error` event

## Related Documents

- [WebView2 Events Detailed Documentation](./WebView2-Events.md)
- [WebView2 Properties Detailed Documentation](./WebView2-Properties.md)
- [WebView2 Methods Detailed Documentation](./WebView2-Methods.md)
- [WebView2 Environment Options](./WebView2EnvironmentOptions.md)
- [Enumeration Types](./Enumerations.md)
- [Deferred Callback Mechanism](./DeferredCallback.md)
- [Quick Start Guide](./Getting-started.md)

