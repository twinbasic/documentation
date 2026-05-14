---
title: PixelCount
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/PixelCount
---
# PixelCount
{: .no_toc }

> [!NOTE]
> **PixelCount** is declared as an empty `Enum` block (with a placeholder `[_MAX] = 0` member) only because twinBASIC has not yet exposed a type-alias syntax such as `Type PixelCount = Long`. The source has a `FIXME` comment noting the stand-in. Treat **PixelCount** as a **Long**-compatible type alias rather than as an enumeration with named members; when alias syntax becomes available, the enum stand-in will be replaced.

A **Long**-compatible type alias used wherever a measurement in pixels is expected. Used pervasively across the package — every control's inherited **Left**, **Top**, **Width**, **Height** are typed as **PixelCount**, as are [**Corner.Radius**](../Styles/Corners#radius), [**Padding**](../Styles/Padding) fields, [**Border.StrokeSize**](../Styles/Borders#strokesize), and many more.

The package treats one **PixelCount** as one *unscaled* pixel; the design-time canvas is at 96 DPI. The runtime scales the value for the active monitor's DPI when painting, so a 15-pixel corner radius looks the same on a 96-DPI and a 192-DPI display. Inside an [**ICustomControl.Paint**](../Framework/ICustomControl#paint) implementation, the scale factor is available through [**Canvas.RuntimeUICCGetDpiScaleFactor**](../Framework/Canvas#runtimeuiccgetdpiscalefactor).
