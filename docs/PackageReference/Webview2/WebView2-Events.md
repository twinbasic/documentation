---
title: Events
parent: WebView2 Package
nav_order: 5
---

# WebView2 Events Reference

The WebView2 control provides rich events to monitor and control web content behavior.

## Event List

### Create

Fired before the WebView2 control is created. Use this event to control `EnvironmentOptions`, such as `UserDataFolder`.

**Syntax:**

```vb
Public Event Create()
```

**Purpose:**

- Configure environment options
- Set user data folder
- Initialize control state

---

### Ready

Fired after the WebView2 control is created and ready.

**Syntax:**

```vb
Public Event Ready()
```

**Purpose:**

- Start navigation operations
- Execute initialization code that requires the control to be ready
- Configure subsequent operations

**Example:**

```vb
Private Sub WebView21_Ready()
    WebView21.Navigate "https://www.example.com"
End Sub
```

---

### Error

Captures errors that occur during WebView2 control initialization.

**Syntax:**

```vb
Public Event Error(ByVal code As Long, ByVal msg As String)
```

**Parameters:**

- `code` - Error code
- `msg` - Error message description

**Purpose:**

- Handle initialization failures
- Display error messages to users
- Log errors

---

### NavigationStarting

Fired before navigation starts.

**Syntax:**

```vb
Public Event NavigationStarting(ByVal Uri As String, _
                                ByVal IsUserInitiated As Boolean, _
                                ByVal IsRedirected As Boolean, _
                                ByVal RequestHeaders As WebView2RequestHeaders, _
                                ByRef Cancel As Boolean)
```

**Parameters:**

- `Uri` - Target URI
- `IsUserInitiated` - Whether initiated by user
- `IsRedirected` - Whether it's a redirect
- `RequestHeaders` - Request headers object
- `Cancel` - Set to True to cancel navigation

**Purpose:**

- Check or modify request headers
- Cancel specific navigation
- Log navigation history

**Example:**

```vb
Private Sub WebView21_NavigationStarting(ByVal Uri As String, ByVal IsUserInitiated As Boolean, _
                                       ByVal IsRedirected As Boolean, ByVal RequestHeaders As WebView2RequestHeaders, _
                                       ByRef Cancel As Boolean)
    If InStr(Uri, "blocked-site.com") > 0 Then
        Cancel = True
    End If
End Sub
```

---

### NavigationComplete

Fired after calls like `Navigate`, `NavigateCustom`, and `NavigateToString` complete.

**Syntax:**

```vb
Public Event NavigationComplete(ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
```

**Parameters:**

- `IsSuccess` - Whether navigation was successful
- `WebErrorStatus` - Web error status code

**Purpose:**

- Update UI state
- Handle navigation errors
- Begin page content processing

---

### SourceChanged

Fired when the `DocumentURL` property updates, typically after page navigation.

**Syntax:**

```vb
Public Event SourceChanged(ByVal IsNewDocument As Boolean)
```

**Parameters:**

- `IsNewDocument` - Whether it's a new document

**Purpose:**

- Sync URL bar
- Update navigation history
- Detect page changes

**Example:**

```vb
Private Sub WebView21_SourceChanged(ByVal IsNewDocument As Boolean)
    txtURL.Text = WebView21.DocumentURL
End Sub
```

---

### DocumentTitleChanged

Fired when the `DocumentTitle` property updates, typically after page navigation.

**Syntax:**

```vb
Public Event DocumentTitleChanged()
```

**Purpose:**

- Update window title
- Display page title
- Log page visits

---

### PermissionRequested

Fired when a webpage needs task authorization, such as reading from the clipboard or viewing live camera feed.

**Syntax:**

```vb
Public Event PermissionRequested(ByVal IsUserInitiated As Boolean, _
                                  ByRef State As wv2PermissionState, _
                                  ByVal Uri As String, _
                                  ByVal PermissionKind As wv2PermissionKind)
```

**Parameters:**

- `IsUserInitiated` - Whether initiated by user
- `State` - Permission state (modifiable to grant/deny permission)
- `Uri` - URI requesting permission
- `PermissionKind` - Permission type

**Purpose:**

- Control camera and microphone access permissions
- Control clipboard access
- Implement custom permission prompts

---

### AcceleratorKeyPressed

Fired when an accelerator key is pressed.

**Syntax:**

```vb
Public Event AcceleratorKeyPressed(ByRef KeyState As wv2KeyEventKind, _
                                    ByVal IsExtendedKey As Boolean, _
                                    ByVal WasKeyDown As Boolean, _
                                    ByVal IsKeyReleased As Boolean, _
                                    ByVal IsMenuKeyDown As Boolean, _
                                    ByVal RepeatCount As Long, _
                                    ByVal ScanCode As Long, _
                                    ByRef IsHandled As Boolean)
```

**Parameters:**

- `KeyState` - Key event type
- `IsExtendedKey` - Whether it's an extended key
- `WasKeyDown` - Whether it's a key down
- `IsKeyReleased` - Whether it's a key release
- `IsMenuKeyDown` - Whether menu key is down
- `RepeatCount` - Repeat count
- `ScanCode` - Scan code
- `IsHandled` - Set to True to indicate handled

**Purpose:**

- Intercept keyboard shortcuts
- Implement custom keyboard handling
- Prevent default behavior

---

### WebResourceRequested

Fired when an HTTP request matching a URI set via `AddWebResourceRequestedFilter` is made.

**Syntax:**

```vb
Public Event WebResourceRequested(ByVal Request As WebView2Request, _
                                  ByVal Response As WebView2Response)
```

**Parameters:**

- `Request` - Request object
- `Response` - Response object

**Purpose:**

- Intercept and modify requests
- Provide custom responses
- Implement resource caching
- Block specific requests

---

### ProcessFailed

Fired when an external EXE process used by WebView2 fails (e.g., rendering or JavaScript external process).

**Syntax:**

```vb
Public Event ProcessFailed(ByVal Kind As wv2ProcessFailedKind)
```

**Parameters:**

- `Kind` - Process failure type

**Purpose:**

- Handle crash recovery
- Log error information
- Notify users

---

### ScriptDialogOpening

Fired when `AreDefaultScriptDialogsEnabled` is set to False, allowing you to present custom dialogs.

**Syntax:**

```vb
Public Event ScriptDialogOpening(ByVal ScriptDialogKind As wv2ScriptDialogKind, _
                                 ByRef Accept As Boolean, _
                                 ByVal ResultText As String, _
                                 ByVal URI As String, _
                                 ByVal Message As String, _
                                 ByVal DefaultText As String)
```

**Parameters:**

- `ScriptDialogKind` - Dialog type
- `Accept` - Set to True to accept (for confirmation dialogs)
- `ResultText` - Result text
- `URI` - URI making the request
- `Message` - Dialog message
- `DefaultText` - Default text

**Purpose:**

- Implement custom alert dialogs
- Implement custom prompt dialogs
- Implement custom confirm dialogs

**Example:**

```vb
Private Sub WebView21_ScriptDialogOpening(ScriptDialogKind As wv2ScriptDialogKind, _
                                         ByRef Accept As Boolean, ResultText As String, _
                                         URI As String, Message As String, DefaultText As String)
    If ScriptDialogKind = wv2ScriptDialogKind.wv2Alert Then
        MsgBox Message, vbInformation, "Alert"
    End If
End Sub
```

---

### UserContextMenu

Fired when the user right-clicks within the WebView control. Set `AreDefaultContextMenusEnabled` to False and use this event to implement your own context menu.

**Syntax:**

```vb
Public Event UserContextMenu(X As Single, Y As Single)
```

**Parameters:**

- `X` - Mouse X coordinate
- `Y` - Mouse Y coordinate

**Purpose:**

- Implement custom right-click menu
- Disable default menu

---

### DOMContentLoaded

Fired when the DOM document is fully loaded and accessible from the JavaScript side.

**Syntax:**

```vb
Public Event DOMContentLoaded()
```

**Purpose:**

- Execute page initialization scripts
- Manipulate DOM elements
- Check page state

---

### SuspendCompleted

Fired after a successful `Suspend` request.

**Syntax:**

```vb
Public Event SuspendCompleted()
```

**Purpose:**

- Confirm suspension completion
- Update UI state

---

### SuspendFailed

Fired after a failed `Suspend` request.

**Syntax:**

```vb
Public Event SuspendFailed()
```

**Purpose:**

- Handle suspension failure
- Retry or notify user

---

### DownloadStarting

Fired when the user clicks content that will be downloaded, allowing you to override the download path or cancel the operation.

**Syntax:**

```vb
Public Event DownloadStarting(ByRef ResultFilePath As String, _
                               ByRef Cancel As Boolean, _
                               ByRef Handled As Boolean)
```

**Parameters:**

- `ResultFilePath` - Result file path (modifiable)
- `Cancel` - Set to True to cancel download
- `Handled` - Set to True to indicate handled

**Purpose:**

- Change download location
- Cancel unwanted downloads
- Implement custom download management

**Example:**

```vb
Private Sub WebView21_DownloadStarting(ByRef ResultFilePath As String, _
                                       ByRef Cancel As Boolean, _
                                       ByRef Handled As Boolean)
    ResultFilePath = "C:\Downloads\" & Mid(ResultFilePath, InStrRev(ResultFilePath, "\") + 1)
End Sub
```

---

### PrintToPdfCompleted

Fired after a successful `PrintToPdf` request.

**Syntax:**

```vb
Public Event PrintToPdfCompleted()
```

**Purpose:**

- Notify PDF print completion
- Update UI state

---

### PrintToPdfFailed

Fired after a failed `PrintToPdf` request.

**Syntax:**

```vb
Public Event PrintToPdfFailed()
```

**Purpose:**

- Handle print failure
- Notify user

---

### NewWindowRequested

Fired when a new web page window is about to be opened. Set `IsHandled` to True if you have handled the request (thus suppressing the default behavior of opening a new Edge window).

**Syntax:**

```vb
Public Event NewWindowRequested(ByVal IsUserInitiated As Boolean, _
                                ByRef IsHandled As Boolean, _
                                ByVal Uri As String, _
                                ByVal HasPosition As Long, _
                                ByVal HasSize As Long, _
                                ByVal Left As Long, _
                                ByVal Top As Long, _
                                ByVal Width As Long, _
                                ByVal Height As Long, _
                                ByVal ShouldDisplayMenuBar As Long, _
                                ByVal ShouldDisplayStatus As Long, _
                                ByVal ShouldDisplayToolbar As Long, _
                                ByVal ShouldDisplayScrollBars As Long)
```

**Parameters:**

- `IsUserInitiated` - Whether initiated by user
- `IsHandled` - Set to True to indicate handled
- `Uri` - New window URI
- `HasPosition` - Whether position is specified
- `HasSize` - Whether size is specified
- `Left` - Left margin
- `Top` - Top margin
- `Width` - Width
- `Height` - Height
- `ShouldDisplayMenuBar` - Whether to display menu bar
- `ShouldDisplayStatus` - Whether to display status bar
- `ShouldDisplayToolbar` - Whether to display toolbar
- `ShouldDisplayScrollBars` - Whether to display scroll bars

**Purpose:**

- Open new window within application
- Block popups
- Control window properties

---

### JsAsyncResult

Fired in response to the `JsRunAsync` function, providing the JavaScript result.

**Syntax:**

```vb
Public Event JsAsyncResult(ByVal Result As Variant, _
                           Token As LongLong, _
                           ErrString As String)
```

**Parameters:**

- `Result` - JavaScript execution result
- `Token` - Token used to identify the request
- `ErrString` - Error string (if any)

**Purpose:**

- Handle asynchronous JavaScript execution results
- Match requests by token

---

### JsMessage

Fired when the JavaScript side calls `window.chrome.webview.postMessage(...)`. `IsWebMessageEnabled` must be True.

**Syntax:**

```vb
Public Event JsMessage(ByVal Message As Variant)
```

**Parameters:**

- `Message` - Message from JavaScript

**Purpose:**

- Receive messages from web pages
- Implement JavaScript to native code communication

**Example:**

JavaScript side:

```javascript
// Send simple string
window.chrome.webview.postMessage("Hello from JavaScript");

// Send object (automatically converted to JSON)
window.chrome.webview.postMessage({
  type: "alert",
  message: "Hello",
  timestamp: Date.now(),
});
```

twinBASIC side:

```vb
' Receive string
Private Sub WebView21_JsMessage(ByVal Message As Variant)
    If VarType(Message) = vbString Then
        Debug.Print "Received message: " & Message
    End If
End Sub

' Receive object (JavaScript objects are converted to Dictionary)
Private Sub WebView21_JsMessage(ByVal Message As Variant)
    If VarType(Message) = vbObject Then
        Dim msg As Object
        Set msg = Message

        ' JavaScript object properties are automatically converted to Dictionary keys
        If msg.Exists("type") And msg("type") = "alert" Then
            MsgBox msg("message")
        End If
    End If
End Sub

' Use Scripting.Dictionary for easier handling
Private Sub WebView21_JsMessage(ByVal Message As Variant)
    If VarType(Message) = vbObject Then
        Dim msg As Scripting.Dictionary
        Set msg = Message

        Select Case msg("type")
            Case "alert"
                MsgBox msg("message")
            Case "notification"
                Debug.Print "Notification: " & msg("text")
        End Select
    End If
End Sub
```

---

### DevToolsProtocolResponse

Fired in response to `CallDevToolsProtocolMethod`.

**Syntax:**

```vb
Public Event DevToolsProtocolResponse(ByVal CustomEventId As Variant, _
                                      ByVal JsonResponse As String)
```

**Parameters:**

- `CustomEventId` - Custom event ID
- `JsonResponse` - JSON formatted response

**Purpose:**

- Receive Developer Tools Protocol response
- Implement advanced debugging features

