---
title: Documentation Overview
parent: WebView2 Package
nav_order: 2
---

# WebView2 Technical Documentation

twinBASIC WebView2 package provides complete Microsoft Edge WebView2 control integration, enabling you to embed modern web content in twinBASIC applications and achieve bidirectional interaction.

## Documentation Index

### Core Documents

| Document                             | Description                                    |
| ------------------------------------ | ---------------------------------------------- |
| [Getting Started Guide](./Getting-started.md) | Quick start with WebView2 control              |
| [Index](./index.md)                  | Documentation index and functionality overview |

### Class References

| Document                                        | Description                                  |
| ----------------------------------------------- | -------------------------------------------- |
| [WebView2 Control](./WebView2.md)              | Main control class, complete reference of all properties, methods, and events |
| [Environment Options](./WebView2EnvironmentOptions.md) | WebView2 environment configuration options   |

### HTTP Related

| Document                                     | Description               |
| -------------------------------------------- | ------------------------- |
| [HTTP Request](./WebView2Request.md)         | Web resource request object|
| [HTTP Response](./WebView2Response.md)       | Web resource response object|
| [Request Headers](./WebView2RequestHeaders.md)| HTTP request header management |
| [Response Headers](./WebView2ResponseHeaders.md)| HTTP response header management|
| [Header Collection](./WebView2HeadersCollection.md)| HTTP header collection enumeration |
| [Header Info](./WebView2Header.md)           | Single HTTP header information |

### Advanced Topics

| Document                             | Description                                 |
| ------------------------------------ | ------------------------------------------- |
| [Enumeration Types](./WebView2-Enumerations.md)| All enumeration type definitions and descriptions |
| [Deferred Callback](./DeferredCallback.md) | Deferred event and callback mechanism (re-entrancy issues) |

## Quick Navigation

### I Want to...

#### Display a Web Page

```vb
WebView21.Navigate "https://www.example.com"
```

→ Refer to [WebView2 Control - Navigation Methods](./WebView2.md#navigation-methods)

#### Execute JavaScript

```vb
Dim result As Variant
result = WebView21.JsRun("document.title")
```

→ Refer to [WebView2 Control - JavaScript Interaction](./WebView2.md#javascript-interaction)

#### Communicate Between Twinbasic and JavaScript

```vb
' Twinbasic sends to JavaScript
WebView21.PostWebMessage "Hello!"

' JavaScript sends to Twinbasic
window.chrome.webview.postMessage("Hello from JS");
```

→ Refer to [WebView2 Control - Message Passing](./WebView2.md#javascript-interaction)

#### Intercept HTTP Requests

```vb
WebView21.AddWebResourceRequestedFilter "*://*/*.png", wv2Image

Private Sub WebView21_WebResourceRequested(ByVal Request As WebView2Request, _
    ByVal Response As WebView2Response)
    ' Handle request
End Sub
```

→ Refer to [WebView2 Control - Web Resource Interception](./WebView2.md#resource-management)

#### Customize Right-Click Menu

```vb
Private Sub WebView21_UserContextMenu(X As Single, Y As Single)
    PopupMenu mnuCustomContext, vbPopupMenuRightButton, X, Y
End Sub
```

→ Refer to [WebView2 Control - Events](./WebView2.md#user-interaction-events)

#### Print to PDF

```vb
WebView21.PrintToPdf "C:\output.pdf"
```

→ Refer to [WebView2 Control - Advanced Features](./WebView2.md#advanced-features)

#### Configure Environment Options

```vb
WebView21.EnvironmentOptions.UserDataFolder = "C:\MyApp\Data"
WebView21.EnvironmentOptions.Language = "en-US"
```

→ Refer to [Environment Options](./WebView2EnvironmentOptions.md)

## Core Class Diagram

```
WebView2 (Main Control)
├── WebView2EnvironmentOptions (Environment Configuration)
├── WebView2Request (HTTP Request)
│   └── WebView2RequestHeaders (Request Headers)
│       └── WebView2HeadersCollection (Header Collection)
│           └── WebView2Header (Single Header)
└── WebView2Response (HTTP Response)
    └── WebView2ResponseHeaders (Response Headers)
        └── WebView2HeadersCollection (Header Collection)
            └── WebView2Header (Single Header)
```

## Main Functionality Modules

### 1. Web Content Display

- ✅ Load URL web pages
- ✅ Load custom HTML strings
- ✅ Virtual host mapping
- ✅ PDF export

### 2. Navigation Control

- ✅ Forward/backward navigation
- ✅ Page refresh
- ✅ Custom HTTP requests (POST, Headers)

### 3. JavaScript Interaction

- ✅ Execute JavaScript code
- ✅ Synchronously call JS functions
- ✅ Asynchronously call JS functions
- ✅ Bidirectional message passing

### 4. Object Sharing

- ✅ Expose COM objects to JavaScript
- ✅ Deferred invocation mode (avoid re-entrancy)

### 5. Event Handling

- ✅ Navigation events
- ✅ Permission request events
- ✅ Script dialog events
- ✅ Download events
- ✅ Web resource interception

### 6. Advanced Features

- ✅ Developer tools
- ✅ DevTools protocol
- ✅ Download manager
- ✅ Task manager
- ✅ Audio control
- ✅ Suspend/resume

## Development Workflow

### Step 1: Environment Setup

1. Install WebView2 Runtime
2. Reference WebView2 package
3. Add WebView2 control to form

→ Refer to [Getting Started](./Getting-started.md)

### Step 2: Basic Navigation

```vb
Private Sub Form_Load()
    ' Note: All WebView21 member operations must be done after WebView21_Ready()
End Sub

Private Sub WebView21_Ready()
    WebView21.DocumentURL = "https://www.example.com"
End Sub

Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, _
    ByVal WebErrorStatus As Long)
    ' Page loading complete
End Sub
```

### Step 3: JavaScript Interaction

```vb
' Execute JS
WebView21.ExecuteScript "document.body.style.background = 'red'"

' Get JS return value
Dim title As Variant
title = WebView21.JsProp("document.title")
```

### Step 4: Bidirectional Communication

```vb
' Twinbasic sends to JavaScript
WebView21.PostWebMessage "Hello"

Private Sub WebView21_JsMessage(ByVal Message As Variant)
    ' Receive JavaScript message
End Sub
```

### Step 5: Advanced Features

- Intercept HTTP requests
- Customize right-click menu
- Print PDF
- Virtual host mapping

## Common Questions

### 1. Control Not Displaying

Make sure to set `Visible = True` and properly set position and size.

### 2. Page Loading Failed

Check if WebView2 Runtime is installed and review the `Error` event.

### 3. JavaScript Call Timeout

Set `JsCallTimeOutSeconds` property to increase timeout.

### 4. Re-entrancy Problems

Use `UseDeferredEvents = True` and use `UseDeferredInvoke = True` in `AddObject`.

### 5. Permission Requests

Handle permission requests in the `PermissionRequested` event.

## Dependency Requirements

- Windows 7 SP1 or higher
- WebView2 Runtime (Evergreen) 86.0.616.0 or higher

## License

The WebView2 package follows its own license terms, see the LICENCE.md file in the package for details.

## Feedback and Support

For questions or suggestions, please provide feedback through:

- Submit an Issue
- Visit twinBASIC community

## Documentation Updates

Last updated: February 15, 2026
