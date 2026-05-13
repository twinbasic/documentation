---
title: Packages
parent: Reference Section
nav_order: 20
permalink: /tB/Packages/
has_toc: false
---

# Packages

A *package* groups related code — modules, classes, controls, and enumerations — under a single namespace, and is referenced from a project as a single dependency. See [Features → Packages](../../Features/Packages/) for how packages are built and distributed in general; the pages below document the *built-in* packages that ship with twinBASIC itself.

## Default Packages

These packages are included in every project by default.

- [VB Package](VB/) -- standard controls (**CheckBox**, **CommandButton**, **TextBox**, …), forms, and the application-level singletons (**App**, **Screen**, **Clipboard**, **Printer**, …)
- [VBA Package](VBA) -- the standard runtime library — **MsgBox**, **CStr**, **Mid**, **Format**, … grouped into modules, plus the **Collection** and **Err** intrinsics and twinBASIC's runtime expression engine
- [VBRUN Package](VBRUN/) -- runtime-only types — ambient properties, asynchronous-read state, structured error context, the **PropertyBag**, the clipboard / drag-and-drop container, and the enumerations used by classic VB6 forms and controls

## Built-In Packages

These packages are built into twinBASIC and are always available, even offline. To use them, add them to Project → References (Ctrl-T) → Available Packages.

- [Assert Package](Assert/) -- assertion functions for unit tests — three modules (**Exact**, **Strict**, **Permissive**) sharing the same fifteen-member API with different comparison strictness
- [CustomControls Package](CustomControls/) -- owner-drawn `Waynes…` custom controls (button, form, frame, grid, label, slider, textbox, timer), the shared `Styles/` helpers that paint them, and the DESIGNER framework (interfaces, callback objects, **Canvas**, **SerializeInfo**) for authoring new custom controls
- [CEF Package](CEF/) -- the **CefBrowser** control wrapping the Chromium Embedded Framework: cross-platform-ready browser embedding with a choice of three Chromium runtimes (v49 / v109 / v145); currently in BETA
- [WebView2 Package](WebView2/) -- the **WebView2** control wrapping the Microsoft Edge runtime, plus its surrounding wrapper objects (request / response / headers / environment options) and the `wv2…` enumerations
- [WinEventLogLib Package](WinEventLogLib/) -- writes Windows Event Log entries from twinBASIC; the generic **EventLog**(*Of EventIds, Categories*) class handles registration, registry setup, and the per-event `ReportEventW` call, with message-table resources for *EventIds* and *Categories* synthesised into the EXE at compile time
- [WinNamedPipesLib Package](WinNamedPipesLib/) -- Windows named pipes as twinBASIC objects with an asynchronous IOCP-driven I/O model; **NamedPipeServer** + **NamedPipeServerConnection** on the host side, **NamedPipeClientManager** + **NamedPipeClientConnection** on the client side, with message-boundary semantics and a cookie-based correlation pattern across `AsyncRead` / `AsyncWrite` and their matching events
