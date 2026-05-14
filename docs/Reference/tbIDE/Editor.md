---
title: Editor
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/Editor
has_toc: false
---

# Editor class
{: .no_toc }

The base interface every IDE editor presents. **Editor** itself exposes only the universal members --- [**Path**](#path), [**Type**](#type), [**SetFocus**](#setfocus), [**Close**](#close), [**Save**](#save), [**IsDirty**](#isdirty) --- and an instance returned from [**Editors.Item**](Editors#item) or the [**Host.OnChangedActiveEditor**](Host#onchangedactiveeditor) event is normally a *specific* editor kind (e.g. [**CodeEditor**](CodeEditor) for code panes), reachable by casting.

## Castability
{: #castability }

An **Editor** returned by the IDE is castable to the specific editor kind for the underlying pane. For a code pane the cast target is [**CodeEditor**](CodeEditor); other editor kinds may be added in future IDE versions and will follow the same pattern.

Use `TypeOf` to test before casting:

```tb
If Host.ActiveEditors.Count > 0 Then
    If TypeOf Host.ActiveEditors(0) Is CodeEditor Then
        Dim codeEditor As CodeEditor = Host.ActiveEditors(0)
        Host.DebugConsole.PrintText "selected text: " & codeEditor.SelectedText
    End If
End If
```

Cast unconditionally only when the source --- e.g. an [**OnChangedActiveEditor**](Host#onchangedactiveeditor) handler for a known editor kind --- guarantees the underlying type.

* TOC
{:toc}

## Properties

### IsDirty
{: .no_toc }

**True** if the editor has unsaved changes. **Boolean**, read-only.

### Path
{: .no_toc }

The internal virtual-FS path of the file the editor is displaying --- e.g. `"twinbasic:/Sources/MainModule.twin"`. **String**, read-only. Resolves through [**FileSystem.ResolvePath**](FileSystem#resolvepath).

### Type
{: .no_toc }

A short string identifying the editor kind --- e.g. `"CodeEditor"` for a code pane. **String**, read-only. Useful for diagnostic log lines; for capability dispatch prefer `TypeOf` over comparing this string.

## Methods

### Close
{: .no_toc }

Closes the editor. If the editor is dirty, the IDE may prompt the user before actually closing.

Syntax: *editor*.**Close**

### Save
{: .no_toc }

Saves the editor's contents.

Syntax: *editor*.**Save**

### SetFocus
{: .no_toc }

Brings the editor to the foreground and gives it keyboard focus.

Syntax: *editor*.**SetFocus**
