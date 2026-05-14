---
title: Project
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Project
has_toc: false
---

# Project class
{: .no_toc }

The currently-loaded project. Reached through [**Host.CurrentProject**](Host#currentproject); the IDE swaps the underlying instance when the user switches projects, but the **Project** reference held by the addin remains a stable handle that always reflects the *currently* loaded project's state.

The class groups four kinds of capability:

- **Identification** — [**Name**](#name), [**Path**](#path), [**BaseFolderPath**](#basefolderpath), [**ProjectID**](#projectid), version + architecture + build-output info.
- **Lifecycle commands** — [**Save**](#save), [**Close**](#close), [**Build**](#build), [**Clean**](#clean) (the same actions the IDE's File menu exposes).
- **Programmatic access** — [**Evaluate**](#evaluate) runs an arbitrary expression against the running project context (the same engine as the DEBUG CONSOLE); [**RootFolder**](#rootfolder) is the entry into the virtual file system.
- **Persistent storage** — [**LoadMetaData**](#loadmetadata) / [**SaveMetaData**](#savemetadata) store per-addin key/value pairs inside the `.twinproj` file.

```tb
With Host.CurrentProject
    Host.DebugConsole.PrintText "Project: " & .Name & " (" & .Path & ")"
    Host.DebugConsole.PrintText "Version: " & .VersionMajor & "." & .VersionMinor & "." & _
                                              .VersionBuild & "." & .VersionRevision
    Host.DebugConsole.PrintText "BuildType: " & .BuildType
End With
```

* TOC
{:toc}

## Properties

### Architecture
{: .no_toc }

The project's target processor architecture. **As** [**VbArchitecture**](../../Modules/Constants/VbArchitecture) (`vbX86` / `vbX64` / `vbARM` …). Read-only.

### BaseFolderPath
{: .no_toc }

The folder containing the project's `.twinproj` file — i.e. the directory part of [**Path**](#path). **String**, read-only.

### BuildFileExtension
{: .no_toc }

The file extension the build output will carry (`"exe"`, `"dll"`, `"ocx"`, `"twinpack"`). **String**, read-only. Implied by [**BuildType**](#buildtype).

### BuildOutputPath
{: .no_toc }

The full path of the project's build output, including filename and extension — the file that [**Build**](#build) writes (or would write) to. **String**, read-only.

### BuildType
{: .no_toc }

The kind of artefact the project builds. **As** [**VbBuildType**](#vbbuildtype) (see below). Read-only.

### Name
{: .no_toc }

The project's display name, as configured in its `Settings`. **String**, read-only.

### Path
{: .no_toc }

The full path to the project's `.twinproj` file. **String**, read-only.

### ProjectID
{: .no_toc }

The project's GUID as a string — e.g. `"{99DEC38C-75F6-4488-8EE7-2D52D83881D2}"`. **String**, read-only. Stable across renames; useful as a key in addin-side per-project state.

### RootFolder
{: .no_toc }

The root of the project's virtual file system — the entry point for walking sources, resources, packages, and other project contents. **As** [**Folder**](Folder). Read-only.

### VersionBuild, VersionMajor, VersionMinor, VersionRevision
{: .no_toc }

The four components of the project's current version (`Major.Minor.Build.Revision`). **Long**, read-only.

## Methods

### Build
{: .no_toc }

Builds the project. Equivalent to the IDE's File → Make/Build… command. Writes the output to [**BuildOutputPath**](#buildoutputpath); errors raised during compilation surface in the DEBUG CONSOLE the same way they would for a user-initiated build.

Syntax: *project*.**Build**

### Clean
{: .no_toc }

Deregisters and deletes any built executables relating to the project — the inverse of a previous [**Build**](#build).

Syntax: *project*.**Clean**

### Close
{: .no_toc }

Closes the project. Equivalent to File → Close Project. If the project is dirty the IDE may prompt the user before actually closing.

Syntax: *project*.**Close**

### Evaluate
{: .no_toc }

Evaluates an expression in the context of the currently-loaded project, as if the user had typed it into the DEBUG CONSOLE. Returns the expression's value as a **Variant** (anything from a `Long` to a serialised object, depending on what was evaluated).

Syntax: *project*.**Evaluate**( *EvalString* [, *Options* ] ) **As Variant**

*EvalString*
: *required* The expression to evaluate. **String**. Any expression valid in the DEBUG CONSOLE works — arithmetic (`10.5 * 4`), property reads (`MyForm.Caption`), function calls (`MyModule.MyFunc(42)`), and so on.

*Options*
: *optional* A [**DebuggerEvaluateOptions**](Host#debuggerevaluateoptions) value. Default [**NONE**](Host#DebuggerEvaluateOptions_NONE).

```tb
On Error Resume Next
Dim result As Variant = Host.CurrentProject.Evaluate("10.5 * 4")
If Err.Number = 0 Then
    Host.ShowMessageBox CStr(result), "OK", "Result"
Else
    Host.ShowMessageBox "ERROR " & Err.Number & vbCrLf & vbCrLf & Err.Description, "OK", "ERROR"
End If
```

Same engine the DEBUG CONSOLE uses, so the same set of identifiers, the same accessibility rules, and the same error semantics apply — including the run-time errors that surface from inside the evaluated expression. Wrap in `On Error Resume Next` if the expression may raise.

### LoadMetaData
{: .no_toc }

Reads a previously-stored value out of the project's meta-data area inside the `.twinproj` file.

Syntax: *project*.**LoadMetaData**( *Key* ) **As String**

*Key*
: *required* The meta-data key. **String**. Returns `""` if no value has been stored under *Key*.

The meta-data is associated with the loaded project, not with the addin globally. Closing the project closes the storage too; opening a different project gives a different store. For addin-wide persistence (e.g. addin-level options that should follow the user across projects), use `GetSetting` / `SaveSetting` against the registry — sample 15 demonstrates that pattern.

### Save
{: .no_toc }

Saves the project. Equivalent to File → Save Project.

Syntax: *project*.**Save**

### SaveMetaData
{: .no_toc }

Stores a string value under a key inside the project's meta-data area in the `.twinproj` file. The value persists across project re-opens.

Syntax: *project*.**SaveMetaData** *Key*, *Value*

*Key*
: *required* The meta-data key. **String**.

*Value*
: *required* The value to store. **String**.

```tb
' Persist a user-selected option that should follow the project:
Host.CurrentProject.SaveMetaData "MyAddIn.LastUsedFilter", "*.bas"

' Restore it next time the project loads:
Private Sub Host_OnProjectLoaded()
    Dim lastFilter As String = Host.CurrentProject.LoadMetaData("MyAddIn.LastUsedFilter")
    If Len(lastFilter) = 0 Then lastFilter = "*.twin"
    ' …
End Sub
```

## VbBuildType
{: #vbbuildtype }

The artefact-kind enum returned by [**BuildType**](#buildtype). Declared inline on the **Project** interface.

| Constant | Value | Description |
|----------|-------|-------------|
| **StandardEXE**{: #VbBuildType_StandardEXE }                | 0 | A standard Win32 executable. |
| **StandardDLL**{: #VbBuildType_StandardDLL }                | 1 | A standard Win32 DLL. Addins themselves are Standard DLL projects. |
| **ActiveXDLL**{: #VbBuildType_ActiveXDLL }                  | 2 | A COM (ActiveX) DLL. |
| **ActiveXControl**{: #VbBuildType_ActiveXControl }          | 3 | A COM (ActiveX) control — `.ocx`. |
| **PackageTWINPACK**{: #VbBuildType_PackageTWINPACK }        | 4 | A twinBASIC package (`.twinpack`). |
