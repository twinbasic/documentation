---
title: Project Types
parent: Project Configuration
nav_order: 1
---

# Project Types

twinBASIC provides built-in support for several project types beyond the traditional EXE and ActiveX DLL/Control.

## Standard DLLs

While it was possible to accomplish this via hacks previously, tB offers it as a built in project type. You can choose this project type at startup, then you simply need to mark functions with `[DllExport]` when you want them exported. The name will be used as-is, it will not be mangled. The `CDecl` calling convention is supported with the normal syntax, e.g. `Public Function foo CDecl(bar As Long) As Long`.

Standard DLLs in twinBASIC can still specify a startup point; each export will then check if this code has run yet, and if not, run it.

## Console Applications

This project type allows making a true console project rather than a GUI project. Helpfully, it will also add a default `Console` class for reading/writing console IO and provided debug console.

## Windows Services

tB has a services package (WinServicesLib) that makes creating full featured true services a breeze. It simplifies use of MESSAGETABLE resources, multiple services per exe, named pipes for IPC, and more. See samples 21-22.

## Kernel-Mode Drivers

Kernel mode drivers can only access a very limited subset of the API, and can't call usermode DLLs like a runtime. So it would typically require elaborate hacks and dramatically limit what you could do in prior BASIC products, if possible at all. And of course, there's no WOW64 layer for kernel mode, so tB is the first BASIC product to support making drivers for 64bit Windows. This is controlled by the 'Project: Native subsystem' option, as well as the following two features:

### Overriding Entry Point

BASIC applications typically have a hidden entry point that is the first to run, before `Sub Main` or the startup form's `Form_Load`. This sets up features of the app like initializing COM. twinBASIC supports overriding this and setting one of your own procedures as the true entry point. This is mostly useful for kernel mode projects, which must have a specific kind of entry point and can't call the normal APIs in the default. But there are other reasons you might want to use this option, but be warned: Many things will break in a normal application if you don't do the initialization procedures yourself or understand precisely what you can't use.

### Place API Declares in the IAT

tB has the option to put all API declares in the import address table rather than call them at runtime via `LoadLibrary/GetProcAddress` like VBx (which puts TLB-declared APIs in the import table; tB replicates this too but further provides an option for in-project declares).

This has a small performance advantage in that it's loaded and bound at startup rather than on the first call, but the primary use is for kernel mode, which cannot call `LoadLibrary` and other user mode APIs to use late binding.
