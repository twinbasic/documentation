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

## Build Type

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

### Export Path

### Export After Save

### Export Verbose

## Force DPI Awareness At Startup

{: #dpi-awareness }

## Runtime Command Line Args

## Immediate Memory Invalidation

## Break On All Errors

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

