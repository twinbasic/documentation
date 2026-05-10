---
title: MultiFrame
parent: VB Package
permalink: /tB/Packages/VB/MultiFrame/
has_toc: false
---

# MultiFrame class
{: .no_toc }

A **MultiFrame** is a layout container that arranges a set of [**Frame**](../Frame) controls in a single horizontal or vertical strip and resizes them whenever the **MultiFrame** itself is resized. Each contained frame keeps its own border, caption, and child controls; the **MultiFrame** decides only where each frame is placed and how wide (or tall) it is.

A frame is associated with a **MultiFrame** by setting the frame's [**Container**](../Frame#container) to point at the **MultiFrame**. The frame's [**MultiFramePosition**](../Frame#multiframeposition) chooses its place in the sequence and [**MultiFrameSize**](../Frame#multiframesize) gives its size as a percentage of the **MultiFrame**'s usable extent. Frames whose **MultiFrameSize** is `0` share whatever extent remains after the fixed-size frames have been laid out.

The default event is [**Initialize**](#initialize). There is no default property.

```tb
Private Sub Form_Load()
    mfPanels.Direction = vbDirectionHorizontal

    Set fraLeft.Container = mfPanels
    fraLeft.MultiFramePosition = 0
    fraLeft.MultiFrameSize = 30                  ' fixed 30% of the strip

    Set fraCenter.Container = mfPanels
    fraCenter.MultiFramePosition = 1
    fraCenter.MultiFrameSize = 0                 ' shares the remaining space

    Set fraRight.Container = mfPanels
    fraRight.MultiFramePosition = 2
    fraRight.MultiFrameSize = 0                  ' shares the remaining space
End Sub
```

* TOC
{:toc}

## Direction and sizing

[**Direction**](#direction) chooses between **vbDirectionHorizontal** (the default — frames laid out left-to-right) and **vbDirectionVertical** (frames stacked top-to-bottom). Changing **Direction** at run time triggers an immediate re-layout.

For each contained frame, [**MultiFrameSize**](../Frame#multiframesize) gives its extent as a percentage of the **MultiFrame**'s width (horizontal) or height (vertical). Frames whose **MultiFrameSize** is `0` share the leftover extent equally — so a typical pattern is to give the edge panels fixed percentages and leave one centre panel at `0` so it absorbs window resizes. Percentages are not clamped; if the fixed-size frames already exceed the **MultiFrame**'s extent the auto-sized frames collapse to zero.

## Position and shuffling

Each contained frame is anchored to a sequential position via its [**MultiFramePosition**](../Frame#multiframeposition) property (zero-based). Positions are kept contiguous: assigning a frame a new **MultiFramePosition** at run time makes the **MultiFrame** shuffle the remaining frames up or down so that the old slot closes and the new slot opens at the requested index. Duplicate or out-of-range positions are normalised at the next layout pass — the **MultiFrame** falls back to the original control order on the parent form, renumbering the frames sequentially from `0`.

A frame whose [**Container**](../Frame#container) is the **MultiFrame** but whose **MultiFramePosition** is `-1` is appended at the next free slot the first time the layout is built.

## Adopting frames at run time

The mapping from frame to **MultiFrame** is discovered from the parent form's control collection on each layout pass: a frame appears in the strip exactly when its [**Container**](../Frame#container) property points at the **MultiFrame**. The discovered set is then cached. To force the cache to be rebuilt — for example after re-parenting a frame at run time — assign any value to [**FramesCount**](#framescount):

```tb
Set fraExtra.Container = mfPanels
mfPanels.FramesCount = 0       ' assigned value is ignored; the layout cache is rebuilt
```

The **MultiFrame** repositions the frame's existing window in place; it does not change the frame's Win32 parent, so the frame remains a child of the form and continues to raise its events normally.

## Properties

### Anchors
{: .no_toc }

The set of edges of the parent that the **MultiFrame**'s corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### BackColor
{: .no_toc }

The background colour of the **MultiFrame**'s drawing surface, as an **OLE_COLOR**. Defaults to the system window-background colour. Visible only where the contained frames do not fully cover the extent — e.g. when their **MultiFrameSize**s sum to less than 100%.

### Container
{: .no_toc }

The control that hosts this **MultiFrame** — typically the form. Read with **Get**, change with **Set**. Setting **Container** re-parents the **MultiFrame** to a different container at run time.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control. Always **vbShape**.

### Direction
{: .no_toc }

The orientation in which contained frames are laid out. A member of **MultiFrameDirectionConstants**: **vbDirectionHorizontal** (0, default — frames laid out left-to-right) or **vbDirectionVertical** (1 — frames stacked top-to-bottom). Changing **Direction** triggers an immediate re-layout of the contained frames.

### Dock
{: .no_toc }

Where the **MultiFrame** is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked **MultiFrame**s ignore [**Anchors**](#anchors).

### FramesCount
{: .no_toc }

The number of [**Frame**](../Frame) controls currently in the **MultiFrame**'s layout. **Long**.

Syntax: *object*.**FramesCount** [ = *value* ]

Reading **FramesCount** returns the size of the current layout cache. Assigning *any* value discards the cache so it is rebuilt on the next layout pass — the assigned number itself is ignored. Use the assignment as a manual refresh after re-parenting a frame at run time.

### Height
{: .no_toc }

The **MultiFrame**'s height, in twips by default (or in the container's **ScaleMode** units). **Double**.

### hWnd
{: .no_toc }

The Win32 window handle for the **MultiFrame**'s drawing surface, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the **MultiFrame** is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the **MultiFrame**. **Double**.

### Name
{: .no_toc }

The unique design-time name of the **MultiFrame** on its parent form. Read-only at run time.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form) that ultimately contains the **MultiFrame**. Read-only. Distinct from [**Container**](#container), which returns the immediate parent.

### TabIndex
{: .no_toc }

The position of the **MultiFrame** in the form's TAB-key navigation order. **Long**.

> [!NOTE]
> A **MultiFrame** never takes the focus itself — **TabIndex** is preserved for compatibility but has no observable effect on the user.

### TabStop
{: .no_toc }

Whether the **MultiFrame** participates in TAB-key navigation. **Boolean**, default **True**.

> [!NOTE]
> A **MultiFrame** never takes the focus itself — **TabStop** is preserved for compatibility but has no observable effect on the user.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the **MultiFrame**. Ignored by the framework.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the **MultiFrame**. **Double**.

### Visible
{: .no_toc }

Whether the **MultiFrame** is shown. **Boolean**, default **True**. The contained frames' own visibility is independent of this setting; hiding the **MultiFrame** hides its drawing surface but does not directly hide the frames.

### Width
{: .no_toc }

The **MultiFrame**'s width. **Double**.

## Methods

### Move
{: .no_toc }

Repositions and optionally resizes the **MultiFrame** in a single call. Contained frames are re-laid out to match the new extent.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### Refresh
{: .no_toc }

Forces an immediate repaint of the **MultiFrame**'s drawing surface.

Syntax: *object*.**Refresh**

### ZOrder
{: .no_toc }

Brings the **MultiFrame** to the front or back of its sibling stack within the container.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Initialize
{: .no_toc }

Raised once, after the **MultiFrame**'s underlying window has been created but before the first layout pass has run. Useful for adjusting [**Direction**](#direction) or contained-frame sizes from code at start-up so that the very first layout reflects them. **Default event.**

Syntax: *object*\_**Initialize**( )
