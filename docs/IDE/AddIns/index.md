---
title: Add Ins
parent: IDE
permalink: /tB/IDE/AddIns/
index:
  - install an addin
  - install add-in
  - install an add-in
  - ide plugin
---

# Add Ins

An addin is a Standard DLL that exports `tbCreateCompilerAddin` and returns an object implementing the [**AddIn**](../../Packages/tbIDE/AddIn) interface. Through the [**Host**](../../Packages/tbIDE/Host) object the IDE passes at startup, an addin can reach the toolbar, the IDE's menus, tool windows, debug console, current project, the Project Explorer, keyboard shortcuts and themes, and can add an editor of its own for a kind of file. The [**tbIDE package**](../../Packages/tbIDE/) documents the full API.

## Add-ins that ship with the IDE

These add-ins are in the install's `addins\win32` and `addins\win64` folders, so every project loads them:

- [Global Search](GlobalSearch) -- searches a project's files from a tool window
- [Hex Editor](HexEditor) -- shows and edits the bytes of any file
- [ICO Designer](IcoEditor) -- draws and edits `.ico` files
- [Diff Compare](DiffCompare) -- compares two files side by side, in one IDE or across two
- [Data Explorer](DataExplorer) -- shows the rows of a database in a grid

The [Help Add-In](Help) is not one of them: it comes from this documentation, and you install it yourself.

## Writing an add-in

The New Project dialog's **Samples** section holds the add-in samples, numbers 10 to 16 and 24 to 27, the cards named *twinBASIC IDE Addin*, alone or with a variant in brackets (see [Samples](../Starting/Samples)), covering patterns from simple toolbar buttons to HTML DOM-backed tool windows and editors of their own. Samples 15 and 24 to 27 are the projects of the add-ins that ship with the IDE. Each is a complete addin project, with the tbIDE package referenced and the build path set, and Sample 10, *twinBASIC IDE Addin*, is the plainest one to start from. A project started from the **Standard DLL** template has neither setting: [Building and loading an addin](../../Packages/tbIDE/#building-and-loading-an-addin) says what to add. Community addins are listed on the [**Community**](Community) page, and other programs that twinBASIC users share on the [**Community tools**](Community-Tools) page.

## Installing an add-in

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

## Add-ins from the community

The add-ins that twinBASIC users write and share are listed on the [Community add-ins](../../../Community/Add-Ins) page of the [Community](../../../Community/) section. Programs that help with twinBASIC and are not add-ins are on its [Community tools](../../../Community/Tools) page.
