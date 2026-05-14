---
title: EnvironmentOptions
parent: CefBrowser
grand_parent: CEF Package
permalink: /tB/Packages/CEF/CefBrowser/EnvironmentOptions
has_toc: false
---

# CefEnvironmentOptions class
{: .no_toc }

Carries the host's pre-creation configuration for the CEF environment — runtime folder, user-data folder, and the optional debug-log destination. Surfaces on every [**CefBrowser**](.) control as its **EnvironmentOptions** property; the control instantiates one automatically before raising the [**Create**](.#create) event.

The fields below take effect only while the CEF runtime is being launched — that is, *before or during* the control's [**Create**](.#create) event. Assigning them after that point has no effect on the live environment.

```tb
Private Sub CefBrowser1_Create()
    CefBrowser1.EnvironmentOptions.UserDataFolder = _
        Environ$("APPDATA") & "\MyApp\CEF\"
    CefBrowser1.EnvironmentOptions.LogFilePath = _
        Environ$("APPDATA") & "\MyApp\CEF\debug.log"
    CefBrowser1.EnvironmentOptions.LogSeverity = CefLogWarning
End Sub
```

The type itself is `Private Class` — you reach instances only through the control's **EnvironmentOptions** property and cannot declare a variable typed as **CefEnvironmentOptions** from outside the package.

## Properties

### BrowserExecutableFolder
{: .no_toc }

Path to the folder containing `libcef.dll` and its accompanying runtime files. **String**. Default: empty (the runtime is loaded from `%LocalAppData%\twinBASIC_CEF_Runtime\<version-stamped-folder>` — see [Installing runtime files](../#installing-runtime-files)).

Set this to point at a portable side-by-side deployment, e.g. a CEF folder shipped beside the application executable:

```tb
Private Sub CefBrowser1_Create()
    CefBrowser1.EnvironmentOptions.BrowserExecutableFolder = _
        App.Path & "\cef145_win64"
End Sub
```

If `libcef.dll` is not found at the configured (or default) location, the [**Error**](.#error) event fires with the exact path that was searched.

### LogFilePath
{: .no_toc }

Path to a writable file CEF will append its debug log to. **String**. Default: empty (no log file is written, regardless of [**LogSeverity**](#logseverity)).

Used together with [**LogSeverity**](#logseverity) — messages at or above the chosen severity are written to this file. The log is appended across runs; rotate or delete the file as needed.

### LogSeverity
{: .no_toc }

The minimum severity at which CEF records messages to the log file named by [**LogFilePath**](#logfilepath). [**CefLogSeverity**](../Enumerations/CefLogSeverity). Default: **CefLogDisable** (logging off).

Set to **CefLogWarning** or **CefLogError** when investigating runtime issues, and back to **CefLogDisable** for normal use.

### UserDataFolder
{: .no_toc }

Path to the folder CEF uses for the user profile — cache, cookies, history, local storage, and so on. **String**. Default: empty (the runtime picks a folder under `%LocalAppData%\twinBASIC_CEF\<ProjectName>\`).

Set a writable, application-specific path when the default would end up in a read-only location, or when multiple deployments of the same application must keep their profiles separate. The same folder cannot be opened by two CEF processes simultaneously — if it's already locked, the [**Error**](.#error) event fires with *"CEF cache path already locked by another process"*.

### See Also

- [CefBrowser control class](.)
- [Create event](.#create)
- [Installing runtime files](../#installing-runtime-files)
- [Overriding the runtime location](../#overriding-the-runtime-location)
- [WebView2EnvironmentOptions](../../WebView2/WebView2/EnvironmentOptions) -- the WebView2 counterpart
