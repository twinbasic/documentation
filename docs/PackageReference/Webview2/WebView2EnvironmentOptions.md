---
title: EnvironmentOptions
parent: WebView2 Package
nav_order: 9
---

# WebView2EnvironmentOptions Class

`WebView2EnvironmentOptions` class is used to configure WebView2 environment options. These options must be set before or during WebView2 creation to take effect.

## Class Information

| Property       | Value                                                 |
| -------------- | ----------------------------------------------------- |
| Class Name     | `WebView2EnvironmentOptions`                           |
| ClassId        | `185E63C0-E641-47ED-B6A9-8565168A7FCF`               |
| InterfaceId    | `E610040A-F023-4DC4-A766-2C2B75BDCC11`               |
| COM Creatable  | No                                                     |
| Access Modifier| `Private` (accessed via WebView2.EnvironmentOptions)  |

## Properties

### BrowserExecutableFolder

```vb
Public BrowserExecutableFolder As String
```

Specifies the folder path for WebView2 runtime browser executable.

- If left empty, system default WebView2 runtime will be used
- Can be used to specify a fixed version of WebView2 runtime

**Note:** Must be set before or during the `Create` event.

**Example:**

```vb
Private Sub WebView21_Create()
    WebView21.EnvironmentOptions.BrowserExecutableFolder = _
        "C:\\WebView2Runtime\\106.0.1370.47"
End Sub
```

---

### UserDataFolder

```vb
Public UserDataFolder As String
```

Specifies the path for the user data folder, used to store browser data (cookies, cache, local storage, etc.).

- If left empty, default location will be used
- Each WebView2 instance needs an independent user data folder or subfolder
- Folder path cannot be too long, otherwise creation may fail

**Note:** Must be set before or during the `Create` event.

**Example:**

```vb
Private Sub WebView21_Create()
    WebView21.EnvironmentOptions.UserDataFolder = _
        Environ("APPDATA") & "\\MyApp\\WebView2Data"
End Sub
```

**Best Practices:**

- Place user data folder in application data directory
- Use independent subfolder for each instance to avoid locking issues
- Ensure the folder path is not too long, otherwise creation may fail

---

### AdditionalBrowserArguments

```vb
Public AdditionalBrowserArguments As String
```

Specifies additional arguments to pass to the browser core.

**Note:** Must be set before or during the `Create` event.

**Common Arguments:**

| Argument                                     | Description                        |
| -------------------------------------------- | ---------------------------------- |
| `--disable-extensions`                       | Disable extensions                 |
| `--disable-web-security`                     | Disable web security (dev only)    |
| `--allow-file-access-from-files`             | Allow local file access            |
| `--autoplay-policy=no-user-gesture-required` | Autoplay media without user gesture |

**Example:**

```vb
Private Sub WebView21_Create()
    WebView21.EnvironmentOptions.AdditionalBrowserArguments = _
        "--disable-extensions --autoplay-policy=no-user-gesture-required"
End Sub
```

---

### Language

```vb
Public Language As String
```

Specifies the language used by the browser, affects `Accept-Language` HTTP header.

- Use RFC 4646 language tag format, such as `"en-US"`, `"zh-CN"`
- Multiple languages separated by commas

**Note:** Must be set before or during the `Create` event.

**Example:**

```vb
Private Sub WebView21_Create()
    WebView21.EnvironmentOptions.Language = "en-US,en;q=0.9,zh;q=0.8"
End Sub
```

---

### TargetCompatibleBrowserVersion

```vb
Public TargetCompatibleBrowserVersion As String = "86.0.616.0"
```

Specifies the minimum required WebView2 runtime version.

- Default: `"86.0.616.0"`
- If system WebView2 version is lower than this value, creation will fail

**Note:** Must be set before or during the `Create` event.

**Example:**

```vb
Private Sub WebView21_Create()
    ' Require WebView2 Runtime 100.0 or higher
    WebView21.EnvironmentOptions.TargetCompatibleBrowserVersion = "100.0.1185.36"
End Sub
```

---

### AllowSingleSignOnUsingOSPrimaryAccount

```vb
Public AllowSingleSignOnUsingOSPrimaryAccount As Boolean
```

Whether to allow using OS primary account for single sign-on (SSO).

- Default: `False`
- When enabled, WebView2 can use credentials of the currently logged-in Windows user for authentication

**Note:** Must be set before or during the `Create` event.

**Example:**

```vb
Private Sub WebView21_Create()
    WebView21.EnvironmentOptions.AllowSingleSignOnUsingOSPrimaryAccount = True
End Sub
```

---

### ExclusiveUserDataFolderAccess

```vb
Public ExclusiveUserDataFolderAccess As Boolean
```

Whether to require exclusive access to the user data folder.

- Default: `False`
- When enabled, if user data folder is already in use by another WebView2 instance, creation will fail

**Note:** Must be set before or during the `Create` event.

**Example:**

```vb
Private Sub WebView21_Create()
    WebView21.EnvironmentOptions.ExclusiveUserDataFolderAccess = True
End Sub
```

---

### EnableTrackingPrevention

```vb
Public EnableTrackingPrevention As Boolean = True
```

Whether to enable tracking prevention feature.

- Default: `True`
- When enabled, WebView2 will block known trackers

**Note:** Must be set before or during the `Create` event.

**Example:**

```vb
Private Sub WebView21_Create()
    ' Disable tracking prevention
    WebView21.EnvironmentOptions.EnableTrackingPrevention = False
End Sub
```

## Usage Examples

### Complete Configuration Example

```vb
Private Sub WebView21_Create()
    With WebView21.EnvironmentOptions
        ' Specify user data folder
        .UserDataFolder = Environ("LOCALAPPDATA") & "\\MyApp\\WebView2"

        ' Set language
        .Language = "en-US"

        ' Enable single sign-on
        .AllowSingleSignOnUsingOSPrimaryAccount = True

        ' Enable tracking prevention
        .EnableTrackingPrevention = True

        ' Additional browser arguments
        .AdditionalBrowserArguments = "--autoplay-policy=no-user-gesture-required"

        ' Set minimum version requirement
        .TargetCompatibleBrowserVersion = "100.0.0.0"
    End With
End Sub
```

### Multi-Instance Configuration

When multiple WebView2 instances are needed, each instance should use an independent user data subfolder:

```vb
Private InstanceCount As Long = 0

Private Sub CreateWebViewWithUniqueFolder()
    Dim wv As New WebView2
    InstanceCount = InstanceCount + 1

    ' Use Create event handler to dynamically set
    AddHandler wv.Create, AddressOf WebView_Create

    Controls.Add wv
End Sub

Private Sub WebView_Create(Sender As Object)
    Dim wv As WebView2 = CType(Sender, WebView2)
    wv.EnvironmentOptions.UserDataFolder = _
        Environ("LOCALAPPDATA") & "\\MyApp\\WebView2_" & InstanceCount
End Sub
```

**Note:** The WebView2 class has implemented an automatic retry mechanism internally. When the user data folder is locked, it will automatically try to create a subfolder.

## Property Setting Timing

| Property                                     | Setting Timing          |
| -------------------------------------------- | ----------------------- |
| `BrowserExecutableFolder`                    | Before/during Create event |
| `UserDataFolder`                             | Before/during Create event |
| `AdditionalBrowserArguments`                | Before/during Create event |
| `Language`                                  | Before/during Create event |
| `TargetCompatibleBrowserVersion`            | Before/during Create event |
| `AllowSingleSignOnUsingOSPrimaryAccount`    | Before/during Create event |
| `ExclusiveUserDataFolderAccess`             | Before/during Create event |
| `EnableTrackingPrevention`                  | Before/during Create event |

## Notes

1. **Setting Timing**: All properties must be set before or during the `Create` event, setting afterwards has no effect
2. **User Data Folder**: Ensure the application has read/write permissions for the specified user data folder
3. **Version Compatibility**: `TargetCompatibleBrowserVersion` should not be set too high, otherwise may not run on older systems
4. **Argument Security**: Arguments in `AdditionalBrowserArguments` may affect security, use cautiously in production environment
