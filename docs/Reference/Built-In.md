---
title: Built-In Packages
parent: Packages
nav_order: 2
permalink: /tB/Packages/Built-In/
has_toc: false
---

# Built-In Packages

These packages are built into twinBASIC and are always available, even offline. To use them, add them to Project → References (Ctrl-T) → Available Packages.

- [Assert Package](../Assert/) -- assertion functions for unit tests -- three modules (**Exact**, **Strict**, **Permissive**) sharing the same fifteen-member API with different comparison strictness
- [CustomControls Package](../CustomControls/) -- owner-drawn `Waynes…` custom controls (button, form, frame, grid, label, slider, textbox, timer), the shared `Styles/` helpers that paint them, and the DESIGNER framework (interfaces, callback objects, **Canvas**, **SerializeInfo**) for authoring new custom controls
- [CEF Package](../CEF/) -- the **CefBrowser** control wrapping the Chromium Embedded Framework: cross-platform-ready browser embedding with a choice of three Chromium runtimes (v49 / v109 / v145); currently in BETA
- [WebView2 Package](../WebView2/) -- the **WebView2** control wrapping the Microsoft Edge runtime, plus its surrounding wrapper objects (request / response / headers / environment options) and the `wv2…` enumerations
- [WinEventLogLib Package](../WinEventLogLib/) -- writes Windows Event Log entries from twinBASIC; the generic **EventLog**(*Of EventIds, Categories*) class handles registration, registry setup, and the per-event `ReportEventW` call, with message-table resources for *EventIds* and *Categories* synthesised into the EXE at compile time
- [WinNamedPipesLib Package](../WinNamedPipesLib/) -- Windows named pipes as twinBASIC objects with an asynchronous IOCP-driven I/O model; **NamedPipeServer** + **NamedPipeServerConnection** on the host side, **NamedPipeClientManager** + **NamedPipeClientConnection** on the client side, with message-boundary semantics and a cookie-based correlation pattern across `AsyncRead` / `AsyncWrite` and their matching events
- [WinServicesLib Package](../WinServicesLib/) -- runs a twinBASIC EXE as one or more Windows services; the **Services** singleton coordinates configuration, install / uninstall, and the SCM dispatcher loop, while user-implemented **ITbService** classes are instantiated through **ServiceCreator**`(Of T)`
- [tbIDE Package](../tbIDE/) -- the **addin SDK** for the twinBASIC IDE: every addin is a Standard DLL that exports `tbCreateCompilerAddin`, returns an object implementing the **AddIn** contract, and from there reaches the IDE's toolbar, tool-window DOM, virtual file system, debug console, current project, keyboard shortcuts, and themes
- [WinNativeCommonCtls Package](../WinNativeCommonCtls/) -- VB6-compatible replacement for **Microsoft Common Controls 6.0** (`MSCOMCTL.OCX`) built on top of the Win32 ComCtl32 controls: eight controls (**DTPicker**, **ImageList**, **ListView**, **MonthView**, **ProgressBar**, **Slider**, **TreeView**, **UpDown**) with the original member names preserved, plus the collection sub-objects and user-facing enumerations
