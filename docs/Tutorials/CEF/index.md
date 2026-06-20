---
title: CEF
parent: Tutorials
permalink: /Tutorials/CEF/
---

# CEF

The [**CefBrowser**](../../tB/Packages/CEF/CefBrowser/) control hosts a Chromium browser inside a twinBASIC form --- navigate to web pages, run local web apps, exchange messages and method calls with JavaScript, and print pages to PDF. Unlike [**WebView2**](../WebView2/), the Chromium runtime ships *alongside* the application rather than being a system component, so the browser version is under the developer's control and the same package works on machines without Edge installed.

These tutorials demonstrate the most common patterns:

- [Getting started](Getting-Started) -- adding the package reference, downloading the matching CEF runtime, and dropping a control onto a form.
- [Customize the UserDataFolder](Customize-UserDataFolder) -- relocating the runtime's working folder for hosted scenarios (Office add-ins, kiosk installs, portable deployments).
- [Re-entrancy](Re-entrancy) -- what the control's deferred-event machinery does for you, and the one place ([**JsRun**](../../tB/Packages/CEF/CefBrowser/#jsrun)) where you still have to think about it.
- [Building a browser shell](Building-A-Browser-Shell) -- address bar, back / forward / reload, zoom, PDF export --- turning the control into a working browser.
- [Hosting local web assets](Hosting-Local-Web-Assets) -- serve HTML / JS / CSS from a project resource folder, without an HTTP server.
- [JavaScript interop](JavaScript-Interop) -- the two bridges between BASIC and the page: messages and scripted calls.
- [Driving Monaco from twinBASIC](Driving-Monaco) -- a case study combining everything above: embed Microsoft's Monaco editor next to a live HTML preview pane.

The complete sample code for the last four tutorials ships as *Sample 1b --- Chromium Embedded Framework Examples* in the New-Project dialog, mirroring *Sample 1a --- WebView2 Examples* almost feature-for-feature.

> [!IMPORTANT]
> The CEF package is currently in **BETA**. Several features available on [**WebView2**](../../tB/Packages/WebView2/WebView2/) are not yet exposed --- see the [WebView2 parity](../../tB/Packages/CEF/#webview2-parity) section of the reference for the current gap list.

For the full set of members on the control itself, see the [**CefBrowser** class reference](../../tB/Packages/CEF/CefBrowser/).
