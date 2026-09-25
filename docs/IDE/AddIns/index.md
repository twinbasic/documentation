---
title: Add Ins
parent: IDE
permalink: /tB/IDE/AddIns/
---

# Add Ins

An addin is a Standard DLL that exports `tbCreateCompilerAddin` and returns an object implementing the [**AddIn**](../../Packages/tbIDE/AddIn) interface. Through the [**Host**](../../Packages/tbIDE/Host) object the IDE passes at startup, an addin can reach the toolbar, tool windows, debug console, current project, keyboard shortcuts, and themes. The [**tbIDE package**](../../Packages/tbIDE/) documents the full API.

The New Project dialog's **Samples** tab holds seven addin samples, numbers 10 to 16 (see [New Project](../Project/New#samples)), covering patterns from simple toolbar buttons to HTML DOM-backed tool windows. Each is a complete addin project, with the tbIDE package referenced and the build path set, and Sample 10, *twinBASIC IDE Addin*, is the plainest one to start from. A project started from the **Standard DLL** template has neither setting: [Building and loading an addin](../../Packages/tbIDE/#building-and-loading-an-addin) says what to add. Community addins are listed on the [**Community**](Community) page.

twinBASIC supports two addin install locations. The IDE install directory is available to all user accounts on the machine but may require reinstallation after an IDE update. A per-user application data folder persists across IDE upgrades and requires no administrator rights.

To install an addin via the IDE install directory, unzip and copy each architecture DLL to the matching folder:

`\twinBASIC_IDE_BETA_xxx\addins\win32\`

`\twinBASIC_IDE_BETA_xxx\addins\win64\`

To install it for your own user account instead, copy each architecture DLL to the matching folder under your application data. The IDE creates both folders when it starts:

`%APPDATA%\twinBASIC\addins\win32\`

`%APPDATA%\twinBASIC\addins\win64\`

In either location the DLL goes in one of the two architecture folders. A DLL placed directly in `addins\` is not loaded. The IDE loads the addins in the folder that matches the project's build target, which is `win32` unless the project is set to build for win64, so an addin that should load either way needs a build of each. Switching the build target restarts the compiler, which then loads the addins in the other folder.

## When an addin does not load

The DEBUG CONSOLE says why, on a line that starts with the DLL's file name in brackets:

| Message | Cause |
|---|---|
| `Failed to load addin.  LoadLibrary() failed.` | Windows could not load the DLL: for example, a 32-bit build in a `win64` folder. |
| `Failed to load addin.  Entry point not found.  Addin may have been compiled for a newer version of the twinBASIC IDE.` | The DLL exports none of the names this IDE looks for; see the [**tbIDE package**](../../Packages/tbIDE/#building-and-loading-an-addin). |
| `Failed to load addin.  Entry point 'tbCreateCompilerAddin' call failed.` | The addin's `tbCreateCompilerAddin` returned **Nothing**. |
| `Failed to load addin.  Entry point 'tbCreateCompilerAddin' returned an object that does not implement interface IAddInV1.` | It returned an object that does not implement [**AddIn**](../../Packages/tbIDE/AddIn). |

The Add-Ins menu still lists such a DLL, as *Unknown Addin*.
