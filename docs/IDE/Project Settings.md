---
title: Project Settings
parent: IDE
# nav_order: 1
permalink: /tB/IDE/Project/Settings
---

# Project Settings

Listed below are the project settings, in the same order as they appear in the Project Settings dialog. The explanations of those settings will be added below in the future. In the meantime, please refer to the setting descriptions built into the Project Settings dialog:

![A fragment of the Project Settings dialog, indicating a description of a setting](Images/project settings description text.png)

{: .toc }

## Project Name

## Project Description

## Application Title

## Application HelpFile

## Startup Object

## Icon Form

## Library References

![The Project Settings dialog on its Enabled Libraries tab, listing four ticked references in priority order with Library Symbol and Version columns: the twinBASIC VBA and VBRUN compatibility packages, OLE Automation as stdole, and the IDE Extensibility package as tbIDE.](Images/ProjectSettings_LibraryReferences.png)

![The same dialog on its Available COM References tab. A search box sits above an alphabetical list of unticked type libraries registered on the machine --- AccessibilityCplAdmin, Active DS, ActiveMovie, AgentWmiLib and so on --- against Library Symbol, Version and Publisher columns.](Images/ProjectSettings_AvailableCOMReferences.png)

See [Packages](../../../Features/Packages/)

![The Project Settings dialog open over the IDE, with hand-drawn red numbers marking the route: 1 on the toolbar settings gear, 2 on the Library References heading, 3 on the Available Packages tab. That tab lists the published packages with tick boxes and Library Symbol, Version and Publisher columns.](../Features/Packages/Images/e749e10f-e361-4f15-a977-d756fcb3b5dd.png)

## Compiler Warnings

## Project ID

## Use Project ID for type library ID

## Build Output Path

The full path of the file the compiler creates. Its description in the dialog lists these variables: `${SourcePath}`, the folder that holds the `.twinproj` file, and `${ProjectName}`, `${ProjectID}`, `${FileExtension}`, `${Architecture}`, `${VersionMajor}`, `${VersionMinor}`, `${VersionBuild}` and `${VersionRevision}`. `${Architecture}` is `win32` or `win64`, whichever the toolbar's [build configuration](Toolbar#build-configuration) box is set to.

Every project template sets it to `${SourcePath}\Build\${ProjectName}_${Architecture}.${FileExtension}`: a `Build` folder beside the `.twinproj` file, and a different file name for each architecture. A Standard DLL project named `MathGreetLib` builds `Build\MathGreetLib_win32.dll` or `Build\MathGreetLib_win64.dll`, and a `Declare` that calls it has to name that file --- see [Calling a Standard DLL from VBA or Excel](../../../Features/Project-Configuration/Project-Types#calling-a-standard-dll-from-vba-or-excel). In the `Settings` file it is `project.buildPath`.

## Build Type

The type of file the compiler creates: **Standard EXE**, **ActiveX DLL**, **ActiveX Control**, **Standard DLL** or **Package TWINPACK**. [Project Types](../../../Features/Project-Configuration/Project-Types) describes the Standard DLL, and code can test the setting with the [`TWINBASIC_BUILD_TYPE`](../../../Reference/Compiler-Constants#twinbasic_build_type) compiler constant. In the `Settings` file it is `project.buildType`.

## Licence Type

## Package Visibility

## VERSION Resource

### Major/Minor/Build

### Product Name

### Company Name

### File Description

### Legal Copyright

### Legal Trademarks

### Comments

### Auto-Increment

## Type Library Version

### Major/Minor

{: #typelib-major-minor}

### Auto-Increment

{: #typelib-auto-increment}

## Register DLLs to HKLM

## COM Initialization

## Is Console Application

## Native Subsystem

## Override Entry Point

## Runtime Binding of DLL Declares

## Conditional Compilation Args

## Option Explicit On

## Auto Prettify Source Code

## CodeLens - Show Run Procedure

{: #show-run-procedure }

## Runtime Windows Codepage

## Use Unicode Standard Library

## Unicode Control Notifications

## Include Procedure Name Symbols in Built Executables

{: #include-procedure-name-symbols }

## Trace Flags

## Trace Output

## Disable Overflow Checks

## Disable Array Bounds Checks

## Disable FPU Error Checks

## Sanitize Booleans

## Constant Function Folding

## Large Address Aware (LAA)

{: .la-aware }

## Terminal Server Avare

{: .ts-aware }

## Data Execution Prevention Aware (DEP)

{: .dep-aware }

## Export

> [!WARNING]
> **File → Export Project** deletes everything in its target folder before it writes, without asking. Read [Export Project](Menu/File#export-project) before setting these.

### Export Path

The folder **File → Export Project** writes to. When it is set, the command exports there straight away instead of asking for a folder, and empties the folder first.

The path can use these variables: `${SourcePath}`, the folder that holds the `.twinproj` file, and `${ProjectName}`, `${ProjectFileName}`, `${ProjectID}`, `${FileExtension}`, `${VersionMajor}`, `${VersionMinor}`, `${VersionBuild}` and `${VersionRevision}`. The dialog refuses `${SourcePath}` on its own, because the export would delete the project file, but it accepts the same folder written out in full.

Every project template sets `"project.exportPathIsV2": true` in the `Settings` file. In a project without it, the export goes into a subfolder named after the project, inside *Export Path*.

### Export After Save

When set to **Yes**, every save of the project also runs **Export Project** into *Export Path*. So every save empties that folder again, even a save with nothing changed.

### Export Verbose

When set to **Yes**, **Export Project** writes a line to the [Debug Console](DebugConsole) for each file and folder it deletes, `[EXPORT]  DELETED: …`, and for each file it writes, `[EXPORT]  DONE: …`. When set to **No**, the console shows only the line that starts the export, the `[EXPORT] COMPLETED` line that ends it, and any failure.

## Force DPI Awareness At Startup

{: #dpi-awareness }

## Runtime Command Line Args

## Immediate Memory Invalidation

## Break On All Errors

When set to **Yes**, a run-time error stops the program at the failing line even while an `On Error Resume Next` or `On Error GoTo` statement is in effect, with the same error panel as an error that nothing handles. It is **No** by default, and then the handler gets the error. **Debug → Debugger Options → Break On All Errors** turns the same setting on and off. In the `Settings` file it is `debugger.breakOnAllErrors`.

[When a run-time error stops the program](Menu/Debug#when-a-run-time-error-stops-the-program) describes the panel. [Debugger Options](Menu/Debug#debugger-options) says what **Ignore (Resume Next)** does when this setting is on.

## Build Stack Reserve Size

## Target OS Version

## Codegen Model

## Strip PE File Relocation Symbols

{: #strip-pe-symbols }

## Enable Address Space Layout Randomization (ASLR)

{: #enable-aslr }

## PE File Image Base Address (Win32)

{: #win32-base-address }

## PE File Image Base Address (Win64)

## Debuggable

## Feature Flags

## Compiler Options (BUILD)

Turns on [LLVM compilation](../../../LLVM/Getting-Started#llvm-in-twinbasic) and its optimizations for the executable a build produces.

## Compiler Options (DEBUG)

Turns on [LLVM compilation](../../../LLVM/Getting-Started#llvm-in-twinbasic) and its optimizations when the project runs in the IDE. This is not recommended: the IDE cannot debug code compiled with LLVM.

