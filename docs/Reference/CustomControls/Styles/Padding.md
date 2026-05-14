---
title: Padding
parent: Styles
grand_parent: CustomControls Package
permalink: /tB/Packages/CustomControls/Styles/Padding
has_toc: false
---

# Padding class
{: .no_toc }

Per-side padding, in pixels, applied around the text inside a [**TextRendering**](TextRendering). Reached as [**TextRendering.Padding**](TextRendering#padding). The padded region is what the text [**Alignment**](TextRendering#alignment) is applied to — adding 5 pixels of left padding moves left-aligned text 5 pixels to the right, and shrinks the available area by 5 pixels at the left edge.

```tb
With txtNotes.NormalState.TextRendering.Padding
    .Left = 5
    .Right = 5
End With
```

## Properties

### Bottom
{: .no_toc }

Padding inserted at the bottom edge, in pixels. [**PixelCount**](../Enumerations/PixelCount). Default: 0.

### Left
{: .no_toc }

Padding inserted at the left edge, in pixels. [**PixelCount**](../Enumerations/PixelCount). Default: 0.

### Right
{: .no_toc }

Padding inserted at the right edge, in pixels. [**PixelCount**](../Enumerations/PixelCount). Default: 0.

### Top
{: .no_toc }

Padding inserted at the top edge, in pixels. [**PixelCount**](../Enumerations/PixelCount). Default: 0.

## Events

### OnChanged
{: .no_toc }

Raised whenever any of the four padding values is assigned. The containing [**TextRendering**](TextRendering) re-raises its own **OnChanged** in response, which in turn triggers a repaint on the hosting control.
