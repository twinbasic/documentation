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
