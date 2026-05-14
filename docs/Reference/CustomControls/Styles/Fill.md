---
title: Fill
parent: Styles
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/Fill
has_toc: false
---

# Fill class
{: .no_toc }

The colour or gradient that paints a region — background of a control, body of a border, fill of a grid line, foreground of text. A **Fill** has two parts: a [**Pattern**](#pattern) that picks the gradient direction (or `tbPatternNone` for transparent), and a [**ColorPoints**](#colorpoints) collection of one or more colour stops that supply the actual colours.

A single solid colour is just a one-stop fill: call [**ColorPoints.SetSolidColor**](#setsolidcolor) with a `Long` colour, or [**SetSimplePattern**](#setsimplepattern) on the parent **Fill** for a two-colour gradient.

```tb
btnGo.NormalState.BackgroundFill.ColorPoints.SetSolidColor vbBlue
btnGo.HoverState.BackgroundFill.SetSimplePattern vbBlue, vbWhite, _
        Pattern:=tbGradientNorthToSouth
```

For three or more colour stops, build [**FillColorPoint**](#fillcolorpoint-class) instances and pass them to [**SetColorPoints**](#setcolorpoints). The stops accept fully-opaque ARGB literals (`&HFF` alpha in the high byte) — see [**ColorRGBA**](../Enumerations/ColorRGBA) for the encoding:

```tb
With pnlHeader.BackgroundFill
    .Pattern = tbGradientNorthToSouth
    .ColorPoints.SetColorPoints _
        New FillColorPoint(&HFFF3E58F, 0), _
        New FillColorPoint(&HFF99CCFF, 50), _
        New FillColorPoint(&HFF014C99, 100)
End With
```

* TOC
{:toc}

## Properties

### ColorPoints
{: .no_toc }

The [**FillColorPoints**](#fillcolorpoints-class) collection holding the gradient stops. Always present and pre-allocated; assigning new stops is done by calling methods on this object rather than replacing the collection.

### Pattern
{: .no_toc }

How the colours in [**ColorPoints**](#colorpoints) are mapped across the region. A member of [**FillPattern**](../Enumerations/FillPattern). Default: **tbGradientNorthToSouth**. Use **tbPatternNone** to make the **Fill** transparent.

## Methods

### SetSimplePattern
{: .no_toc }

Replaces the colour stops with a two-stop gradient between two solid colours, optionally adjusting the [**Granularity**](#granularity) and [**Pattern**](#pattern) at the same time. The colours are given as ordinary `Long` values (the `vb…` colour constants or a hex literal); the opaque alpha mask is OR-ed in automatically.

Syntax: *object*.**SetSimplePattern** *Value1RGB*, *Value2RGB* [, *Granularity* [, *Pattern* ] ]

*Value1RGB*
: *required* A **Long** RGB colour for the first gradient stop (position 0).

*Value2RGB*
: *required* A **Long** RGB colour for the second gradient stop (position 100).

*Granularity*
: *optional* The colour-table size assigned to [**Granularity**](#granularity). Default: 100.

*Pattern*
: *optional* A member of [**FillPattern**](../Enumerations/FillPattern). Default: **tbGradientNorthToSouth**.

### SetSimplePatternRGBA
{: .no_toc }

Same as [**SetSimplePattern**](#setsimplepattern) but accepts raw 32-bit [**ColorRGBA**](../Enumerations/ColorRGBA) values with their own alpha channels rather than three-byte RGB colours.

Syntax: *object*.**SetSimplePatternRGBA** *Value1RGBA*, *Value2RGBA* [, *Granularity* [, *Pattern* ] ]

*Value1RGBA*
: *required* A [**ColorRGBA**](../Enumerations/ColorRGBA) (ABGR) value for the first gradient stop.

*Value2RGBA*
: *required* A [**ColorRGBA**](../Enumerations/ColorRGBA) (ABGR) value for the second gradient stop.

*Granularity*
: *optional* The colour-table size assigned to [**Granularity**](#granularity). Default: 100.

*Pattern*
: *optional* A member of [**FillPattern**](../Enumerations/FillPattern). Default: **tbGradientNorthToSouth**.

## Events

### OnChanged
{: .no_toc }

Raised whenever [**Pattern**](#pattern) is assigned or the [**ColorPoints**](#colorpoints) collection raises its own **OnChanged**.

## FillColorPoints class

The collection of [**FillColorPoint**](#fillcolorpoint-class) stops that define a [**Fill**](#)'s colour gradient. Reached as [**Fill.ColorPoints**](#colorpoints). Internally an array of **FillColorPoint** plus a [**Granularity**](#granularity) integer.

### Granularity
{: .no_toc }

The size of the generated colour table that interpolates the stops. Higher values give smoother gradients; a value of 2 produces a hard transition between just two colours regardless of how many stops the collection holds. **Long**. Default: 100.

### Values
{: .no_toc }

The array of [**FillColorPoint**](#fillcolorpoint-class) gradient stops. Read-write, but in practice you populate it through the [**SetSolidColor**](#setsolidcolor), [**SetSolidColorRGBA**](#setsolidcolorrgba), [**SetColorPoints**](#setcolorpoints), or [**SetColorPointsArray**](#setcolorpointsarray) methods rather than assigning the array directly.

### SetSolidColor
{: .no_toc }

Replaces the stop array with a single fully-opaque stop. Takes a three-byte `Long` colour and OR-s in the opaque alpha mask.

Syntax: *object*.**SetSolidColor** *ValueRGB*

*ValueRGB*
: *required* A **Long** RGB colour.

### SetSolidColorRGBA
{: .no_toc }

Replaces the stop array with a single stop whose alpha is taken from the supplied value rather than forced opaque.

Syntax: *object*.**SetSolidColorRGBA** *ValueRGBA*

*ValueRGBA*
: *required* A [**ColorRGBA**](../Enumerations/ColorRGBA) (ABGR) value.

### SetColorPoints
{: .no_toc }

Replaces the stop array with the supplied [**FillColorPoint**](#fillcolorpoint-class) values, in order.

Syntax: *object*.**SetColorPoints** *ColorPoint1* [, *ColorPoint2*, … ]

*ColorPoint1*, *ColorPoint2*, …
: *required* One or more [**FillColorPoint**](#fillcolorpoint-class) objects, passed as **Variant**s through a `ParamArray`.

### SetColorPointsArray
{: .no_toc }

Replaces the stop array with the contents of an existing array of [**FillColorPoint**](#fillcolorpoint-class).

Syntax: *object*.**SetColorPointsArray** *ColorPoints* ( )

*ColorPoints*
: *required* An array of [**FillColorPoint**](#fillcolorpoint-class). Uninitialised or empty arrays leave the collection unchanged.

### OnChanged
{: .no_toc }

Raised when the array of stops is reassigned or when any single stop raises its own **OnChanged**, or when [**Granularity**](#granularity) is assigned. The parent [**Fill**](#) listens for this event and re-raises its own.

## FillColorPoint class

A single gradient stop — a colour together with the position (0–100 %) at which the colour applies along the gradient. Elements of the [**FillColorPoints.Values**](#values) array.

### Color
{: .no_toc }

The stop's colour as a 32-bit ABGR value. [**ColorRGBA**](../Enumerations/ColorRGBA).

### PositionPercent
{: .no_toc }

The stop's position along the gradient, as a percentage from 0 to 100. **Double**. A two-stop gradient typically has stops at 0 and 100; intermediate stops at 25 / 50 / 75 produce smooth multi-colour transitions.

### New
{: .no_toc }

Constructs a [**FillColorPoint**](#fillcolorpoint-class). The parameterless overload sets neither field; the two-argument overload sets both.

Syntax: **New FillColorPoint** [ ( *ColorRGBA*, *PositionPercent* ) ]

*ColorRGBA*
: *optional* A [**ColorRGBA**](../Enumerations/ColorRGBA) value to assign to [**Color**](#color).

*PositionPercent*
: *optional* A **Double** to assign to [**PositionPercent**](#positionpercent).

### OnChanged
{: .no_toc }

Raised when either [**Color**](#color) or [**PositionPercent**](#positionpercent) is assigned. The parent [**FillColorPoints**](#fillcolorpoints-class) listens for this event.
