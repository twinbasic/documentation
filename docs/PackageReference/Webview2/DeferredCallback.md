# Deferred Callback Mechanism

The WebView2 package provides deferred event and callback mechanisms to address re-entrancy issues during event processing. When you need to call WebView2 control methods within event handlers, using the deferred mechanism can prevent potential deadlocks and crashes.

## Overview

### What is the Re-entrancy Problem?

Re-entrancy occurs when, during the processing of one event, a method on the same object is called again, causing code to execute recursively. In WebView2, certain event handlers may need to call WebView2 control methods; direct calls can lead to:

- Deadlocks
- Crashes
- Unexpected behavior
- Stack overflow

### How the Deferred Mechanism Works

The deferred mechanism operates as follows:

1. **Deferred Execution**: Event processing is postponed until the current message loop completes
2. **Message Queue**: Windows message queue is used to schedule deferred execution
3. **Asynchronous Processing**: Avoids calling WebView2 methods directly within the event handling context

## WebView2 Control Related

### UseDeferredEvents Property

```vb
Public UseDeferredEvents As Boolean = True
```

Controls whether to use deferred event mode. Default value is `True`.

| Value   | Description                              |
| ------- | ---------------------------------------- |
| `True`  | Use deferred event mode (recommended)    |
| `False` | Use synchronous event mode (may cause re-entrancy issues) |

**Example:**

```vb
Private Sub Form_Load()
    ' Note: All member operations on WebView21 must be performed after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' It is recommended to use deferred event mode
    WebView21.UseDeferredEvents = True
End Sub
```

### Events Supporting Deferred Mode

The following events support deferred mode:

| Event                   | Description                  |
| ----------------------- | ---------------------------- |
| `PermissionRequested`   | Permission request event     |
| `NavigationComplete`    | Navigation complete event    |
| `SourceChanged`         | Source changed event         |
| `DocumentTitleChanged`  | Document title changed event |
| `ProcessFailed`         | Process failed event         |
| `DOMContentLoaded`      | DOM content loaded event     |
| `ScriptDialogOpening`   | Script dialog opening event  |
| `DownloadStarting`      | Download starting event      |
| `WebResourceRequested`  | Web resource requested event |
| `NewWindowRequested`    | New window requested event   |
| `Ready`                 | WebView2 ready event         |
| `SuspendCompleted`      | Suspend completed event      |
| `SuspendFailed`         | Suspend failed event         |
| `PrintToPdfCompleted`   | PDF print completed event    |
| `PrintToPdfFailed`      | PDF print failed event       |
| `JsAsyncResult`         | JS async result event        |

## Deferred Invocation for AddObject

### UseDeferredInvoke Parameter

```vb
Public Sub AddObject(ByVal ObjName As String, ByVal Object As Object, _
                    ByVal UseDeferredInvoke As Boolean = False)
```

The `UseDeferredInvoke` parameter of the `AddObject` method controls the behavior when JavaScript calls Twinbasic objects.

| Value   | Description                                                  |
| ------- | ------------------------------------------------------------ |
| `False` | Direct invocation, returns a Promise. JS can use `await` or `.then()` to get the Twinbasic function return value, but may cause re-entrancy issues |
| `True`  | Deferred invocation, executed via message queue scheduling, avoids re-entrancy issues, but JS **cannot get** the function return value |

> **Note on default value differences**:
> - `UseDeferredEvents` (event deferred) defaults to `True` — event handlers often need to call WebView2 methods, deferred mode avoids re-entrancy deadlocks, **safety first**
> - `UseDeferredInvoke` (JS call deferred) defaults to `False` — JS calls usually need return values, direct invocation is more convenient, **convenience first**

### Direct Invocation Mode (UseDeferredInvoke = False)

```vb
' Twinbasic side
Public Function GetValue() As String
    GetValue = "Hello from Twinbasic"
End Function

Private Sub WebView21_Ready()
    WebView21.AddObject "tbObjectInst", Me, False  ' Direct invocation
End Sub
```

```javascript
// JavaScript side
// Returns a Promise, use await to get the return value
async function callTwinbasic() {
    const result = await window.chrome.webview.hostObjects.tbObjectInst.GetValue();
    console.log(result); // Output: Hello from Twinbasic
}

// Or use .then()
window.chrome.webview.hostObjects.tbObjectInst.GetValue()
    .then(result => console.log(result));
```

**Advantages:**

- Can return values to JavaScript via Promise
- Supports await/async syntax

**Disadvantages:**

- May cause re-entrancy issues
- Cannot call WebView2 methods during the call process

**Usage Scenarios:**

- Need to get return values from Twinbasic functions
- Do not need to access WebView2 during the call process

### Deferred Invocation Mode (UseDeferredInvoke = True)

```vb
' Twinbasic side
Public Sub ProcessData(ByVal data As String)
    Debug.Print "Processing data: " & data
    ' Can safely call WebView2 methods here
    WebView21.PostWebMessage "Processing completed: " & data
    ' Note: JS side cannot get the return value
End Sub

Private Sub WebView21_Ready()
    WebView21.AddObject "tbObjectInst", Me, True  ' Deferred invocation
End Sub
```

```javascript
// JavaScript side
// Calls will be deferred, cannot get return value
window.chrome.webview.hostObjects.tbObjectInst.ProcessData("test data");

// Using async/await only waits for the call to complete, result is undefined
async function callTwinbasic() {
    const result = await window.chrome.webview.hostObjects.tbObjectInst.ProcessData("test data");
    console.log(result); // Output: undefined
}
```

**Advantages:**

- Avoids re-entrancy issues
- Can safely call WebView2 methods within the method
- Safer and more stable

**Disadvantages:**

- JS side **cannot get** the function return value
- Calls are queued in the message queue for deferred execution

**Usage Scenarios:**

- Need to call WebView2 within the method
- Do not need to return values to JavaScript
- Handling event notifications and other one-way calls

## Internal Classes

### WebView2DeferredCallback

**Class ID:** `383FCA6A-9D0B-4F03-B4D1-F040D7588B91`

Internal class for deferred callbacks, implementing the `IScheduledCallback` interface.

**Constructor:**

```vb
Public Sub New(ByVal Control As IDeferredCallback, _
               ByVal EventName As String, _
               ByVal Args As stdole.IUnknown, _
               ByVal Deferral As ICoreWebView2Deferral)
```

**Supported Events:**

- `NewWindowRequested`
- `PermissionRequested`
- `WebResourceRequested`
- `ScriptDialogOpening`
- `DownloadStarting`

### WebView2DeferredRaiseEvent

**Class ID:** `9B92FD8E-1F85-494F-BA97-02E2DDED0AD2`

Internal class for deferred event raising, implementing the `IScheduledCallback` interface.

**Constructor:**

```vb
Public Sub New(ByVal Control As WebView2, _
               ByVal EventName As String, _
               ParamArray Args() As Variant)
```

### IDeferredCallback Interface

```vb
Interface IDeferredCallback
    Sub NewWindowRequested(ByVal args As ICoreWebView2NewWindowRequestedEventArgs, _
                           ByVal Deferral As ICoreWebView2Deferral)
    Sub PermissionRequested(ByVal args As ICoreWebView2PermissionRequestedEventArgs, _
                            ByVal Deferral As ICoreWebView2Deferral)
    Sub WebResourceRequested(ByVal args As ICoreWebView2WebResourceRequestedEventArgs, _
                             ByVal Deferral As ICoreWebView2Deferral)
    Sub ScriptDialogOpening(ByVal args As ICoreWebView2ScriptDialogOpeningEventArgs, _
                            ByVal Deferral As ICoreWebView2Deferral)
    Sub DownloadStarting(ByVal args As ICoreWebView2DownloadStartingEventArgs, _
                         ByVal Deferral As ICoreWebView2Deferral)
End Interface
```

## Usage Examples

### Example 1: Execute JavaScript After Navigation Complete

```vb
Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    If IsSuccess Then
        ' In deferred mode, can safely call WebView2 methods
        WebView21.ExecuteScript "document.body.style.backgroundColor = '#f0f0f0'"
        Dim title As Variant
        title = WebView21.JsProp("document.title")
        Debug.Print "Page title: " & title
    End If
End Sub
```

### Example 2: Call WebView2 Methods in Permission Request

```vb
Private Sub WebView21_PermissionRequested(ByVal IsUserInitiated As Boolean, _
    ByRef State As wv2PermissionState, ByVal Uri As String, _
    ByVal PermissionKind As wv2PermissionKind)

    ' Decide based on permission type
    Select Case PermissionKind
        Case wv2Geolocation
            ' Show dialog to ask user
            If MsgBox("Allow access to location information?", vbYesNo) = vbYes Then
                State = wv2StateAllow
                ' Can safely log in deferred mode
                WebView21.PostWebMessage "Geolocation permission granted"
            Else
                State = wv2StateDeny
            End If
        Case wv2Camera
            State = wv2StateDeny
    End Select
End Sub
```

### Example 3: Script Dialog Handling

```vb
Private Sub WebView21_ScriptDialogOpening(ByVal ScriptDialogKind As wv2ScriptDialogKind, _
    ByRef Accept As Boolean, ByVal ResultText As String, ByVal URI As String, _
    ByVal Message As String, ByVal DefaultText As String)

    Select Case ScriptDialogKind
        Case wv2DialogAlert
            ' Custom Alert dialog
            Accept = True
            MsgBox Message, vbInformation, "Web Page Alert"

            ' Can safely log in deferred mode
            WebView21.PostWebMessage "Show Alert: " & Message

        Case wv2DialogConfirm
            ' Custom Confirm dialog
            If MsgBox(Message, vbYesNo, "Confirm") = vbYes Then
                Accept = True
                WebView21.PostWebMessage "User clicked OK"
            Else
                Accept = False
                WebView21.PostWebMessage "User clicked Cancel"
            End If

        Case wv2DialogPrompt
            ' Custom Prompt dialog
            ResultText = InputBox(Message, "Input", DefaultText)
            Accept = True
            WebView21.PostWebMessage "User input: " & ResultText
    End Select
End Sub
```

### Example 4: Mixed Use of Deferred and Non-Deferred Calls

```vb
Public Class Form1
    Public Function GetConfigValue(ByVal key As String) As String
        ' This method needs to return a value, use non-deferred invocation (UseDeferredInvoke = False)
        Select Case key
            Case "version"
                GetConfigValue = "1.0"
            Case "name"
                GetConfigValue = "MyApp"
        End Select
    End Function

    Public Sub HandleEvent(ByVal eventData As String)
        ' This method does not need to return a value, use deferred invocation (UseDeferredInvoke = True)
        ' Can safely call WebView2 methods
        Debug.Print "Event: " & eventData
        WebView21.PostWebMessage "Event handled: " & eventData
        ' Note: JS side cannot get return value
    End Sub

    Private Sub WebView21_Ready()
        ' Add two objects with different invocation modes
        WebView21.AddObject "config", Me, False      ' Non-deferred invocation, can get return value
        WebView21.AddObject "handler", Me, True      ' Deferred invocation, cannot get return value
    End Sub
End Class
```

```javascript
// JavaScript side
// config object needs return value, use non-deferred invocation (UseDeferredInvoke = False)
// Returns Promise, use await to get return value
async function getConfig() {
    const version = await window.chrome.webview.hostObjects.config.GetConfigValue("version");
    console.log(version); // Output: 1.0
}

// handler object uses deferred invocation (UseDeferredInvoke = True)
// Cannot get return value
window.chrome.webview.hostObjects.handler.HandleEvent("button_click");

// Even using await, return value is undefined
async function callHandler() {
    const result = await window.chrome.webview.hostObjects.handler.HandleEvent("submit");
    console.log(result); // Output: undefined
}
```

### Example 5: Web Resource Interception

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Intercept specific requests
    If InStr(Request.Uri, "/api/data") > 0 Then
        ' Build custom response
        Response.StatusCode = 200
        Response.ReasonPhrase = "OK"
        Response.ContentUTF8 = "{""status"":""success""}"
        Response.Headers.AppendHeader "Content-Type", "application/json"

        ' Can safely log in deferred mode
        WebView21.PostWebMessage "Intercepted request: " & Request.Uri
    End If
End Sub
```

## Best Practices

### 1. Use Deferred Mode by Default

```vb
Private Sub Form_Load()
    ' Note: All member operations on WebView21 must be performed after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    WebView21.UseDeferredEvents = True
End Sub
```

### 2. Choose AddObject Mode Based on Requirements

```vb
' When return value is needed (UseDeferredInvoke = False)
' JS can get Twinbasic function return value via await/.then()
WebView21.AddObject "dataProvider", dataProvider, False

' When return value is not needed (UseDeferredInvoke = True)
' Can safely call WebView2 methods, but JS cannot get return value
WebView21.AddObject "eventHandler", eventHandler, True
```

### 3. Avoid Blocking in Event Handlers

```vb
Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    If IsSuccess Then
        ' Do not perform time-consuming operations in event handlers
        ' Use deferred calls or asynchronous processing
        WebView21.JsRunAsync "initPage", FunctionAddress(OnPageInitComplete)
    End If
End Sub
```

### 4. Error Handling

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    On Error GoTo ErrorHandler

    ' Processing logic
    Response.StatusCode = 200

    Exit Sub

ErrorHandler:
    Debug.Print "Error: " & Err.Description
    Response.StatusCode = 500
    Response.ReasonPhrase = "Internal Server Error"
End Sub
```

## Notes

1. **Default Settings**: `UseDeferredEvents` defaults to `True`, which is the recommended setting.

2. **Performance Impact**: Deferred events introduce slight delays, but are negligible for most applications.

3. **Return Value Retrieval**: When `UseDeferredInvoke = False`, JS calls return a Promise, and the Twinbasic function return value can be obtained via `await` or `.then()`; when `UseDeferredInvoke = True`, JS side **cannot get** the function return value.

4. **Asynchronous Nature**: Deferred calls are asynchronous, so execution order needs attention.

5. **Debugging Difficulty**: Deferred calls add complexity to debugging, requiring careful tracking of execution flow.

6. **Memory Leaks**: Ensure proper cleanup of object references to avoid memory leaks.

7. **Thread Safety**: Deferred calls execute in the main thread's message queue, so thread safety is not a concern.

8. **Event Order**: Deferred events execute after the current event handling completes, which may affect expected event order.
