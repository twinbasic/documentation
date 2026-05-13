---
title: Corners
parent: Styles
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/Corners
has_toc: false
---

# Corners class
{: .no_toc }

The four corners of a rendered region. Each corner is an independent [**Corner**](#corner-class) sub-object — the shape and radius can vary corner by corner — letting a control round one corner while notching another. Reached as `<state>.Corners`, [**CellRenderingOptions.Corners**](../WaynesGrid/CellRenderingOptions#corners), and the slider's `<sliderState>.BackgroundCorners` / `BlockCorners`.

```tb
With btnGo.NormalState.Corners
    .SetAll tbCurve, 12       ' all four corners 12px rounded
    .TopRight.Shape = tbNotched
End With
```

The three [**CornerShape**](../Enumerations/CornerShape) values can mix on a single control. Setting [**TopLeft**](#topleft), [**TopRight**](#topright), [**BottomLeft**](#bottomleft), and [**BottomRight**](#bottomright) individually gives full control over the silhouette:

```tb
With btnTab.NormalState.Corners
    .TopLeft.Shape = tbCurve     : .TopLeft.Radius = 12
    .TopRight.Shape = tbCurve    : .TopRight.Radius = 12
    .BottomLeft.Shape = tbNotched : .BottomLeft.Radius = 0
    .BottomRight.Shape = tbNotched : .BottomRight.Radius = 0
End With
```

A circular control is just a square one with all four corners set to [**tbCurve**](../Enumerations/CornerShape#tbCurve) and a radius greater than or equal to half the control's smaller dimension — that is what the `Circle` button in the package's sample forms uses.

* TOC
{:toc}

## Properties

### BottomLeft
{: .no_toc }

The [**Corner**](#corner-class) sub-object that controls the bottom-left corner.

### BottomRight
{: .no_toc }

The [**Corner**](#corner-class) sub-object that controls the bottom-right corner.

### TopLeft
{: .no_toc }

The [**Corner**](#corner-class) sub-object that controls the top-left corner.

### TopRight
{: .no_toc }

The [**Corner**](#corner-class) sub-object that controls the top-right corner.

## Methods

### SetAll
{: .no_toc }

Sets all four corners to the same shape and radius in a single call. Equivalent to assigning the same values to each of [**TopLeft**](#topleft), [**TopRight**](#topright), [**BottomLeft**](#bottomleft), and [**BottomRight**](#bottomright).

Syntax: *object*.**SetAll** *Shape*, *Radius*

*Shape*
: *required* A member of [**CornerShape**](../Enumerations/CornerShape).

*Radius*
: *required* A [**PixelCount**](../Enumerations/PixelCount) giving the curve / notch / cut-out radius.

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the four corner sub-objects changes — either through a direct property set on the **Corners** object or through a propagated **OnChanged** from one of the **Corner** sub-objects.

## Corner class

A single corner of a [**Corners**](#) object. Has a [**Shape**](#shape) (curve, notch, or cut-out) and a [**Radius**](#radius) (in pixels).

### Radius
{: .no_toc }

The corner's radius in pixels. The interpretation depends on [**Shape**](#shape): for **tbCurve** it is the radius of the quarter-circle, for **tbNotched** the cut depth, and for **tbCutOut** the depth of the carved-out region. [**PixelCount**](../Enumerations/PixelCount). Default: 0 (a sharp 90° corner regardless of **Shape**).

### Shape
{: .no_toc }

How the corner is drawn. A member of [**CornerShape**](../Enumerations/CornerShape): **tbCurve** (default), **tbNotched**, or **tbCutOut**.

### OnChanged
{: .no_toc }

Raised when either [**Shape**](#shape) or [**Radius**](#radius) is assigned. The parent [**Corners**](#) listens for this event and re-raises its own.
