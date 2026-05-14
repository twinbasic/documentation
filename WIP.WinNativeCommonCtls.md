# WinNativeCommonCtls Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide.

A VB6-compatible replacement for **Microsoft Common Controls 6.0** (`MSCOMCTL.OCX`), written on top of the Win32 ComCtl32 controls (`COMCTL32.DLL` / `MSFTEDIT.DLL`). Ships eight controls that mirror the MSCOMCTL surface name-for-name where possible. First released v0.0.1.0 on 18-FEB-2023; independent of (but co-versioned with) the VB compatibility package.

Each control is a heavy `<Name>BaseCtl` (where every event / method / property is implemented, tagged `[COMCreatable(False)]` + `[EventsUseDispInterface]`) plus a thin `<Name>` leaf (`Inherits <Name>BaseCtl`, tagged `[WindowsControl("/miscellaneous/ICONS??/<Name>??.png")]`). The leaf adds only a `Class_BeforeFirstMethodAccess` that calls `[_HiddenModule].EnsureContainerIsLoaded(Me)` — same `<Name>BaseCtl` / `<Name>` leaf split that CEF and the VB controls use.

Eight controls (one `.twin` per pair):

| File              | `<Name>BaseCtl` inherits        | Role                                                                                          |
|-------------------|---------------------------------|-----------------------------------------------------------------------------------------------|
| `DTPicker.twin`   | `VB.BaseControlFocusable`       | Date / time picker — calendar drop-down, single-date `Value`, custom format strings           |
| `ImageList.twin`  | `VB.BaseControlNotFocusable`    | Off-screen image collection — feeds `ListView` / `TreeView` icons via `Icons` / `ImageList` properties |
| `ListView.twin`   | `VB.BaseControlFocusable`       | Multi-column list — four `View` modes (Icon / SmallIcon / List / Report), label-edit, checkboxes |
| `MonthView.twin`  | `VB.BaseControlFocusable`       | Full-month calendar grid — multi-select, bold-day callbacks, week-number / today display      |
| `ProgressBar.twin`| `VB.BaseControlNotFocusable2`   | Standard / Smooth / Marquee progress indicator with three visual states (Normal / Error / Paused) |
| `Slider.twin`     | `VB.BaseControlFocusableNoFont` | Trackbar / slider — tick marks, range selection, vertical or horizontal orientation           |
| `TreeView.twin`   | `VB.BaseControlFocusable`       | Hierarchical tree of `Node` objects — sorting, label-edit, checkboxes, image lists            |
| `UpDown.twin`     | `VB.BaseControlFocusableNoFont` | Spin control (up / down arrows) — pure Increment / Min / Max / Value; no auto-buddy binding   |

Every `<Name>BaseCtl` carries `[WithDispatchForwarding] Implements Control` (where `Control` is `Private Interface` in `Interfaces.twin`, marked `[COMExtensible]` — essentially an `Object` alias that makes the dispatch forwarding behave). They also implement a chorus of `VB.IWindowsControl`, `VB.IWindowElementEventsCommon`, `VB.IWindowElementEventsCommonControls`, `VB.IWindowElementEventsUC`, `VB.IWindowElementEventsAX` — these are the VB-package event-dispatch interfaces; do **not** surface them on the docs. Each control also implements one private `Tb<Name>Private` interface (declared `[ComImport(True)]` inside the same `.twin`) that the package's collection sub-objects use to refcount and reach internal state without taking a strong reference; **no doc page** for those.

## Public user-facing surface

The eight leaf classes `DTPicker`, `ImageList`, `ListView`, `MonthView`, `ProgressBar`, `Slider`, `TreeView`, `UpDown` are what user code references at design time (via `[WindowsControl(...)]`) and at run time (`Dim lv As ListView`). The `<Name>BaseCtl` base classes are the implementation half — `[COMCreatable(False)]` and not user-instantiable, but **the entire user-visible surface is declared on them**. Document on the leaf's name (`ListView.md`), describe the full surface, and don't surface the `<Name>BaseCtl` split.

The package also surfaces eight sub-object classes — collection plus item:

| Class           | Reached via                                              | Notes                                                                              |
|-----------------|----------------------------------------------------------|------------------------------------------------------------------------------------|
| `ListImages`    | `ImageList.ListImages` (Get-only)                        | Enumerable; `Item(Index or Key)` default member; `Add`, `Remove`, `Clear`, `Exists` |
| `ListImage`     | element of `ListImages` (returned from `Add`, indexed)   | `Index` (read-only), `Key`, `Picture`, `Tag`, plus `Draw(hDC, x, y, Style)` and `ExtractIcon` |
| `ListItems`    | `ListView.ListItems` (Get-only)                          | Enumerable; `Item(Index or Key)` default member; `Add`, `Remove`, `Clear`          |
| `ListItem`     | element of `ListItems`                                   | `Text` (default), `SubItems(Index)`, `Icon`, `SmallIcon`, `Checked`, `Selected`, `Ghosted`, `Bold`, `BackColor`, `ForeColor`, `Tag`, `ToolTipText`, `EnsureVisible`, `Left` / `Top` / `Width` / `Height`, `Index` (RO), `Key`, `CreateDragImage` (`[Unimplemented]`) |
| `ColumnHeaders` | `ListView.ColumnHeaders` (Get-only)                      | Same shape as `ListItems`; `Add(Index, Key, Text, Width, Alignment, Icon)` returns `ColumnHeader` |
| `ColumnHeader`  | element of `ColumnHeaders`                               | `Text` (default), `Width`, `Left` (RO), `Alignment` (typed `ListColumnAlignmentConstants`), `Position`, `SubItemIndex`, `Icon`, `Index` (RO), `Key`, `Tag` |
| `Nodes`        | `TreeView.Nodes` (Get-only)                              | Enumerable; `Item(Index or Key)` default; `Add(Relative, Relationship, Key, Text, Image, SelectedImage)` returns `Node` |
| `Node`         | element of `Nodes`                                       | `Text` (default), `Parent`, `Child`, `Next`, `Previous`, `Root`, `FirstSibling`, `LastSibling`, `Children` (count), `Expanded`, `Selected`, `Checked`, `Bold`, `BackColor`, `ForeColor`, `Image`, `SelectedImage`, `Tag`, `FullPath`, `Visible` (RO), `Sorted`, `SortOrder`, `SortType`, `EnsureVisible`, `Index` (RO), `Key` |

Every sub-object is `[COMCreatable(False)]` — its constructor takes a `<Name>BaseCtl` reference, so user code never instantiates these directly. They are returned from container methods (`Add`, `Item`) and reached through container properties.

Container cross-references (typed as the `<Name>BaseCtl` parent, since the controls accept either the base or the leaf — but document the parameter as the **leaf**):

- `TreeView.ImageList` / `Let` / `Set` — typed `As ImageListBaseCtl`; the user assigns an `ImageList`.
- `ListView.Icons` / `Let` / `Set`, `ListView.SmallIcons` / `Let` / `Set`, `ListView.ColumnHeaderIcons` / `Let` / `Set` — all three typed `As ImageListBaseCtl`; the user assigns an `ImageList`.

`ListView.BorderStyle` is unusually typed `As TreeBorderStyleConstants` (declared in `TreeViewPublic`, not in a `ListView*` module) — the enum is shared across both controls. Surface this on the `BorderStyle` entry without trying to rationalise it.

## Per-control highlights

These are the points worth surfacing on each control's page that are *not* obvious from a flat property list:

- **DTPicker** — the only control where most behaviour is in the calendar drop-down, not the inline display. The `Calendar*` colour properties (`CalendarBackColor`, `CalendarForeColor`, `CalendarTitleBackColor`, `CalendarTitleForeColor`, `CalendarTrailingForeColor`) act on the dropped-down month grid via `DTM_SETMCCOLOR`. `Format` (`DTPickerFormatConstants`) chooses between long-date / short-date / time / custom; when set to `dtpCustom`, the picker pulls `CustomFormat` (a `GetDateFormat`-style picture string). The control exposes `Year` / `Month` / `Week` / `Day` / `Hour` / `Minute` / `Second` accessors that decompose the current `Value`. `Value` is `Variant` — it can be `Null` (no date selected) when `CheckBox = True` and the user unchecks the box. Events `Format`, `FormatSize`, `CallbackKeyDown` fire when `Format = dtpCustom` and the format string contains a callback token.
- **ImageList** — purely off-screen; `Visible` does nothing user-meaningful (it's a "store of pictures" control). The `ImageWidth` / `ImageHeight` properties are read/write **only while empty** — once any image is added, the setter raises run-time error 35611 (*"Property is read-only if image list contains images"*). `ColorDepth` is fixed at construction time. `MaskColor` + `UseMaskColor = True` makes the masked pixels transparent when rendered into a control that consumes the image list. `Overlay(Key1, Key2)` composes two list-images into a single `StdPicture`. Bound-count tracking: an `ImageList` cannot be modified (clear / remove) while any control has it bound as `Icons` / `SmallIcons` / `ColumnHeaderIcons` / `ImageList`, throwing error 35617.
- **ListView** — the largest of the eight. `View` switches the visual mode (`lvwIcon` / `lvwSmallIcon` / `lvwList` / `lvwReport`); `Arrange` (`lvwNone` / `lvwAutoLeft` / `lvwAutoTop`) auto-flows the icon mode; `Report` mode is the only one that shows the `ColumnHeaders`. `LabelEdit` defaults to `lvwAutomatic` — F2 / click-and-wait edits a label in place; `lvwManual` requires `StartLabelEdit()` and `lvwDisabled` blocks editing. `TextBackground` (`lvwTransparent` / `lvwOpaque`) acts on the *item* text rendering, not the control's `BackColor`. `MultiSelect = True` enables Ctrl+click / Shift+click range selection. `CheckBoxes = True` adds a leading checkbox per row and fires `ItemCheck`. `AllowColumnReorder` only matters in Report view. `BorderStyle` is `TreeBorderStyleConstants` (`ccNone` / `ccFixedSingle`). The control surfaces `hWnd` and `hWndHeader` (the embedded `SysHeader32` window) separately. `Scroll` is `[Unimplemented]` per the source. `GetFirstVisible() As ListItem`, `SelectedItem` / `SelectedItemIndex` — the latter is read-only (assign through `ListItem.Selected = True` instead).
- **MonthView** — `MonthColumns` / `MonthRows` lay out a grid of side-by-side month panels (`ResizeToFit` auto-sizes the control to fit them). `Day` / `Month` / `Week` / `Year` are the same decomposition pattern as DTPicker. `MaxSelCount` is the upper bound of a multi-day selection (default 7, max ≈ 366 per the Win32 control); `SelStart` and `SelEnd` are the inclusive range. `MinDate` / `MaxDate` bound the navigable range. `Value` is the *current selection's start date* (same as `SelStart` when `MultiSelect = False`). The control fires both `Click` (any click) and `DateClick` (only when a date cell is hit, with the date passed as a parameter); same split for `DblClick` / `DateDblClick`. `GetDayBold` is an event-driven callback — the control fires it for each visible month asking for a `State()` array of which days to render bold; this is the mechanism for highlighting holidays, schedule entries, etc. `DayBold` is an alternative per-date setter. `GetMonthRange(IncludeTrailing, StartDate, EndDate)` returns the visible date span.
- **ProgressBar** — three orthogonal axes. `Min` / `Max` / `Value` are the standard range. `Step` + `StepIt()` advances the bar by `Step` units (typical loop pattern: `Min = 0`, `Max = N`, then `StepIt()` per iteration). `Scrolling = PrbScrollingStandard` (default) animates the bar in segments; `PrbScrollingSmooth` is the continuous block; `PrbScrollingMarquee` is the indeterminate animation (drive with `MarqueeAnimation = True` + `MarqueeSpeed`). `State` (`PrbStateNormal` / `Error` / `Paused`) tints the bar red / yellow per the OS theme. `Orientation` is `PrbOrientation` (`Horizontal` / `Vertical`). The control has `Click` / `DblClick` / `Mouse*` events but **no** `Change` despite the declaration — verify with the source if surfaced (`Change` is declared in the events region but not fired by any Win32 progress-bar notification).
- **Slider** — `Min` / `Max` / `Value` like a scrollbar; `SmallChange` is the arrow-key step, `LargeChange` is the PgUp / PgDn step. `SelStart` + `SelLength` create a highlighted selection range (visible when `SelectRange = True`). `TickFrequency` controls how often tick marks appear; `TickStyle` (`sldBottomRight` / `sldTopLeft` / `sldBoth` / `sldNoTicks`) chooses which side(s) of the channel they render on. `TextPosition` (`sldAboveLeft` / `sldBelowRight`) is for the optional tip text. `HideThumb = True` removes the draggable indicator. `ShowTip = True` enables the floating tooltip showing the current value during drag. `Orientation` is `OrientationConstants` (the shared horizontal / vertical enum used also by `UpDown`).
- **TreeView** — the second-largest control. `Style` (`TreeStyleConstants`, 8 values) is a composite of *show / hide* flags for tree-lines / plus-minus boxes / icons / text — the values name what's shown. `LineStyle` chooses `tvwRootLines` (lines from root nodes) or `tvwTreeLines` (lines only from children). `Sorted` / `SortOrder` / `SortType` apply at the root level; each `Node` has its own per-subtree `Sorted` / `SortOrder` / `SortType`. `LabelEdit` is the same gating as `ListView.LabelEdit` (`tvwAutomatic` / `Manual` / `Disabled`). `CheckBoxes = True` adds per-node checkboxes; `FullRowSelect` extends the selection highlight across the full row width. `Indentation` is in twips. `HitTest(x, y)` returns the `Node` at a point (for hover effects, drag-drop). `SelectedItem` (`Get` / `Let` / `Set`) and `DropHighlight` (`Get` / `Let` / `Set`) are both `Node`-typed. `StartLabelEdit()` for `Manual` mode. `GetVisibleCount()` returns how many full nodes the visible area shows. `Scroll` event new to tB.
- **UpDown** — pure spin control: `Min` / `Max` / `Value` / `Increment`. `Orientation` is `OrientationConstants` (horizontal pair of arrows or vertical, the more common). Events are `Change` (any time `Value` changes), `UpClick`, `DownClick`. There is *no* auto-buddy / partner-control facility in this version (the Win32 `UDS_AUTOBUDDY` flag is in the source enums but not exposed) — user code wires `UpClick` / `DownClick` to update the partner control manually.

Common surface across every control: `Public Opacity As Double = 100` (with the *"REQUIRES TARGET OS 6.2+ FOR CHILD CONTROLS."* description), `Public TransparencyKey As OLE_COLOR = -1` (same OS requirement), and (where `FEATURE_OLEDRAGDROP` is enabled at compile time) `Public OLEDropMode As VBRUN.OLEDropConstants` plus the `OLECompleteDrag` / `OLEDragDrop` / `OLEDragOver` / `OLEGiveFeedback` / `OLESetData` / `OLEStartDrag` events. `Public OLEDrag()` method on every control. `Public Property Get Parent() As Object` and `Public Property Get Object() As Object` on every control. The inherited surface from `VB.BaseControl*` includes `Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, `Visible`, `Enabled`, `BackColor` / `ForeColor` / `Font` (where focusable), `Appearance`, `MousePointer` / `MouseIcon`, `ToolTipText`, `DragMode` / `DragIcon`, `Drag()`, `Refresh()`, `SetFocus()` (focusable variants), `ZOrder()`, `CausesValidation`, `TabIndex` / `TabStop` (focusable variants), `VisualStyles`, `hWnd`, `HelpContextID` / `WhatsThisHelpID`.

## Per-control nested enums (fold onto the declaring control's page)

These enums are declared *inside* each `<Name>BaseCtl` (`Enum <Name>` without `Public`, which still surfaces because the enclosing class is public). Following the CustomControls convention for `WaynesSlider.SliderDirection`, document each on its declaring control's page rather than under `Enumerations/`:

| Enum                            | Declared on                | Members                                                                       |
|---------------------------------|----------------------------|-------------------------------------------------------------------------------|
| `ImageListColorDepth`           | `ImageListBaseCtl`         | `ColorDepth4Bit = 4`, `ColorDepth8Bit = 8`, `ColorDepth16Bit = 16`, `ColorDepth24Bit = 24`, `ColorDepth32Bit = 32` |
| `ListViewConstants`             | `ListViewBaseCtl`          | `lvwIcon = 0`, `lvwSmallIcon = 1`, `lvwList = 2`, `lvwReport = 3`             |
| `ListArrangeConstants`          | `ListViewBaseCtl`          | `lvwNone = 0`, `lvwAutoLeft = 1`, `lvwAutoTop = 2`                            |
| `ListTextBackgroundConstants`   | `ListViewBaseCtl`          | `lvwTransparent = 0`, `lvwOpaque = 1`                                         |
| `ListLabelEditConstants`        | `ListViewBaseCtl`          | `lvwAutomatic = 0`, `lvwManual = 1`, `lvwDisabled = 2`                        |
| `ListColumnAlignmentConstants`  | `ColumnHeader`             | `lvwColumnLeft = 0`, `lvwColumnRight = 1`, `lvwColumnCenter = 2`              |
| `PrbOrientation`                | `ProgressBarBaseCtl`       | `PrbOrientationHorizontal = 0`, `PrbOrientationVertical = 1`                  |
| `PrbScrolling`                  | `ProgressBarBaseCtl`       | `PrbScrollingStandard = 0`, `PrbScrollingSmooth = 1`, `PrbScrollingMarquee = 2` |
| `PrbState`                      | `ProgressBarBaseCtl`       | `PrbStateNormal = 1`, `PrbStateError = 2`, `PrbStatePaused = 3`               |
| `TickStyleConstants`            | `SliderBaseCtl`            | `sldBottomRight = 0`, `sldTopLeft = 1`, `sldBoth = 2`, `sldNoTicks = 3`       |
| `TextPositionConstants`         | `SliderBaseCtl`            | `sldAboveLeft = 0`, `sldBelowRight = 1`                                       |

Source-side spelling note: every enum is named `<Name>` (no `Public` modifier) but the *member* names use the historical VB6 prefix conventions — `lvw` for ListView, `tvw` for TreeView, `sld` for Slider, `dtp` for DTPicker, `Prb` for ProgressBar, `cc` for cross-control. Mixed casing in member names (`SldAboveLeft` literal in the source defaults vs `sldAboveLeft` declaration) is a source-side issue; surface members with the declared casing.

## Module-level enums (under `Enumerations/`)

Five `<Name>Consts.twin` modules in `SUPPORT/` carry Win32 SDK plumbing (message IDs, notification IDs, style flags, Win32 types like `NMHDR` / `SYSTEMTIME` / `LVCOLUMNW`) **plus** a small fraction of user-facing enums. The plumbing is unreachable by user code (mostly inside `Private Module …Consts`); the user-facing enums are split into a separate `Public Module` (TreeView's clean case) or coexist with the plumbing in an effectively-public bare `Module` (the rest). Either way, surface only the user-facing enums:

| Enum                          | Declared in / module                                       | Members                                                              |
|-------------------------------|------------------------------------------------------------|----------------------------------------------------------------------|
| `DTPickerFormatConstants`     | `DTPickerConsts.twin` (module `DTPickerConsts`)            | `dtpLongDate = 0`, `dtpShortDate = 1`, `dtpTime = 2`, `dtpCustom = 3` |
| `TreeBorderStyleConstants`    | `TreeViewConsts.twin` (`Public Module TreeViewPublic`)     | `ccNone = 0`, `ccFixedSingle = 1`                                    |
| `TreeLabelEditConstants`      | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwAutomatic = 0`, `tvwManual = 1`, `tvwDisabled = 2`               |
| `TreeLineStyleConstants`      | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwTreeLines = 0`, `tvwRootLines = 1`                               |
| `TreeStyleConstants`          | `TreeViewConsts.twin` (`TreeViewPublic`)                   | 8 members: `tvwTextOnly`, `tvwPictureText`, `tvwPlusMinusText`, `tvwPlusMinusPictureText`, `tvwTreelinesText`, `tvwTreelinesPictureText`, `tvwTreelinesPlusMinusText`, `tvwTreelinesPlusMinusPictureText` |
| `TreeRelationshipConstants`   | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwFirst = 0`, `tvwLast = 1`, `tvwNext = 2`, `tvwPrevious = 3`, `tvwChild = 4` |
| `TreeSortOrderConstants`      | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwAscending = 0`, `tvwDescending = 1`                              |
| `TreeSortTypeConstants`       | `TreeViewConsts.twin` (`TreeViewPublic`)                   | `tvwBinary = 0`, `tvwText = 1`                                       |
| `OrientationConstants`        | `Misc.twin` (`Private Module Miscellaneous`)               | `ccOrientationHorizontal = 0`, `ccOrientationVertical = 1` — used by both **Slider** and **UpDown** |
| `ImlDrawConstants`            | `ImageListConsts.twin` (`Private Module ImageListConsts`)  | `ImlDrawNormal = 1`, `ImlDrawTransparent = 2`, `ImlDrawSelected = 4`, `ImlDrawFocus = 8`, `ImlDrawNoMask = 16` — flag combination; used as `[TypeHint(ImlDrawConstants)]` on `ListImage.Draw`'s `Style` parameter |

For `OrientationConstants` and `ImlDrawConstants` (declared `Public Enum` inside a `Private Module`): the enclosing module is unreachable by name from user code, but the enum members are reachable because they're tagged through `[TypeHint]` on the consuming method's parameter and are also surfaced by the IDE's "implicit member visibility" — i.e. user code writes `Slider1.Orientation = ccOrientationVertical` and `ListImage.Draw(hdc, 0, 0, ImlDrawTransparent Or ImlDrawSelected)`. Document the enum and don't worry about qualification — the user's call site never needs `Module.Enum.Member` form.

The remaining `<Name>Consts.twin` modules (`ImageListConsts`, `ListViewConsts`, `ProgressBarConsts`, `TreeViewConsts.TreeViewConsts` (the private half), `UpDownConsts`, `SliderConsts`, `MonthViewConsts`, `DTPickerConsts` non-`DTPickerFormatConstants` content) are package-internal — Win32 message IDs, style flags, notification structures (`NMHDR`, `NMLISTVIEW`, `NMDATETIMECHANGE`, …) that the controls use to talk to ComCtl32 but that the user never references. **No doc pages** for those; do not document `LVMessages`, `TVMessages`, `MonthViewMessages`, `SliderMessages`, `UpDownMessages`, `DTPickerMessages` and the associated `*Notifications` / `*Styles` enums.

## Private classes (no doc page)

- `Private Class ListViewHeaderSubclasser` (in `ListView.twin`) — subclasses the embedded `SysHeader32` window to intercept `HDM_LAYOUT` notifications for the column-resize handler. Implementation detail.
- `Private Class TreeViewNodeCheckState` / `ListViewNodeCheckState` / `TreeViewNodeClick` / `TreeViewNodeDblClick` (in `TreeViewNodeCheckState.twin`) — four `IScheduledCallback`-implementing dispatch helpers that the controls schedule onto the message loop to fire `NodeCheck` / `ItemCheck` / `NodeClick` / `DblClick` events at the right point in the click-handling sequence. Same role as the `…Internal` classes in WinNamedPipesLib; no doc page.
- `Class ImageListPropertyPage` (in `ImageListPropertyPage.twin`) — `[FormDesignerId]` `[PredeclaredId]` `[COMCreatable(False)]` Form class that's the IDE's design-time property editor for `ImageList` (the "Custom Properties..." button). Invoked from `ImageListBaseCtl.HandleInvokePropertyExtension`. Pure design-time tooling, never appears at run-time; no doc page.
- `Private Interface Control` / `IScheduledCallback` / `ITwinBasicDesignerExtensions` (in `Interfaces.twin`) — internal interfaces. `Control` is the empty marker interface that `[WithDispatchForwarding]` resolves names through. No doc pages.
- `Private Module Miscellaneous` (in `Misc.twin`) — `StrPtrSafe`, `CommonTreeViewGetNodeFromHandle`, `SyncBorderStyle` — internal helpers. `OrientationConstants` does surface from this module (see above) but the module itself doesn't get a doc page.
- `Private Module ImagesHelper` (in `ImagesHelper.twin`) — `GetBitsPerPixelFromPic`. Internal helper. No doc page.
- `Private Module ImageListConsts`, `ListViewConsts`, `ProgressBarConsts`, `TreeViewConsts` (the private half), and the bare `Module DTPickerConsts` / `MonthViewConsts` / `SliderConsts` / `UpDownConsts` (effectively public but Win32-plumbing-only) — covered above; no per-module doc page.

## `[Unimplemented]` and `[Hidden]` members to flag

- **DTPicker.RightToLeft** — tagged `[Unimplemented]`; flag with `> [!NOTE]`.
- **MonthView.RightToLeft** — same.
- **ListView.Scroll** event — tagged `[Unimplemented]`; flag on the event entry.
- **ListItem.CreateDragImage** — tagged `[Unimplemented]`; flag with `> [!NOTE]`.
- **ListImages.ControlDefault** — tagged `[Unimplemented]` and `[Hidden]`; **do not document** (`[Hidden]` means the IDE intentionally suppresses it).
- **ListView.AllowColumnReorder** — implemented but only takes effect in Report view; surface as a note on the property.

Layout: folder-style for `ImageList/`, `ListView/`, `TreeView/` (each has 2–4 sub-object companions — `ListImage` + `ListImages`; `ListItem` + `ListItems` + `ColumnHeader` + `ColumnHeaders`; `Node` + `Nodes` — that are 1:1 with the container, same pattern as `CustomControls/WaynesButton/WaynesButtonState.md`). Single-file for the remaining five (`DTPicker.md`, `MonthView.md`, `ProgressBar.md`, `Slider.md`, `UpDown.md`). An `Enumerations/` folder holds the 10 module-level / shared enums; the 11 per-control nested enums fold onto their declaring control's page.

## Pre-existing cross-references on the site

- [`docs/Reference/VBRUN/Constants/ControlTypeConstants.md`](docs/Reference/VBRUN/Constants/ControlTypeConstants.md) already lists every control's `vb<Name>` constant: `vbProgressBar = 21`, `vbTreeView = 22`, `vbSlider = 26`, `vbUpDown = 27`, `vbDTPicker = 28`, `vbMonthView = 29`, `vbListView = 30`, `vbImageList = 31`. Each control's reference page should link back to its constant.
- [`docs/Reference/VBRUN/Constants/OLEDropConstants.md`](docs/Reference/VBRUN/Constants/OLEDropConstants.md) and the `OLEDragDrop` events are inherited surface — link the `OLEDropMode` entries to the constant.
