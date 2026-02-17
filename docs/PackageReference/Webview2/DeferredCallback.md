---
title: Deferred Callback
parent: WebView2 Package
nav_order: 16
---

# Deferred Callback Mechanism

The WebView2 package provides a deferred event and callback mechanism to solve re-entrancy problems during event handling. When you need to call WebView2 control methods within an event handler, using the deferred mechanism can avoid potential deadlocks and crashes.

## Overview

### What is the Re-entrancy Problem?

Re-entrancy refers to calling a method of the same object again during an event handler, causing recursive code execution. In WebView2, some event handlers may need to call WebView2 control methods, and direct calls can lead to:

- Deadlocks
- Crashes
- Unexpected behavior
- Call stack overflow

### How the Deferred Mechanism Works

The deferred mechanism works in the following ways:

1. **Deferred Execution**: Postpone event handling until after the current message loop completes
2. **Message Queue**: Use Windows message queue to schedule deferred execution
3. **Asynchronous Processing**: Avoid calling WebView2 methods directly in event handling context

## WebView2 Control Related

### UseDeferredEvents Property

```vb
Public UseDeferredEvents As Boolean = True
```

Controls whether to use deferred event mode. Default value is `True`.

| Value   | Description                                                |
| ------- | ---------------------------------------------------------- |
| `True`  | Use deferred event mode (recommended)                       |
| `False` | Use synchronous event mode (may cause re-entrancy problems) |

**Example:**

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Recommended to use deferred event mode
    WebView21.UseDeferredEvents = True
End Sub
```

### Events Supporting Deferred Mode

The following events support deferred mode:

| Event                  | Description                    |
| ---------------------- | ------------------------------- |
| `PermissionRequested`  | Permission request event        |
| `NavigationComplete`   | Navigation complete event       |
| `SourceChanged`        | Source changed event            |
| `DocumentTitleChanged` | Document title changed event    |
| `ProcessFailed`        | Process failed event            |
| `DOMContentLoaded`     | DOM load complete event        |
| `ScriptDialogOpening`  | Script dialog opening event     |
| `DownloadStarting`     | Download starting event        |
| `WebResourceRequested` | Web resource request event     |
| `NewWindowRequested`   | New window request event       |
| `Ready`                | WebView2 ready event           |
| `SuspendCompleted`     | Suspend complete event         |
| `SuspendFailed`        | Suspend failed event            |
| `PrintToPdfCompleted`  | PDF print complete event        |
| `PrintToPdfFailed`     | PDF print failed event          |
| `JsAsyncResult`        | JS async result event           |

## Deferred Invocation for AddObject

### UseDeferredInvoke Parameter

```vb
Public Sub AddObject(ByVal ObjName As String, ByVal Object As Object, _
                    ByVal UseDeferredInvoke As Boolean = False)
```

The `UseDeferredInvoke` parameter of the `AddObject` method controls the behavior when JavaScript calls VB objects.

| Value   | Description                                                                     |
| ------- | ------------------------------------------------------------------------------- |
| `False` | Direct invocation, can return value to JavaScript, but may cause re-entrancy problems |
| `True`  | Deferred invocation, avoids re-entrancy problems, returns value to JavaScript asynchronously via Promise |

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
var result = window.chrome.webview.hostObjects.tbObjectInst.GetValue();
console.log(result); // Output: Hello from Twinbasic
```

**Advantages:**

- Can return value to JavaScript
- Simple and direct invocation

**Disadvantages:**

- May cause re-entrancy problems
- Cannot call WebView2 methods during invocation

**Use Cases:**

- Only need to return simple data
- No need to access WebView2 during invocation

### Deferred Invocation Mode (UseDeferredInvoke = True)

```vb
' Twinbasic side
Public Function ProcessData(ByVal data As String) As String
    Debug.Print "Processing data: " & data
    ' Can safely call WebView2 methods here
    WebView21.PostWebMessage "Processing complete: " & data
    ProcessData = "Processing result: " & data
End Function

Private Sub WebView21_Ready()
    WebView21.AddObject "tbObjectInst", Me, True  ' Deferred invocation
End Sub
```

```javascript
// JavaScript side
// Returns a Promise object, you can get the return value via .then()
window.chrome.webview.hostObjects.tbObjectInst
  .ProcessData("test data")
  .then(function (result) {
    console.log("VB return value:", result); // Output: Processing result: test data
  })
  .catch(function (error) {
    console.error("Invocation error:", error);
  });

// Use async/await syntax
async function callVB() {
  try {
    const result =
      await window.chrome.webview.hostObjects.tbObjectInst.ProcessData(
        "test data",
      );
    console.log(result);
  } catch (error) {
    console.error(error);
  }
}
```

**Advantages:**

- Avoids re-entrancy problems
- Can call WebView2 methods in the method
- More safe and stable
- Returns value to JavaScript asynchronously via Promise

**Disadvantages:**

- Invocation is asynchronous, need to use Promise or async/await
- Slightly more latency compared to direct invocation

**Use Cases:**

- Need to call WebView2 in the method
- Can accept asynchronous return values
- Handle complex interaction logic

## Internal Classes

### WebView2DeferredCallback

**Class ID:** `383FCA6A-9D0B-4F03-B4D1-F040D7588B91`

Internal class for deferred callbacks, implements the `IScheduledCallback` interface.

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

Internal class for deferred event raising, implements the `IScheduledCallback` interface.

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

### Example 1: Execute JavaScript After Navigation Completes

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
            If MsgBox("Allow access to location?", vbYesNo) = vbYes Then
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
            MsgBox Message, vbInformation, "Web Page Notification"

            ' Can safely log in deferred mode
            WebView21.PostWebMessage "Showing Alert: " & Message

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

### Example 4: Mixed Use of Deferred and Non-Deferred Invocations

```vb
Public Class Form1
    Public Function GetConfigValue(ByVal key As String) As String
        ' This method needs to return value, use non-deferred invocation
        Select Case key
            Case "version"
                GetConfigValue = "1.0"
            Case "name"
                GetConfigValue = "MyApp"
        End Select
    End Function

    Public Function HandleEvent(ByVal eventData As String) As String
        ' This method uses deferred invocation, returns value to JavaScript asynchronously via Promise
        Debug.Print "Event: " & eventData
        ' Can safely call WebView2 methods
        WebView21.PostWebMessage "Event processed"
        HandleEvent = "Processing complete: " & eventData
    End Function

    Private Sub WebView21_Ready()
        ' Add two objects using different invocation modes
        WebView21.AddObject "config", Me, False      ' Non-deferred invocation
        WebView21.AddObject "handler", Me, True      ' Deferred invocation
    End Sub
End Class
```

```javascript
// JavaScript side
// config object needs to return value, use non-deferred invocation (synchronous)
var version =
  window.chrome.webview.hostObjects.config.GetConfigValue("version");
console.log(version); // Output: 1.0

// handler object uses deferred invocation, get return value asynchronously via Promise
window.chrome.webview.hostObjects.handler
  .HandleEvent("button_click")
  .then(function (result) {
    console.log("Processing result:", result); // Output: Processing complete: button_click
  })
  .catch(function (error) {
    console.error("Invocation error:", error);
  });

// Use async/await syntax
async function callHandler() {
  try {
    const result =
      await window.chrome.webview.hostObjects.handler.HandleEvent("submit");
    console.log(result);
  } catch (error) {
    console.error(error);
  }
}
```

### Example 5: Web Resource Interception

```vb
Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)

    ' Intercept specific request
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
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    WebView21.UseDeferredEvents = True
End Sub
```

### 2. Choose AddObject Mode Based on Requirements

```vb
' When need to return value
WebView21.AddObject "dataProvider", dataProvider, False

' When don't need to return value
WebView21.AddObject "eventHandler", eventHandler, True
```

### 3. Avoid Blocking in Event Handlers

```vb
Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    If IsSuccess Then
        ' Don't perform time-consuming operations in event handler
        ' Use deferred invocation or async processing
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

1. **Default Setting**: `UseDeferredEvents` defaults to `True`, which is the recommended setting.

2. **Performance Impact**: Deferred events introduce a slight delay, but it's negligible for most applications.

3. **Asynchronous Return Values**: Deferred object methods return values to JavaScript asynchronously via Promise, need to use `.then()` or `await` syntax to get them.

4. **Asynchronous Nature**: Deferred invocations are asynchronous, pay attention to execution order.

5. **Debugging Difficulty**: Deferred invocations increase debugging complexity, need to carefully track execution flow.

6. **Memory Leaks**: Ensure proper cleanup of object references to avoid memory leaks.

7. **Thread Safety**: Deferred invocations execute in the main thread's message queue, no need to worry about thread safety issues.

8. **Event Order**: Deferred events execute after the current event handling completes, which may affect expected event order.
