---
title: Add Ins
parent: IDE
permalink: /tB/IDE/AddIns/
---

# Add Ins

An addin is a Standard DLL that exports `tbCreateCompilerAddin` and returns an object implementing the [**AddIn**](../../Packages/tbIDE/AddIn) interface. Through the [**Host**](../../Packages/tbIDE/Host) object the IDE passes at startup, an addin can reach the toolbar, tool windows, debug console, current project, keyboard shortcuts, and themes. The [**tbIDE package**](../../Packages/tbIDE/) documents the full API.

The New Project dialog includes addin templates (samples 10 through 16), covering patterns from simple toolbar buttons to HTML DOM-backed tool windows. Community addins are listed on the [**Community**](Community) page.

twinBASIC supports two addin install locations. The IDE install directory is available to all user accounts on the machine but may require reinstallation after an IDE update. A per-user application data folder persists across IDE upgrades and requires no administrator rights.

To install an addin via the IDE install directory, unzip and copy each architecture DLL to the matching folder:

`\twinBASIC_IDE_BETA_xxx\addins\win32\`

`\twinBASIC_IDE_BETA_xxx\addins\win64\`

To install it for your own user account instead, copy each architecture DLL to the matching folder under your application data. The IDE creates both folders when it starts:

`%APPDATA%\twinBASIC\addins\win32\`

`%APPDATA%\twinBASIC\addins\win64\`

In either location the DLL goes in one of the two architecture folders. A DLL placed directly in `addins\` is not loaded. The IDE loads the addins in the folder that matches the project's build target, which is `win32` unless the project is set to build for win64, so an addin that should load either way needs a build of each.
