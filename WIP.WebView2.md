# WebView2 Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide.

The user-facing surface is the `WebView2` control plus a small set of wrapper classes plus the `wv2…` enumerations.

| Class                       | Role                                                                                                  |
|-----------------------------|-------------------------------------------------------------------------------------------------------|
| `WebView2`                  | the control itself (`Inherits VB.BaseControlFocusableNoFont`, `[WindowsControl(...)]`)                |
| `WebView2Header`            | one HTTP header (Name / Value); value type returned by header iteration                               |
| `WebView2HeadersCollection` | enumerable wrapper used by `For Each` over request / response headers                                 |
| `WebView2Request`           | request side of a `WebResourceRequested` event — Method, Uri, Headers, ContentBytes, ContentUTF8     |
| `WebView2RequestHeaders`    | mutable request-header collection — `GetHeader`, `Contains`, `AppendHeader`, `RemoveHeader`, …       |
| `WebView2Response`          | response side of a `WebResourceRequested` event — StatusCode, ReasonPhrase, Headers, ContentBytes…   |
| `WebView2ResponseHeaders`   | mutable response-header collection                                                                    |

`WebView2EnvironmentOptions` is declared `Private Class`, **but** the `WebView2` control exposes it via `Public EnvironmentOptions As WebView2EnvironmentOptions = New WebView2EnvironmentOptions`. It is documented as a sub-page of the `WebView2` control class — its `Public` fields (`BrowserExecutableFolder`, `UserDataFolder`, `AdditionalBrowserArguments`, `Language`, `TargetCompatibleBrowserVersion`, `AllowSingleSignOnUsingOSPrimaryAccount`, `ExclusiveUserDataFolderAccess`, `EnableTrackingPrevention`) are user-set before / during the `Create` event.

The `WebView2` control class uses the **folder-style** layout (`WebView2/index.md`) because of its size and to host the `EnvironmentOptions` sub-page.

Enumerations (ten of them: `wv2PermissionKind`, `wv2PermissionState`, `wv2ErrorStatus`, `wv2KeyEventKind`, `wv2WebResourceContext`, `wv2ProcessFailedKind`, `wv2ScriptDialogKind`, `wv2HostResourceAccessKind`, `wv2PrintOrientation`, `wv2DefaultDownloadCornerAlign`) live under `WebView2/Enumerations/`. `COREWEBVIEW2_PHYSICAL_KEY_STATUS` is a public `Type` (used in the `AcceleratorKeyPressed` event arguments) and lives under `WebView2/Types/`.

Pre-existing site cross-references:

- [`docs/Tutorials/WebView2/`](docs/Tutorials/WebView2) — task-oriented tutorial set; cross-link from / to the reference pages where useful.
- [`docs/Reference/VBRUN/Constants/ControlTypeConstants.md`](docs/Reference/VBRUN/Constants/ControlTypeConstants.md) — lists `vbWebView2 = 18`.
