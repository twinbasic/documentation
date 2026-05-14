---
title: ColorRGBA
parent: Enumerations
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Enumerations/ColorRGBA
---
# ColorRGBA
{: .no_toc }

A **Long**-compatible type alias used wherever a 32-bit ABGR colour value is expected. The high byte is the alpha channel — `&HFF000000` is fully opaque, `&H00000000` is fully transparent — and the low three bytes follow the standard `vbBlue`/`vbGreen`/`vbRed` order used by the [**ColorConstants**](../../VBRUN/Constants/ColorConstants) `Long`-coloured constants. Used by [**FillColorPoint.Color**](../Styles/Fill#color) and by the **RGBA** parameter of [**FillColorPoints.SetSolidColorRGBA**](../Styles/Fill#setsolidcolorrgba) / [**Borders.SetSimpleBorderRGBA**](../Styles/Borders#setsimpleborderrgba).

> [!NOTE]
> **ColorRGBA** is declared as an empty `Enum` block (with a placeholder `[_MAX] = 0` member) only because twinBASIC has not yet exposed a type-alias syntax such as `Type ColorRGBA = Long`. The source has a `FIXME` comment noting the stand-in. **ColorRGBA** should be used as a **Long**-compatible type alias rather than as an enumeration with named members; when alias syntax becomes available, the enum stand-in will be replaced.

To write a fully-opaque colour, OR-in the opaque alpha mask: `&HFF000000 Or vbBlue`. The convenience setters [**FillColorPoints.SetSolidColor**](../Styles/Fill#setsolidcolor) and [**Borders.SetSimpleBorder**](../Styles/Borders#setsimpleborder) take a normal three-byte **Long** colour and apply the opaque mask automatically; only the `*RGBA` variants take a raw **ColorRGBA**.

```tb
Dim translucentRed As ColorRGBA = &H800000FF&    ' 50% alpha, full red
```
