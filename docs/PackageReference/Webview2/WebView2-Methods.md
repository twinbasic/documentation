---
title: Methods
parent: WebView2 Package
nav_order: 7
---

# WebView2 Methods Reference

The WebView2 control provides rich methods to control navigation, execute JavaScript, manage resources, etc.

## Method List

### MoveFocus

Sets focus to the WebView control.

**Syntax:**

```vb
Public Sub MoveFocus()
```

**Example:**

```vb
WebView21.MoveFocus
```

---

### Navigate

Navigates to the requested URI. URIs need a protocol prefix, such as http://. Triggers `NavigationStarting` and `NavigationComplete` events.

**Syntax:**

```vb
Public Sub Navigate(ByVal uri As String)
```

**Parameters:**

- `uri` - Target URI

**Example:**

```vb
WebView21.Navigate "https://www.example.com"
' Protocol prefix not required, https:// is added automatically
WebView21.Navigate "www.example.com"
```

---

### NavigateCustom

Navigates to the requested URI using the specified HTTP method (e.g., GET/POST), optional HTTP headers (vbCrLf separated), and optional POST data. URIs need a protocol prefix, such as http://. Triggers `NavigationStarting` and `NavigationComplete` events.

**Syntax:**

```vb
Public Sub NavigateCustom(ByVal uri As String, _
                          method As String, _
                          Optional headers As String, _
                          Optional postData As Variant, _
                          Optional postDataAsUTF8 As Boolean = True)
```

**Parameters:**

- `uri` - Target URI
- `method` - HTTP method (such as "GET", "POST")
- `headers` - Optional, HTTP headers (vbCrLf separated)
- `postData` - Optional, POST data
- `postDataAsUTF8` - Optional, whether to encode postData as UTF-8 (default True)

**Note:** Use `SupportsNavigateCustomFeatures` to check if this feature is supported.

**Example:**

```vb
' POST request
Dim postData As String
postData = "username=admin&password=123456"
WebView21.NavigateCustom "https://api.example.com/login", "POST", _
                        "Content-Type: application/x-www-form-urlencoded", _
                        postData

' GET request with custom headers
WebView21.NavigateCustom "https://api.example.com/data", "GET", _
                        "Authorization: Bearer token123"
```

---

### NavigateToString

Navigates to the requested HTML string content. Triggers `NavigationStarted` and `NavigationComplete` events.

**Syntax:**

```vb
Public Sub NavigateToString(ByVal htmlContent As String)
```

**Parameters:**

- `htmlContent` - HTML content string

**Example:**

```vb
Dim html As String
html = "<html><body><h1>Hello World</h1></body></html>"
WebView21.NavigateToString html
```

---

### GoBack

Navigates to the previous URL in the browser navigation history.

**Syntax:**

```vb
Public Sub GoBack()
```

**Example:**

```vb
If WebView21.CanGoBack Then
    WebView21.GoBack
End If
```

---

### GoForward

Navigates to the next URL in the browser navigation history.

**Syntax:**

```vb
Public Sub GoForward()
```

**Example:**

```vb
If WebView21.CanGoForward Then
    WebView21.GoForward
End If
```

---

### Reload

Reloads the current URL, equivalent to the F5 key.

**Syntax:**

```vb
Public Sub Reload()
```

**Example:**

```vb
WebView21.Reload
```

---

### AddObject

Makes a COM object accessible from the JavaScript side via the `chrome.webview.hostObjects.ObjName` JavaScript syntax.

**Syntax:**

```vb
Public Sub AddObject(ByVal ObjName As String, ByVal Object As Object, ByVal UseDeferredInvoke As Boolean = False)
```

**Parameters:**

- `ObjName` - Object name to use in JavaScript
- `Object` - COM object to expose
- `UseDeferredInvoke` - Optional, whether to use deferred invocation (default False)

**UseDeferredInvoke Description:**

| Value   | Description                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------ |
| `False` | Direct invocation, can return values to JavaScript, but may cause reentrancy issues                    |
| `True`  | Deferred invocation, avoids reentrancy issues, returns values to JavaScript via Promise asynchronously |

See [Deferred Callback Mechanism](./DeferredCallback.md#deferred-invocation-for-addobject) for detailed comparison and use cases of both modes.

**Example:**

```vb
' Add object (default using direct invocation mode)
Set myObject = New MyClass
WebView21.AddObject "MyObject", myObject

' Add deferred invocation mode object (avoids reentrancy issues)
Set dataProcessor = New DataProcessor
WebView21.AddObject "Processor", dataProcessor, True
```

**JavaScript Side Call Example:**

```javascript
// Direct invocation mode (UseDeferredInvoke = False)
const result = chrome.webview.hostObjects.MyObject.GetValue();
console.log(result); // Directly get return value

// Deferred invocation mode (UseDeferredInvoke = True)
chrome.webview.hostObjects.Processor.ProcessData("data").then(
  function (result) {
    console.log("Processing result:", result); // Get return value via Promise
  },
);

// Or use async/await
async function processData() {
  const result = await chrome.webview.hostObjects.Processor.ProcessData("data");
  console.log(result);
}
```

---

### RemoveObject

Removes a COM object previously exposed via `AddObject`.

**Syntax:**

```vb
Public Sub RemoveObject(ByVal ObjName As String)
```

**Parameters:**

- `ObjName` - Object name to remove

**Example:**

```vb
WebView21.RemoveObject "MyObject"
```

---

### AddScriptToExecuteOnDocumentCreated

Sets JavaScript code to inject into each subsequent navigated webpage. Only takes effect on the next URL navigation.

**Syntax:**

```vb
Public Sub AddScriptToExecuteOnDocumentCreated(ByVal jsCode As String)
```

**Parameters:**

- `jsCode` - JavaScript code to inject

**Example:**

```vb
' Inject custom script
WebView21.AddScriptToExecuteOnDocumentCreated _
    "window.addEventListener('load', function() {" & vbCrLf & _
    "    console.log('Page loaded!');" & vbCrLf & _
    "});"
```

---

### AddWebResourceRequestedFilter

Sets a URL filter that will trigger the `WebResourceRequested` event. Use `*` and `?` for wildcard matching.

**Syntax:**

```vb
Public Sub AddWebResourceRequestedFilter(ByVal sFilter As String, ByVal FilterContext As wv2WebResourceContext)
```

**Parameters:**

- `sFilter` - URL filter pattern (supports wildcards)
- `FilterContext` - Web resource context

**Example:**

```vb
' Intercept all image requests
WebView21.AddWebResourceRequestedFilter "*.jpg", wv2WebResourceContext.wv2Image

' Intercept all requests for a specific domain
WebView21.AddWebResourceRequestedFilter "https://api.example.com/*", wv2WebResourceContext.wv2All
```

---

### RemoveWebResourceRequestedFilter

Removes a URL filter previously added via `AddWebResourceRequestedFilter`.

**Syntax:**

```vb
Public Sub RemoveWebResourceRequestedFilter(ByVal sFilter As String, ByVal FilterContext As wv2WebResourceContext)
```

**Parameters:**

- `sFilter` - URL filter pattern
- `FilterContext` - Web resource context

**Example:**

```vb
WebView21.RemoveWebResourceRequestedFilter "*.jpg", wv2WebResourceContext.wv2Image
```

---

### OpenDevToolsWindow

Opens the Developer Tools window.

**Syntax:**

```vb
Public Sub OpenDevToolsWindow()
```

**Example:**

```vb
WebView21.OpenDevToolsWindow
```

---

### CallDevToolsProtocolMethod

Sends a protocol message to the Developer Tools window. If `CustomEventId` is provided, the `DevToolsProtocolResponse` event will be triggered with the result.

**Syntax:**

```vb
Public Sub CallDevToolsProtocolMethod(ByVal MethodName As String, _
                                       ByVal ParamsAsJson As String, _
                                       Optional CustomEventId As Variant)
```

**Parameters:**

- `MethodName` - Method name
- `ParamsAsJson` - JSON formatted parameters
- `CustomEventId` - Optional, custom event ID

**Example:**

```vb
' Disable script execution
WebView21.CallDevToolsProtocolMethod "Emulation.setScriptExecutionDisabled", "{""value"":true}"

' With custom ID, receive response
WebView21.CallDevToolsProtocolMethod "Runtime.evaluate", "{""expression"":'document.title'}", "MyEventId"

' Handle in event:
Private Sub WebView21_DevToolsProtocolResponse(ByVal CustomEventId As Variant, ByVal JsonResponse As String)
    If CustomEventId = "MyEventId" Then
        Debug.Print JsonResponse
    End If
End Sub
```

---

### ExecuteScript

Triggers execution of the provided JavaScript code. Does not wait for completion and provides no result.

**Syntax:**

```vb
Public Sub ExecuteScript(ByVal jsCode As String)
```

**Parameters:**

- `jsCode` - JavaScript code

**Example:**

```vb
WebView21.ExecuteScript "alert('Hello from WebView2!')"
```

---

### JsRun

Executes the provided JavaScript function with its parameters, waits for completion, and returns the result.

**Syntax:**

```vb
Public Function JsRun(ByVal FuncName As String, ParamArray args() As Variant) As Variant
```

**Parameters:**

- `FuncName` - JavaScript function name
- `args` - Parameter array

**Return Value:** Return value of the JavaScript function

**Example:**

```vb
' Call simple function
Dim result As Variant
result = WebView21.JsRun("Math.max", 10, 20, 30)
Debug.Print result  ' Output: 30

' Call custom function
WebView21.ExecuteScript "function add(a, b) { return a + b; }"
result = WebView21.JsRun("add", 5, 3)
Debug.Print result  ' Output: 8

' Get page property
result = WebView21.JsProp("document.title")
Debug.Print result  ' Output page title
```

---

### JsRunAsync

Triggers asynchronous execution of the given JavaScript function with its parameters. Returns a token for identification. When the result arrives, the `JsAsyncResult` event is triggered (providing the token as one of its parameters).

**Syntax:**

```vb
Public Function JsRunAsync(ByVal FuncName As String, ParamArray args() As Variant) As LongLong
```

**Parameters:**

- `FuncName` - JavaScript function name
- `args` - Parameter array

**Return Value:** Token used to identify the request

**Example:**

```vb
Dim token As LongLong
token = WebView21.JsRunAsync("fetchData", "https://api.example.com/data")

Private Sub WebView21_JsAsyncResult(ByVal Result As Variant, Token As LongLong, ErrString As String)
    If Token = token Then
        Debug.Print "Result: " & Result
    End If
End Sub
```

---

### JsProp

Executes the given JavaScript code (e.g., 'document.url'), waits for completion, and returns the result.

**Syntax:**

```vb
Public Function JsProp(ByVal PropName As String) As Variant
```

**Parameters:**

- `PropName` - JavaScript property or expression

**Return Value:** Property value or expression result

**Example:**

```vb
Dim url As String
url = WebView21.JsProp("document.URL")
Debug.Print url

Dim title As String
title = WebView21.JsProp("document.title")
Debug.Print title

Dim scrollPos As Long
scrollPos = WebView21.JsProp("window.scrollY")
Debug.Print scrollPos
```

---

### PostWebMessage

Sends a message to the JavaScript side, which can be received via `window.chrome.webview.addEventListener('message', handler)`. Requires `IsWebMessageEnabled` to be set to True.

**Syntax:**

```vb
Public Sub PostWebMessage(Message As Variant)
```

**Parameters:**

- `Message` - Message to send (can be a string or other type, non-string types are automatically converted to JSON)

**Description:**

- If `Message` is a string type, use `PostWebMessageAsString` to send the raw string
- If `Message` is another type (including objects), use `PostWebMessageAsJson` to automatically convert to JSON

**Example:**

```vb
' Send string
WebView21.PostWebMessage "Hello from VB6"

' Send object (automatically converted to JSON)
Dim dict As Object
Set dict = CreateObject("Scripting.Dictionary")
dict("type") = "notification"
dict("message") = "Data updated"
dict("timestamp") = CLng(Now)
WebView21.PostWebMessage dict

' JavaScript side receive:
// window.chrome.webview.addEventListener('message', (event) => {
//     console.log(event.data);
//     // String: "Hello from VB6"
//     // Object: {type: "notification", message: "Data updated", timestamp: ...}
// });

// Or use async/await to receive messages
// window.chrome.webview.addEventListener('message', async (event) => {
//     const data = event.data;
//     if (typeof data === 'string') {
//         console.log('String:', data);
//     } else {
//         console.log('Object:', data.type, data.message);
//     }
// });
```

---

### PostWebMessageJSON

Sends raw JSON value to the JavaScript side, which can be received via `window.chrome.webview.addEventListener('message', handler)`. Requires `IsWebMessageEnabled` to be set to True.

**Syntax:**

```vb
Public Sub PostWebMessageJSON(jsonString As String)
```

**Parameters:**

- `jsonString` - JSON formatted string

**Example:**

```vb
WebView21.PostWebMessageJSON "{""type"":""alert"",""message"":""Hello""}"
```

---

### Suspend

Suspends WebView2 processing/rendering. Useful for creating tabs. Use `SupportsSuspendResumeFeatures` to check if this feature is supported.

**Syntax:**

```vb
Public Sub Suspend()
```

**Example:**

```vb
If WebView21.SupportsSuspendResumeFeatures Then
    WebView21.Suspend
End If

Private Sub WebView21_SuspendCompleted()
    Debug.Print "WebView suspended successfully"
End Sub
```

---

### Resume

Resumes WebView2 processing/rendering after a previous `Suspend` call. Use `SupportsSuspendResumeFeatures` to check if this feature is supported.

**Syntax:**

```vb
Public Sub Resume()
```

**Example:**

```vb
If WebView21.SupportsSuspendResumeFeatures Then
    WebView21.Resume
End If
```

---

### SetVirtualHostNameToFolderMapping

Creates a virtual mapping of the specified hostname to a local folder. Use `SupportsFolderMappingFeatures` to check if this feature is supported.

**Note:** Due to a WebView2 bug, this may cause a 2-second delay in name resolution if you're not careful with the hostname selection. See https://github.com/MicrosoftEdge/WebView2Feedback/issues/2381

**Syntax:**

```vb
Public Sub SetVirtualHostNameToFolderMapping(ByVal hostName As String, _
                                               ByVal folderPath As String, _
                                               ByVal accessKind As wv2HostResourceAccessKind = wv2HostResourceAccessKind.wv2ResourceAllow)
```

**Parameters:**

- `hostName` - Virtual hostname
- `folderPath` - Local folder path
- `accessKind` - Access type (default wv2ResourceAllow)

**Example:**

```vb
' Map local folder as virtual domain
WebView21.SetVirtualHostNameToFolderMapping "app.local", "C:\MyApp\wwwroot"

' Now can access local files
WebView21.Navigate "https://app.local/index.html"
```

---

### ClearVirtualHostNameToFolderMapping

Removes the virtual mapping of the specified hostname previously set via `SetVirtualHostNameToFolderMapping`. Use `SupportsFolderMappingFeatures` to check if this feature is supported.

**Syntax:**

```vb
Public Sub ClearVirtualHostNameToFolderMapping(ByVal hostName As String)
```

**Parameters:**

- `hostName` - Hostname to clear

**Example:**

```vb
WebView21.ClearVirtualHostNameToFolderMapping "app.local"
```

---

### PrintToPdf

Saves the current document as a PDF file. Use `SupportsPdfFeatures` to check if this feature is supported.

**Syntax:**

```vb
Public Sub PrintToPdf(ByVal outputPath As String, _
                      Optional ByVal Orientation As wv2PrintOrientation = wv2PrintOrientation.wv2PrintPortrait, _
                      Optional ByVal ScaleFactor As Variant, _
                      Optional PageWidth As Variant, _
                      Optional PageHeight As Variant, _
                      Optional ByVal MarginTop As Variant, _
                      Optional ByVal MarginBottom As Variant, _
                      Optional ByVal MarginLeft As Variant, _
                      Optional ByVal MarginRight As Variant, _
                      Optional ByVal ShouldPrintBackgrounds As Boolean = False, _
                      Optional ByVal ShouldPrintSelectionOnly As Boolean = False, _
                      Optional ByVal ShouldPrintHeaderAndFooter As Boolean = True, _
                      Optional ByVal HeaderTitle As Variant, _
                      Optional ByVal FooterUri As Variant)
```

**Parameters:**

- `outputPath` - Output PDF file path
- `Orientation` - Optional, page orientation (default portrait)
- `ScaleFactor` - Optional, scale factor
- `PageWidth` - Optional, page width
- `PageHeight` - Optional, page height
- `MarginTop` - Optional, top margin
- `MarginBottom` - Optional, bottom margin
- `MarginLeft` - Optional, left margin
- `MarginRight` - Optional, right margin
- `ShouldPrintBackgrounds` - Optional, whether to print backgrounds (default False)
- `ShouldPrintSelectionOnly` - Optional, whether to print only selected content (default False)
- `ShouldPrintHeaderAndFooter` - Optional, whether to print header and footer (default True)
- `HeaderTitle` - Optional, header title
- `FooterUri` - Optional, footer URI

**Example:**

```vb
' Basic print
WebView21.PrintToPdf "C:\output.pdf"

' Print landscape with backgrounds
WebView21.PrintToPdf "C:\output.pdf", wv2PrintOrientation.wv2PrintLandscape, , , , , , , , True

' Full configuration
WebView21.PrintToPdf "C:\output.pdf", _
                   wv2PrintOrientation.wv2PrintPortrait, _
                   1.0, _
                   210, _
                   297, _
                   10, _
                   10, _
                   10, _
                   10, _
                   True, _
                   False, _
                   True, _
                   "My Document", _
                   "https://www.example.com"

Private Sub WebView21_PrintToPdfCompleted()
    MsgBox "PDF saved successfully!"
End Sub
```

---

### OpenDefaultDownloadDialog

Opens the built-in download manager dialog. Use `SupportsDownloadDialogFeatures` to check if this feature is supported.

**Syntax:**

```vb
Public Sub OpenDefaultDownloadDialog()
```

**Example:**

```vb
WebView21.OpenDefaultDownloadDialog
```

---

### CloseDefaultDownloadDialog

Closes the built-in download manager dialog. Use `SupportsDownloadDialogFeatures` to check if this feature is supported.

**Syntax:**

```vb
Public Sub CloseDefaultDownloadDialog()
```

**Example:**

```vb
WebView21.CloseDefaultDownloadDialog
```

---

### OpenTaskManagerWindow

Opens the built-in task manager dialog. Use `SupportsTaskManagerFeatures` to check if this feature is supported.

**Syntax:**

```vb
Public Sub OpenTaskManagerWindow()
```

**Example:**

```vb
WebView21.OpenTaskManagerWindow
```

---

## Usage Examples

### Complete Navigation Example

```vb
Private Sub cmdGo_Click()
    WebView21.Navigate txtURL.Text
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

Private Sub cmdReload_Click()
    WebView21.Reload
End Sub
```

### JavaScript Interaction Example

```vb
' Synchronous call
Dim title As String
title = WebView21.JsProp("document.title")
Me.Caption = title

' Call function
Dim result As Variant
result = WebView21.JsRun("parseInt", "12345")
Debug.Print result

' Asynchronous call
Dim token As LongLong
token = WebView21.JsRunAsync("fetchData", "api/data")
```

### Download Management Example

```vb
Private Sub WebView21_DownloadStarting(ByRef ResultFilePath As String, _
                                      ByRef Cancel As Boolean, _
                                      ByRef Handled As Boolean)
    ' Change download location
    ResultFilePath = "C:\Downloads\" & Mid(ResultFilePath, InStrRev(ResultFilePath, "\") + 1)
    Handled = True
End Sub

Private Sub cmdOpenDownloads_Click()
    WebView21.OpenDefaultDownloadDialog
End Sub
```

### PDF Export Example

```vb
Private Sub cmdExportPDF_Click()
    If WebView21.SupportsPdfFeatures Then
        Dim outputPath As String
        outputPath = "C:\Documents\" & WebView21.DocumentTitle & ".pdf"
        WebView21.PrintToPdf outputPath, , , , , , , , , True
    Else
        MsgBox "PDF export not supported"
    End If
End Sub
```

