---
title: Quick Start
parent: WebView2 Package
nav_order: 3
---

# WebView2 Quick Start Guide

This guide will help you quickly get started with the twinBASIC WebView2 control.

## Environment Setup

### 1. Install WebView2 Runtime

WebView2 requires Microsoft Edge WebView2 Runtime (Evergreen) to be installed.

**Download URLs:**

- Official download: [https://developer.microsoft.com/microsoft-edge/webview2/](https://developer.microsoft.com/microsoft-edge/webview2/)
- Evergreen Runtime: [https://go.microsoft.com/fwlink/p/?LinkId=2124703](https://go.microsoft.com/fwlink/p/?LinkId=2124703)

> **Note:** If you are using Windows 7, please download the WebView2 Runtime that supports Windows 7 from:
> [https://gitcode.com/woeoio/tbman/releases/Webview2Runtime](https://gitcode.com/woeoio/tbman/releases/Webview2Runtime)

**Check if already installed:**

You can verify whether WebView2 Runtime is installed by checking the default installation directory and registry.

```vb
Private Function IsWebView2Installed() As Boolean
    Dim wsh As Object
    Dim regValue As String
    Dim installPath As String
    Dim tempPath As String
    Dim found As Boolean

    found = False
    Set wsh = CreateObject("WScript.Shell")

    ' ===== Method 1: Improved Registry Check =====
    On Error Resume Next ' Only used for registry reads

    ' Check 64-bit system (WOW6432Node)
    regValue = ""
    regValue = wsh.RegRead("HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv")
    If Len(regValue) > 0 Then
        found = True
        GoTo CleanUp
    End If

    ' Check 32-bit system (without WOW6432Node)
    regValue = ""
    regValue = wsh.RegRead("HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv")
    If Len(regValue) > 0 Then
        found = True
        GoTo CleanUp
    End If

    ' Check user-level installation
    regValue = ""
    regValue = wsh.RegRead("HKEY_CURRENT_USER\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv")
    If Len(regValue) > 0 Then
        found = True
        GoTo CleanUp
    End If

    On Error GoTo 0 ' Restore normal error handling

    ' ===== Method 2: Improved File System Check =====
    ' Check 64-bit program directory
    installPath = Environ("ProgramFiles(x86)") & "\Microsoft\EdgeWebView\Application\"
    If Dir(installPath, vbDirectory) <> "" Then
        ' Check if directory contains actual DLL files
        tempPath = Dir(installPath & "*.dll")
        If tempPath <> "" Then
            found = True
            GoTo CleanUp
        End If
    End If

    ' Check user directory
    installPath = Environ("LOCALAPPDATA") & "\Microsoft\EdgeWebView\Application\"
    If Dir(installPath, vbDirectory) <> "" Then
        ' Check if directory contains actual DLL files
        tempPath = Dir(installPath & "*.dll")
        If tempPath <> "" Then
            found = True
        End If
    End If

CleanUp:
    IsWebView2Installed = found
    Set wsh = Nothing
End Function

' Return WebView2 version number (if installed), otherwise return empty string
Private Function GetWebView2Version() As String
    Dim wsh As Object
    Dim regKeys(1 To 3) As String
    Dim i As Integer

    regKeys(1) = "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv"
    regKeys(2) = "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv"
    regKeys(3) = "HKEY_CURRENT_USER\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}\pv"

    Set wsh = CreateObject("WScript.Shell")
    On Error Resume Next

    For i = 1 To 3
        GetWebView2Version = wsh.RegRead(regKeys(i))
        If Len(GetWebView2Version) > 0 Then
            Exit For
        End If
    Next i

    On Error GoTo 0
    Set wsh = Nothing
End Function
```

### 2. Reference WebView2 Package

Reference the WebView2 package in your twinBASIC project:

1. Open Project Settings
2. Select "Packages/References"
3. Add `WebView2Package`

## Basic Usage

### Example 1: Display a Web Page

```vb
' Form1.frm
Option Explicit

Private WithEvents WebView21 As WebView2

Private Sub Form_Load()
    ' Create WebView2 control
    Set WebView21 = Controls.Add("WebView2.WebView2", "WebView21")

    ' Set position and size
    With WebView21
        .Visible = True
        .Move 0, 0, ScaleWidth, ScaleHeight
        .DocumentURL = "https://www.twinbasic.com"
    End With
End Sub

Private Sub WebView21_Ready()
    Debug.Print "WebView2 is ready"
End Sub

Private Sub Form_Resize()
    If WebView21 Is Nothing Then Exit Sub
    WebView21.Move 0, 0, ScaleWidth, ScaleHeight
End Sub
```

### Example 2: Design-Time Usage

If you've added the WebView2 control to the form designer:

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Set initial URL
    WebView21.DocumentURL = "https://www.example.com"
End Sub

Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, ByVal WebErrorStatus As Long)
    If IsSuccess Then
        Debug.Print "Page loaded successfully"
        Debug.Print "Title: " & WebView21.DocumentTitle
    Else
        Debug.Print "Page loading failed, error code: " & WebErrorStatus
    End If
End Sub
```

## Navigation Control

### Add Navigation Buttons

```vb
Private WithEvents cmdBack As CommandButton
Private WithEvents cmdForward As CommandButton
Private WithEvents cmdRefresh As CommandButton
Private WithEvents txtUrl As TextBox
Private WithEvents cmdGo As CommandButton

Private Sub Form_Load()
    ' Create navigation buttons
    Set cmdBack = Controls.Add("VB.CommandButton", "cmdBack")
    cmdBack.Caption = "Back"
    cmdBack.Move 10, 10, 60, 30

    Set cmdForward = Controls.Add("VB.CommandButton", "cmdForward")
    cmdForward.Caption = "Forward"
    cmdForward.Move 80, 10, 60, 30

    Set cmdRefresh = Controls.Add("VB.CommandButton", "cmdRefresh")
    cmdRefresh.Caption = "Refresh"
    cmdRefresh.Move 150, 10, 60, 30

    ' Create URL input box
    Set txtUrl = Controls.Add("VB.TextBox", "txtUrl")
    txtUrl.Move 220, 10, 300, 30
    txtUrl.Text = "https://www.twinbasic.com"

    ' Create Go button
    Set cmdGo = Controls.Add("VB.CommandButton", "cmdGo")
    cmdGo.Caption = "Go"
    cmdGo.Move 530, 10, 60, 30

    ' Create WebView2 control
    Set WebView21 = Controls.Add("WebView2.WebView2", "WebView21")
    With WebView21
        .Visible = True
        .Move 0, 50, ScaleWidth, ScaleHeight - 50
    End With
End Sub

Private Sub cmdGo_Click()
    If Len(txtUrl.Text) > 0 Then
        WebView21.Navigate txtUrl.Text
    End If
End Sub

Private Sub cmdBack_Click()
    If WebView21.CanGoBack Then
        WebView21.GoBack
    End If
End Sub

Private Sub cmdForward_Click()
    If WebView21.CanGoForward Then
        WebView21.GoForward
    End If
End Sub

Private Sub cmdRefresh_Click()
    WebView21.Reload
End Sub

Private Sub WebView21_SourceChanged(ByVal IsNewDocument As Boolean)
    txtUrl.Text = WebView21.DocumentURL
End Sub
```

## JavaScript Interaction

### Execute JavaScript

```vb
Private Sub WebView21_DOMContentLoaded()
    ' Modify page background color
    WebView21.ExecuteScript "document.body.style.backgroundColor = '#f0f0f0'"

    ' Get page title
    Dim title As Variant
    title = WebView21.JsProp("document.title")
    Debug.Print "Page title: " & title
End Sub
```

### Call JavaScript Functions

```vb
Private Sub WebView21_DOMContentLoaded()
    ' Call page function
    Dim result As Variant
    result = WebView21.JsRun("getWindowWidth")
    Debug.Print "Window width: " & result
End Sub
```

### Asynchronous JavaScript Invocation

```vb
Private Sub WebView21_Ready()
    ' Async JavaScript invocation
    Dim token As LongLong
    token = WebView21.JsRunAsync("fetchUserData", "user123")
    Debug.Print "Async invocation Token: " & token
End Sub

Private Sub WebView21_JsAsyncResult(ByVal Result As Variant, Token As LongLong, ErrString As String)
    Debug.Print "Async result Token: " & Token
    If Len(ErrString) > 0 Then
        Debug.Print "Error: " & ErrString
    Else
        Debug.Print "Result: " & Result
    End If
End Sub
```

## Twinbasic and JavaScript Communication

### Send Message from Twinbasic to JavaScript

```vb
' Twinbasic side
Private Sub btnSendMessage_Click()
    WebView21.PostWebMessage "Hello from Twinbasic!"
    WebView21.PostWebMessage Array("data1", "data2", 123)
End Sub
```

```javascript
// JavaScript side (in web page)
window.chrome.webview.addEventListener("message", function (e) {
  console.log("Received message:", e.data);
  // Process message
  if (typeof e.data === "string") {
    alert(e.data);
  } else if (Array.isArray(e.data)) {
    console.log("Array:", e.data);
  }
});
```

### Send Message from JavaScript to Twinbasic

```javascript
// JavaScript side
window.chrome.webview.postMessage({
  type: "button_click",
  buttonId: "submit",
  timestamp: Date.now(),
});
```

```vb
' Twinbasic side
Private Sub WebView21_JsMessage(ByVal Message As Variant)
    Debug.Print "Received JS message: " & Message

    ' Process JSON object
    If TypeName(Message) = "Object" Then
        Debug.Print "Type: " & Message("type")
        Debug.Print "Button ID: " & Message("buttonId")
    End If
End Sub
```

## Object Sharing

### Expose Twinbasic Objects to JavaScript

```vb
' Twinbasic class module - tbObjectInst.twin
Public Function GetUserName() As String
    GetUserName = "John Doe"
End Function

Public Sub ShowMessage(ByVal msg As String)
    MsgBox msg, vbInformation, "From Twinbasic"
End Sub

Public Function Calculate(ByVal a As Double, ByVal b As Double) As Double
    Calculate = a + b
End Function
```

```vb
' Main form
Private WithEvents WebView21 As WebView2
Private vbObj As tbObjectInst

Private Sub WebView21_Ready()
    ' Create object
    Set vbObj = New tbObjectInst

    ' Expose to JavaScript (direct invocation, can return value)
    WebView21.AddObject "tbObjectInst", vbObj, False

    ' Expose to JavaScript (deferred invocation, returns value asynchronously via Promise)
    WebView21.AddObject "vbHandler", vbObj, True
End Sub
```

```javascript
// JavaScript side
// Call Twinbasic method (needs return value, direct invocation)
var userName = window.chrome.webview.hostObjects.tbObjectInst.GetUserName();
console.log(userName); // Output: John Doe

var result = window.chrome.webview.hostObjects.tbObjectInst.Calculate(10, 20);
console.log(result); // Output: 30

// Call Twinbasic method (deferred invocation, returns value asynchronously via Promise)
window.chrome.webview.hostObjects.vbHandler
  .ShowMessage("Test message")
  .then(function (returnValue) {
    console.log("Twinbasic return value:", returnValue);
  })
  .catch(function (error) {
    console.error("Invocation error:", error);
  });

// Use async/await syntax
async function callVBHandler() {
  try {
    const result = await window.chrome.webview.hostObjects.vbHandler.Calculate(
      5,
      3,
    );
    console.log("Calculation result:", result);
  } catch (error) {
    console.error(error);
  }
}
```

## Permission Handling

```vb
Private Sub WebView21_PermissionRequested(ByVal IsUserInitiated As Boolean, _
    ByRef State As wv2PermissionState, ByVal Uri As String, _
    ByVal PermissionKind As wv2PermissionKind)

    Select Case PermissionKind
        Case wv2ClipboardRead
            ' Allow clipboard read
            State = wv2StateAllow
            Debug.Print "Allowed clipboard access: " & Uri

        Case wv2Geolocation
            ' Ask user if they allow geolocation
            If MsgBox("Web page requests access to location, allow?", vbYesNo + vbQuestion) = vbYes Then
                State = wv2StateAllow
                Debug.Print "Allowed location access: " & Uri
            Else
                State = wv2StateDeny
                Debug.Print "Denied location access: " & Uri
            End If

        Case wv2Camera, wv2Microphone
            ' Deny camera and microphone
            State = wv2StateDeny
            Debug.Print "Denied " & PermissionKind & ": " & Uri

        Case Else
            ' Other permissions use default behavior
            State = wv2StateDefault
    End Select
End Sub
```

## Load Custom HTML

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Create HTML content
    Dim html As String
    html = "<!DOCTYPE html>" & vbCrLf
    html = html & "<html>" & vbCrLf
    html = html & "<head>" & vbCrLf
    html = html & "    <meta charset='UTF-8'>" & vbCrLf
    html = html & "    <title>Local HTML</title>" & vbCrLf
    html = html & "    <style>" & vbCrLf
    html = html & "        body { font-family: Arial, sans-serif; padding: 20px; }" & vbCrLf
    html = html & "        h1 { color: #333; }" & vbCrLf
    html = html & "    </style>" & vbCrLf
    html = html & "</head>" & vbCrLf
    html = html & "<body>" & vbCrLf
    html = html & "    <h1>Welcome to WebView2</h1>" & vbCrLf
    html = html & "    <p>This is a local HTML page</p>" & vbCrLf
    html = html & "    <button onclick='sendMessage()'>Send Message to VB</button>" & vbCrLf
    html = html & "    <script>" & vbCrLf
    html = html & "        function sendMessage() {" & vbCrLf
    html = html & "            window.chrome.webview.postMessage('Hello from HTML!');" & vbCrLf
    html = html & "        }" & vbCrLf
    html = html & "    </script>" & vbCrLf
    html = html & "</body>" & vbCrLf
    html = html & "</html>"

    ' Load HTML
    WebView21.NavigateToString html
End Sub
```

## Load Local Files

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Method 1: Use file path
    WebView21.Navigate "file:///C:/Projects/MyApp/index.html"

    ' Method 2: Use virtual host mapping
    WebView21.SetVirtualHostNameToFolderMapping "app.local", "C:\Projects\MyApp", wv2ResourceAllow
    WebView21.Navigate "https://app.local/index.html"
End Sub
```

### Comparison of Two Methods

| Feature       | file:// protocol              | Virtual host mapping                    |
| ------------- | ----------------------------- | --------------------------------------- |
| Protocol      | file://                       | https://                                |
| Domain        | File path                     | Custom domain name                      |
| Security      | More restrictions             | Less restrictions (follows HTTPS rules) |
| Compatibility | Some frameworks don't support | Widely supported                        |

### Core Advantages of Virtual Host Mapping

#### 1. Solve Frontend Framework Protocol Restrictions

Many modern frontend frameworks and libraries, for security reasons, **prohibit or restrict running under the `file://` protocol**, including:

- React, Vue, Angular and other frameworks' features
- Service Worker (must be under HTTPS or localhost)
- Web Workers (some restrictions)
- IndexedDB (disabled under file:// in some browsers)
- Fetch API cross-origin requests

Virtual host mapping uses `https://` protocol, **completely avoiding these restrictions**.

#### 2. Simulate Web Server Environment

- **No real server needed**: No need to install nginx, Apache, etc.
- **No port occupation**: Maps directly to local folder
- **Custom domain**: Can set memorable domain names (like `app.local`, `dev.local`)
- **Follows HTTPS rules**: Enjoy security features of modern web standards

#### 3. Better Resource Loading Experience

```vb
' file:// method may have issues
WebView21.Navigate "file:///C:/Projects/MyApp/index.html"
' Relative path resource loading may be restricted
' <script src="./app.js"></script> may fail

' Virtual host mapping method
WebView21.SetVirtualHostNameToFolderMapping "app.local", "C:\Projects\MyApp", wv2ResourceAllow
WebView21.Navigate "https://app.local/index.html"
' All resources loaded via https://app.local/, consistent with real server
```

#### 4. Access Control Permissions

The second parameter of virtual host mapping can set resource access permissions:

```vb
' wv2ResourceAllow - Allow all access
' wv2ResourceDeny - Deny access
' wv2ResourceDenyCors - Deny CORS requests
```

### Typical Use Cases

#### Scenario 1: Developing Single Page Application (SPA)

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Vue/React projects use virtual host mapping
    WebView21.SetVirtualHostNameToFolderMapping "myapp.dev", "C:\MyVueApp\dist", wv2ResourceAllow
    WebView21.Navigate "https://myapp.dev/index.html"
End Sub
```

#### Scenario 2: Multiple Independent Applications

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Run multiple applications simultaneously
    WebView21.SetVirtualHostNameToFolderMapping "admin.local", "C:\Apps\admin", wv2ResourceAllow
    WebView21.SetVirtualHostNameToFolderMapping "api.local", "C:\Apps\api-docs", wv2ResourceAllow

    ' Switch to load different applications
    WebView21.Navigate "https://admin.local/index.html"
End Sub
```

#### Scenario 3: Avoid Cross-Origin Issues

```javascript
// Using file://, fetch requests may be blocked
fetch("data.json"); // May fail under file://

// Using virtual host mapping, works like on a real server
fetch("/data.json"); // Works normally, uses https://app.local/data.json
```

### Nature of Virtual Host Mapping

Virtual host mapping maps a local folder to a custom HTTPS domain name, making the browser think it's accessing a real web server.

### Best Practices

- For simple static HTML, use `file://`
- For modern frontend apps, SPAs, or scenarios needing Service Worker, etc., **strongly recommend using virtual host mapping**
- When publishing to production, just replace with real HTTPS server addresses

## Print to PDF

```vb
Private Sub btnSaveToPdf_Click()
    Dim savePath As String
    savePath = "C:\Temp\output.pdf"

    ' Check if feature is supported
    If WebView21.SupportsPdfFeatures Then
        ' Print to PDF
        WebView21.PrintToPdf savePath, _
            Orientation:=wv2PrintPortrait, _
            ShouldPrintBackgrounds:=True, _
            MarginTop:=20, _
            MarginBottom:=20, _
            MarginLeft:=20, _
            MarginRight:=20

        Debug.Print "PDF printing..."
    Else
        MsgBox "Current WebView2 version does not support PDF features", vbExclamation
    End If
End Sub

Private Sub WebView21_PrintToPdfCompleted()
    MsgBox "PDF printing complete!", vbInformation
End Sub

Private Sub WebView21_PrintToPdfFailed()
    MsgBox "PDF printing failed!", vbExclamation
End Sub
```

## Developer Tools

```vb
Private Sub cmdOpenDevTools_Click()
    ' Open developer tools
    WebView21.OpenDevToolsWindow
End Sub

Private Sub cmdInspectPage_Click()
    ' Call DevTools protocol method
    If WebView21.AreDevToolsEnabled Then
        WebView21.CallDevToolsProtocolMethod "Runtime.enable", "{}", "enableRuntime"
    End If
End Sub

Private Sub WebView21_DevToolsProtocolResponse(ByVal CustomEventId As Variant, ByVal JsonResponse As String)
    Debug.Print "DevTools response [" & CustomEventId & "]: " & JsonResponse
End Sub
```

## Common Issues

### 1. Control Not Showing

```vb
' Make sure to set Visible and position
Private Sub Form_Load()
    Set WebView21 = Controls.Add("WebView2.WebView2", "WebView21")
    With WebView21
        .Visible = True
        .Move 0, 0, ScaleWidth, ScaleHeight
    End With
End Sub
```

### 2. Page Loading Failed

```vb
Private Sub WebView21_Error(ByVal code As Long, ByVal msg As String)
    Debug.Print "Error code: " & code
    Debug.Print "Error message: " & msg

    ' Check if WebView2 Runtime is installed
    If code = -1 Then
        MsgBox "WebView2 Runtime is not installed" & vbCrLf & vbCrLf & msg, vbCritical
    End If
End Sub
```

### 3. JavaScript Call Timeout

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Set JavaScript call timeout (seconds)
    WebView21.JsCallTimeOutSeconds = 30
End Sub
```

### 4. Re-entrancy Problems

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    ' Use deferred event mode to avoid re-entrancy problems
    WebView21.UseDeferredEvents = True
End Sub
```

## Next Steps

- Read [WebView2 Control](./WebView2.md) to learn all properties, methods, and events
- Read [Environment Options](./WebView2EnvironmentOptions.md) to configure WebView2 environment
- Read [Enumeration Types](./Enumerations.md) to learn all enumeration values
- Read [Deferred Callback](./DeferredCallback.md) to understand how to handle re-entrancy problems
- Read [Re-entrancy Issues](./Re-entrancy.md) for detailed explanation of re-entrancy problems

