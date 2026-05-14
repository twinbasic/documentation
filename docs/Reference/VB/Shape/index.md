---
title: Shape
parent: VB Package
permalink: /tB/Packages/VB/Shape/
has_toc: false
---

# Shape class
{: .no_toc }

A **Shape** is a windowless lightweight control that draws one of a fixed set of geometric primitives — rectangle, square, oval, circle, rounded rectangle, rounded square, five-pointed star, or an arrow pointing in any of the four cardinal directions — directly on its container. It exists purely for visual presentation: backgrounds, decorative artwork, panel dividers, highlighting, and any other place where a heavy [**PictureBox**](../PictureBox/) would be overkill.

A **Shape** has no interactive elements — no focus, no caption, and no mouse, keyboard, or drag events. The shape kind and its appearance are chosen entirely through properties; the only event raised by the control is [**Initialize**](#initialize). The default property is [**Shape**](#shape) and the default event is [**Initialize**](#initialize).

```tb
Private Sub Form_Load()
    shpPanel.Shape       = vbShapeRoundedRectangle
    shpPanel.BorderColor = vbBlack
    shpPanel.BorderWidth = 2
    shpPanel.FillStyle   = vbFSSolid
    shpPanel.FillColor   = RGB(240, 240, 240)
    shpPanel.BackStyle   = vbBFOpaque
End Sub
```

* TOC
{:toc}

## Windowless rendering

A **Shape** has no `hWnd`. The framework paints it onto its parent's drawing surface during the parent's paint cycle, so the control is cheap — no Win32 window is created on its behalf and no per-instance overhead beyond a small piece of state. The trade-offs are the same as for any windowless control:

- No focus, no keyboard input, no `KeyDown` / `KeyPress` / `KeyUp` / `GotFocus` / `LostFocus` / `Validate`.
- No mouse events of any kind — to make a region clickable, place a transparent [**Label**](../Label/) on top.
- No `hWnd` to pass to API functions, and no `SetFocus`.
- Cannot host child controls.

For anything that needs those, use [**PictureBox**](../PictureBox/) or a custom **UserControl** instead.

## Shape kinds

[**Shape**](#shape) chooses which primitive is drawn, as a member of [**ShapeConstants**](../../VBRUN/Constants/ShapeConstants):

| Constant                      | Value | Drawn as                                                                    |
|-------------------------------|-------|-----------------------------------------------------------------------------|
| **vbShapeRectangle**          | 0     | Rectangle filling the control's bounds.                                     |
| **vbShapeSquare**             | 1     | Square inscribed in the bounds — the shorter side determines the size, the longer side is centred. |
| **vbShapeOval**               | 2     | Ellipse filling the bounds.                                                 |
| **vbShapeCircle**             | 3     | Circle inscribed in the bounds — the shorter side determines the diameter.  |
| **vbShapeRoundedRectangle**   | 4     | Rectangle with rounded corners; corner radius from [**RoundedCornerSize**](#roundedcornersize). |
| **vbShapeRoundedSquare**      | 5     | Square inscribed in the bounds, with rounded corners.                       |
| **vbShapeStar**               | 6     | Regular star polygon; configured through [**VariationA**](#variationa), [**VariationB**](#variationb), and [**VariationC**](#variationc). |
| **vbShapeArrowLeft**          | 7     | Left-pointing arrow.                                                        |
| **vbShapeArrowRight**         | 8     | Right-pointing arrow.                                                       |
| **vbShapeArrowUp**            | 9     | Up-pointing arrow.                                                          |
| **vbShapeArrowDown**          | 10    | Down-pointing arrow.                                                        |

For **vbShapeCircle**, **vbShapeSquare**, and **vbShapeRoundedSquare**, the drawn primitive is square: the shorter of the control's width and height is used and the primitive is centred along the longer axis. The control's bounding rectangle is unchanged.

## Stars and arrows

Stars and arrows are parameterised through the three **Variation** properties, all **Long** with a sentinel default of `-1` that selects the built-in default geometry:

For **vbShapeStar**:

- [**VariationA**](#variationa) — number of points, clamped to the inclusive range `2`–`30`. Default `5`.
- [**VariationB**](#variationb) — inner-radius factor controlling how "thin" the star's arms are. Larger values produce thinner arms. Default chosen so the inner radius is half the outer radius.
- [**VariationC**](#variationc) — vertex-spread divisor, an integer from `1` to `12`. Lower values produce closely-bunched points; higher values produce a more conventional star. Default `12` (effectively a divisor of `2`).

For **vbShapeArrowLeft**, **vbShapeArrowRight**, **vbShapeArrowUp**, **vbShapeArrowDown**:

- [**VariationA**](#variationa) — arrowhead "height" along the arrow's axis, as a percentage (`0`–`100`) of the control's cross-axis dimension. Default `30` (i.e. `0.30`).
- [**VariationB**](#variationb) — arrowhead "depth" along the arrow's tip-to-tail axis, as a percentage (`0`–`100`) of the control's axis dimension. Default `50` (i.e. `0.50`).

[**VariationC**](#variationc) is unused for arrows.

## Background, fill, and gradients

A **Shape** is painted in three logical layers:

1. The control's background, governed by [**BackStyle**](#backstyle) and [**BackColor**](#backcolor). When [**BackStyle**](#backstyle) is **vbBFTransparent** (default), pixels outside the drawn shape but inside the control's bounding rectangle show whatever the parent painted underneath. When **vbBFOpaque**, those pixels are filled with [**BackColor**](#backcolor).
2. The interior of the shape, governed by [**FillStyle**](#fillstyle), [**FillColor**](#fillcolor), and (for gradients) [**FillColorAlt**](#fillcoloralt).
3. The shape's outline, governed by [**BorderStyle**](#borderstyle), [**BorderColor**](#bordercolor), and [**BorderWidth**](#borderwidth).

[**FillStyle**](#fillstyle) is a member of [**FillStyleConstantsEx**](../../VBRUN/Constants/FillStyleConstantsEx):

| Constant                  | Value | Interior                                                       |
|---------------------------|-------|----------------------------------------------------------------|
| **vbFSSolid**             | 0     | Filled with [**FillColor**](#fillcolor).                       |
| **vbFSTransparent**       | 1     | No fill (default — the shape's interior shows through).        |
| **vbHorizontalLine**      | 2     | Horizontal hatch in [**FillColor**](#fillcolor).               |
| **vbVerticalLine**        | 3     | Vertical hatch in [**FillColor**](#fillcolor).                 |
| **vbUpwardDiagonal**      | 4     | `/`-direction diagonal hatch.                                  |
| **vbDownwardDiagonal**    | 5     | `\`-direction diagonal hatch.                                  |
| **vbCross**               | 6     | Orthogonal cross-hatch.                                        |
| **vbDiagonalCross**       | 7     | Diagonal cross-hatch.                                          |
| **vbGradientNS**          | 8     | Vertical gradient from [**FillColor**](#fillcolor) (top) to [**FillColorAlt**](#fillcoloralt) (bottom). |
| **vbGradientWE**          | 9     | Horizontal gradient from [**FillColor**](#fillcolor) (left) to [**FillColorAlt**](#fillcoloralt) (right). |

The gradient styles (**vbGradientNS**, **vbGradientWE**) use the Win32 `GradientFill` GDI primitive, which does not respect the world transform applied for rotation: when [**Angle**](#angle) is non-zero, the gradient styles fall back to a solid fill of [**FillColor**](#fillcolor). The hatch and gradient styles are clipped to the shape's outline using a GDI region matching the shape kind.

## Border

The outline is drawn with a Win32 GDI pen:

- [**BorderColor**](#bordercolor) — the pen colour (defaults to the system window-text colour).
- [**BorderWidth**](#borderwidth) — the pen width in pixels (default `1`).
- [**BorderStyle**](#borderstyle) — the pen pattern, as a member of [**BorderStyleConstants**](../../VBRUN/Constants/BorderStyleConstants): **vbTransparent** (0 — no outline), **vbBSSolid** (1, default), **vbBSDash** (2), **vbBSDot** (3), **vbBSDashDot** (4), **vbBSDashDotDot** (5), or **vbBSInsideSolid** (6).

As with [**Line**](../Line/), GDI forces a solid pen whenever [**BorderWidth**](#borderwidth) is greater than `1` — dashed and dotted patterns are only honoured at width `1`.

## Rotation

[**Angle**](#angle) rotates the rendered shape around the control's top-left point, in degrees, anti-clockwise. `0` (default) is the natural orientation; `90` is a quarter turn anti-clockwise; values between `0` and `360` give arbitrary rotations. The control's bounding rectangle on the parent does not change — large rotation angles can therefore push the visible shape outside the rectangle. The rendered pixels are bounded only by the parent's clip, not by the **Shape**'s own rectangle.

Gradient fill styles do not honour rotation — see [Background, fill, and gradients](#background-fill-and-gradients).

## Draw mode

[**DrawMode**](#drawmode) selects the raster operation that combines the drawn pixels with the destination. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants): **vbCopyPen** (default — opaque drawing) or one of the XOR / AND / NOT / merge variants. Non-default modes are mainly useful for "rubber-band" feedback drawn over an existing background — the same XOR applied twice cancels itself out, restoring the original pixels.

## Properties

### Anchors
{: .no_toc }

The set of edges of the parent that the **Shape**'s corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### Angle
{: .no_toc }

The rotation of the rendered shape, in degrees, anti-clockwise around the control's top-left corner. **Double**, default `0`. See [Rotation](#rotation) for the details and the gradient-fill caveat.

### BackColor
{: .no_toc }

The colour painted into the **Shape**'s bounding rectangle (outside the shape's own outline) when [**BackStyle**](#backstyle) is **vbBFOpaque**. **OLE_COLOR**, defaults to the system window-background colour. Has no effect when [**BackStyle**](#backstyle) is **vbBFTransparent**.

### BackStyle
{: .no_toc }

Whether the bounding rectangle around the shape is filled with [**BackColor**](#backcolor) or left transparent. A member of [**BackFillStyleConstants**](../../VBRUN/Constants/BackFillStyleConstants): **vbBFTransparent** (0, default) or **vbBFOpaque** (1).

### BorderColor
{: .no_toc }

The colour of the shape's outline, as an **OLE_COLOR**. Defaults to the system window-text colour.

### BorderStyle
{: .no_toc }

The pen pattern used for the outline. A member of [**BorderStyleConstants**](../../VBRUN/Constants/BorderStyleConstants): **vbTransparent** (0), **vbBSSolid** (1, default), **vbBSDash** (2), **vbBSDot** (3), **vbBSDashDot** (4), **vbBSDashDotDot** (5), or **vbBSInsideSolid** (6). Forced to **vbBSSolid** by Win32 whenever [**BorderWidth**](#borderwidth) is greater than `1`.

### BorderWidth
{: .no_toc }

The outline pen width, in pixels. **Long**, default `1`. Widths greater than `1` ignore [**BorderStyle**](#borderstyle) and always draw solid.

### Container
{: .no_toc }

The control that hosts this **Shape** — typically the form, a [**Frame**](../Frame/), or a **UserControl**. Read with **Get**, change with **Set**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control. Always **vbShape**. This constant is shared with the [**Line**](../Line/) control — both are windowless geometric primitives.

### Dock
{: .no_toc }

Where the **Shape** is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked shapes ignore [**Anchors**](#anchors).

### DrawMode
{: .no_toc }

The raster operation that the shape drawing applies when combining its pixels with the destination. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants): **vbCopyPen** (default) is normal opaque drawing; other values produce XOR, AND, NOT, and other pixel-mixing effects.

### FillColor
{: .no_toc }

The primary colour used to fill the shape's interior. **OLE_COLOR**, defaults to the system scrollbar colour. Used as the only colour for solid and hatched fills, and as the start colour for gradient fills. Has no effect when [**FillStyle**](#fillstyle) is **vbFSTransparent**.

### FillColorAlt
{: .no_toc }

The secondary colour used as the end of a gradient fill. **OLE_COLOR**, defaults to `vbWhite`. Used only when [**FillStyle**](#fillstyle) is **vbGradientNS** or **vbGradientWE**.

### FillStyle
{: .no_toc }

The pattern used to fill the shape's interior, as a member of [**FillStyleConstantsEx**](../../VBRUN/Constants/FillStyleConstantsEx). Default **vbFSTransparent** (1) — the interior is not painted and shows through to the underlying parent pixels. See [Background, fill, and gradients](#background-fill-and-gradients) for the full table and the caveat for gradients combined with rotation.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Double**.

### Index
{: .no_toc }

When the **Shape** is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Double**.

### Name
{: .no_toc }

The unique design-time name of the **Shape** on its parent form. Read-only at run time.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that ultimately contains the **Shape**. Read-only.

### RoundedCornerSize
{: .no_toc }

The radius, in the container's **ScaleMode** units, of the corner arc drawn when [**Shape**](#shape) is **vbShapeRoundedRectangle** or **vbShapeRoundedSquare**. **Long**, default `20`. Ignored for other shape kinds.

### Shape
{: .no_toc }

The geometric primitive drawn by the control. **Default property.**

Syntax: *object*.**Shape** [ = *value* ]

*value*
: A member of [**ShapeConstants**](../../VBRUN/Constants/ShapeConstants). See [Shape kinds](#shape-kinds) for the full table.

When accessed through the default-property path (e.g. `Shape1 = vbShapeOval`), the value is read and written as a **Long** matching the underlying enum.

### TabIndex
{: .no_toc }

> [!NOTE]
> Inherited from the windowless-control base class but has no effect: a **Shape** does not accept focus and is skipped by TAB-key navigation regardless of this value.

### TabStop
{: .no_toc }

> [!NOTE]
> Inherited from the windowless-control base class but has no effect: a **Shape** does not accept focus and cannot be reached by the TAB key.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the **Shape**. Ignored by the framework.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the control. **Double**.

### VariationA
{: .no_toc }

First geometry parameter for the star and arrow shape kinds. **Long**, default `-1` (which selects the built-in default for the current shape). See [Stars and arrows](#stars-and-arrows) for the meaning per shape.

### VariationB
{: .no_toc }

Second geometry parameter for the star and arrow shape kinds. **Long**, default `-1`. See [Stars and arrows](#stars-and-arrows).

### VariationC
{: .no_toc }

Third geometry parameter, used only by **vbShapeStar**. **Long**, default `-1`. See [Stars and arrows](#stars-and-arrows).

### Visible
{: .no_toc }

Whether the **Shape** is drawn. **Boolean**, default **True**.

### Width
{: .no_toc }

The control's width, in twips by default (or in the container's **ScaleMode** units). **Double**.

## Methods

### Move
{: .no_toc }

Repositions and optionally resizes the **Shape** in a single call.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### Refresh
{: .no_toc }

Forces an immediate repaint of the **Shape**'s bounding rectangle on the parent's drawing surface.

Syntax: *object*.**Refresh**

### ZOrder
{: .no_toc }

Brings the **Shape** to the front or back of the windowless-sibling stack within its container.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Initialize
{: .no_toc }

Raised once, after the **Shape** has been connected to its container's paint cycle but before it is first painted. Useful for last-minute setup that depends on container state. **Default event.**

Syntax: *object*\_**Initialize**( )
