---
title: WebView2 Package
parent: Package Reference
nav_order: 1
permalink: /PackageReference/Webview2/
---

# WebView2 Development Documentation

`twinBASIC`'s WebView2 package provides complete functionality for embedding Microsoft Edge WebView2 controls in Windows applications. Based on the Microsoft Edge browser kernel, it can display modern web content and interact bidirectionally with JavaScript.

## Documentation Table of Contents

### Overview Documents

| Document   | Description                      |
| ---------- | -------------------------------- |
| [Documentation Overview](./README.md) | Documentation summary and quick navigation |
| [Quick Start](./Getting-started.md)     | Quick start guide                 |

### Core Class References

| Document   | Description                      |
| ---------- | -------------------------------- |
| [WebView2 Control](./WebView2.md)              | Main control class overview      |
| [WebView2 Events](./WebView2-Events.md)         | Detailed description of all events |
| [WebView2 Properties](./WebView2-Properties.md)| Detailed description of all properties |
| [WebView2 Methods](./WebView2-Methods.md)       | Detailed description of all methods |
| [Environment Options](./WebView2EnvironmentOptions.md) | Configure WebView2 environment parameters |
| [Enumeration Types](./Enumerations.md)          | All enumeration type definitions |

### HTTP Related

| Document   | Description                      |
| ---------- | -------------------------------- |
| [HTTP Request](./WebView2Request.md)             | Web resource request object     |
| [HTTP Response](./WebView2Response.md)           | Web resource response object    |
| [Request Headers](./WebView2RequestHeaders.md)  | HTTP request header management  |
| [Response Headers](./WebView2ResponseHeaders.md)| HTTP response header management  |
| [Header Collection](./WebView2HeadersCollection.md)| HTTP header collection enumeration |
| [Header Info](./WebView2Header.md)               | Single HTTP header information  |

### Advanced Topics

| Document   | Description                      |
| ---------- | -------------------------------- |
| [Deferred Callback](./DeferredCallback.md)       | Deferred event and callback mechanism |

## Core Functionality Overview

### 1. Web Content Display
- Load URL web pages
- Load custom HTML strings
- Support local folder virtual host mapping
- Print to PDF

### 2. Navigation Control
- Forward/backward navigation
- Page refresh
- Custom HTTP request navigation (supports POST data, custom Headers)

### 3. JavaScript Interaction
- Execute JavaScript code
- Synchronously call JS functions and get return values
- Asynchronously call JS functions
- Send messages to JavaScript
- Receive JavaScript messages

### 4. Object Sharing
- Expose COM objects to JavaScript
- Support deferred invocation mode (avoid re-entrancy problems)

### 5. Event Handling
- **Lifecycle events**: Create, Ready, Error
- **Navigation events**: NavigationStarting, NavigationComplete, SourceChanged
- **Page events**: DocumentTitleChanged, DOMContentLoaded
- **Permission events**: PermissionRequested
- **User interaction**: UserContextMenu, AcceleratorKeyPressed
- **Script dialogs**: ScriptDialogOpening
- **Resource requests**: WebResourceRequested
- **Download events**: DownloadStarting
- **New window**: NewWindowRequested
- **JavaScript communication**: JsMessage, JsAsyncResult
- **System events**: ProcessFailed, SuspendCompleted, SuspendFailed
- **Print events**: PrintToPdfCompleted, PrintToPdfFailed
- **Developer tools**: DevToolsProtocolResponse

### 6. Advanced Features
- Developer tools
- DevTools protocol invocation
- Built-in download manager
- Task manager
- Audio control (mute, detect playback status)
- Suspend/resume (for tab management)

## Package Structure

```
WebView2Package/
├── Sources/
│   ├── Classes/
│   │   ├── WebView2.twin                    # Main control class
│   │   ├── WebView2EnvironmentOptions.twin  # Environment options
│   │   ├── WebView2Request.twin             # HTTP request
│   │   ├── WebView2Response.twin            # HTTP response
│   │   ├── WebView2RequestHeaders.twin      # Request headers
│   │   ├── WebView2ResponseHeaders.twin     # Response headers
│   │   ├── WebView2HeadersCollection.twin   # Header collection
│   │   ├── WebView2Header.twin              # Single header info
│   │   ├── WebView2DeferredCallback.twin    # Deferred callback
│   │   ├── WebView2DeferredRaiseEvent.twin  # Deferred event
│   │   ├── WebView2ExecuteScriptCompleteHandler.twin  # Script execution complete
│   │   └── WebView2DevToolsProtocolCallback.twin      # DevTools callback
│   ├── Support/
│   │   ├── Enumerations.twin    # Enumeration definitions
│   │   ├── Types.twin           # Type definitions
│   │   └── WebView2Misc.twin    # Helper functions
│   └── Abstract/                # COM interface definitions
├── Resources/                   # Resource files
└── Miscellaneous/               # Icons and other resources
```

## Dependency Requirements

- Windows system needs **WebView2 Runtime (Evergreen)** installed
- Minimum supported WebView2 version: 86.0.616.0

## License

The WebView2 package follows its own license terms, see the LICENCE.md file in the package for details.
