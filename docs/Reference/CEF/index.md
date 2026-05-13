---
title: CEF Package
parent: Packages
grand_parent: Reference Section
nav_order: 6
permalink: /tB/Packages/CEF/
has_toc: false
---

# CEF Package
{: .no_toc }

The **cefPackage** wraps the [Chromium Embedded Framework](https://chromiumembedded.github.io/cef/) and exposes it as an ordinary twinBASIC control. Drop a [**CefBrowser**](CefBrowser/) onto a form and a Chromium browser renders web content inside it — navigate to URLs, run JavaScript, print pages to PDF, and exchange messages with the loaded page.

The package is a built-in package shipped with twinBASIC, but the CEF runtime itself is distributed *separately* — applications must ship the matching runtime ZIP alongside the executable. See [Runtime files](#runtime-files) below.

> [!IMPORTANT]
> The CEF package is currently in **BETA**. Several features available on [**WebView2**](../WebView2/) are not yet exposed; see [WebView2 parity](#webview2-parity) below.

* TOC
{:toc}

## Why CEF instead of WebView2?

CEF and [**WebView2**](../WebView2/) both wrap a Chromium-based browser inside a twinBASIC control. CEF brings advantages that matter for some applications:

- **Cross-platform ready.** CEF runs on Windows, Linux, and macOS. [**WebView2**](../WebView2/) is Windows-only.
- **Full control over the runtime stack.** The application targets a specific Chromium build and distributes it alongside the software. There is no runtime auto-update behind the developer's back, so behavior stays consistent across deployments.
- **Deeper runtime integration.** CEF allows hosting twinBASIC code inside the renderer / JavaScript process — something the locked-down WebView2 object model cannot do.

Choose [**WebView2**](../WebView2/) when targeting only modern Windows and willing to rely on the system-installed Edge runtime; choose **CEF** when control over the Chromium version or cross-platform readiness matters.

## Supported runtimes

Three CEF versions are supported, each carrying a different Chromium baseline and different OS reach:

| Runtime version | Supported OS  | Notes                                                          |
|-----------------|---------------|----------------------------------------------------------------|
| **v49**         | Windows XP+   | Last Chromium version that supports Windows XP.                |
| **v109**        | Windows 7+    | Last Chromium version that supports Windows 7.                 |
| **v145**        | Windows 10+   | Recommended modern runtime.                                    |

> [!WARNING]
> Older Chromium versions should not generally be used for unrestricted internet browsing — they carry unpatched security vulnerabilities. They remain appropriate for tightly controlled environments where the browser loads only trusted local or internal content.

The user picks a runtime in two places that must agree:

- **At compile time** — by adding the matching `[COMPILER PACKAGE] twinBASIC - Chromium Embedded Framework Package v<N>` reference to the project. This sets the `CEF_VERSION` conditional-compilation constant (49, 109, or 145) that the package's own sources compile against. [**CefBrowser.CefMajorVersion**](CefBrowser/#cefmajorversion) returns this value at run time.
- **At deploy time** — by shipping the matching runtime ZIP, extracted into [the discovery folder](#installing-runtime-files) or pointed at via [**EnvironmentOptions.BrowserExecutableFolder**](CefBrowser/EnvironmentOptions#browserexecutablefolder).

The runtime bitness must match the application bitness — a 32-bit application needs the 32-bit runtime ZIP, a 64-bit application needs the 64-bit ZIP.

## Runtime files

The runtime ships separately from the package. Download the ZIP that matches both the CEF version and the application bitness:

| Version | Win32                                                        | Win64                                                        |
| ------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| v49     | [cefRuntime49_win32.zip](https://github.com/twinbasic/cef-runtimes/releases/download/v1.0.0/cefRuntime49_win32.zip) | [cefRuntime49_win64.zip](https://github.com/twinbasic/cef-runtimes/releases/download/v1.0.0/cefRuntime49_win64.zip) |
| v109    | [cefRuntime109_win32.zip](https://github.com/twinbasic/cef-runtimes/releases/download/v1.0.0/cefRuntime109_win32.zip) | [cefRuntime109_win64.zip](https://github.com/twinbasic/cef-runtimes/releases/download/v1.0.0/cefRuntime109_win64.zip) |
| v145    | [cefRuntime145_win32.zip](https://github.com/twinbasic/cef-runtimes/releases/download/v1.0.0/cefRuntime145_win32.zip) | [cefRuntime145_win64.zip](https://github.com/twinbasic/cef-runtimes/releases/download/v1.0.0/cefRuntime145_win64.zip) |

See also [CEF Runtime Releases](https://github.com/twinbasic/cef-runtimes/releases/) for the latest release.

### Installing runtime files

{: .no_toc }

Extract the ZIP into:

```text
%LocalAppData%\twinBASIC_CEF_Runtime\
```

For example, the v145 Win64 runtime ends up at:

```text
%LocalAppData%\twinBASIC_CEF_Runtime\145_0_7632_160_Win64\
```

The version-stamped folder must contain `libcef.dll` and its sibling runtime files.

At launch, [**CefBrowser**](CefBrowser/) searches for the runtime in this default location. If `libcef.dll` cannot be found, the [**Error**](CefBrowser/#error) event fires with the exact path that was searched.

### Overriding the runtime location
{: .no_toc }

To point at a different folder — for example a portable side-by-side deployment — assign [**EnvironmentOptions.BrowserExecutableFolder**](CefBrowser/EnvironmentOptions#browserexecutablefolder) before or during the [**Create**](CefBrowser/#create) event:

```tb
Private Sub CefBrowser1_Create()
    CefBrowser1.EnvironmentOptions.BrowserExecutableFolder = _
        "D:\MyApp\CEF\145_0_7632_160_Win64"
End Sub
```

The folder must contain `libcef.dll`.

## WebView2 parity

These [**WebView2**](../WebView2/) features are not yet exposed on **CefBrowser** and have no documented counterpart:

- Methods: **OpenTaskManagerWindow**, **AddObject** (host-object publication for JavaScript), **AddWebResourceRequestedFilter** and the surrounding request-interception machinery.
- Events: **AcceleratorKeyPressed**, **PermissionRequested**, **WebResourceRequested**, **ProcessFailed**, **ScriptDialogOpening**, **UserContextMenu**, **SuspendCompleted**, **SuspendFailed**, **DownloadStarting**, **NewWindowRequested**.

The [**NavigationComplete**](CefBrowser/#navigationcomplete) event carries **IsSuccess** and **WebErrorStatus** parameters in its signature but currently returns placeholder values (`True` and `0`) — the underlying CEF callbacks that would populate them have not yet been wired in.

The surface will continue to grow; treat this list as a snapshot of the current beta and not a long-term limitation.

## Classes

- [CefBrowser](CefBrowser/) -- the control: navigation, scripting, virtual-host mapping, PDF printing, and lifecycle events driven by the matching CEF runtime
- [CefEnvironmentOptions](CefBrowser/EnvironmentOptions) -- pre-creation configuration for the CEF environment (executable folder, user-data folder, log file, log severity); reached via the control's **EnvironmentOptions** property

## Enumerations

- [CefLogSeverity](Enumerations/CefLogSeverity) -- the verbosity threshold for the CEF debug log; carried by [**EnvironmentOptions.LogSeverity**](CefBrowser/EnvironmentOptions#logseverity)
- [cefPrintOrientation](Enumerations/cefPrintOrientation) -- page orientation passed to [**PrintToPdf**](CefBrowser/#printtopdf)
