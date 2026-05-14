# CEF Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide.

The entire user-facing surface lives in one source file (`CefControl.twin`): the private `CefBrowserBaseCtl` (where every event / method / property is declared), the private `CefEnvironmentOptions`, and the public `CefBrowser` control which inherits from `CefBrowserBaseCtl`. Everything else under the source tree (`CefControlGlobalWnd`, `APIs`, `MainModule`, `Registry`, `SpecialFolders`, the `CEF\Aliases` / `ApiEntryPoints` / `Globals` / `Initialize` / `Misc` modules, the 30 `_cef_*_t` internal enums and structs, the `CrossProcessIPC` IPC brokers, and every `Implementations/*` callback handler) is `Private Class` / `Private Module` plumbing and gets no doc page. Two user-facing enums live inside otherwise-private files: `CefLogSeverity` in the `_cef_log_severity_t` enum file, and `cefPrintOrientation` inline in `BrowserOM.twin`.

Public user-facing surface (one control + one options class + two enums):

| Symbol                       | Kind                                  | Role                                                                                          |
|------------------------------|---------------------------------------|-----------------------------------------------------------------------------------------------|
| `CefBrowser`                 | Class (inherits `CefBrowserBaseCtl`)  | the control itself, tagged `[WindowsControl("/Miscellaneous/cef64.png")]`                     |
| `CefEnvironmentOptions`      | `Private Class`, exposed              | reached via `Public EnvironmentOptions As CefEnvironmentOptions = New CefEnvironmentOptions` on the control |
| `CefLogSeverity`             | `Enum` (in `_cef_log_severity_t.twin`)| used by `CefEnvironmentOptions.LogSeverity`                                                   |
| `cefPrintOrientation`        | `Enum` (in `BrowserOM.twin`)          | used by the `Orientation` parameter of `CefBrowser.PrintToPdf`                                |

`CefBrowserBaseCtl` is `Private Class` but is where every public member is *declared* — `CefBrowser` itself adds nothing beyond inheriting from it. The page (`CefBrowser/index.md`, folder-style, parallel to `WebView2/`) describes the union; the base class is invisible to user code.

`CefBrowser` inherits from `VB.BaseControlRectDockable`, so its Properties listing folds in the dockable-rect surface (`Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, ...) the same way VB-package and CustomControls control pages do.

`CefBrowserRequestHeaders` is declared as `Alias CefBrowserRequestHeaders As Object` and appears in the `NavigationStarting` event signature. The underlying `Class CefRequestHeaders` is an empty placeholder for a future header collection. **No doc page;** mention on the `NavigationStarting` event entry that the parameter is currently typed `Object` and reserved for future use.

The `CefBrowser` public surface:

- **Events (12):** `Create`, `Ready`, `Error`, `NavigationStarting`, `NavigationComplete`, `SourceChanged`, `DocumentTitleChanged`, `DOMContentLoaded`, `PrintToPdfCompleted`, `PrintToPdfFailed`, `JsAsyncResult`, `JsMessage`.
- **Methods (14):** `Initialize`, `Navigate`, `NavigateToString`, `Reload`, `GoBack`, `GoForward`, `ExecuteScript`, `JsRun`, `JsRunAsync`, `PostWebMessage`, `SetVirtualHostNameToFolderMapping`, `ClearVirtualHostNameToFolderMapping`, `OpenDevToolsWindow`, `PrintToPdf`.
- **Properties (12):** `DocumentURL` (Get/Let), `DocumentTitle` (Get), `ZoomFactor` (Get/Let), `UserAgent` (Get/Let), `CanGoBack` (Get), `CanGoForward` (Get), `CefMajorVersion` (Get), `Visible` (Get/Let), `hWnd` (Get), `Parent` (Get), `EnvironmentOptions` (field), `CreateInitialized` (field, `Boolean`, defaults `True`). Plus a `Hidden` `Align` (Get/Let) inherited boilerplate. Plus the inherited rect-dockable surface (`Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, …).

`CefEnvironmentOptions` is four bare `Public` fields:

| Field                      | Type             |
|----------------------------|------------------|
| `BrowserExecutableFolder`  | `String`         |
| `UserDataFolder`           | `String`         |
| `LogFilePath`              | `String`         |
| `LogSeverity`              | `CefLogSeverity` |

`CefLogSeverity` members: `CefLogDisable = 0`, `CefLogVerbose = 1`, `CefLogInfo = 2`, `CefLogWarning = 3`, `CefLogError = 4`, `CefLogFatal = 5`.

`cefPrintOrientation` members: `cefPrintPortrait = 0`, `cefPrintLandscape = 1`.

**WebView2-parity gap list** (called out on `CEF/index.md`, drawn from the sample-project examples where these are commented out as *"Sorry, this feature is not yet available in the CEF package"*):

- Methods: `OpenTaskManagerWindow`, `AddObject` (host-object publication), the request-filter machinery (`AddWebResourceRequestedFilter`).
- Events: `AcceleratorKeyPressed`, `PermissionRequested`, `WebResourceRequested`, `ProcessFailed`, `ScriptDialogOpening`, `UserContextMenu`, `SuspendCompleted`, `SuspendFailed`, `DownloadStarting`, `NewWindowRequested`.

`CefBrowser.NavigationComplete` carries `IsSuccess` and `WebErrorStatus` parameters, but `OnNavigationComplete_UI` currently hard-codes `IsSuccess = True` and `WebErrorStatus = 0` with `FIXME` comments — noted on the event entry.

**Multi-version source.** The same `.twin` sources compile against three CEF runtimes (v49 / v109 / v145) selected via the `CEF_VERSION` conditional-compilation argument on the project. At runtime, `CefBrowser.CefMajorVersion` returns the value picked at compile time. The user picks a runtime at deploy time by downloading the matching ZIP from `github.com/twinbasic/cef-runtimes` and extracting to `%LocalAppData%\twinBASIC_CEF_Runtime\`, or by overriding `CefBrowser.EnvironmentOptions.BrowserExecutableFolder` before / during the `Create` event. The runtime download + version-picking section lives on `CEF/index.md`.
