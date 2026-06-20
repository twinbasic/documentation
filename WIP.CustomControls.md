# CustomControls Package — Working Notes

See [WIP.md](WIP.md) for the cross-package maintenance guide.

Two source-side packages, **one** doc-side package (`docs/Reference/CustomControls/`). The two source halves split by *role*: a **DESIGNER** framework (the abstract surface a custom control hooks into — `ICustomControl`, `ICustomForm`, the `CustomControlContext` / `CustomFormContext` / `CustomControlTimer` / `CustomControlsCollection` CoClasses, plus the `SerializeInfo` / `Canvas` UDTs and the enums) and a **runtime** half (the eight concrete `Waynes…` controls + shared appearance helpers + mixin base classes).

Public user-facing surface, grouped by role.

## Concrete controls

Each is `Class <Name>` (no `Public` modifier — implicitly public), tagged `[CustomControl("/miscellaneous/frm<X>.png")]` (designer icon) and `[COMCreatable(False)]` (cannot be `New`'d through COM; instantiated by the designer).

| Control          | Implements                                                | Co-located public types                          |
|------------------|-----------------------------------------------------------|--------------------------------------------------|
| `WaynesButton`   | `ICustomControl` + `BaseControlFocusable` (mixin)         | `WaynesButtonState` (private, but exposed)       |
| `WaynesForm`     | `ICustomControl` + `BaseForm` (mixin)                     | — (uses `WindowsFormOptions` from support file)  |
| `WaynesFrame`    | `ICustomControl` + `BaseControl` (mixin)                  | —                                                |
| `WaynesGrid`     | `ICustomControl` + `BaseControlFocusable` (mixin)         | `Column`, `CellRenderingOptions`                 |
| `WaynesLabel`    | `ICustomControl` + `BaseControl` (mixin)                  | —                                                |
| `WaynesSlider`   | `ICustomControl` + `BaseControlFocusable` (mixin)         | `WaynesSliderState`, `SliderDirection` & `SliderDisplayValueFormat` (nested enums) |
| `WaynesTextBox`  | `ICustomControl` + `BaseControlFocusable` (mixin)         | `WaynesTextBoxState`                             |
| `WaynesTimer`    | `ICustomControl` + `BaseControl` (mixin)                  | —                                                |

The "mixin" base classes (`BaseControl`, `BaseControlFocusable`, `BaseForm`) are pulled into each control via the twinBASIC `Implements <Base> Via _BaseControl = New <Base>` syntax. The base classes themselves get **no doc page** (they're private and never named by user code), but the inherited members **must be folded into each control's Properties listing** the same way VB-package controls list their inherited surface. The visible inherited surface, by mixin:

- `BaseControl` → `Name`, `Left`, `Top`, `Width`, `Height`, `Anchors`, `Dock`, `Visible`.
- `BaseControlFocusable` → all of `BaseControl` + `TabIndex`, `TabStop`.
- `BaseForm` → `FormDesignerId`, `Name`, `Left`, `Top`, `Width`, `Height`, `Controls`.

The state-holder classes (`WaynesButtonState`, `WaynesSliderState`, `WaynesTextBoxState`) and `WindowsFormOptions` are declared `Private Class` but are exposed on the parent control via `Public WithEvents NormalState As WaynesButtonState` (etc.). Same situation as `WebView2EnvironmentOptions` — document them as **sub-pages** of the parent control using the folder-style layout.

## Shared appearance helpers

These helpers are reachable through `Public WithEvents …` properties on one or more of the eight controls:

| Class           | Reached as                                                                          |
|-----------------|-------------------------------------------------------------------------------------|
| `Anchors`       | `<control>.Anchors` (via the mixin base)                                            |
| `Corners`       | `<state>.Corners`, `CellRenderingOptions.Corners`, `<sliderState>.BackgroundCorners`, `BlockCorners` |
| `Corner`        | `Corners.TopLeft` / `.TopRight` / `.BottomLeft` / `.BottomRight`                    |
| `Borders`       | `<state>.Borders`, `CellRenderingOptions.Borders`, `<sliderState>.BackgroundBorders`, `BlockBorders` |
| `Border`        | element of `Borders.Elements()`; also `TextRendering.Outlines()`                    |
| `Fill`          | `<state>.BackgroundFill`, `<sliderState>.BlockFill`, `CellRenderingOptions.Fill`, `Border.Fill`, `Line.Fill`, `TextRendering.Fill` |
| `FillColorPoint`  | element of `FillColorPoints.Values()`                                             |
| `FillColorPoints` | `Fill.ColorPoints`                                                                |
| `Line`          | `WaynesGrid.VerticalLineOptions` / `.HorizontalLineOptions` / `.ResizerBar`         |
| `Padding`       | `TextRendering.Padding`                                                             |
| `TextRendering` | `<state>.TextRendering`, `WaynesLabel.TextRendering`, `CellRenderingOptions.TextRendering` |
| `FontStyle`     | `TextRendering.Font`                                                                |
| `WindowsFormOptions` | `WaynesForm.WindowsOptions` (only one consumer)                                |

These pair their small helpers on a single page (`Corner` inlines under `Corners.md`, `Border` under `Borders.md`, `FillColorPoint` and `FillColorPoints` under `Fill.md`, `FontStyle` under `TextRendering.md`). `WindowsFormOptions` is the exception: it has exactly one consumer (`WaynesForm`), so it sits as a folder-style sub-page of `WaynesForm/`, parallel to how WebView2 carries `EnvironmentOptions`. The `TextDecorator(s)` / `UDTs` / `MathSupport` / `ColorSupport` / mixin-bases content is package-internal and gets **no doc page**.

## DESIGNER framework surface

The framework half — what a *control author* writes against. Documented under `docs/Reference/CustomControls/Framework/`:

| Symbol                       | Kind                | Role                                                                                  |
|------------------------------|---------------------|---------------------------------------------------------------------------------------|
| `ICustomControl`             | `Interface`         | what every concrete control implements: `Initialize(Context)`, `Destroy()`, `Paint(Canvas)` |
| `ICustomForm`                | `Interface`         | analogous surface for form-class custom controls                                      |
| `CustomControlContext`       | `CoClass`           | passed to `ICustomControl.Initialize`; offers `GetSerializer()`, `Repaint()`, `CreateTimer()`, `ChangeFocusedElement()` |
| `CustomFormContext`          | `CoClass`           | extends `CustomControlContext` with `Show()` / `Close()`                              |
| `CustomControlTimer`         | `CoClass`           | returned by `CustomControlContext.CreateTimer()`; `Interval`, `Enabled`, `OnTimer` event |
| `CustomControlsCollection`   | `CoClass`           | the `Controls` collection on a form — `Count`, `Item`, `Add`, `Remove`, `_NewEnum`    |
| `SerializeInfo`              | UDT                 | obtained from `Context.GetSerializer()`; exposes `RuntimeUISrz*` operations (deserialize, mode flags, …) |
| `Canvas`                     | UDT                 | parameter to `ICustomControl.Paint`; exposes `RuntimeUICCCanvasAddElement` + DPI / size getters |

Both UDTs follow a pattern unique to twinBASIC: a `Pointer As LongPtr` field plus `Public DeclareWide PtrSafe Function/Sub … Lib "<runtimeuisrz>" Alias "#N"` pseudo-DLL declarations bound directly into the type. From a *caller* perspective these read as instance methods on the UDT (`Canvas.RuntimeUICCCanvasAddElement(descriptor)`); document them as methods, and **do not** surface the `Lib "<…>"` / `Alias "#N"` / `PreserveSig` / `DLLStackCheck` decoration (same treatment as Assert's pseudo-DLL plumbing). The verbose `RuntimeUISrz*` / `RuntimeUICC*` names are unfortunate but they *are* the public API — keep them as-is.

The two underscore-prefixed default interfaces of each CoClass (`_CustomControlTimer`, `_CustomControlContext`, `_CustomFormContext`, `_CustomControlsCollection`, `_CustomControlTimerEvents`) are an implementation detail of the COM `[Default]`/`[Default, Source]` pattern — fold their members onto the CoClass page, **don't** give the interfaces their own pages.

## Enumerations

Public enums under `docs/Reference/CustomControls/Enumerations/`:

- `CornerShape`, `FillPattern`, `TextAlignment`, `TextOverflowMode`, `DockMode`, `FontWeight`, `StartupPosition`, `BorderStyle`, `WindowState` — straightforward value enums.
- `Customtate` — **probable typo** for `CustomState`. Has the same three members as `WindowState` (`tbNormal` / `tbMinimized` / `tbMaximized`) and isn't referenced anywhere else in the package. Document it (since it's `Public`), but add a `> [!NOTE]` callout flagging the typo and pointing readers to `WindowState`.
- `ColorRGBA`, `PixelCount`, `PointSize` — these are declared as `Enum` only because twinBASIC doesn't yet have a `Type Foo = Long` alias syntax. Each carries a `FIXME` comment ("Substitute for an ALIAS to Long") and a single `[_MAX] = 0` placeholder member. Document them as **typedefs for `Long`** (the underlying storage type), not as real enums. Note in each that the alias is what user code actually sees on `Public Width As CustomControls.PixelCount` (etc.) — when the alias syntax lands, these enum stand-ins go away.

Plus the two enums nested inside `WaynesSlider`: `SliderDirection` and `SliderDisplayValueFormat`. They live on the `WaynesSlider/index.md` page rather than under `Enumerations/` (locally scoped to the slider).
