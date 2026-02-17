---
title: Properties
parent: WebView2 Package
nav_order: 6
---

# WebView2 Properties Reference

The WebView2 control provides rich properties to control its behavior and state.

## Property List

### DocumentURL

Sets the URL to open. URIs need a protocol prefix, such as http://. For example: https://www.google.com

**Type:** String (Read-only)

**Example:**

```vb
WebView21.Navigate "https://www.example.com"
Debug.Print WebView21.DocumentURL
```

---

### DocumentTitle

Returns the current document title provided by HTML content.

**Type:** String (Read-only)

**Example:**

```vb
Me.Caption = WebView21.DocumentTitle
```

---

### ZoomFactor

Sets or gets the overall zoom factor. For example, a value of 1.5 represents a 50% zoom.

**Type:** Double

**Example:**

```vb
WebView21.ZoomFactor = 1.5  ' Zoom in 50%
Debug.Print WebView21.ZoomFactor
```

---

### BrowserProcessId

Gets the ProcessID of the external browser EXE process.

**Type:** Long (Read-only)

**Example:**

```vb
Debug.Print "Browser Process ID: " & WebView21.BrowserProcessId
```

---

### CanGoBack

Determines if there is backward navigation history.

**Type:** Boolean (Read-only)

**Example:**

```vb
If WebView21.CanGoBack Then
    WebView21.GoBack
End If
```

---

### CanGoForward

Determines if there is forward navigation history.

**Type:** Boolean (Read-only)

**Example:**

```vb
If WebView21.CanGoForward Then
    WebView21.GoForward
End If
```

---

### hWnd

Returns the container window handle.

**Type:** LongPtr (Read-only)

**Example:**

```vb
Debug.Print "Window Handle: 0x" & Hex(WebView21.hWnd)
```

---

### IsScriptEnabled

Controls whether JavaScript is enabled within the webview.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsScriptEnabled = False  ' Disable JavaScript
```

---

### IsWebMessageEnabled

Controls whether PostWebMessage functionality is enabled.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsWebMessageEnabled = True
```

---

### AreDefaultScriptDialogsEnabled

Controls whether default script dialogs are enabled (such as JavaScript alert() function). Set to False and listen to `ScriptDialogOpening` event to implement your own dialogs.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.AreDefaultScriptDialogsEnabled = False
```

---

### IsStatusBarEnabled

Controls whether the status bar is enabled.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsStatusBarEnabled = False
```

---

### AreDevToolsEnabled

Controls whether users are allowed to open DevTools through context menu or accelerator keys (does not affect `OpenDevToolsWindow` function).

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.AreDevToolsEnabled = False
```

---

### AreDefaultContextMenusEnabled

Controls whether the default Edge context menu is enabled. Set to False and listen to `UserContextMenu` event to use your own.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.AreDefaultContextMenusEnabled = False
```

---

### AreHostObjectsAllowed

Controls whether `AddObject` functionality can be used to share host COM objects with the JavaScript engine.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.AreHostObjectsAllowed = True
```

---

### IsZoomControlEnabled

Controls whether users can change the zoom factor using Ctrl++/Ctrl+-/Ctrl+mouse wheel.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsZoomControlEnabled = False
```

---

### IsBuiltInErrorPageEnabled

Controls whether the built-in error page is enabled (such as 404 navigation errors).

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsBuiltInErrorPageEnabled = False
```

---

### UserAgent

Sets the UserAgent string to be used in HTTP request headers.

**Type:** String (Read/Write)

**Example:**

```vb
WebView21.UserAgent = "MyApp/1.0"
```

**Note:** Use `SupportsUserAgentFeatures` to check if this feature is supported.

---

### AreBrowserAcceleratorKeysEnabled

Controls whether all default accelerator keys are enabled. For example, F5 to reload.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.AreBrowserAcceleratorKeysEnabled = False
```

**Note:** Use `SupportsAcceleratorKeysFeatures` to check if this feature is supported.

---

### IsPasswordAutoSaveEnabled

Controls whether password information is automatically saved.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsPasswordAutoSaveEnabled = False
```

**Note:** Use `SupportsAutoFillFeatures` to check if this feature is supported.

---

### IsGeneralAutoFillEnabled

Controls whether general form information is saved and auto-filled.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsGeneralAutoFillEnabled = False
```

**Note:** Use `SupportsAutoFillFeatures` to check if this feature is supported.

---

### IsPinchZoomEnabled

Controls whether pinch gestures control zoom on touch devices.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsPinchZoomEnabled = False
```

**Note:** Use `SupportsPinchZoomFeatures` to check if this feature is supported.

---

### IsSwipeNavigationEnabled

Controls whether swipe gestures control page navigation on touch devices.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.IsSwipeNavigationEnabled = False
```

**Note:** Use `SupportsSwipeNavigationFeatures` to check if this feature is supported.

---

### IsMuted

Controls whether audio is muted from the webview.

**Type:** Boolean (Read/Write)

**Default Value:** False

**Example:**

```vb
WebView21.IsMuted = True
```

**Note:** Use `SupportsAudioFeatures` to check if this feature is supported.

---

### IsDocumentPlayingAudio

Indicates whether the WebView2 current document is playing audio.

**Type:** Boolean (Read-only)

**Example:**

```vb
If WebView21.IsDocumentPlayingAudio Then
    Debug.Print "Audio is playing"
End If
```

**Note:** Use `SupportsAudioFeatures` to check if this feature is supported.

---

### IsSuspended

Indicates whether WebView2 processing/rendering is suspended.

**Type:** Boolean (Read-only)

**Example:**

```vb
If WebView21.IsSuspended Then
    WebView21.Resume
End If
```

**Note:** Use `SupportsSuspendResumeFeatures` to check if this feature is supported.

---

### IsDefaultDownloadDialogOpen

Indicates whether the built-in download manager dialog is currently open.

**Type:** Boolean (Read-only)

**Example:**

```vb
If WebView21.IsDefaultDownloadDialogOpen Then
    WebView21.CloseDefaultDownloadDialog
End If
```

**Note:** Use `SupportsDownloadDialogFeatures` to check if this feature is supported.

---

### EnvironmentOptions

Environment options configuration object.

**Type:** WebView2EnvironmentOptions (Read/Write)

**Example:**

```vb
WebView21.EnvironmentOptions.UserDataFolder = "C:\MyAppData"
```

See [WebView2EnvironmentOptions.md](WebView2EnvironmentOptions.md) for detailed documentation.

---

### UseDeferredEvents

Controls whether to use deferred event handling.

**Type:** Boolean (Read/Write)

**Default Value:** True

**Example:**

```vb
WebView21.UseDeferredEvents = False
```

---

### AdditionalAllowedFrameAncestors

Sets additional allowed frame ancestors.

**Type:** String (Read/Write)

**Example:**

```vb
WebView21.AdditionalAllowedFrameAncestors = "https://trusted-domain.com"
```

---

### BackColor

The color applied when WebView2 loads.

**Type:** OLE_COLOR (Read/Write)

**Default Value:** &Ha0bd95

**Example:**

```vb
WebView21.BackColor = vbWhite
```

---

### JsCallTimeOutSeconds

Sets the JavaScript call timeout in seconds.

**Type:** Double (Read/Write)

**Example:**

```vb
WebView21.JsCallTimeOutSeconds = 30
```

---

## Feature Support Properties

The following properties are used to check if specific features are supported:

### SupportsNavigateCustomFeatures

Indicates whether custom navigation features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** CoreWebView2 is not Nothing

---

### SupportsSuspendResumeFeatures

Indicates whether suspend/resume features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** CoreWebView3 is not Nothing

---

### SupportsAudioFeatures

Indicates whether audio features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** CoreWebView8 is not Nothing

---

### SupportsDownloadDialogFeatures

Indicates whether download dialog features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** CoreWebView9 is not Nothing

---

### SupportsTaskManagerFeatures

Indicates whether task manager features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** CoreWebView7 is not Nothing

---

### SupportsFolderMappingFeatures

Indicates whether folder mapping features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** CoreWebView5 is not Nothing

---

### SupportsPdfFeatures

Indicates whether PDF features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** CoreWebView7 is not Nothing

---

### SupportsUserAgentFeatures

Indicates whether UserAgent features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** Settings2 is not Nothing

---

### SupportsAcceleratorKeysFeatures

Indicates whether accelerator key features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** Settings3 is not Nothing

---

### SupportsAutoFillFeatures

Indicates whether auto-fill features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** Settings4 is not Nothing

---

### SupportsPinchZoomFeatures

Indicates whether pinch zoom features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** Settings5 is not Nothing

---

### SupportsSwipeNavigationFeatures

Indicates whether swipe navigation features are supported.

**Type:** Boolean (Read-only)

**Return Condition:** Settings6 is not Nothing

---

## Usage Examples

### Check Feature Support

```vb
If WebView21.SupportsPdfFeatures Then
    WebView21.PrintToPdf "C:\output.pdf"
Else
    MsgBox "PDF export not supported in this WebView2 version"
End If

If WebView21.SupportsAudioFeatures Then
    WebView21.IsMuted = True
End If
```

### Configure WebView2

```vb
With WebView21
    .IsScriptEnabled = True
    .AreDefaultContextMenusEnabled = False
    .AreDevToolsEnabled = False
    .UserAgent = "MyApp/2.0"
    .ZoomFactor = 1.0
End With
```

