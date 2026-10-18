---
title: What a build writes
parent: Building
grand_parent: IDE
nav_order: 3
permalink: /tB/IDE/Building/Build-Output
index:
  - build output path
  - open build output folder
  - auto-increment
  - build type
  - fusion host
---

# What a build writes

A build writes one file, and the project's *Build Type* decides what kind. This page describes where the file goes and what it is called, how to open its folder, how the version numbers change, and the other file a build can write.

## The build output path

The [*Build Output Path*](../Project-Settings#build-output-path) setting is the full path of the file. It can use variables, and [Project Settings](../Project-Settings#build-output-path) lists them. A new project sets it to

```
${SourcePath}\Build\${ProjectName}_${Architecture}.${FileExtension}
```

a file in a `Build` folder beside the `.twinproj`, named for the project and for the architecture of the [build configuration](Build-Configuration). `${ProjectName}` is the *Project Name* setting, not the name of the `.twinproj` file. `${FileExtension}` follows the project's [type](#what-each-project-type-produces).

A build makes the folders of the path when they are missing, nested ones too. The IDE does not check the text of the setting, so a mistake shows only in the build:

- A path that ends in a backslash fails with `[LINKER] FAILED to create output file '<path>' (error code 3)`. So does a path with forward slashes, when its `Build` folder does not exist yet; the folder is not made.
- An unknown variable such as `${Nope}` prints `[COMPILER] build path contains unrecognized variable.` and builds nothing.
- `${IdePath}`, which the samples that build an add-in use, is the folder the IDE is installed in.

> [!WARNING] BETA 1010
> `${ProjectID}` in the path is replaced with nothing. A path of `${SourcePath}\Build\${ProjectID}_x.exe` builds a file called `_x.exe`, with no message, and two projects that use the same pattern overwrite each other's file. Do not use `${ProjectID}`; name the file with `${ProjectName}`.

The other variables, `${VersionMajor}`, `${VersionMinor}`, `${VersionBuild}`, `${VersionRevision}` and `${Bitness}`, give the numbers and the bitness as the settings and the box hold them.

## Open Build Output Folder

**Project → Open Build Output Folder...** opens the folder of the build output path in Windows Explorer. It opens the folder whether or not a file is in it. If the folder does not exist, Windows Explorer decides what to show.

The IDE reads the path once, when the project loads or the compiler restarts, and keeps that copy. So the command does not follow the project after:

- the first save of a project that had no file. It says **Project is not yet saved.  Please save the project first.**, even after you have saved and built;
- a change of the *Build Output Path* in Project Settings. It opens the old folder.

Close the project and open it again, or choose **Tools → Restart the compiler**, and the command opens the right folder. The same message shows when the path has an unknown variable.

**Project → Open Project Folder...** opens the folder of the `.twinproj` file, and gives the same message for a project with no file. The **Open Folder** link in the console, which follows a successful build, opens the folder of the file just built.

## Version numbers

The *Major*, *Minor*, *Build* and *Revision* settings of the [version resource](../Project-Settings#version-resource) go into the built file. The *Auto-Increment* setting makes the build raise one of them by 1 after each successful build, and the console says so:

```
[BUILD] Auto-incremented next build number to: 1.0.8.3
```

The type library of an ActiveX DLL or control has its own pair of settings, [*Type Library Version*](../Project-Settings#type-library-version), and its own *Auto-Increment*. A build prints `[BUILD] Auto-incremented type-library version number to: <n>` for it.

> [!WARNING] BETA 1010
> The number that *Auto-Increment* raises is changed in the IDE's memory only. The project is not marked as changed, the `Settings` file is not written, and the **Version** row of the **PACKAGE PUBLISHING** pane stays as it was. **Close Project** asks nothing, and the increments are lost: the next session builds again with the old numbers, and a package is published with a number that was used already. Set the numbers by hand in Project Settings before you build a version that you release or publish, and save the project.

## What each project type produces

The *Build Type* setting is a list of five values. The file is the same kind for every project of a type, and the registration and the log depend on it too.

| Build Type | File | After the build |
|---|---|---|
| **Standard EXE** | `.exe` | The links **Launch EXE** and **Open Folder**. |
| **ActiveX DLL** | `.dll` | Registered, unless *Register DLL after build* is **No**. See [ActiveX registration](ActiveX-Registration). |
| **ActiveX Control** | `.ocx` | The same. |
| **Standard DLL** | `.dll` | Not registered. |
| **Package TWINPACK** | `.twinpack` | No links. The file is a package; see [Creating a TWINPACK package](../../../Features/Packages/Creating-TWINPACK). |

A console program, a Windows service and a kernel-mode driver are Standard EXE projects with other settings. A console program sets [*Is Console Application*](../Project-Settings#is-console-application). A driver sets [*Native Subsystem*](../Project-Settings#native-subsystem) and [*Override Entry Point*](../Project-Settings#override-entry-point). A service is a Standard EXE that uses the [WinServicesLib](../../Packages/WinServicesLib/) package. The New Project dialog has a template for the console program only. [Project Types](../../../Features/Project-Configuration/Project-Types) describes all of them, and the Standard DLL as well.

When you change the *Build Type* and apply the change in Project Settings, the IDE saves the project and restarts the compiler, and the console prints `[COMPILER] Project settings changes require compiler-restart`. The **PACKAGE PUBLISHING** pane switches on for a package and dims for any other type. The next **Build** writes the new kind of file, and **Clean** removes only the file of the current path, so the old file stays.

## The Fusion host

A project that references an ActiveX control may need the host program of [Fusion](../../../Features/Fusion#automatic-fusion-host-exe-generation). The compiler builds it on its own when a project loads and a referenced control needs it. The host is a second file. Its path is the [*ActiveX Fusion Host EXE Output Path*](../Project-Settings#activex-fusion-host-exe-output-path) setting. When that is empty, the path is the build output path with `win32host` or `win64host` in place of `${Architecture}`.

<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> builds the host on request, without building the project. The console prints `[BUILD] successfully built Fusion server file '<path>'`, or `[BUILD] failed to build Fusion server file '<path>'`. In a project without a Fusion reference, the key does nothing: no line and no file. The key has no menu item and no button. The command's id is `tbBuild_Fusion`.

## See Also

- [Project Settings](../Project-Settings) -- *Build Type*, *Build Output Path* and the version settings
- [Build and Clean](Build-and-Clean) -- the commands
- [Project Types](../../../Features/Project-Configuration/Project-Types) -- Standard DLLs, console programs, services and drivers
- [Fusion](../../../Features/Fusion) -- the host program for ActiveX controls
- [Project menu](../Reference/Menu/Project) -- **Open Build Output Folder...**
