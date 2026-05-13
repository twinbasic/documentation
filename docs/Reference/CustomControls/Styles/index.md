---
title: Styles
parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/
has_toc: false
---

# Styles

The shared appearance helper classes used by the [**CustomControls**](..) package's concrete `Waynes…` controls. Each is a small container of related visual settings — a [**Fill**](Fill) is a colour or gradient, a [**Borders**](Borders) is an array of border strokes, a [**Corners**](Corners) is the shape and radius of each corner, and so on. Controls compose them through `Public WithEvents …` properties: a [**WaynesButton**](../WaynesButton/) holds four [**WaynesButtonState**](../WaynesButton/WaynesButtonState) sub-objects (Normal / Hover / Focused / Pressed), each of which carries its own [**BackgroundFill**](../WaynesButton/WaynesButtonState#backgroundfill), [**Borders**](../WaynesButton/WaynesButtonState#borders), [**Corners**](../WaynesButton/WaynesButtonState#corners), and [**TextRendering**](../WaynesButton/WaynesButtonState#textrendering).

Every style object raises an **OnChanged** event whenever any of its public fields is assigned. The hosting control listens for that event on each of its sub-objects and asks the framework to repaint, so style changes made at runtime are reflected immediately.

| Class | Role |
|-------|------|
| [Anchors](Anchors) | which sides of a control are pinned to the container when it resizes |
| [Borders](Borders) | an array of border strokes drawn around a region; carries the per-stroke `Border` sub-object |
| [Corners](Corners) | the four corner shapes / radii of a region; carries the per-corner `Corner` sub-object |
| [Fill](Fill) | the colour or gradient that paints a region; carries the `FillColorPoint` and `FillColorPoints` sub-objects that hold the gradient stops |
| [Line](Line) | a single grid- or resizer-line stroke; a thinner shape than a full border |
| [Padding](Padding) | per-side padding around text inside a [**TextRendering**](TextRendering) |
| [TextRendering](TextRendering) | font, padding, fill, outlines, alignment, and overflow for text; carries the `FontStyle` sub-object that holds the font metrics |

The style classes are declared `Private Class` in the **CustomControlsPackage** source — they cannot be created with `New` from outside the package, and a variable cannot be typed as e.g. `Dim x As Fill` from a referencing project. Application code reaches every style object exclusively through the property chain that hangs off a concrete control.
