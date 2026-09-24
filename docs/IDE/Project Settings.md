---
title: Project Settings
parent: IDE
# nav_order: 1
permalink: /tB/IDE/Project/Settings
---

# Project Settings

The Project Settings dialog, **Project → Project Settings...**, holds the settings of the open project. They are listed below in the order the dialog shows them. The dialog shows a description under each setting, and each entry below restates it:

![The Option Explicit On setting in the Project Settings dialog, set to Yes, with an arrow pointing at the description under it](Images/project settings description text.png)

The drop-down list of a setting ends with a **COMPILER DEFAULT** entry, which names the value used when the project does not set one. Choosing it removes the setting from the project's `Settings` file, and so does emptying a box. [**File → Export Project**](Menu/File#export-project) writes that file beside the project's `Sources` folder, and the entries below give the settings' keys in it.

{: .toc }

## Project Name

The name that code uses for the project, as a namespace. When the build produces a type library, this is also the library's name. In the `Settings` file it is `project.name`.

## Project Description

The description of the type library, when the build produces one. It can include the variables `${Architecture}`, `${VersionMajor}`, `${VersionMinor}`, `${VersionBuild}` and `${VersionRevision}`. In the `Settings` file it is `project.description`.

## Application Title

The title that [**MsgBox**](../../Modules/Interaction/MsgBox) and [**InputBox**](../../Modules/Interaction/InputBox) show when the call gives none, and the value that [**App.Title**](../../Packages/AppGlobalClassObject/_App/Title) returns. When [Product Name](#product-name) is not set, the build also writes it into the file's version resource as the product name. In the `Settings` file it is `project.appTitle`.

## Application HelpFile

The help file of the program. [**App.HelpFile**](../../Packages/AppGlobalClassObject/_App/HelpFile) returns it at run time, and forms use it for **F1** and *What's This* help. A new project does not set it. In the `Settings` file it is `project.appHelpFile`.

## Startup Object

The form that the program shows when it starts, or **Sub Main**. When it is not set, the default is **Sub Main** for an EXE and **(none)** for a DLL. For a Standard EXE the list does not offer **(none)**. In the `Settings` file it is `project.startupObject`.

## Icon Form

The form whose icon becomes the program's icon. The list holds the project's forms, and the default is **(none)**. The build copies the form's icon into the file's icon resources, as entry `#1` of the `RT_GROUP_ICON` group, which is the icon Windows usually shows for the program. In the `Settings` file it is `project.iconForm`.

## Library References

The type libraries and packages that the compiler uses for this project. In the `Settings` file it is `project.references`.

![The Project Settings dialog on its Enabled Libraries tab, listing four ticked references in priority order with Library Symbol and Version columns: the twinBASIC VBA and VBRUN compatibility packages, OLE Automation as stdole, and the IDE Extensibility package as tbIDE.](Images/ProjectSettings_LibraryReferences.png)

![The same dialog on its Available COM References tab. A search box sits above an alphabetical list of unticked type libraries registered on the machine --- AccessibilityCplAdmin, Active DS, ActiveMovie, AgentWmiLib and so on --- against Library Symbol, Version and Publisher columns.](Images/ProjectSettings_AvailableCOMReferences.png)

See [Packages](../../../Features/Packages/)

![The Project Settings dialog open over the IDE, with hand-drawn red numbers marking the route: 1 on the toolbar settings gear, 2 on the Library References heading, 3 on the Available Packages tab. That tab lists the published packages with tick boxes and Library Symbol, Version and Publisher columns.](../Features/Packages/Images/e749e10f-e361-4f15-a977-d756fcb3b5dd.png)

## Compiler Warnings

How the compiler reports each of its warnings in this project. The dialog lists every warning by its code and message, and each one can be set to **WARNING**, **HINT**, **INFO**, **IGNORE** or **ERROR**. In a new project, TB0015 and TB0030 are at **HINT**; TB0018 to TB0021, TB0024, TB0025 and TB0029 are at **IGNORE**; and every other warning is at **WARNING**.

The [**IgnoreWarnings**](../../Core/Attributes#ignorewarnings), [**EnforceWarnings**](../../Core/Attributes#enforcewarnings) and [**EnforceErrors**](../../Core/Attributes#enforceerrors) attributes override these settings in a class, a module or a procedure. [Compiler Warnings](../../../Features/Compiler-IDE/Compiler-Warnings) describes some of the warnings. In the `Settings` file the setting is `project.warnings`, which holds a list of codes for each level: `errors`, `hints`, `ignored`, `info` and `warnings`.

## Project ID

A GUID that identifies the project. The **↻** button beside it replaces it with a new GUID. In the `Settings` file it is `project.id`.

## Use Project ID for type library ID

When set to **Yes**, the type library that the build produces takes the [Project ID](#project-id) as its ID. When set to **No**, the build generates a unique ID for it. It is **No** by default. In the `Settings` file it is `project.useProjectIdForTypeLibraryId`.

## Build Output Path

The full path of the file the compiler creates. Its description in the dialog lists these variables: `${SourcePath}`, the folder that holds the `.twinproj` file, and `${ProjectName}`, `${ProjectID}`, `${FileExtension}`, `${Architecture}`, `${VersionMajor}`, `${VersionMinor}`, `${VersionBuild}` and `${VersionRevision}`. `${Architecture}` is `win32` or `win64`, whichever the toolbar's [build configuration](Toolbar#build-configuration) box is set to. The IDE add-in samples use one more that the description leaves out, `${IdePath}`, the folder the IDE is installed in: their `${IdePath}\addins\${Architecture}\${ProjectName}.${FileExtension}` builds straight into the IDE's own `addins` folder, which works until the IDE has loaded the add-in --- see [Rebuilding an addin the IDE has loaded](../../Packages/tbIDE/#rebuilding-an-addin-the-ide-has-loaded).

Every project template sets it to `${SourcePath}\Build\${ProjectName}_${Architecture}.${FileExtension}`: a `Build` folder beside the `.twinproj` file, and a different file name for each architecture. A Standard DLL project named `MathGreetLib` builds `Build\MathGreetLib_win32.dll` or `Build\MathGreetLib_win64.dll`, and a `Declare` that calls it has to name that file --- see [Calling a Standard DLL from VBA or Excel](../../../Features/Project-Configuration/Project-Types#calling-a-standard-dll-from-vba-or-excel). In the `Settings` file it is `project.buildPath`.

## ActiveX Fusion Host EXE Output Path

The full path of the host EXE that the compiler creates for [Fusion](../../../Features/Fusion): the separate program that ActiveX controls run in. It can use the same variables as [Build Output Path](#build-output-path), except that `${Architecture}` is `win32host` or `win64host`. When it is not set, the compiler uses *Build Output Path* when it needs the file. A built program expects the host EXE in its own folder. For a host EXE kept anywhere else, the program has to set `App.FusionHostEXEPath` as it starts --- see [Runtime Behaviour and Deployment](../../../Features/Fusion#runtime-behaviour-and-deployment). In the `Settings` file it is `project.fusionBuildPath`.

## Build Type

The type of file the compiler creates: **Standard EXE**, **ActiveX DLL**, **ActiveX Control**, **Standard DLL** or **Package TWINPACK**. [Project Types](../../../Features/Project-Configuration/Project-Types) describes the Standard DLL, and code can test the setting with the [`TWINBASIC_BUILD_TYPE`](../../../Reference/Compiler-Constants#twinbasic_build_type) compiler constant. In the `Settings` file it is `project.buildType`.

## Licence Type

For a package published to the package database: its licence, shown to the people who use the package. A new project does not set it. [Creating a TWINPACK Package](../../../Features/Packages/Creating-TWINPACK) describes the settings of a package. In the `Settings` file it is `project.licence`.

## Package Visibility

For a package published to the package database: **PUBLIC** makes it available to everyone, and **PRIVATE** only to its publisher. It is **PRIVATE** by default. In the `Settings` file it is `project.packageVisibility`.

## VERSION Resource

The version number of the build, and the text that the build writes into the file's version resource (`VERSIONINFO`).

### Major/Minor/Build/Revision

The four parts of the version number: *Major*, *Minor*, *Build* and *Revision*. The build writes them into the file's version resource, and [**App.Major**](../../Packages/AppGlobalClassObject/_App/Major), [**App.Minor**](../../Packages/AppGlobalClassObject/_App/Minor), [**App.Build**](../../Packages/AppGlobalClassObject/_App/Build) and [**App.Revision**](../../Packages/AppGlobalClassObject/_App/Revision) return them. When they are not set, the version is 1.0.0.0. In the `Settings` file they are `project.versionMajor`, `project.versionMinor`, `project.versionBuild` and `project.versionRevision`.

### Product Name

The `ProductName` text that the build writes into the file's version resource. When it is not set, the build writes the [Application Title](#application-title) there instead. At run time, [**App.ProductName**](../../Packages/AppGlobalClassObject/_App/ProductName) returns the product name. In the `Settings` file it is `project.versionProductName`.

### Company Name

The `CompanyName` text that the build writes into the file's version resource. [**App.CompanyName**](../../Packages/AppGlobalClassObject/_App/CompanyName) returns it at run time. A new project does not set it. In the `Settings` file it is `project.versionCompanyName`.

### File Description

The `FileDescription` text that the build writes into the file's version resource. [**App.FileDescription**](../../Packages/AppGlobalClassObject/_App/FileDescription) returns it at run time. A new project does not set it. In the `Settings` file it is `project.versionFileDescription`.

### Legal Copyright

The `LegalCopyright` text that the build writes into the file's version resource. [**App.LegalCopyright**](../../Packages/AppGlobalClassObject/_App/LegalCopyright) returns it at run time. A new project does not set it. In the `Settings` file it is `project.versionLegalCopyright`.

### Legal Trademarks

The `LegalTrademarks` text that the build writes into the file's version resource. [**App.LegalTrademarks**](../../Packages/AppGlobalClassObject/_App/LegalTrademarks) returns it at run time. A new project does not set it. In the `Settings` file it is `project.versionLegalTrademarks`.

### Comments

The `Comments` text that the build writes into the file's version resource. [**App.Comments**](../../Packages/AppGlobalClassObject/_App/Comments) returns it at run time. A new project does not set it. In the `Settings` file it is `project.versionComments`.

### Auto-Increment

The part of the version number that goes up by 1 after each successful build: **None**, **Revision**, **Build**, **Minor** or **Major**. It is **None** by default. VB6 always increases *Revision*. In the `Settings` file it is `project.versionAutoIncrement`.

## Type Library Version

The version of the type library that the build generates for the project.

### Major/Minor
{: #typelib-major-minor}

The major and minor version numbers of the type library. When one of them is -1, the build uses the matching part of the [version number](#majorminorbuildrevision) instead. When they are not set, the type library's version is 1.0. In the `Settings` file they are `project.typeLibVersionMajor` and `project.typeLibVersionMinor`.

### Auto-Increment
{: #typelib-auto-increment}

The part of the type library's version that goes up by 1 after each successful build: **None**, **Major** or **Minor**. It is **None** by default. In the `Settings` file it is `project.typeLibVersionAutoIncrement`.

## Register DLLs to HKLM

For an **ActiveX DLL** or **ActiveX Control** build. When set to **Yes**, the DLL's `DllRegisterServer` and `DllUnregisterServer` register it under `HKEY_LOCAL_MACHINE` instead of `HKEY_CURRENT_USER`, as VB6 DLLs do. It is **No** by default. In the `Settings` file it is `project.dllRegisterLocalMachine`.

> [!IMPORTANT]
> Registering under `HKEY_LOCAL_MACHINE` needs administrator rights, so with this setting at **Yes**, the IDE usually has to be started with **Run as administrator**.

## Register DLL after build

For an **ActiveX DLL** or **ActiveX Control** build. When set to **Yes**, the IDE registers the DLL as soon as the build finishes. It is **Yes** by default. **No** leaves the registration to the developer. In the `Settings` file it is `project.dllRegisterAfterBuild`.

## COM Initialization

How a built EXE initializes COM and OLE, which sets its threading model: **OleInitialize STA (Single Threaded Apartment)**, **MTA (CoInitializeEx - Multi Threaded Apartment)** or **STA (CoInitialize - Single Threaded Apartment)**. The default is **OleInitialize STA (Single Threaded Apartment)**, which matches VB6. It has no effect on a DLL build. In the `Settings` file it is `project.comInitialization`.

## Is Console Application

When set to **Yes**, the built executable is marked as a console application rather than a GUI application. It is **No** by default; the **Standard EXE (Console App)** template sets it to **Yes**. In the `Settings` file it is `project.isConsoleApplication`. [Writing a command-line tool](../../../Features/Project-Configuration/Project-Types#writing-a-command-line-tool-output-exit-code-and-arguments) shows how such a program writes its output and sets its exit code.

## Native Subsystem

When set to **Yes**, the build marks the file as a native-subsystem image (`IMAGE_SUBSYSTEM_NATIVE`), which suits a kernel-mode device driver. It is **No** by default. In the `Settings` file it is `project.isNativeSubsystem`.

## Override Entry Point

The name of a procedure to use as the entry point of the built file. That procedure then has to initialize everything itself, such as COM and OLE. It is mainly for native kernel-mode builds --- see [Native Subsystem](#native-subsystem). A new project does not set it. In the `Settings` file it is `project.overrideEntryPoint`.

## Runtime Binding of DLL Declares

When set to **Yes**, the project's [**Declare**](../../Core/Declare) statements are resolved at run time. When set to **No**, they are added to the import address table (IAT) of the built file. It is **Yes** by default. A **Declare** that comes from a type library always goes into the import address table, whatever this setting says. In the `Settings` file it is `project.dllRuntimeBinding`.

## Conditional Compilation Args

Conditional compilation constants for the whole project, as `name=value` pairs separated by colons: `foo=42:bar=-42`. Each value must be between -32768 and 32767. These are the project-wide constants that [**#If**](../../Core/Topic-Preprocessor) can test; **#Const** defines a constant for its own module only. A new project does not set it. In the `Settings` file it is `project.conditionalCompilationArguments`.

## Option Explicit On

Whether [**Option Explicit**](../../Core/Option) is on in a file that has no **Option Explicit** statement of its own. It is **Yes** by default. In the `Settings` file it is `project.optionExplicit`.

## Auto Prettify Source Code

When set to **Yes**, the editor corrects the capitalization of words as they are typed, and corrects spacing to the usual VBE layout. It is **Yes** by default. In the `Settings` file it is `project.autoPrettify`.

## CodeLens - Show Run Procedure
{: #show-run-procedure }

When set to **Yes**, the editor shows **▶ run** and the procedure's name in the CodeLens above each procedure in a standard module that takes no arguments. [CodeLens](../../../Features/Compiler-IDE/CodeLens) describes running a procedure that way. It is **Yes** by default. In the `Settings` file it is `project.codeLensRunProcedure`.

## Runtime Windows Codepage

The Windows code page that [**Chr**](../../Modules/Strings/Chr), **Chr$**, [**String**](../../Modules/Strings/String), **String$**, [**StrConv**](../../Modules/Strings/StrConv) and [**Asc**](../../Modules/Strings/Asc) use at run time. The choices are the system code page at compile time, the system code page at run time, fourteen code pages named by number, from **CODEPAGE 1252 - WESTERN EUROPEAN (Latin-1)** to **CODEPAGE 949 - KOREAN (KS C 5601)**, and **OTHER**. The default is **SYSTEM CODEPAGE [AT COMPILE TIME]**. In the `Settings` file it is `project.ansiCodePageRuntime`.

## Use Unicode Standard Library

When set to **Yes**, the compiler uses the Unicode versions of Windows API calls wherever it can: [**MsgBox**](../../Modules/Interaction/MsgBox) calls `MessageBoxW` rather than `MessageBoxA`, for example. It is **Yes** by default. In the `Settings` file it is `runtime.useUnicodeStandardLibrary`.

## Unicode Control Notifications

When set to **Yes**, twinBASIC container windows --- forms, UserControls, PictureBoxes and Frames --- answer the `WM_NOTIFYFORMAT` message from third-party controls and Common Controls by saying that they support Unicode. It is **Yes** by default. A project that does not subclass its windows to handle `WM_NOTIFY` messages itself does not usually need to change it. In the `Settings` file it is `runtime.useUnicodeCommonControlNotifications`.

## Include Procedure Name Symbols in Built Executables
{: #include-procedure-name-symbols }

When set to **Yes**, the compiler includes the names of procedures in built EXEs and DLLs, and the call stack information read at run time uses them. When set to **No**, [**ErrorStackFrame**](../../Packages/VBRUN/ErrorStackFrame/) gives `{unknown}` for those names in a built executable. It is **No** by default. The names make the file slightly larger and do not slow it down. In the `Settings` file it is `compiler.includeStackSymbols`.

## Trace Flags

What the trace logger records, together with [Trace Output](#trace-output). [Debug Trace Logger](../../../Features/Compiler-IDE/Debugging#debug-trace-logger) describes the logger. Each flag has a box, and no box is ticked by default:

- **Trace Procedure Entry and Exit points**
- **Trace Procedure Arguments** -- needs *Trace Procedure Entry and Exit points* as well
- **Trace IDispatch::QueryInterface calls**
- **Trace IDispatch::GetIDsOfNames calls**
- **Trace IDispatch::Invoke calls**
- **Trace Window (HWND) Messages**
- **Trace Debug.TracePrint output** -- what [**Debug.TracePrint**](../../Modules/Debug#traceprint) writes
- **Buffered Trace Log File Writing** -- not for tracing a hard crash
- **Trace IClassFactory::CreateInstance and IClassFactory2::CreateInstanceLic calls for exposed COM classes**
- **Trace DllGetClassObject calls** -- COM and ActiveX creation of the project's exposed classes
- **Trace RaiseEvent calls and arguments**

In the `Settings` file it is `compiler.traceFlags`.

## Trace Output

Where the trace log goes: the full path of the log file. A new project does not set it. The path can use these placeholders:

- `${SESSIONID}` -- a GUID that is unique to each session and each thread
- `${DATE}` -- the date, as `YYYYMMDD`
- `${TIME}` -- the time, as `HHNNSS`
- `${DEBUG}` -- sends the log to the IDE's [DEBUG CONSOLE](DebugConsole) only

In the `Settings` file it is `compiler.traceOutput`.

> [!IMPORTANT]
> A path to a file must include `${SESSIONID}`, so that each thread can create a log of its own.

## Disable Overflow Checks

When set to **Yes**, the compiler leaves out every run-time check for integer overflow in arithmetic, which produces more efficient code. It is **No** by default. It is the same as [**IntegerOverflowChecks(False)**](../../Core/Attributes#integeroverflowchecks) on every procedure in the project, and the compiler then ignores any **IntegerOverflowChecks** attribute in the project. It affects the project only, not the packages it references. In the `Settings` file it is `compiler.disableOverflowChecks`.

## Disable Array Bounds Checks

When set to **Yes**, the compiler leaves out every run-time check of array bounds when array elements are read and written, which produces more efficient code. It is **No** by default. It is the same as [**ArrayBoundsChecks(False)**](../../Core/Attributes#arrayboundschecks) on every procedure in the project, and the compiler then ignores any **ArrayBoundsChecks** attribute in the project. It affects the project only, not the packages it references. In the `Settings` file it is `compiler.disableArrayBoundsChecks`.

## Disable FPU Error Checks

When set to **Yes**, the compiler leaves out every run-time check for floating-point (FPU) errors in arithmetic, which produces more efficient code. It is **No** by default. It is the same as [**FloatingPointErrorChecks(False)**](../../Core/Attributes#floatingpointerrorchecks) on every procedure in the project, and the compiler then ignores any **FloatingPointErrorChecks** attribute in the project. It affects the project only, not the packages it references. In the `Settings` file it is `compiler.disableFPUErrorChecks`.

## Sanitize Booleans

When set to **Yes**, the compiler makes sure that a **Boolean** value from an external source is exactly **True** (-1) or **False** (0), so that a value such as 1 cannot end up in a **Boolean**. It is **No** by default. It costs a little performance. In the `Settings` file it is `compiler.sanitizeBooleans`.

## Constant Function Folding

Experimental. When set to **Yes**, the compiler replaces some function calls with their results as it compiles, where the result is fully known at compile time. It affects only calls to the VBA standard library, and calls to standard-module functions marked with the [**ConstantFoldable**](../../Core/Attributes#constantfoldable) attribute. It is **No** by default. In the `Settings` file it is `optimizer.constantFunctionFolding`.

## Large Address Aware (LAA)
{: .la-aware }

When set to **Yes**, a 32-bit EXE built from the project has the `LARGE ADDRESS AWARE` flag, which lets it use up to 4 GB of memory. When set to **No**, a 32-bit EXE is limited to 2 GB. It is **No** by default. The project's own code and every third-party DLL it uses must be compatible with the flag, so set it with care. A 64-bit build always has the flag. In the `Settings` file it is `project.largeAddressAware`.

## Terminal Server Aware
{: .ts-aware }

When set to **Yes**, the build marks the file as Terminal Server aware. The mark changes how some Windows API calls, such as `GetWindowsDirectory`, behave when the program runs on a Terminal Server. It is **No** by default. In the `Settings` file it is `project.terminalServerAware`.

## Data Execution Prevention Aware (DEP)
{: .dep-aware }

When set to **Yes**, the build marks the file as DEP-aware. On hardware that supports it, this protects the program against attacks that inject code while it runs. It is **No** by default. In the `Settings` file it is `project.depAware`.

## Export

> [!WARNING]
> **File → Export Project** deletes everything in its target folder before it writes, without asking. Read [Export Project](Menu/File#export-project) before setting these.

### Export Path

The folder **File → Export Project** writes to. When it is set, the command exports there straight away instead of asking for a folder, and empties the folder first. In the `Settings` file it is `project.exportPath`.

The path can use these variables: `${SourcePath}`, the folder that holds the `.twinproj` file, and `${ProjectName}`, `${ProjectFileName}`, `${ProjectID}`, `${FileExtension}`, `${VersionMajor}`, `${VersionMinor}`, `${VersionBuild}` and `${VersionRevision}`. The dialog refuses `${SourcePath}` on its own, because the export would delete the project file, but it accepts the same folder written out in full.

Every project template sets `"project.exportPathIsV2": true` in the `Settings` file. In a project without it, the export goes into a subfolder named after the project, inside *Export Path*.

### Export After Save

When set to **Yes**, every save of the project also runs **Export Project** into *Export Path*. So every save empties that folder again, even a save with nothing changed. It is **No** by default. In the `Settings` file it is `project.exportAfterSave`.

### Export Verbose

When set to **Yes**, **Export Project** writes a line to the [Debug Console](DebugConsole) for each file and folder it deletes, `[EXPORT]  DELETED: …`, and for each file it writes, `[EXPORT]  DONE: …`. When set to **No**, the console shows only the line that starts the export, the `[EXPORT] COMPLETED` line that ends it, and any failure. It is **No** by default. In the `Settings` file it is `project.exportVerbose`.

## Force DPI Awareness At Startup
{: #dpi-awareness }

How the program sets its DPI awareness as it starts: **NONE**, **SYSTEM_DPI_AWARE** or **PER_MONITOR_DPI_AWARE**. The default is **PER_MONITOR_DPI_AWARE**. The last two make the program call the `SetProcessDpiAwareness` API, where Windows has it. **NONE** turns DPI awareness off; it is also the choice for a program that sets its DPI awareness itself, in a manifest. In the `Settings` file it is `project.forceDpiAwarenessAtStartup`.

## Runtime Command Line Args

The text that [**Command$**](../../Modules/Interaction/Command) returns while the project runs in a debug session in the IDE. A new project does not set it. In the `Settings` file it is `debugger.runtimeCommandLineArguments`.

## Immediate Memory Invalidation

When set to **Yes**, the memory of a **String**, **Variant** or array is overwritten with garbage as soon as the value is released. The operating system does not usually clear freed memory until it is used again, so code that reads through a stale pointer to a released value usually still finds the old contents, and the bug shows only now and then. With this setting on, the stale pointer finds garbage, which makes the bug easier to detect. It is **No** by default, and it slows debugging slightly. In the `Settings` file it is `debugger.immediateMemoryInvalidation`.

## Break On All Errors

When set to **Yes**, a run-time error stops the program at the failing line even while an `On Error Resume Next` or `On Error GoTo` statement is in effect, with the same error panel as an error that nothing handles. It is **No** by default, and then the handler gets the error. **Debug → Debugger Options → Break On All Errors** turns the same setting on and off. In the `Settings` file it is `debugger.breakOnAllErrors`.

[When a run-time error stops the program](Menu/Debug#when-a-run-time-error-stops-the-program) describes the panel. [Debugger Options](Menu/Debug#debugger-options) says what **Ignore (Resume Next)** does when this setting is on.

## Build Stack Reserve Size

The size of the stack reserved for the program, in bytes, which the build writes into the PE header of the file. The default is 1 MB, 1048576 bytes. If procedures crash at run time with stack overflow errors, try a larger value. In the `Settings` file it is `project.buildStackReserveSize`.

## Target OS Version

The version of Windows that the built file is marked for. The build writes it into the `MajorOperatingSystemVersion`, `MinorOperatingSystemVersion`, `MajorSubsystemVersion` and `MinorSubsystemVersion` fields of the file's PE optional header. The choices run from **[v5.0] Windows 2000** to **[v10.0] Windows 10 / Windows 11 / Windows Server 2016**, and the default is **[v5.1] Windows XP**. In the `Settings` file it is `project.targetOsVersion`.

## Codegen Model

The kind of code that the compiler generates for a built file, especially when it does not use [LLVM](../../../LLVM/Getting-Started#llvm-in-twinbasic): **SMALL** makes the file as small as it can, whatever the speed; **FAST** generates larger code, aiming to run slightly faster; **BALANCED** is between the two. The default is **BALANCED**. Only the main project's setting counts: a package uses the setting of the project that references it. In the `Settings` file it is `project.codegenModel`.

## Strip PE File Relocation Symbols
{: #strip-pe-symbols }

Whether the build leaves the relocation data out of the file, which makes it smaller: **AUTO**, **YES** or **NO**. The default is **AUTO**, which strips the relocations from an EXE and keeps them in a DLL or OCX. **YES** is not usually right for a DLL: without its relocations, a DLL can fail to load when another DLL already uses its base address. In the `Settings` file it is `project.relocationSymbolsStripped`.

## Enable Address Space Layout Randomization (ASLR)
{: #enable-aslr }

When set to **Yes**, Windows loads the EXE or DLL at a random base address. It is **Yes** by default. It works only in a file that keeps its relocation data, so with [Strip PE File Relocation Symbols](#strip-pe-symbols) at its default it applies to a DLL and not to an EXE. In the `Settings` file it is `project.addressSpaceLayoutRandomization`.

## PE File Image Base Address (Win32)
{: #win32-base-address }

Overrides the image base address in the PE header of a Win32 EXE, DLL or OCX. The default is `&H400000`, for a DLL as well as for an EXE. In the `Settings` file it is `project.imageBaseAddress32`, as a decimal number.

## PE File Image Base Address (Win64)

Overrides the image base address in the PE header of a Win64 EXE, DLL or OCX. The default is `&H140000000`, for a DLL as well as for an EXE. In the `Settings` file it is `project.imageBaseAddress64`, as a decimal number.

## Debuggable

When set to **Yes**, breakpoints can be set in the project's procedures, and stepping into them works as usual. It is **Yes** by default. **No** is mainly useful in a package, to keep the projects that use the package from stepping into its code. The [**Debuggable**](../../Core/Attributes#debuggable) attribute changes it for a module, a class or a procedure. In the `Settings` file it is `project.debuggable`.

## Feature Flags

Project features that can be turned off, to make the built file smaller. The dialog shows them as two settings, **Feature Flags** and **Feature Flags - continued**, with a box for each feature, and every box is ticked by default.

**Feature Flags** has these: PictureBox Control, Label Control, TextBox Control, Frame Control, Multiframe Control (which needs Frame Control as well), CommandButton Control, Checkbox Control, OptionButton Control, ComboBox Control, ListBox Control, HScrollBar Control, VScrollBar Control, Timer Control, DriveListBox Control, DirListBox Control, FileListBox Control, Line Control, Shape Control, Image Control, CheckMark Control, QRCode Control, Data Control (which needs Data Bindings as well), Data Bindings (all controls), OLE Control, MDI Forms support, PropertyPages support, Reports support, Menus support, OLE Drag-Drop support, Printers support, Help CHM support for controls, and ActiveX and UserControls.

**Feature Flags - continued** has these: Manual drawing on container controls, DTPicker Control, ImageList Control, ListView Control, MonthView Control, ProgressBar Control, Slider Control, TreeView Control, UpDown Control, Compress Runtime Class Dispatch Info, Compress Runtime Error Tables, Compress Misc Data, Buttons support Graphical style, and Runtime PNG support (via Global.LoadPicture).

In the `Settings` file they are `project.featureFlagsUI` and `project.featureFlagsUI2`.

## Compiler Options (BUILD)

Turns on [LLVM compilation](../../../LLVM/Getting-Started#llvm-in-twinbasic) and its optimizations for the executable a build produces.

## Compiler Options (DEBUG)

Turns on [LLVM compilation](../../../LLVM/Getting-Started#llvm-in-twinbasic) and its optimizations when the project runs in the IDE. This is not recommended: the IDE cannot debug code compiled with LLVM.
