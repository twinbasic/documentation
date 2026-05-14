---
title: TextRendering
parent: Styles
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/TextRendering
has_toc: false
---

# TextRendering class
{: .no_toc }

Aggregates everything needed to draw a piece of text inside a control: the font, the padding, the fill that supplies the text colour, an optional array of outlines, the alignment within the available area, and the overflow behaviour. Reached as `<state>.TextRendering`, [**WaynesLabel.TextRendering**](../WaynesLabel#textrendering), and [**CellRenderingOptions.TextRendering**](../WaynesGrid/CellRenderingOptions#textrendering).

A newly-constructed **TextRendering** pre-sets its [**Fill**](#fill) to solid black so that text is immediately visible.

```tb
With lblTitle.TextRendering
    .Font.Size = 18
    .Font.Weight = tbBold
    .Alignment = tbAlignMiddleCenter
    .Fill.ColorPoints.SetSolidColor vbWhite
End With
```

[**Fill**](#fill) can hold a gradient just as well as a solid colour, so glyphs themselves can be painted with a top-to-bottom or corner-to-corner colour transition. [**Outlines**](#outlines) is an array of [**Border**](Borders#border-class) elements stroked around the glyphs — a single thin black outline gives a "stickered" look; layering several outlines with different [**StrokeSize**](Borders#strokesize) values produces a glow or drop-shadow:

```tb
With lblBanner.TextRendering
    .Font.Size = 32
    .Font.Weight = tbBold
    .Alignment = tbAlignMiddleCenter
    .Fill.SetSimplePattern vbWhite, &HCCCCFF, _
            Pattern:=tbGradientNorthToSouth
    Dim outline(0 To 0) As Border
    Set outline(0) = New Border
    outline(0).StrokeSize = 2
    outline(0).Fill.ColorPoints.SetSolidColor vbBlack
    .Outlines = outline
End With
```

Set [**OverflowMode**](#overflowmode) to **tbShrinkToFit** to scale the glyphs down rather than truncating with an ellipsis when the text is too long for the available width — useful on fixed-width labels whose caption is set at runtime from data of unpredictable length.

* TOC
{:toc}

## Properties

### Alignment
{: .no_toc }

How the text is positioned horizontally and vertically within the available area (after [**Padding**](#padding) is applied). A member of [**TextAlignment**](../Enumerations/TextAlignment). Default: **tbAlignMiddleCenter**.

### Fill
{: .no_toc }

The [**Fill**](Fill) that supplies the text colour or gradient. Pre-set to a solid black fill on construction.

### Font
{: .no_toc }

The [**FontStyle**](#fontstyle-class) sub-object that gives the font size, weight, italic / underline / strikeout flags.

### OverflowMode
{: .no_toc }

How text longer than the available width is truncated. A member of [**TextOverflowMode**](../Enumerations/TextOverflowMode). Default: **tbAppendEllipsis**.

### Outlines
{: .no_toc }

An array of [**Border**](Borders#border-class) elements describing one or more outlines that are stroked around the rendered glyphs. Read-write; an uninitialised array means no outline.

### Padding
{: .no_toc }

The [**Padding**](Padding) sub-object holding per-side padding inserted around the text inside its bounding rectangle. The [**Alignment**](#alignment) is applied to the padded region.

## Events

### OnChanged
{: .no_toc }

Raised when [**Alignment**](#alignment) or [**OverflowMode**](#overflowmode) is assigned, when [**Outlines**](#outlines) is replaced or any of its elements raises **OnChanged**, or when [**Font**](#font), [**Padding**](#padding), or [**Fill**](#fill) raise their own **OnChanged**.

## FontStyle class

The font metrics that control how [**TextRendering**](#) lays out text. Reached as [**TextRendering.Font**](#font).

### Italic
{: .no_toc }

When **True**, glyphs are rendered with italic styling. **Boolean**. Default: **False**.

### Size
{: .no_toc }

The font size in typographic points. [**PointSize**](../Enumerations/PointSize). Default: 12.

### Strikeout
{: .no_toc }

When **True**, a horizontal line is drawn through the middle of each glyph. **Boolean**. Default: **False**.

### Underline
{: .no_toc }

When **True**, an underline is drawn beneath each glyph. **Boolean**. Default: **False**.

### Weight
{: .no_toc }

The font weight on the OpenType `wght` scale. A member of [**FontWeight**](../Enumerations/FontWeight). Default: **tbNormal**.

### OnChanged
{: .no_toc }

Raised when any of the five font-style fields is assigned. The parent [**TextRendering**](#) listens for this event and re-raises its own.
