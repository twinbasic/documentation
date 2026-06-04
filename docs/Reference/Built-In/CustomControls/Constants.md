---
title: Constants
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Constants
has_toc: false
---
# Constants
{: .no_toc }

The **Constants** module in the **CustomControls DESIGNER** library declares the enumerations and UDTs shared across the entire **CustomControls** package.

The module is internal to the DESIGNER library; user code does not reference it by name. The members it exposes are:

- **Enumerations** --- the full set of public constants used by the package's controls, style objects, and form options. Each is documented on its own page under [Enumerations](Enumerations/).
- **UDTs** --- [**SerializeInfo**](Framework/SerializeInfo) and [**Canvas**](Framework/Canvas), the two value types passed to custom control implementations; both carry twinBASIC pseudo-DLL method bindings and are documented under [Framework](Framework/).

## Enumerations

| Enumeration | Purpose |
|-------------|---------|
| [ColorRGBA](Enumerations/ColorRGBA) | `Long`-compatible type alias for 32-bit ABGR colour values |
| [CornerShape](Enumerations/CornerShape) | How a single corner of a control is shaped: curve, notch, or cut-out |
| [Customtate](Enumerations/Customtate) | Reserved duplicate of [**WindowState**](Enumerations/WindowState) |
| [DockMode](Enumerations/DockMode) | How a control is docked inside its container |
| [FillPattern](Enumerations/FillPattern) | The gradient or fill pattern used by a [**Fill**](Styles/Fill) |
| [FontWeight](Enumerations/FontWeight) | Font weights from **tbThin** (100) through **tbHeavy** (900), mirroring the OpenType `wght` scale |
| [PixelCount](Enumerations/PixelCount) | `Long`-compatible type alias for measurements expressed in pixels |
| [PointSize](Enumerations/PointSize) | `Long`-compatible type alias for font sizes expressed in points |
| [StartupPosition](Enumerations/StartupPosition) | Initial position of a form when it is first shown |
| [TextAlignment](Enumerations/TextAlignment) | Horizontal and vertical alignment of text within a [**TextRendering**](Styles/TextRendering) |
| [TextOverflowMode](Enumerations/TextOverflowMode) | How text longer than the available area is truncated |
| [BorderStyle](Enumerations/BorderStyle) | Window-frame style passed to [**WindowsFormOptions.BorderStyle**](WaynesForm/WindowsFormOptions#borderstyle) |
| [WindowState](Enumerations/WindowState) | The minimized / normal / maximized window state of a form |

## UDTs

| Type | Purpose |
|------|---------|
| [SerializeInfo](Framework/SerializeInfo) | Per-instance serializer returned by [**CustomControlContext.GetSerializer**](Framework/CustomControlContext#getserializer); used to deserialize designer-set property values and to query the runtime mode |
| [Canvas](Framework/Canvas) | Drawing surface passed to [**ICustomControl.Paint**](Framework/ICustomControl#paint); exposes element-adding and DPI / size query methods |

### See Also

- [Enumerations](Enumerations/) -- package enumeration index
- [Framework](Framework/) -- host-side contract for custom control authors
