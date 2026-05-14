---
title: Customize the UserDataFolder
parent: CEF
grand_parent: Tutorials
nav_order: 2
permalink: /Tutorials/CEF/Customize-UserDataFolder
---

# Customize the UserDataFolder

At runtime, CEF needs a working folder for the user profile — cache, cookies, history, local storage, password manager, and the per-instance lock file that prevents two browser processes from sharing the same profile. By default the runtime picks a folder under `%LocalAppData%\twinBASIC_CEF\<ProjectName>\instance-<N>\`, but that default is not always appropriate.

A few situations where the default goes wrong:

- **Office add-ins**, where the host process is `MSACCESS.EXE` or `EXCEL.EXE` — the default per-process layout interferes with the host's own profile.
- **Kiosk installations**, where the application runs under a low-privilege account that can't write under `%LocalAppData%`.
- **Portable deployments**, where all state must live next to the executable on a USB stick or network share.
- **Multi-user / hosted scenarios**, where each end-user needs an isolated profile.

In every one of these, override the default by assigning [**EnvironmentOptions.UserDataFolder**](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions#userdatafolder) during the control's [**Create**](../../tB/Packages/CEF/CefBrowser/#create) event:

```tb
Private Sub CefBrowser1_Create()
    CefBrowser1.EnvironmentOptions.UserDataFolder = _
        Environ$("APPDATA") & "\MyApp\CEF\"
End Sub
```

The folder is created automatically if it doesn't exist. The path must be writable by the current user — a read-only path raises the [**Error**](../../tB/Packages/CEF/CefBrowser/#error) event when the helper browser process tries to launch.

## Why the Create event

CEF reads the environment options *once*, when the helper browser process is launched. The [**Create**](../../tB/Packages/CEF/CefBrowser/#create) event fires immediately before that launch, which makes it the right place to override the defaults. Assigning [**UserDataFolder**](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions#userdatafolder) any later (e.g. inside [**Ready**](../../tB/Packages/CEF/CefBrowser/#ready)) has no effect on the running browser.

## Sharing a folder across instances

A single user-data folder cannot be opened by two CEF processes at once — the runtime takes an exclusive lock on it for the lifetime of the browser process. Two **CefBrowser** controls in the *same* application share the helper process and therefore the same lock, so they cooperate fine; two *separate* applications pointing at the same folder collide.

When a collision is detected and [**UserDataFolder**](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions#userdatafolder) is left at its default, the control automatically retries with the next `instance-N` sub-folder. When the host has explicitly set a path, the lock failure instead appears as a CEF initialisation error (*"CEF cache path already locked by another process"*) — handle it in the [**Error**](../../tB/Packages/CEF/CefBrowser/#error) event:

```tb
Private Sub CefBrowser1_Error(ByVal code As Long, ByVal msg As String)
    If InStr(msg, "already locked") > 0 Then
        MsgBox "Another copy of this application is already running. " & _
               "Close it before opening another window.", _
               vbExclamation
    End If
End Sub
```

## Logging the runtime's output

Two related fields on [**EnvironmentOptions**](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions) configure the CEF debug log, useful when investigating runtime issues:

```tb
Private Sub CefBrowser1_Create()
    CefBrowser1.EnvironmentOptions.UserDataFolder = _
        Environ$("APPDATA") & "\MyApp\CEF\"
    CefBrowser1.EnvironmentOptions.LogFilePath = _
        Environ$("APPDATA") & "\MyApp\CEF\debug.log"
    CefBrowser1.EnvironmentOptions.LogSeverity = CefLogWarning
End Sub
```

[**LogFilePath**](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions#logfilepath) is appended to across runs — rotate or delete it from your own code if it needs to be capped. [**LogSeverity**](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions#logseverity) controls the threshold; **CefLogDisable** (the default) writes nothing regardless of the path.

## See also

- [CefEnvironmentOptions](../../tB/Packages/CEF/CefBrowser/EnvironmentOptions) — full reference for the pre-creation options.
- [Customize the UserDataFolder (WebView2)](../WebView2/Customize-UserDataFolder) — the same idea applied to the [**WebView2**](../../tB/Packages/WebView2/WebView2/) control.
