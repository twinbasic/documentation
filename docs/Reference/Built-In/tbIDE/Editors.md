---
title: Editors
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Editors
has_toc: false
---

# Editors class
{: .no_toc }

The collection of editors active in the IDE --- accessible through [**Host.ActiveEditors**](Host#activeeditors). The IDE currently exposes exactly one active editor at a time, but the collection interface allows future versions to expose more. The most common operations are `Host.ActiveEditors(0)` (the active editor) and [**Open**](#open) (jump to a file at a given line / column).

```tb
' Read the selection out of the currently-focused code pane:
If Host.ActiveEditors.Count > 0 Then
    If TypeOf Host.ActiveEditors(0) Is CodeEditor Then
        Dim codeEditor As CodeEditor = Host.ActiveEditors(0)
        Host.DebugConsole.PrintText codeEditor.SelectedText
    End If
End If

' Navigate to a specific file + line + column:
Host.ActiveEditors.Open "twinbasic:/Sources/MainModule.twin", 42, 8
Host.ActiveEditors.Item(0).SetFocus
```

* TOC
{:toc}

## Properties

### Count
{: .no_toc }

Number of editors currently active. **Long**, read-only. Currently always **0** or **1**.

### Item
{: .no_toc }

Indexed access to the editor collection. **DefaultMember** --- so `Host.ActiveEditors(0)` is equivalent to `Host.ActiveEditors.Item(0)`.

Syntax: *editors*( *Index* ) **As** [**Editor**](Editor)

*Index*
: A zero-based **Variant** index. Currently `0` is the only valid value when an editor is open.

The returned object is an [**Editor**](Editor) but is usually castable to a more specific kind (e.g. [**CodeEditor**](CodeEditor) for a code pane) --- see [Editor castability](Editor#castability).

## Methods

### Open
{: .no_toc }

Opens (or re-focuses) the editor for a given file, optionally positioning the caret at a specific line and column.

Syntax: *editors*.**Open** *Path* [, *LineNumber* ] [, *ColumnNumber* ] [, *Options* ]

*Path*
: *required* The virtual-FS path of the file to open. **String**. Typically starts with `"twinbasic:/"`; the value returned by [**FileSystemItem.Path**](FileSystemItem#path) or [**Editor.Path**](Editor#path) is always a valid argument.

*LineNumber*
: *optional* One-based line number to navigate to. **Long**. Default **0** (no navigation --- open the file at its remembered cursor position).

*ColumnNumber*
: *optional* One-based column number on the requested line. **Long**. Default **0** (column 1).

*Options*
: *optional* An [**EditorOpenOptions**](#editoropenoptions) value. Default [**NONE**](#EditorOpenOptions_NONE).

After **Open** returns, the requested file is the active editor; call `Editors.Item(0).SetFocus` to give it keyboard focus.

```tb
Host.ActiveEditors.Open File.Path, LineNumber, ColumnNumber
Host.ActiveEditors.Item(0).SetFocus
```

## EditorOpenOptions
{: #editoropenoptions }

A flags enum declared inline on the **Editors** interface; consumed by [**Open**](#open). Currently a single-value placeholder --- additional flags may appear in later IDE versions.

| Constant | Value | Description |
|----------|-------|-------------|
| **NONE**{: #EditorOpenOptions_NONE } | 0 | No special open options. |
