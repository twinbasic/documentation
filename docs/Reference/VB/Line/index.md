---
title: Line
parent: VB Package
permalink: /tB/Packages/VB/Line/
has_toc: false
---

# Line class
{: .no_toc }

A **Line** is a windowless lightweight control that draws a single straight line segment from one point to another on its container. It exists purely for visual presentation — to divide regions of a form, underline a heading, draw a leader to an annotation — and has no interactive elements of its own: no mouse events, no focus, no caption.

A **Line** is positioned by its two endpoints, [**X1**](#x1) / [**Y1**](#y1) and [**X2**](#x2) / [**Y2**](#y2), rather than by a `Left` / `Top` / `Width` / `Height` rectangle. The default property is [**Visible**](#visible) and the default event is [**Initialize**](#initialize).

```tb
Private Sub Form_Load()
    linUnderHeading.X1 = 120 :  linUnderHeading.Y1 = 320
    linUnderHeading.X2 = 4800 : linUnderHeading.Y2 = 320
    linUnderHeading.BorderColor = vbBlue
    linUnderHeading.BorderWidth = 2
End Sub
```

* TOC
{:toc}

## Endpoints

[**X1**](#x1) / [**Y1**](#y1) is one endpoint of the line; [**X2**](#x2) / [**Y2**](#y2) is the other. Coordinates are in the container's **ScaleMode** units (twips by default) and are measured from the top-left corner of the container's client area. The line is drawn between the two points regardless of which is "earlier" — swapping the endpoints does not change the result.

The control has no `Width` or `Height` of its own; the bounding rectangle is derived from the two endpoints. Resizing a **Line** at design time moves whichever endpoint is being dragged.

## Pen

The line is drawn with a Win32 GDI pen whose appearance is controlled by:

- [**BorderColor**](#bordercolor) — the colour of the pen (defaults to the system window-text colour).
- [**BorderWidth**](#borderwidth) — the pen width in pixels (default `1`).
- [**BorderStyle**](#borderstyle) — the pen pattern, as a member of [**BorderStyleConstants**](../../VBRUN/Constants/BorderStyleConstants): **vbTransparent** (0), **vbBSSolid** (1, default), **vbBSDash** (2), **vbBSDot** (3), **vbBSDashDot** (4), **vbBSDashDotDot** (5), or **vbBSInsideSolid** (6).

GDI applies a hard limitation here: when [**BorderWidth**](#borderwidth) is greater than `1`, the OS forces a solid pen even if [**BorderStyle**](#borderstyle) requests a dashed or dotted pattern. Use width `1` if the pattern matters.

## Draw mode

[**DrawMode**](#drawmode) selects the raster operation that combines the pen with the destination pixels. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants): **vbCopyPen** (default — opaque drawing) or one of the XOR / AND / NOT / merge variants. Non-default modes are mainly useful for "rubber-band" feedback drawn over an existing background — the same XOR you draw twice cancels itself out, restoring the original pixels.

## No interaction

Unlike most other controls, a **Line** does not raise mouse, keyboard, or focus events of any kind, and has no [**Caption**](/tB/Packages/VB/Label#caption), [**Enabled**](/tB/Packages/VB/Label#enabled), or **ToolTipText**. To make a region clickable, place a transparent [**Label**](../Label/) on top.

## Properties

### BorderColor
{: .no_toc }

The colour of the line, as an **OLE_COLOR**. Defaults to the system window-text colour.

### BorderStyle
{: .no_toc }

The pen pattern. A member of [**BorderStyleConstants**](../../VBRUN/Constants/BorderStyleConstants): **vbTransparent** (0), **vbBSSolid** (1, default), **vbBSDash** (2), **vbBSDot** (3), **vbBSDashDot** (4), **vbBSDashDotDot** (5), or **vbBSInsideSolid** (6). Forced to **vbBSSolid** by Win32 whenever [**BorderWidth**](#borderwidth) is greater than `1`.

### BorderWidth
{: .no_toc }

The pen width, in pixels. **Long**, default `1`. Widths greater than `1` ignore [**BorderStyle**](#borderstyle) and always draw solid.

### Container
{: .no_toc }

The control that hosts this line — typically the form, a [**Frame**](../Frame/), or a **UserControl**. Read with **Get**, change with **Set**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control. The **Line** shares the **vbShape** constant with the [**Shape**](../Shape) control — both are windowless, points-based geometric primitives with no dedicated control-type identifier.

### DrawMode
{: .no_toc }

The raster operation that the line drawing applies when combining the pen with the destination. A member of [**DrawModeConstants**](../../VBRUN/Constants/DrawModeConstants): **vbCopyPen** (default) is normal opaque drawing; other values produce XOR, AND, NOT, and other pixel-mixing effects.

### Index
{: .no_toc }

When the line is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Name
{: .no_toc }

The unique design-time name of the control on its parent. Read-only at run time.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that ultimately contains the line. Read-only.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the line. Ignored by the framework.

### Visible
{: .no_toc }

Whether the line is shown. **Boolean**, default **True**. **Default property.**

### X1
{: .no_toc }

The horizontal position of the first endpoint, in the container's **ScaleMode** units. **Double**.

### X2
{: .no_toc }

The horizontal position of the second endpoint, in the container's **ScaleMode** units. **Double**.

### Y1
{: .no_toc }

The vertical position of the first endpoint, in the container's **ScaleMode** units. **Double**.

### Y2
{: .no_toc }

The vertical position of the second endpoint, in the container's **ScaleMode** units. **Double**.

## Methods

### ZOrder
{: .no_toc }

Brings the line to the front or back of the windowless-sibling stack within its container.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Initialize
{: .no_toc }

Raised once, after the line has been connected to its container's paint cycle but before it is first painted. **Default event.**

Syntax: *object*\_**Initialize**( )
