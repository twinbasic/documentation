---
title: Enumerations
parent: WebView2 Package
nav_order: 8
---

# WebView2 Enumeration Types

This document describes all enumeration types defined in the WebView2 package.

## wv2PermissionKind

Permission type enumeration, used in `PermissionRequested` event.

```vb
Enum wv2PermissionKind
    wv2UnknownPermission = 0
    wv2Microphone = 1
    wv2Camera = 2
    wv2Geolocation = 3
    wv2Notifications = 4
    wv2Sensors = 5
    wv2ClipboardRead = 6
End Enum
```

| Value | Name                    | Description                          |
| ----- | ----------------------- | ------------------------------------ |
| 0     | `wv2UnknownPermission`  | Unknown permission                  |
| 1     | `wv2Microphone`         | Microphone access permission        |
| 2     | `wv2Camera`             | Camera access permission            |
| 3     | `wv2Geolocation`        | Geolocation access permission        |
| 4     | `wv2Notifications`      | Notification permission             |
| 5     | `wv2Sensors`           | Sensor access permission            |
| 6     | `wv2ClipboardRead`      | Clipboard read permission           |

**Usage Example:**

```vb
Private Sub WebView21_PermissionRequested(ByVal IsUserInitiated As Boolean, _
    ByRef State As wv2PermissionState, ByVal Uri As String, _
    ByVal PermissionKind As wv2PermissionKind)

    Select Case PermissionKind
        Case wv2Microphone
            State = wv2StateAllow
        Case wv2Camera
            State = wv2StateDeny
        Case wv2Geolocation
            State = wv2StateDefault
    End Select
End Sub
```

---

## wv2PermissionState

Permission state enumeration, used in `PermissionRequested` event.

```vb
Enum wv2PermissionState
    wv2StateDefault = 0
    wv2StateAllow = 1
    wv2StateDeny = 2
End Enum
```

| Value | Name              | Description                                     |
| ----- | ----------------- | ----------------------------------------------- |
| 0     | `wv2StateDefault` | Use default behavior (usually prompts the user) |
| 1     | `wv2StateAllow`   | Allow permission request                         |
| 2     | `wv2StateDeny`    | Deny permission request                          |

---

## wv2ErrorStatus

Web error status enumeration, used in `NavigationComplete` event.

```vb
Enum wv2ErrorStatus
    wv2StateUnknown = 0
    wv2CertificateCommonNameIsIncorrect = 1
    wv2CertificateExpired = 2
    wv2ClientCertificateContainsErrors = 3
    wv2CertificateRevoked = 4
    wv2CertificateIsInvalid = 5
    wv2ServerUnreachable = 6
    wv2Timeout = 7
    wv2ErrorHttpInvalidServerResponse = 8
    wv2ConnectionAborted = 9
    wv2ConnectionReset = 10
    wv2Disconnected = 11
    wv2CannotConnect = 12
    wv2HostNameNotResolved = 13
    wv2OperationCanceled = 14
    wv2RedirectFailed = 15
    wv2UnexpectedError = 16
    wv2ValidAuthenticationCredentialsRequired = 17
    wv2ValidProxyAuthenticationRequired = 18
End Enum
```

| Value | Name                                        | Description                                   |
| ----- | ------------------------------------------- | --------------------------------------------- |
| 0     | `wv2StateUnknown`                           | Unknown error                                 |
| 1     | `wv2CertificateCommonNameIsIncorrect`       | Certificate common name is incorrect          |
| 2     | `wv2CertificateExpired`                     | Certificate has expired                       |
| 3     | `wv2ClientCertificateContainsErrors`        | Client certificate contains errors            |
| 4     | `wv2CertificateRevoked`                     | Certificate has been revoked                  |
| 5     | `wv2CertificateIsInvalid`                   | Certificate is invalid                        |
| 6     | `wv2ServerUnreachable`                      | Server unreachable                            |
| 7     | `wv2Timeout`                                | Connection timeout                            |
| 8     | `wv2ErrorHttpInvalidServerResponse`         | HTTP invalid server response                 |
| 9     | `wv2ConnectionAborted`                      | Connection aborted                            |
| 10    | `wv2ConnectionReset`                        | Connection reset                              |
| 11    | `wv2Disconnected`                           | Disconnected                                  |
| 12    | `wv2CannotConnect`                          | Cannot connect                                |
| 13    | `wv2HostNameNotResolved`                    | Host name cannot be resolved                 |
| 14    | `wv2OperationCanceled`                      | Operation canceled                            |
| 15    | `wv2RedirectFailed`                         | Redirect failed                               |
| 16    | `wv2UnexpectedError`                        | Unexpected error                              |
| 17    | `wv2ValidAuthenticationCredentialsRequired` | Valid authentication credentials required     |
| 18    | `wv2ValidProxyAuthenticationRequired`       | Valid proxy authentication required           |

**Usage Example:**

```vb
Private Sub WebView21_NavigationComplete(ByVal IsSuccess As Boolean, _
    ByVal WebErrorStatus As Long)

    If Not IsSuccess Then
        Select Case WebErrorStatus
            Case wv2Timeout
                MsgBox "Connection timeout!"
            Case wv2HostNameNotResolved
                MsgBox "Cannot resolve host name!"
            Case Else
                MsgBox "Navigation error: " & WebErrorStatus
        End Select
    End If
End Sub
```

---

## wv2KeyEventKind

Keyboard event type enumeration, used in `AcceleratorKeyPressed` event.

```vb
Enum wv2KeyEventKind
    wv2EventKeyDown = 0
    wv2EventKeyUp = 1
    wv2EventSystemKeyDown = 2
    wv2EventSystemKeyUp = 3
End Enum
```

| Value | Name                    | Description                           |
| ----- | ----------------------- | ------------------------------------- |
| 0     | `wv2EventKeyDown`       | Key pressed                           |
| 1     | `wv2EventKeyUp`         | Key released                         |
| 2     | `wv2EventSystemKeyDown` | System key pressed (like Alt)         |
| 3     | `wv2EventSystemKeyUp`   | System key released                   |

---

## wv2WebResourceContext

Web resource context type enumeration, used in `AddWebResourceRequestedFilter` method.

```vb
Enum wv2WebResourceContext
    wv2All = 0
    wv2Document = 1
    wv2Stylesheet = 2
    wv2Image = 3
    wv2Media = 4
    wv2Font = 5
    wv2Script = 6
    wv2XMLHttpRequest = 7
    wv2Fetch = 8
    wv2TextTrack = 9
    wv2EventSource = 10
    wv2WebSocket = 11
    wv2Manifest = 12
    wv2SignedExchange = 13
    wv2Ping = 14
    wv2CspViolationReport = 15
    wv2Other = 16
End Enum
```

| Value | Name                    | Description                           |
| ----- | ----------------------- | ------------------------------------- |
| 0     | `wv2All`                | All resource types                   |
| 1     | `wv2Document`           | HTML document                        |
| 2     | `wv2Stylesheet`         | CSS stylesheet                       |
| 3     | `wv2Image`              | Image resources                      |
| 4     | `wv2Media`              | Media resources (audio/video)        |
| 5     | `wv2Font`               | Font resources                       |
| 6     | `wv2Script`             | JavaScript script                    |
| 7     | `wv2XMLHttpRequest`     | XMLHttpRequest requests              |
| 8     | `wv2Fetch`              | Fetch API requests                   |
| 9     | `wv2TextTrack`          | Text track                           |
| 10    | `wv2EventSource`        | EventSource (SSE)                   |
| 11    | `wv2WebSocket`          | WebSocket                            |
| 12    | `wv2Manifest`           | Web application manifest            |
| 13    | `wv2SignedExchange`     | Signed exchange                      |
| 14    | `wv2Ping`               | Ping request                         |
| 15    | `wv2CspViolationReport` | CSP violation report                 |
| 16    | `wv2Other`              | Other types                          |

**Usage Example:**

```vb
' Intercept all image requests
WebView21.AddWebResourceRequestedFilter("*://*/*.png", wv2Image)
WebView21.AddWebResourceRequestedFilter("*://*/*.jpg", wv2Image)

' Intercept all XMLHttpRequests
WebView21.AddWebResourceRequestedFilter("*://api.example.com/*", wv2XMLHttpRequest)
```

---

## wv2ProcessFailedKind

Process failure type enumeration, used in `ProcessFailed` event.

```vb
Enum wv2ProcessFailedKind
    wv2BrowserProcessExited = 0
    wv2RenderProcessExited = 1
    wv2RenderProcessUnresponsive = 2
    wv2FrameRenderProcessExited = 3
    wv2UtilityProcessExited = 4
    wv2SandboxHelperProcessExited = 5
    wv2GpuProcessExited = 6
    wv2PpapiPluginProcessExited = 7
    wv2PpapiBrokerProcessExited = 8
    wv2UnknownProcessExited = 9
End Enum
```

| Value | Name                            | Description                       |
| ----- | ------------------------------- | --------------------------------- |
| 0     | `wv2BrowserProcessExited`       | Browser process exited           |
| 1     | `wv2RenderProcessExited`        | Render process exited            |
| 2     | `wv2RenderProcessUnresponsive`  | Render process unresponsive      |
| 3     | `wv2FrameRenderProcessExited`   | Frame render process exited      |
| 4     | `wv2UtilityProcessExited`       | Utility process exited           |
| 5     | `wv2SandboxHelperProcessExited` | Sandbox helper process exited    |
| 6     | `wv2GpuProcessExited`           | GPU process exited               |
| 7     | `wv2PpapiPluginProcessExited`   | PPAPI plugin process exited      |
| 8     | `wv2PpapiBrokerProcessExited`   | PPAPI Broker process exited      |
| 9     | `wv2UnknownProcessExited`       | Unknown process exited           |

**Usage Example:**

```vb
Private Sub WebView21_ProcessFailed(ByVal Kind As wv2ProcessFailedKind)
    Select Case Kind
        Case wv2RenderProcessExited
            MsgBox "Render process exited, page may need refresh"
        Case wv2RenderProcessUnresponsive
            MsgBox "Page unresponsive"
    End Select
End Sub
```

---

## wv2ScriptDialogKind

Script dialog type enumeration, used in `ScriptDialogOpening` event.

```vb
Enum wv2ScriptDialogKind
    wv2DialogAlert = 0
    wv2DialogConfirm = 1
    wv2DialogPrompt = 2
    wv2DialogBeforeUnload = 3
End Enum
```

| Value | Name                    | Description                                |
| ----- | ----------------------- | ------------------------------------------ |
| 0     | `wv2DialogAlert`        | Alert dialog (`alert()`)                   |
| 1     | `wv2DialogConfirm`      | Confirm dialog (`confirm()`)                |
| 2     | `wv2DialogPrompt`       | Prompt dialog (`prompt()`)                 |
| 3     | `wv2DialogBeforeUnload` | Page leave confirmation dialog             |

**Usage Example:**

```vb
Private Sub WebView21_ScriptDialogOpening(ByVal ScriptDialogKind As wv2ScriptDialogKind, _
    ByRef Accept As Boolean, ByVal ResultText As String, ByVal URI As String, _
    ByVal Message As String, ByVal DefaultText As String)

    Select Case ScriptDialogKind
        Case wv2DialogAlert
            MsgBox Message, vbExclamation, "Notification"
            Accept = True
        Case wv2DialogConfirm
            Accept = (MsgBox(Message, vbYesNo + vbQuestion) = vbYes)
        Case wv2DialogPrompt
            ResultText = InputBox(Message, "Input", DefaultText)
            Accept = (ResultText <> "")
    End Select
End Sub
```

---

## wv2HostResourceAccessKind

Host resource access type enumeration, used in `SetVirtualHostNameToFolderMapping` method.

```vb
Enum wv2HostResourceAccessKind
    wv2ResourceDeny = 0
    wv2ResourceAllow = 1
    wv2ResourceDenyCors = 2
End Enum
```

| Value | Name                  | Description                               |
| ----- | --------------------- | ----------------------------------------- |
| 0     | `wv2ResourceDeny`     | Deny access                               |
| 1     | `wv2ResourceAllow`    | Allow access                              |
| 2     | `wv2ResourceDenyCors` | Allow access but deny CORS requests       |

**Usage Example:**

```vb
' Allow access to local folder
WebView21.SetVirtualHostNameToFolderMapping("app.local", _
    "C:\\MyApp\\Resources", wv2ResourceAllow)

' Use in HTML
' <img src="http://app.local/image.png">
```

---

## wv2PrintOrientation

Print orientation enumeration, used in `PrintToPdf` method.

```vb
Enum wv2PrintOrientation
    wv2PrintPortrait = 0
    wv2PrintLandscape = 1
End Enum
```

| Value | Name                | Description      |
| ----- | ------------------- | ---------------- |
| 0     | `wv2PrintPortrait`  | Portrait print   |
| 1     | `wv2PrintLandscape` | Landscape print  |

**Usage Example:**

```vb
' Landscape print to PDF
WebView21.PrintToPdf "C:\\output.pdf", wv2PrintLandscape
```

---

## wv2DefaultDownloadCornerAlign

Default download dialog corner alignment enumeration.

```vb
Enum wv2DefaultDownloadCornerAlign
    wv2CornerTopLeft = 0
    wv2CornerTopRight = 1
    wv2CornerBottomLeft = 2
    wv2CornerBottomRight = 3
End Enum
```

| Value | Name                   | Description |
| ----- | ---------------------- | ----------- |
| 0     | `wv2CornerTopLeft`     | Top-left    |
| 1     | `wv2CornerTopRight`    | Top-right   |
| 2     | `wv2CornerBottomLeft`  | Bottom-left |
| 3     | `wv2CornerBottomRight` | Bottom-right|
