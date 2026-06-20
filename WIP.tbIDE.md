# tbIDE Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide.

The **addin SDK** — a type-only compiler package. Every public symbol is an interface or a CoClass; the actual implementations live in the IDE binary, and an addin DLL binds against the type declarations and lets the IDE marshal calls into its implementations at run time. Twenty-three public CoClasses + one concrete `Class` (`AddinTimer`) + one interface-only declaration; no `Private` plumbing.

The package's own `CHANGELOG.md` is a leftover copy-paste from a different package ("twinBASIC WinNativeForms") and is **not** about tbIDE.

## How an addin is built and loaded

From any of the six sample `Settings` files (the structure is identical across them):

- `project.buildType`: **Standard DLL** — addins are not packages, they are DLLs that the IDE loads.
- `project.buildPath`: `${IdePath}\addins\${Architecture}\${ProjectName}.${FileExtension}` — the build output drops directly into `<IDE>\addins\Win32\` or `<IDE>\addins\Win64\`. The IDE scans this folder on startup.
- `project.references` includes the tbIDE compiler package: `id: {99DEC38C-75F6-4488-8EE7-2D52D83881D2}`, `isCompilerPackage: true`, `publisher: TWINBASIC-COMPILER`, `symbolId: tbIDE`. Same shape that `CustomControls` uses.

The DLL **must** export a single factory function the IDE will call:

```tb
Module MainModule
    [DllExport]
    Public Function tbCreateCompilerAddin(ByVal Host As Host) As AddIn
        Return New MyAddinClass(Host)
    End Function
End Module
```

The returned object must implement the [`AddIn`](#addin) interface (a single read-only `Name` property). The IDE releases the object when the addin is disabled or the IDE shuts down. Every sample uses this exact `tbCreateCompilerAddin` skeleton — surface it on the index landing as the canonical entry point.

## Public user-facing surface

Twenty-four files declaring twenty-three public CoClasses + one concrete `Class` + one interface-only declaration:

| File                         | Public symbols                                                        | Role                                                                                                              |
|------------------------------|-----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `Addin.twin`                 | `IAddInV1` + `AddIn` CoClass                                          | The contract every addin's main class implements. One member: `Property Get Name() As String`.                    |
| `Host.twin`                  | `IHostV1` + `ItbHostEventsV1/V2/V3` + `Host` CoClass                  | Root of the API — passed to `tbCreateCompilerAddin`. Versioned events (see "Versioned event interfaces" below).   |
| `AddinTimer.twin`            | `Class AddinTimer` (no CoClass)                                       | **The only concrete instantiable class** in the package. `New AddinTimer`; sets `Interval` (ms) + `Enabled`; fires `Timer` event. Internally wraps `SetTimer`/`KillTimer`. |
| `Button.twin`                | `IButtonV1` + `IButtonEventsV1` + `Button` CoClass                    | Toolbar button. Returned by `Toolbar.AddButton`. `OnClick` event.                                                 |
| `CodeEditor.twin`            | `ICodeEditorV1 Extends IEditorV1` + `CodeEditor` CoClass              | A code-pane editor — selection, text, Monaco passthrough, `AddMonacoWidget` for inline overlay HTML. Nested `RevealArea` enum. |
| `DebugConsole.twin`          | `IDebugConsoleV1` + `DebugConsole` CoClass                            | The DEBUG CONSOLE pane. `PrintText` (with optional colour), `Clear`, `SetFocus`.                                  |
| `Editor.twin`                | `IEditorV1` + `Editor` CoClass                                        | Base interface for editors. Source-side comment: *"Castable to CodeEditor etc."* — i.e. `Dim ce As CodeEditor = editor` works because the underlying object implements both. |
| `Editors.twin`               | `IEditorsV1` + `Editors` CoClass                                      | Collection of active editors. `Item(Index)` default member, `Count`, `Open(Path, Line, Col, Options)`. Source-side note: *"There is currently only ONE active editor, accessible via Editors(0) syntax"*. |
| `File.twin`                  | `IFileV1` + `IFileV2 Extends IFileV1` + `File` CoClass                | A virtual-FS file. V1: `Data` / `DataLen` / `Text` / `IsDirty`. V2 adds `ReadText(ReadTextFlags)`. Nested `ReadTextFlags` enum (one flag: `CommentsToWhitespace`). |
| `FileSystem.twin`            | `IFileSystemV1` + `FileSystem` CoClass                                | Tiny — `RootFolder` and `ResolvePath(Path)` (path needs the `twinbasic:/` prefix).                                |
| `FileSystemItem.twin`        | `IFileSystemItemV1` + `FileSystemItem` CoClass                        | Base for `File` and `Folder`. `Name`, `Path`, `Type`, `Parent`. Nested `FileSystemItemType` enum (`Folder`, `FileVIRTUALDOC`, `FileOTHER`, `FileTWIN`, `FileBAS`, `FileCLS`, `FileUIDESIGNER`, `FileJSON`). |
| `Folder.twin`                | `IFolderV1 Extends IFileSystemItemV1` + `Folder` CoClass              | `Count`, `Item(IndexOrName)`, `IsPackagesFolder`, plus for-each enumeration over `FileSystemItem` children.       |
| `HtmlElement.twin`           | `IHtmlElementV1` + `HtmlElement` CoClass                              | A DOM element inside a tool window. `Properties` (default member — see below), `ChildDomElements`, `Remove`, `AddEventListener(DomEventName, CallbackFunc, Optional Data)`. Plus one `[Hidden]` legacy `AddEventListenerOLD1`. |
| `HtmlElementProperties.twin` | `IHtmlElementPropertiesV1` (`[COMExtensible(True)]`) + CoClass         | The dynamic property bag on a DOM element. `Item(DomPropertyName)` is the default member; the `[COMExtensible(True)]` attribute is what makes `.style.display = "flex"` resolve through `Item("style").Item("display")` at run time. |
| `HtmlElementProperty.twin`   | `IHtmlElementPropertyV1` (`[COMExtensible(True)]`) + CoClass           | One value in the bag. `Value` (Get/Let, default member), plus nested `Properties` for chained access (`.style.color = "white"`). |
| `HtmlElements.twin`          | `IHtmlElementsV1` + `HtmlElements` CoClass                            | The `ChildDomElements` collection. `Item(ID)` default, `Add(ElementID, TagName)` returns the new child. Note `TagName` accepts both standard HTML tags AND the IDE's custom widget tags `chartjs` / `monaco` / `listview` / `virtuallistview`. |
| `IHtmlEventProperties.twin`  | `IHtmlEventPropertiesV1` (`[COMExtensible(True)]`) + `HtmlEventProperties` CoClass | The event-payload bag. Like `HtmlElementProperties` but read-only and used inside event handler callbacks. |
| `IHtmlEventProperty.twin`    | `IHtmlEventPropertyV1` (`[COMExtensible(True)]`) + `HtmlEventProperty` CoClass | One value in the event bag.                                                                                  |
| `KeyboardShortcuts.twin`     | `IKeyboardShortcutsV1` + `KeyboardShortcuts` CoClass                  | Single member: `Add(keyString, Callback As LongPtr)`. `keyString` is a literal key like `"{CTRL}{SHIFT}d"` (prefixes `{CTRL}` / `{SHIFT}` / `{ALT}`). |
| `Project.twin`               | `IProjectV1` + `Project` CoClass                                      | The currently-loaded project. Lifecycle (`Save`, `Close`, `Build`, `Clean`), introspection (`Path`, `Name`, `BaseFolderPath`, `ProjectID`, version + architecture + build-output info), `Evaluate(ExprString)` (debug-console-style expression evaluation), `RootFolder` (entry into the virtual FS), and `LoadMetaData`/`SaveMetaData` (persistent per-addin key/value storage inside the `.twinproj`). Nested `VbBuildType` enum. |
| `Themes.twin`                | `IThemesV1` + `Themes` CoClass                                        | `ActiveThemeName` ("Classic" / "Dark" / "Light"), `ActiveThemeNameGroup` ("dark" / "light"). The `Host` events interface fires `OnChangedTheme` when this flips. |
| `ToolWindow.twin`            | `IToolWindowV1` + `IToolWindowEventsV1` + `ToolWindow` CoClass        | A dockable / floating tool window. `Title`, `Visible`, `Resizable`, `Close`, `ApplyCss(stylesString)`, `RootDomElement` (default member — the entry into the DOM tree). `OnClose` event. |
| `ToolWindows.twin`           | `IToolWindowsV1` + `ToolWindows` CoClass                              | Single member: `Add(Name, Optional UniqueIdForPositionPersistance) As ToolWindow`. The second argument lets the IDE remember the floating-window position across IDE restarts. |
| `Toolbar.twin`               | `IToolbarV1` + `Toolbar` CoClass                                      | `AddSplitter` (vertical-bar separator), `AddButton(Id, Caption, Optional IconData)`.                              |
| `Toolbars.twin`              | `IToolbarsV1` + `Toolbars` CoClass                                    | `Item(Index)` default, `Count`. Source-side note: *"There is currently only ONE toolbar, accessible via the Toolbars(0) syntax"*. |

## The interface/CoClass split — what it means for the doc layout

Almost every `.twin` declares one or two `Public Interface I<X>V1 Extends stdole.IUnknown` followed by `Public CoClass <X>` with `[Default] Interface I<X>V1` (and optionally `[Default, Source] Interface I<X>EventsV1`). The pattern is the standard COM idiom for late-binding-friendly extensibility — the IDE implements the interfaces, the addin holds references typed at the CoClass.

**The interfaces themselves get no doc page.** Users type their variables `As Host` / `As Button` / `As ToolWindow` (the CoClass), not `As IHostV1`. Fold the interface's members onto the CoClass's page; do not list both. Same convention CustomControls uses for its `_…` default interfaces.

**Versioning is conveyed by interface chains.** Two cases visible in the source:

- `IFileV1` → `IFileV2 Extends IFileV1` (V2 adds `ReadText(ReadTextFlags)`). The `File` CoClass declares `[Default] Interface IFileV2`. Document the V2 surface as the canonical `File` page; do not split V1 vs V2. (Mention in passing that `ReadText` is V2-only and consequently won't bind against very early IDE builds — though in practice every shipping IDE is V2+.)
- `IHostV1` → `ItbHostEventsV1` → `ItbHostEventsV2 Extends V1` → `ItbHostEventsV3 Extends V2`. The `Host` CoClass declares `[Default, Source] Interface ItbHostEventsV3`. The new members on V2 / V3 (`OnChangedActiveEditor`, `OnChangedTheme`) are each tagged **`[AllowUnpopulatedVtableEntry]`**, which is the mechanism that lets a newer addin compile against `ItbHostEventsV3` and still load against an older IDE that only implements `V1` — the IDE doesn't have to provide the V2/V3 entries.

Document all `Host` events together on the `Host.md` page (the per-version split is a compatibility detail, not a user-facing concept).

## `AddinTimer` is the only user-instantiable class

Every other public symbol is a CoClass exposed *to* the addin by the IDE — the addin receives instances via `Host`, never constructs them. `AddinTimer` is the exception: it's a concrete `Class AddinTimer` (not a CoClass) and the addin instantiates it with `New AddinTimer`. Internally it wraps `SetTimer` / `KillTimer` with a private `TimerCallback`, exposes `Interval` (ms) + `Enabled`, and fires a `Timer` event.

Sample 11's CPU-monitor demonstrates the typical pattern:

```tb
Private WithEvents Timer As AddinTimer
…
Set Timer = New AddinTimer
Timer.Interval = 500
Timer.Enabled = True
…
Private Sub Timer_Timer()
    ' fires every 500 ms
End Sub
Private Sub myToolWindow_OnClose()
    Set Timer = Nothing       ' stop the timer when the window closes
End Sub
```

The class uses the `Handles` syntax internally (`Private Sub Changed() Handles Enabled.OnPropertyLet, Interval.OnPropertyLet`) so any change to `Enabled` or `Interval` re-arms the underlying timer — surface this as *"set `Enabled = False` to stop, change `Interval` at any time"*, not as an implementation detail.

`Class_Terminate` calls `KillTimer` so a dropped reference is sufficient to stop. Sample 15 demonstrates that direct Win32 `SetTimer` / `KillTimer` is also fine if `AddinTimer` doesn't fit — both patterns are valid; the package doesn't *require* the helper.

## The HTML / DOM surface

Tool windows are rendered as HTML inside the IDE (the same browser surface the IDE uses for its own panes). The `HtmlElement` / `HtmlElements` / `HtmlElementProperty` / `HtmlElementProperties` quartet is the addin's keyhole into the DOM.

Three things make this surface unusual and have to be surfaced on the docs:

1. **`[COMExtensible(True)]` on `HtmlElementProperties` / `HtmlElementProperty` / `HtmlEventProperties` / `HtmlEventProperty`.** The attribute opts the interface into IDispatch dynamic-member resolution, which is what makes `.style.display = "flex"` work — at compile time the right-hand `.style.display` resolves to `Item("style").Item("display").Value = "flex"` (the default-member dance), and the IDE resolves the names against the live DOM at run time. No member named `style` is *declared* on `IHtmlElementPropertiesV1`. Surface this on each of the four pages with a `> [!IMPORTANT]` callout: the property names accepted are **every DOM property of the underlying tag** (standard HTML attributes, CSS-style properties under `.style.…`, plus any custom-element-specific surface like `.chart.data.datasets(0).borderWidth` on a `chartjs` element or `.editor.setOption(...)` on a `monaco` element). The docs cannot enumerate them — refer the reader to the relevant DOM / library reference.
2. **The custom-element tags.** `HtmlElements.Add(id, tagName)` accepts standard HTML tags (`"div"`, `"input"`, `"span"`, `"h1"`, …) AND four IDE-specific widget tags: `"chartjs"` (Chart.js wrapper — surfaces a `.chart` property), `"monaco"` (the Monaco editor — surfaces a `.editor` property), `"listview"` (the IDE's listview widget — surfaces a `.listview` property with `addItem` / `removeItem` / etc.), and `"virtuallistview"` (the same with `setItemCount` + the `onAsyncGetItemHTML` event). All four are demonstrated in samples 11–14. Surface as *"the tag name is forwarded to the IDE's tool-window renderer, which understands the standard HTML tags plus the custom widget tags … see sample 11 / 12 / 13 / 14"*.
3. **`AddEventListener(DomEventName As String, CallbackFunc As LongPtr, Optional Data As Variant)`.** The callback is passed as `AddressOf SomeSub`, and `SomeSub` must have the signature `Sub(ByVal eventInfo As HtmlEventProperties)`. The `eventInfo` parameter is the IDE-marshalled equivalent of the JavaScript `Event` object — `eventInfo.key` / `eventInfo.target.value` / `eventInfo.target.id` are the usual fields, but again the property names are resolved against the *actual* event object at run time, not declared statically. Sample 13 also demonstrates **custom event names raised from inline HTML** via the IDE-side `raiseEvent("name", event, stopPropagation, …customData)` JavaScript helper; the custom-data values become `eventInfo.customData0`, `eventInfo.customData1`, … and are demonstrated in sample 15's `ClickedMatch` handler. Sample 14 demonstrates **async events** via `eventInfo.setAsyncResult("<html>")` (the listener returns the requested HTML asynchronously back into the virtual list view's render cycle).

Document the four `Html*` classes as the *contract* (`Item` default member, the `Value` accessor, the `Properties` chaining) and use the samples to illustrate the dynamic-resolution mechanism. Do not try to enumerate the resolved property surface — it's open-ended.

The `HtmlEvent*` half of the quartet declares `Value` as **read-only Get** (vs `HtmlElementProperty`'s `Value` which has Get + Let) — that's the contract distinction between an inbound event payload and an outbound DOM property setter. Note this on each page.

## ToolWindow as a jQuery-style selector

`ToolWindow` is the *root* of a tool window's DOM and **also doubles as a member-by-ID accessor**: `myToolWindow("#dataEntry").Value` (see sample 13) returns the `Value` of the child element whose `id` is `dataEntry`. There is no explicit member on `IToolWindowV1` that takes a string argument — the source-side `RootDomElement` carries `[DefaultMember]`, so `myToolWindow("#dataEntry")` resolves to `RootDomElement.Properties.Item("#dataEntry")`, which the dynamic resolver then interprets as a CSS-style selector against the rendered DOM. Surface this as *"the tool window's default member is `RootDomElement`, which is COM-extensible — string indexing accepts CSS selectors"* and call out the `#id` (single element by ID) form as the most common case.

`ApplyCss(styles As String)` injects a `<style>` element scoped to the tool window. Samples 13 / 14 / 15 load CSS from an embedded resource via `StrConv(LoadResDataInternal("styles.css", "STYLESHEETS"), VbStrConv.vbFromUTF8)` and pass it through — surface that pattern on `ToolWindow.ApplyCss`.

`.RootDomElement.Properties.suggestedWidth = "350px"` and `.suggestedHeight = "600px"` are *one-shot* hints — they're used the **first time** the tool window opens as a floating window, then the IDE persists the user's resize. The source-side comments make this explicit (*"used on first opening as a floating tool window"*) — surface as a `> [!NOTE]` on the `ToolWindow.md` page.

## `Project.Evaluate` — the debug-console hook

`Project.Evaluate(EvalString, Options)` runs an arbitrary expression in the project's context, as if the user typed it into the DEBUG CONSOLE. The `Options` parameter is `DebuggerEvaluateOptions` — currently a single-value enum (`NONE = 0`) declared on `IHostV1` itself, not on `IProjectV1`, which is an oddity worth noting. The return is `Variant`. Sample 10's `CurrentProjectKeyUp` handler shows it in action — entering `10.5 * 4` in a textbox and pressing Enter passes the string to `Evaluate` and pops up the result in a message box. Surface as *"this is the same engine that powers the DEBUG CONSOLE; it can call any `Public` symbol the user can see at run time"*.

The reason `DebuggerEvaluateOptions` is declared on `IHostV1` rather than `IProjectV1` looks like a source-side oversight (the only consumer is `IProjectV1.Evaluate`) — surface the enum on the `Host.md` page (where it's declared) and link to it from the `Project.Evaluate` entry, rather than rationalising the layout.

## `Project.LoadMetaData` / `SaveMetaData`

Per-addin persistent key/value storage inside the `.twinproj` file. `LoadMetaData(Key) As String`, `SaveMetaData(Key, Value)`. Surface as *"the storage is associated with the loaded project, not with the addin globally — close the project, the storage goes with it; open a different project, you get a different store. For addin-wide persistence (e.g. checkbox state across all projects), use VBA's `GetSetting` / `SaveSetting` against the registry — see sample 15 for that pattern."*

## `Host.ShowMessageBox` and `Host.ShowNotification`

Both are on `IHostV1`.

- `ShowMessageBox(Prompt, Buttons, Title) As Long` — modal. `Buttons` is a single string with button captions delimited by `|`, e.g. `"OK"` or `"Yes|No|Cancel"`. Return is the zero-based index of the pressed button, or `-1` if the box was closed without picking one. Sample 10's `ShowMessageBoxClick` demonstrates the three-button case and the `-1` close path together — surface as the canonical example.
- `ShowNotification(Prompt)` — non-modal, "discreet" toast-style notification.

The convention is that `ShowMessageBox` is for "user must answer something" and `ShowNotification` is for "user should know but doesn't need to react".

## `Folder` for-each, thread-safety, and traversal

The source-side `[Description]` on `Folder.Count` says: *"CAREFUL: tb IDE is multi-threaded, and so the Count can potentially change after you've read the value. For example, using it for a loop counter is wrong, use For-Each syntax instead."* The matching `Item` carries an analogous warning: *"try to avoid accessing entries by their index positions since the index might change by another thread. Use the For-Each syntax instead."*

Surface this **as the primary fact** on `Folder.md` — the for-each path is the supported one; index-based iteration is technically supported (the methods exist) but races against the IDE's own background threads. Sample 15's `PopulateFolderResultsRecursive` is the canonical traversal pattern:

```tb
For Each folderItem In Folder
    If TypeOf folderItem Is Folder Then
        PopulateFolderResultsRecursive(folderItem, …)
    Else
        Dim file As File = folderItem
        If (file.Type <> FileOTHER) And (file.Type <> FileJSON) Then
            CheckAndPopulateTextFileResults(file, …)
        End If
    End If
Next
```

— for-each yields each child as a `FileSystemItem`; `TypeOf … Is Folder` discriminates folder-vs-file; a folder gets recursed; a file gets a `Type` check against `FileSystemItemType` to skip non-text content before reading it.

`Folder.IsPackagesFolder` returns `True` for the magic Packages folder at the project root — sample 15 uses it to skip package-internal sources when the user has "Search in packages" off. Surface as a usage hint on `Folder.IsPackagesFolder`.

## `File.ReadText` flags

`IFileV2.ReadText(Options As ReadTextFlags) As String` — the V2-only "text view of the file, with options" accessor. Currently one flag: `CommentsToWhitespace` (replace every byte that's part of a comment with a space, preserving line numbers + column positions). Sample 15 uses it for the "exclude comments" search option. Surface as *"call `ReadText(0)` for raw text, `ReadText(ReadTextFlags.CommentsToWhitespace)` to mask comments out — the line/column positions of every non-comment character are preserved, which makes the flag suitable for indexers"*.

`Text` and `Data` (on `IFileV1`) have `Property Let` declarations tagged `[Unimplemented]` — flag with the usual `> [!NOTE]` on each, pointing out that the file system is currently read-only from the addin's perspective.

`File.Type` values that the addin cares about, in practice:

- `FileTWIN` (`.twin`, Unicode UTF-8 source)
- `FileBAS` / `FileCLS` (ANSI-encoded VB6 source)
- `FileUIDESIGNER` (Unicode JSON — the designer surface for a Form)
- `FileJSON` (Unicode JSON — `Settings`, `.twinproj` data)
- `FileOTHER` (binary or unrecognised)
- `FileVIRTUALDOC` (read-only virtual document — surface as *"e.g. the placeholder documents the IDE shows for unrecognised file types"*)
- `Folder` (a `FileSystemItem.Type` of `0` — included in the enum because it's the per-item type discriminator)

`ReadText` works on every text type (`FileTWIN` / `FileBAS` / `FileCLS` / `FileVIRTUALDOC` / `FileUIDESIGNER` / `FileJSON`); calling it on `FileOTHER` is unsupported. Surface on the method entry.

## `CodeEditor.AddMonacoWidget` and `ExecuteMonacoCommand`

`CodeEditor` is the editor-pane subtype; the source-side comment on `IEditorV1` says *"Castable to CodeEditor etc."* — i.e. an `Editor` returned from `Host.ActiveEditors(0)` is actually a `CodeEditor` for code panes, and `Dim ce As CodeEditor = activeEditor` (or `TypeOf editor Is CodeEditor`) is the cast pattern. Sample 15's `GetActiveCodeEditorSelectedText` demonstrates the guarded cast:

```tb
If Host.ActiveEditors.Count > 0 Then
    If TypeOf Host.ActiveEditors(0) Is CodeEditor Then
        Dim activeCodeEditor As CodeEditor = Host.ActiveEditors(0)
        Return activeCodeEditor.SelectedText
    End If
End If
```

Surface as the canonical safe-cast pattern on `CodeEditor.md`.

`ExecuteMonacoCommand(Command As String, ParamArray Args())` sends a raw command to the underlying Monaco editor — e.g. `"actions.find"` opens the Find widget, `"closeFindWidget"` closes it (sample 10). The full list of Monaco commands is in Monaco's own documentation; the docs reference that without trying to enumerate.

`AddMonacoWidget(LineNumber, ColumnNumber, Html, Optional Css) As HtmlElement` attaches an inline HTML overlay to a line of code; if `ColumnNumber` is zero, the widget is rendered below the line and the editor scrolls to make room rather than overlapping the next line. The return value is a normal `HtmlElement` — the same `Properties` / `ChildDomElements` / `AddEventListener` surface applies. Surface as *"the same DOM surface as a tool-window's elements; the widget lives inside the code editor but otherwise behaves identically"*.

`CodeEditor.SelectedText` (Get + Let), `Text` (Get + Let), `GetSelectionInfo(ByRef StartLine, ByRef StartColumn, ByRef EndLine, ByRef EndColumn)`, `SetSelectionInfo(...)`, `RevealRange(... SmoothScroll, Area As RevealArea)` — all straightforward. The `RevealArea` enum is nested on `ICodeEditorV1` itself (six values: `Any` / `Top` / `Center` / `CenterIfNotVisible` / `NearTop` / `NearTopIfNotVisible`) — fold onto the `CodeEditor.md` page rather than spinning off a separate enum file.

## `KeyboardShortcuts.Add` callback signature

The `keyString` argument is a literal key with optional `{CTRL}` / `{SHIFT}` / `{ALT}` prefixes, e.g. `"{CTRL}{SHIFT}d"` (the source-side `[Description]` is the canonical example). The `Callback` is `AddressOf` an addin function; the function takes no arguments and returns nothing. Surface as *"the callback fires on the IDE's UI thread; do everything Host-related synchronously"*.

The samples don't actually use `KeyboardShortcuts.Add` — that's a feature documented through its declaration only. Cross-link to the relevant Win32 / IDE keyboard-handling section once available.

## `Themes.ActiveThemeNameGroup` and `OnChangedTheme`

`Themes` is two members: `ActiveThemeName` (the specific theme — `"Classic"`, `"Dark"`, `"Light"`, …) and `ActiveThemeNameGroup` (which collapses to `"dark"` or `"light"`). The grouping is useful for addins that just want to invert colours.

The `Host` event `OnChangedTheme(ThemeName As String)` fires when the user picks a new theme — the parameter is the new value of `ActiveThemeName`. Surface the pair as *"check `ActiveThemeNameGroup` once at startup for initial colour selection, then refresh in `OnChangedTheme`"*.

## Sample-by-sample idioms to surface

Each sample exercises a different slice. Pick which idioms surface where:

- **Sample 10 (kitchen sink)** — the canonical "Hello, World" structure: `Private WithEvents Host As Host` + a `Host_OnProjectLoaded` handler that sets up the toolbar via `Host.Toolbars(0).AddSplitter()` + `.AddButton(...)`. **Every** sample uses this. Surface as the canonical addin-startup pattern on `Host.md` (and on the index landing).
- **Sample 10 (DOM walkthrough)** — the bulk of the file is a single `Button_OnClick` that builds a vertical-flex tool window populated with 22 styled "buttons" (each one a `div` with click handlers), exercising `.style.display = "flex"`, `.style.flexDirection = "column"`, `.style.gap`, `.style.backgroundImage` with a linear-gradient, `.style.borderRadius`, `.style.cursor = "pointer"`, etc. Surface as a *cross-link* from `HtmlElement.md` / `HtmlElementProperties.md` / `ToolWindow.md` rather than as primary content — the file is too long to inline.
- **Sample 11 (AddinTimer + chartjs)** — the canonical `AddinTimer` example AND the canonical custom-element example. Surface on `AddinTimer.md` as the timer example; cross-link to `HtmlElement.md` for the `"chartjs"` custom-element note.
- **Sample 12 (monaco editor)** — the in-window Monaco editor example. Surface the *"add event handlers to the editor, not the DOM element"* fact (`.editor.AddEventListener("onDidChangeModelContent", …)` not `monacoDivElement.AddEventListener(…)`) as a `> [!IMPORTANT]` on `HtmlElement.AddEventListener`. Cross-link to `CodeEditor.md` so the reader understands the two ways Monaco surfaces: built-in code editor via `CodeEditor`, embedded user-controlled editor via a `"monaco"` tag.
- **Sample 13 (listview + raiseEvent)** — surface as the canonical `ApplyCss` + `myToolWindow("#dataEntry")`-selector example. The inline HTML `raiseEvent("dataEntryKeyDown", event, true)` JS-side helper is what brings custom event names to the addin via `AddEventListener` — surface as a cross-link from `HtmlElement.AddEventListener` to a brief explanation on the `HtmlEventProperties` page. The IDE-side JS helper is documented as *"available to inline HTML inside an addin's tool window: `raiseEvent(eventName, event, stopPropagation, …customData)`"* — it has no twinBASIC declaration.
- **Sample 14 (virtual listview)** — the canonical async-event example. `onAsyncGetItemHTML` fires with `eventInfo.asyncArgument` (the row index the IDE wants HTML for) and the handler responds via `eventInfo.setAsyncResult("<html>")`. `listview.notifyChangedItem(idx)` invalidates the IDE's internal cache so the next render calls `onAsyncGetItemHTML` again. Surface on `HtmlEventProperties.md` as the asynchronous-event-handler pattern.
- **Sample 15 (Global Search addin)** — the canonical end-to-end addin: FS traversal (`Folder` for-each + `TypeOf … Is Folder` recursion), text reading with comment-stripping (`File.ReadText(ReadTextFlags.CommentsToWhitespace)`), editor navigation (`Host.ActiveEditors.Open(path, line, col)` + `.Item(0).SetFocus`), persistent options (registry-side via `GetSetting` / `SaveSetting`, **not** via `Project.SaveMetaData` — flag the difference). The dwell-time pattern (`SetTimer` / `KillTimer` directly from Win32 to debounce keystrokes) is a *"could have used `AddinTimer`"* alternative — surface both options on `AddinTimer.md`.

Layout note: flat, one page per CoClass / Class — no `Enumerations/` sub-folder. The six nested enums (`RevealArea`, `EditorOpenOptions`, `ReadTextFlags`, `FileSystemItemType`, `VbBuildType`, `DebuggerEvaluateOptions`) each live on their declaring class's page.
