---
layout: home
title: Welcome
nav_order: 1
permalink: /
---

# Welcome to twinBASIC

twinBASIC is a new BASIC language and development environment aiming for 100% backward compatibility with VB6 and VBA, while adding modern language features --- generics, native [**Interface**](tB/Core/Interface) and [**CoClass**](tB/Core/CoClass) declarations, attributes, and a package system. The compiler and IDE are under active development and currently in beta; the [FAQ](FAQ) covers the project's status, authorship, and what is and isn't implemented today, and downloads live on the [Releases](https://github.com/twinbasic/twinbasic/releases) page of the main GitHub repository.

## New to twinBASIC?

Start with the [FAQ](FAQ) for orientation --- what twinBASIC is, where it stands today, and what runs on it --- then the [Features overview](Features/) for a tour of everything the language adds on top of VBx. The [Tutorials](#tutorials) section below has step-by-step guides; the [Arrays](Tutorials/Arrays) tutorial assumes no prior twinBASIC experience and is a reasonable first read.

## Coming from VBA or VB6?

Most existing VB6 / VBA code compiles unchanged. The [Features overview](Features/) catalogues every addition --- new data types ([**LongLong**](Features/Language/Data-Types#longlong), [**LongPtr**](Features/Language/Data-Types#longptr), [**Decimal**](Features/Language/Data-Types#decimal)), native [**Interface**](tB/Core/Interface) and [**CoClass**](tB/Core/CoClass) definitions, [**Implements Via**](Features/Language/Inheritance#implements-via-for-basic-inheritance) and [**Inherits**](Features/Language/Inheritance#inherits-for-complete-oop), generics, method overloading, type inference, attribute syntax, and more.

## Looking up a keyword, function, or operator?

The reference section is split into language constructs (the things the compiler parses) and runtime members (functions, properties, types, classes shipped in the built-in packages):

- [**Categorical list**](Reference/Categories) --- statements, procedures, and functions grouped by purpose (compiler control, declarations, control flow, file I/O, ...)
- [**Statements**](Reference/Statements) --- alphabetical index of every language statement
- [**Procedures and Functions**](Reference/Procedures-and-Functions) --- alphabetical index of every callable runtime member
- [**Operators**](Reference/Operators) --- arithmetic, comparison, logical, bitwise, and twinBASIC's added operators
- [**Compiler Constants**](Reference/Compiler-Constants) --- the `#If` symbols recognised by the compiler
- [**Attributes**](tB/Core/Attributes) --- `[Documentation(...)]`, `[COMCreatable(...)]`, and the rest of the attribute syntax
- [**Controls**](tB/Controls) --- the standard UI controls ([**CheckBox**](tB/Packages/VB/CheckBox/), [**TextBox**](tB/Packages/VB/TextBox/), [**CommandButton**](tB/Packages/VB/CommandButton/), ...) grouped by purpose
- [**Glossary**](tB/Gloss) --- technical terms used across the docs

## Built-in packages

A *package* groups related code under one namespace and is referenced from a project as a single dependency. The [Packages page](tB/Packages/) lists every built-in package with a one-line description; the headings below group them by what they are for.

**Default packages** --- referenced in every project automatically:

- [**VBA**](tB/Packages/VBA) --- the standard runtime library (`MsgBox`, `CStr`, `Format`, `Mid`, ...) plus the [**Collection**](tB/Modules/Collection/) and [**Err**](tB/Modules/Information/Err) intrinsics
- [**VBRUN**](tB/Packages/VBRUN/) --- runtime types ([**PropertyBag**](tB/Packages/VBRUN/PropertyBag/), ambient properties, structured error context, drag-and-drop) and the enumerations used by classic VB6 forms and controls
- [**VB**](tB/Packages/VB/) --- the standard controls ([**CheckBox**](tB/Packages/VB/CheckBox/), [**TextBox**](tB/Packages/VB/TextBox/), [**CommandButton**](tB/Packages/VB/CommandButton/), ...) and the application-level singletons ([**App**](tB/Packages/VB/App/), [**Screen**](tB/Packages/VB/Screen/), [**Clipboard**](tB/Packages/VB/Clipboard/), [**Printer**](tB/Packages/VB/Printer/), ...)

**Additional GUI** --- controls beyond the [**VB**](tB/Packages/VB/) package:

- [**CustomControls**](tB/Packages/CustomControls/) --- owner-drawn `Waynes…` controls with a DESIGNER framework for authoring new ones
- [**WinNativeCommonCtls**](tB/Packages/WinNativeCommonCtls/) --- VB6-compatible replacement for `MSCOMCTL.OCX` ([**DTPicker**](tB/Packages/WinNativeCommonCtls/DTPicker), [**ImageList**](tB/Packages/WinNativeCommonCtls/ImageList/), [**ListView**](tB/Packages/WinNativeCommonCtls/ListView/), [**MonthView**](tB/Packages/WinNativeCommonCtls/MonthView), [**ProgressBar**](tB/Packages/WinNativeCommonCtls/ProgressBar), [**Slider**](tB/Packages/WinNativeCommonCtls/Slider), [**TreeView**](tB/Packages/WinNativeCommonCtls/TreeView/), [**UpDown**](tB/Packages/WinNativeCommonCtls/UpDown))

**Web embedding** --- host a browser engine inside a form:

- [**WebView2**](tB/Packages/WebView2/) --- the Microsoft Edge runtime
- [**CEF**](tB/Packages/CEF/) --- the Chromium Embedded Framework (BETA), with a choice of three Chromium runtimes

**Windows integration** --- thin wrappers over OS facilities:

- [**WinServicesLib**](tB/Packages/WinServicesLib/) --- run a twinBASIC EXE as one or more Windows services
- [**WinEventLogLib**](tB/Packages/WinEventLogLib/) --- write Windows Event Log entries, with compile-time message-table generation
- [**WinNamedPipesLib**](tB/Packages/WinNamedPipesLib/) --- IOCP-based asynchronous named-pipe server and client

**Tooling**:

- [**Assert**](tB/Packages/Assert/) --- assertion functions for unit tests, in three modules sharing the same fifteen-member API at different strictness levels
- [**tbIDE**](tB/Packages/tbIDE/) --- the addin SDK for the twinBASIC IDE itself

## Tutorials

- [**Arrays**](Tutorials/Arrays) --- fixed and dynamic arrays, `Dim`, `ReDim`, multi-dimensional shapes
- [**CustomControls**](Tutorials/CustomControls) --- building owner-drawn controls with the `Waynes…` framework
- [**WebView2**](Tutorials/WebView2/) --- embedding the Edge runtime: hosting local assets, JavaScript interop, driving Monaco
- [**CEF**](Tutorials/CEF/) --- embedding Chromium: building a browser shell, hosting local assets, JavaScript interop, driving Monaco

## The twinBASIC IDE

The [**IDE section**](tB/IDE) documents the editor, project explorer, debugging panes (call stack, watches, diagnostics, debug console), the [**tbForm**](tB/IDE/Project/Editor/Form) and [**tbReport**](tB/IDE/Project/Editor/Report) designers, and the per-feature side panes. To install third-party addins, see [**Add Ins**](tB/IDE/AddIns/); to author your own, the [**tbIDE package**](tB/Packages/tbIDE/) is the addin SDK.

## Community and external resources

- The [**twinBASIC wiki**](https://github.com/twinbasic/documentation/wiki) on GitHub supplements these docs with community contributions and notes on bleeding-edge features.
- [**twinBASIC Videos**](Videos/tB) --- the twinBASIC video series. The [**Access DevCon**](Videos/AccessDevCon) archive collects twinBASIC update sessions from the annual Access DevCon conference.
- Third-party guides by Mike Wolfe at [@nolongerset](https://nolongerset.com):
  - [Create a Custom ActiveX Control with twinBASIC](https://nolongerset.com/create-activex-control-with-twinbasic/)
  - [Create a Tool Window in the VBIDE with twinBASIC](https://nolongerset.com/create-a-vbe-addin-with-twinbasic/)

## Contributing to the documentation

These docs are open source. See [**Documentation Development**](Documentation/Development) for the build and preview workflow plus the contribution conventions.
