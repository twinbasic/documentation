---
title: tbIDE Package
parent: Packages
grand_parent: Reference Section
nav_order: 11
permalink: /tB/Packages/tbIDE/
has_toc: false
---

# tbIDE Package
{: .no_toc }

The **tbIDE** package is the **addin SDK** for the twinBASIC IDE. An addin is a Standard DLL that the IDE loads at start-up; the DLL exports one factory function, returns one object implementing the [**AddIn**](AddIn) contract, and from there everything happens through the [**Host**](Host) object the IDE passes in. The package itself is **type-only** — every public symbol is an interface or a CoClass; the actual implementations live in the twinBASIC IDE binary, and the addin DLL binds against the type declarations and lets the IDE marshal calls into its implementations at run time.

The package is a built-in *compiler* package shipped with twinBASIC. It is added to addin projects automatically; you do not need to add it manually through Project → References.

* TOC
{:toc}

## Building and loading an addin

An addin project has three distinguishing settings:

- **Build type:** Standard DLL.
- **Build path:** `${IdePath}\addins\${Architecture}\${ProjectName}.${FileExtension}`. The output drops directly into the IDE's `addins\Win32\` or `addins\Win64\` folder, where the IDE scans for addins on start-up.
- **Compiler-package reference** to **tbIDE** (added to the project's references with `isCompilerPackage: true`, `publisher: TWINBASIC-COMPILER`, `symbolId: tbIDE`). This is the binding between the DLL's compile-time types and the IDE's run-time implementations.

The DLL must export one function — the entry point the IDE calls when it discovers and loads the addin:

```tb
Module MainModule
    [DllExport]
    Public Function tbCreateCompilerAddin(ByVal Host As Host) As AddIn
        Return New MyAddIn(Host)
    End Function
End Module
```

The returned object must implement [**AddIn**](AddIn). The IDE releases the object when the addin is disabled or the IDE shuts down, which lets the addin clean up through `Class_Terminate`.

A minimal addin class:

```tb
Private Class MyAddIn
    Implements AddIn

    Private WithEvents Host As Host

    Public Sub New(ByVal Host As Host)
        Set Me.Host = Host
    End Sub

    Private Property Get AddIn_Name() As String
        Return "My AddIn"
    End Property

    Private Sub Host_OnProjectLoaded()
        Host.DebugConsole.PrintText "Hello from My AddIn!"
    End Sub
End Class
```

The `WithEvents Host As Host` pattern is how the addin subscribes to IDE lifecycle events ([**OnProjectLoaded**](Host#onprojectloaded), [**OnChangedActiveEditor**](Host#onchangedactiveeditor), [**OnChangedTheme**](Host#onchangedtheme)). Almost every meaningful addin sets up its toolbar buttons and tool windows inside the [**OnProjectLoaded**](Host#onprojectloaded) handler — that is the first moment the IDE is fully ready to accept extensibility commands.

## The class catalogue

The package's twenty-four `.twin` files declare one interface-and-CoClass pair each (plus one concrete `Class`), grouped here by role for orientation. Every CoClass except [**AddinTimer**](AddinTimer) is **handed to the addin by the IDE** — never instantiated with `New`.

### Entry point and root API

- [**AddIn**](AddIn) — the contract every addin's main class implements. One read-only [**Name**](AddIn#name) property.
- [**Host**](Host) — the root API object passed to `tbCreateCompilerAddin`. Exposes the [**CurrentProject**](Host#currentproject), the [**ActiveEditors**](Host#activeeditors), the [**Toolbars**](Host#toolbars), the [**ToolWindows**](Host#toolwindows), the [**DebugConsole**](Host#debugconsole), the [**FileSystem**](Host#filesystem), the [**KeyboardShortcuts**](Host#keyboardshortcuts), the [**Themes**](Host#themes), and a small set of dialog helpers ([**ShowMessageBox**](Host#showmessagebox), [**ShowNotification**](Host#shownotification)).
- [**AddinTimer**](AddinTimer) — the package's only user-instantiable class. `New AddinTimer`; set [**Interval**](AddinTimer#interval) and [**Enabled**](AddinTimer#enabled); receive a [**Timer**](AddinTimer#timer) event.

### Project, editors, and the virtual file system

- [**Project**](Project) — the currently-loaded project. Lifecycle ([**Save**](Project#save), [**Close**](Project#close), [**Build**](Project#build), [**Clean**](Project#clean)), introspection ([**Name**](Project#name), [**Path**](Project#path), [**ProjectID**](Project#projectid), version + architecture + build-output info), the [**Evaluate**](Project#evaluate) hook into the debug-console expression engine, the [**RootFolder**](Project#rootfolder) entry into the virtual file system, and the [**LoadMetaData**](Project#loadmetadata) / [**SaveMetaData**](Project#savemetadata) pair for persistent per-addin key/value storage inside the `.twinproj` file.
- [**Editor**](Editor) — the base editor interface (Path, Type, SetFocus, Close, Save, IsDirty). Castable to [**CodeEditor**](CodeEditor).
- [**CodeEditor**](CodeEditor) — a code-pane editor: selection, full text, Monaco passthrough ([**ExecuteMonacoCommand**](CodeEditor#executemonacocommand)), inline overlay HTML ([**AddMonacoWidget**](CodeEditor#addmonacowidget)).
- [**Editors**](Editors) — the collection of active editors. `Editors(0)` is the current editor; [**Open**](Editors#open) jumps to a file (and optional line/column).
- [**FileSystem**](FileSystem) — the virtual file system. [**RootFolder**](FileSystem#rootfolder), [**ResolvePath**](FileSystem#resolvepath).
- [**FileSystemItem**](FileSystemItem) — the base for [**File**](File) and [**Folder**](Folder). `Name`, `Path`, `Type`, `Parent`.
- [**Folder**](Folder) — children enumeration (use **For Each** — see the warning on [**Count**](Folder#count) / [**Item**](Folder#item) — the IDE is multi-threaded and index-based iteration races), [**IsPackagesFolder**](Folder#ispackagesfolder).
- [**File**](File) — virtual-FS file accessors: [**Data**](File#data) (raw bytes), [**Text**](File#text) (decoded text), [**ReadText**](File#readtext) (text with options like comment-stripping), [**IsDirty**](File#isdirty).

### IDE UI surface

- [**Toolbar**](Toolbar) — the IDE toolbar. [**AddSplitter**](Toolbar#addsplitter), [**AddButton**](Toolbar#addbutton).
- [**Toolbars**](Toolbars) — the toolbar collection. Currently there is only one toolbar, addressable as `Toolbars(0)`.
- [**Button**](Button) — a toolbar button created by [**AddButton**](Toolbar#addbutton). Exposes [**OnClick**](Button#onclick).
- [**ToolWindow**](ToolWindow) — a dockable / floating HTML-rendered tool window. [**Title**](ToolWindow#title), [**Visible**](ToolWindow#visible), [**Resizable**](ToolWindow#resizable), [**RootDomElement**](ToolWindow#rootdomelement), [**ApplyCss**](ToolWindow#applycss), [**OnClose**](ToolWindow#onclose).
- [**ToolWindows**](ToolWindows) — the tool-window factory: [**Add**](ToolWindows#add) creates a new one.

### Tool-window DOM and events

The four `Html*` classes are the addin's keyhole into the DOM inside a tool window. All four are declared with `[COMExtensible(True)]` — see [Dynamic DOM property resolution](#dynamic-dom-property-resolution).

- [**HtmlElement**](HtmlElement) — one DOM element. [**Properties**](HtmlElement#properties), [**ChildDomElements**](HtmlElement#childdomelements), [**Remove**](HtmlElement#remove), [**AddEventListener**](HtmlElement#addeventlistener).
- [**HtmlElements**](HtmlElements) — the child-element collection. [**Item**](HtmlElements#item) and [**Add**](HtmlElements#add) — the latter accepts standard HTML tags **and** the IDE's custom-widget tags `"chartjs"`, `"monaco"`, `"listview"`, `"virtuallistview"`.
- [**HtmlElementProperty**](HtmlElementProperty) — one settable property in the bag.
- [**HtmlElementProperties**](HtmlElementProperties) — the dynamic property bag on a DOM element.
- [**HtmlEventProperty**](HtmlEventProperty) — one read-only value in an event payload.
- [**HtmlEventProperties**](HtmlEventProperties) — the dynamic event-payload bag passed to every [**AddEventListener**](HtmlElement#addeventlistener) callback.

### Singletons

- [**DebugConsole**](DebugConsole) — the DEBUG CONSOLE pane. [**PrintText**](DebugConsole#printtext), [**Clear**](DebugConsole#clear), [**SetFocus**](DebugConsole#setfocus).
- [**KeyboardShortcuts**](KeyboardShortcuts) — global IDE keyboard shortcuts. [**Add**](KeyboardShortcuts#add).
- [**Themes**](Themes) — the IDE's active theme. [**ActiveThemeName**](Themes#activethemename), [**ActiveThemeNameGroup**](Themes#activethemenamegroup).

## Dynamic DOM property resolution

The four `Html*` classes that carry the `[COMExtensible(True)]` attribute — [**HtmlElementProperties**](HtmlElementProperties), [**HtmlElementProperty**](HtmlElementProperty), [**HtmlEventProperties**](HtmlEventProperties), [**HtmlEventProperty**](HtmlEventProperty) — accept **arbitrary property names** that are resolved against the underlying DOM element (or event object) at run time. None of `style`, `innerText`, `chart`, `editor`, `listview`, `value`, `target`, `key`, `index`, …, are declared statically on the interfaces — they are all resolved dynamically through the COM-extensible `Item(name)` default member.

So:

```tb
With element.ChildDomElements.Add("mySeparator", "h1").Properties
    .style.textAlign = "center"
    .style.color     = "white"
    .innerText       = "Section heading"
End With
```

reads at run time as:

```tb
.Item("style").Item("textAlign").Value = "center"
.Item("style").Item("color").Value     = "white"
.Item("innerText").Value               = "Section heading"
```

The compiler does not validate the property names; they are forwarded as strings to the IDE's tool-window renderer. The accepted set is **every DOM property of the underlying tag** — standard HTML attributes, every CSS-style property under `.style.…`, plus any custom-widget-specific surface like `.chart.data.datasets(0).borderWidth` on a `"chartjs"` element or `.editor.setOption(...)` on a `"monaco"` element. The reference does not enumerate them — defer to MDN for standard DOM property names, to Chart.js for `chartjs` widgets, to Monaco's documentation for `monaco` widgets, and to the matching samples below for the IDE-specific `listview` / `virtuallistview` surface.

## Tool-window DOM tags

[**HtmlElements.Add**](HtmlElements#add) takes a *TagName* string. Standard HTML tags (`"div"`, `"span"`, `"input"`, `"h1"`, `"label"`, `"img"`, …) work as expected; in addition, the IDE provides four custom-widget tags:

- **`"chartjs"`** — wraps **Chart.js**. The element surfaces a `.chart` property whose sub-properties mirror Chart.js's `data` / `options` / `config` namespaces. See sample 11.
- **`"monaco"`** — embeds an instance of the **Monaco editor** (the same editor the IDE itself uses for code panes). The element surfaces an `.editor` property with `setOption`, `setValue`, `getValue`, and `AddEventListener` (note: event listeners attach to `.editor`, not to the DOM element). See sample 12.
- **`"listview"`** — the IDE's built-in listview widget. The element surfaces a `.listview` property with `addItem`, `removeItem`, `getItem`, `setShowScrollbarV` / `setShowScrollbarH`, and the events `onClickItem` / `onDblClickItem`. See sample 13.
- **`"virtuallistview"`** — a virtual variant of the listview suitable for huge data sets (millions of rows). The element surfaces the same `.listview` property plus `setItemCount` and the asynchronous `onAsyncGetItemHTML` event (the listener responds via `eventInfo.setAsyncResult("<html>")`); call `.listview.notifyChangedItem(idx)` to invalidate the internal cache for one row when its underlying data changes. See sample 14.

The full per-widget property and method surface is documented by each widget's home project; this package wraps them through the same `[COMExtensible(True)]` mechanism described above.

## Where the samples live

Six worked addins ship in the twinBASIC samples folder. They are the canonical reference for "how to use the package end-to-end" and are referenced throughout the per-class pages.

| Sample | Project | What it teaches |
|--------|---------|-----------------|
| 10 | `WaynesWorldAddInTest1` | The kitchen-sink walkthrough — toolbar setup, a single big tool window populated with 22 styled `div`-buttons that each exercise a different `Host.*` capability. Start here. |
| 11 | `WaynesWorldCPUMonitorTest1` | [**AddinTimer**](AddinTimer) + a `"chartjs"` custom-widget tool window driving a live line chart. |
| 12 | `WaynesWorldMonacoEditorTest1` | A `"monaco"` custom-widget tool window: an in-window Monaco editor with `setValue` / `getValue` and a content-change listener. |
| 13 | `WaynesListViewAddIn` | A `"listview"` custom-widget tool window with `ApplyCss`, double-click-to-remove behaviour, and inline-HTML `raiseEvent()` for custom event names. |
| 14 | `WaynesVirtualListViewAddIn` | A `"virtuallistview"` with 5,000,000 rows backed by `onAsyncGetItemHTML` / `setAsyncResult` / `notifyChangedItem`. |
| 15 | `tbGlobalSearchAddIn1` | A full-blown Global Search addin: virtual-FS traversal (**For Each** over [**Folder**](Folder)), text reading with comment-stripping ([**File.ReadText**](File#readtext)), editor navigation ([**Editors.Open**](Editors#open)), persistent options via `GetSetting` / `SaveSetting`. |
