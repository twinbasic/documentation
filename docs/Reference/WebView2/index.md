---
title: WebView2 Package
parent: Packages
grand_parent: Reference Section
nav_order: 6
permalink: /tB/Packages/WebView2/
has_toc: false
---

# WebView2 Package

The **WebView2Package** wraps the Microsoft Edge WebView2 runtime and exposes it as an ordinary twinBASIC control. Drop a [**WebView2**](WebView2/) onto a form and the running Edge engine renders web content inside it — navigate to URLs, run JavaScript, intercept HTTP requests, post messages between BASIC and JavaScript, and print pages to PDF.

The package is a built-in package shipped with twinBASIC. See the [WebView2 tutorials](../../../Tutorials/WebView2/) for how to reference it in your project, and worked samples.

Beyond the control itself, the package exposes a small set of wrapper objects that surface inside the control's event arguments — the request / response pair on **WebResourceRequested**, the request-header collection on **NavigationStarting**, the environment-options object configured before **Create** — together with the `wv2…` enumerations used to spell out option values.

## Classes

- [WebView2](WebView2/) -- the control: navigation, scripting, settings, deferral-aware events, and PDF / suspend / download / task-manager features driven by the underlying Edge runtime
- [WebView2EnvironmentOptions](WebView2/EnvironmentOptions) -- pre-creation configuration for the WebView2 environment (user-data folder, executable folder, locale, tracking-prevention, …); reached via the control's **EnvironmentOptions** property
- [WebView2Header](WebView2Header) -- one HTTP header (Name / Value); the element type yielded by header iteration
- [WebView2HeadersCollection](WebView2HeadersCollection) -- enumerable wrapper used by `For Each` over request / response headers
- [WebView2Request](WebView2Request) -- the request side of a **WebResourceRequested** event — **Method**, **Uri**, **Headers**, and the request body as bytes or UTF-8 text
- [WebView2RequestHeaders](WebView2RequestHeaders) -- mutable request-header collection passed to **NavigationStarting** and reached via **WebView2Request.Headers**
- [WebView2Response](WebView2Response) -- the response side of a **WebResourceRequested** event — **StatusCode**, **ReasonPhrase**, **Headers**, and the body as bytes or UTF-8 text
- [WebView2ResponseHeaders](WebView2ResponseHeaders) -- mutable response-header collection reached via **WebView2Response.Headers**

## Enumerations

- [wv2DefaultDownloadCornerAlign](Enumerations/wv2DefaultDownloadCornerAlign) -- anchors the built-in download-progress dialog to one corner of the control
- [wv2ErrorStatus](Enumerations/wv2ErrorStatus) -- reason a navigation failed; carried by **NavigationComplete**
- [wv2HostResourceAccessKind](Enumerations/wv2HostResourceAccessKind) -- access policy for a virtual hostname registered with **SetVirtualHostNameToFolderMapping**
- [wv2KeyEventKind](Enumerations/wv2KeyEventKind) -- the kind of accelerator-key keyboard message carried by **AcceleratorKeyPressed**
- [wv2PermissionKind](Enumerations/wv2PermissionKind) -- device or browser capability a page is asking permission to use; carried by **PermissionRequested**
- [wv2PermissionState](Enumerations/wv2PermissionState) -- the host's decision (grant / deny / default) on a **PermissionRequested** event
- [wv2PrintOrientation](Enumerations/wv2PrintOrientation) -- page orientation passed to **PrintToPdf**
- [wv2ProcessFailedKind](Enumerations/wv2ProcessFailedKind) -- which of the external WebView2 processes failed; carried by **ProcessFailed**
- [wv2ScriptDialogKind](Enumerations/wv2ScriptDialogKind) -- which JavaScript-dialog primitive is opening; carried by **ScriptDialogOpening**
- [wv2WebResourceContext](Enumerations/wv2WebResourceContext) -- kind of HTTP request a filter registered with **AddWebResourceRequestedFilter** should match

## Types

- [COREWEBVIEW2_PHYSICAL_KEY_STATUS](Types/COREWEBVIEW2_PHYSICAL_KEY_STATUS) -- decoded `WM_KEYDOWN` / `WM_KEYUP` `lParam` bit-fields; surfaced via the **AcceleratorKeyPressed** event
