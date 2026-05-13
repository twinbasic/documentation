---
title: Borders
parent: Styles
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/Borders
has_toc: false
---

# Borders class
{: .no_toc }

The collection of border strokes drawn around a region. Each stroke is an independent [**Border**](#border-class) sub-object with its own thickness, fill, and blending behaviour, layered in source order. A single thin black outline is a one-element collection — easiest constructed by calling [**SetSimpleBorder**](#setsimpleborder).

Reached as `<state>.Borders`, [**CellRenderingOptions.Borders**](../WaynesGrid/CellRenderingOptions#borders), and the slider's `<sliderState>.BackgroundBorders` / `BlockBorders`. The array of [**Border**](#border-class) sub-objects on a [**TextRendering**](TextRendering)'s **Outlines** member uses the same element type.

```tb
btnGo.NormalState.Borders.SetSimpleBorder StrokeSize:=1, ColorRGB:=vbBlack
```

* TOC
{:toc}

## Properties

### Elements
{: .no_toc }

The array of [**Border**](#border-class) sub-objects, drawn in order from index 0 outward. Read-write but in practice populated through [**SetSimpleBorder**](#setsimpleborder) or [**SetSimpleBorderRGBA**](#setsimpleborderrgba).

## Methods

### SetSimpleBorder
{: .no_toc }

Replaces the [**Elements**](#elements) array with a single border stroke of the given thickness and fully-opaque colour.

Syntax: *object*.**SetSimpleBorder** *StrokeSize*, *ColorRGB*

*StrokeSize*
: *required* A **Long** giving the stroke thickness in pixels.

*ColorRGB*
: *required* A **Long** RGB colour for the stroke fill.

### SetSimpleBorderRGBA
{: .no_toc }

Replaces the [**Elements**](#elements) array with a single border stroke whose alpha is taken from the supplied [**ColorRGBA**](../Enumerations/ColorRGBA) rather than forced opaque. Useful for transparent borders that are present only as visual padding (the slider uses a fully transparent border on the **BlockBorders** to indent the block inside the background).

Syntax: *object*.**SetSimpleBorderRGBA** *StrokeSize*, *ColorRGBA*

*StrokeSize*
: *required* A **Long** giving the stroke thickness in pixels.

*ColorRGBA*
: *required* A [**ColorRGBA**](../Enumerations/ColorRGBA) value for the stroke fill.

## Events

### OnChanged
{: .no_toc }

Raised when the [**Elements**](#elements) array is reassigned, or when any single [**Border**](#border-class) element raises its own **OnChanged**.

## Border class

A single border stroke. Elements of [**Borders.Elements**](#elements), and also of [**TextRendering.Outlines**](TextRendering#outlines).

### BlendWithBackgroundFill
{: .no_toc }

When **True**, the border's colour alpha-blends with the control's **BackgroundFill** rather than with whatever is painted underneath the control. Lets a translucent border colour pick up the background tint instead of the form's. **Boolean**. Default: **False**.

### Fill
{: .no_toc }

The [**Fill**](Fill) that supplies the colour or gradient used to stroke the border. Newly-constructed [**Border**](#border-class) objects pre-set this to a solid black fill.

### StrokeSize
{: .no_toc }

The stroke thickness in pixels. [**PixelCount**](../Enumerations/PixelCount). Default: 1.

### New
{: .no_toc }

Constructs a [**Border**](#border-class) with a default solid-black [**Fill**](#fill).

Syntax: **New Border**

### OnChanged
{: .no_toc }

Raised when [**StrokeSize**](#strokesize), [**Fill**](#fill), or [**BlendWithBackgroundFill**](#blendwithbackgroundfill) is assigned, or when the contained [**Fill**](#fill) raises its own **OnChanged**.
