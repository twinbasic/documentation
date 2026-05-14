---
title: HScrollBar
parent: VB Package
permalink: /tB/Packages/VB/HScrollBar/
has_toc: false
---

# HScrollBar class
{: .no_toc }

An **HScrollBar** is a Win32 native horizontal scroll bar exposed as a stand-alone control. Unlike the scroll bars that automatically appear inside a [**ListBox**](../ListBox), [**ComboBox**](../ComboBox), or [**TextBox**](../TextBox), an **HScrollBar** is independent of any other control — its [**Value**](#value) is whatever code reads or writes. The typical use is to control a numeric setting (a volume level, a paginator, a colour channel, the offset of a custom-drawn surface) by binding the **HScrollBar**'s [**Change**](#change) and [**Scroll**](#scroll) events to whatever the value represents.

[**VScrollBar**](../VScrollBar) is the vertical counterpart; the two classes are identical apart from orientation.

The default property is [**Value**](#value) and the default event is [**Change**](#change).

```tb
Private Sub Form_Load()
    hsbVolume.Min = 0
    hsbVolume.Max = 100
    hsbVolume.SmallChange = 1
    hsbVolume.LargeChange = 10
    hsbVolume.Value = 50
End Sub

Private Sub hsbVolume_Change()
    lblVolume.Caption = "Volume: " & hsbVolume.Value & "%"
End Sub

Private Sub hsbVolume_Scroll()
    lblVolume.Caption = "Volume: " & hsbVolume.Value & "%"   ' live update during drag
End Sub
```

* TOC
{:toc}

## Range and value

[**Min**](#min) and [**Max**](#max) define the closed range of integer values the scroll bar can represent, and [**Value**](#value) is the position within that range. Defaults are `0`, `32767`, and `0`. Assigning a [**Value**](#value) outside the current `[Min, Max]` interval raises run-time error 380 (*Invalid property value*); assigning the current value is a no-op (no [**Change**](#change) is raised).

The two endpoints may be supplied in either order. When **Min** is greater than **Max** the scroll bar runs *inverted* — moving the thumb to the right decreases [**Value**](#value), and **Max** is the lower bound of the legal range. This is convenient for, for example, a "high-on-the-left" colour or zoom slider:

```tb
hsbZoom.Min = 400      ' leftmost == 4.00x
hsbZoom.Max = 100      ' rightmost == 1.00x
hsbZoom.Value = 100
```

Changing **Min** or **Max** at run time clips the current [**Value**](#value) into the new range silently — no [**Change**](#change) event is raised for the implicit clip.

## Increment sizes

The scroll bar produces value changes through four kinds of user input:

| Input                               | Increment per step           | Event raised     |
|-------------------------------------|------------------------------|------------------|
| Click an end-arrow                  | [**SmallChange**](#smallchange) | [**Change**](#change) |
| Click the track on either side of the thumb | [**LargeChange**](#largechange) | [**Change**](#change) |
| Drag the thumb                      | continuous                   | [**Scroll**](#scroll) during drag, [**Change**](#change) on release |
| Press **Home** / **End**            | jumps to **Min** / **Max**   | [**Change**](#change) |

Both [**SmallChange**](#smallchange) and [**LargeChange**](#largechange) default to `1`. [**LargeChange**](#largechange) also controls the visible width of the thumb relative to the track, so larger values produce a chunkier thumb.

## Change versus Scroll

The split between the two events lets the application choose how often it reacts to user input. [**Scroll**](#scroll) fires repeatedly while the user is dragging the thumb, so a handler can update a live preview as the thumb moves. [**Change**](#change) fires once each time the value settles — after the user releases the thumb, after a click on an arrow or the track, or whenever code assigns a different [**Value**](#value). Many applications wire both events to the same handler so that the bound display updates both during dragging and after.

## Properties

### Anchors
{: .no_toc }

The set of edges of the parent that the scroll bar's corresponding edges follow when the parent resizes. Read-only — assign individual `.Left`, `.Top`, `.Right`, `.Bottom` flags through the returned **Anchors** object.

### CausesValidation
{: .no_toc }

Determines whether the previously focused control's [**Validate**](#validate) event runs before this control receives the focus. **Boolean**, default **True**.

### Container
{: .no_toc }

The control that hosts this scroll bar — typically the form, a [**Frame**](../Frame/), or a **UserControl**. Read with **Get**, change with **Set**.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a horizontal scroll bar. Always **vbHScrollBar**.

### Dock
{: .no_toc }

Where the scroll bar is docked within its container. A member of [**DockModeConstants**](../../VBRUN/Constants/DockModeConstants): **vbDockNone** (default), **vbDockLeft**, **vbDockTop**, **vbDockRight**, **vbDockBottom**, or **vbDockFill**. Docked scroll bars ignore [**Anchors**](#anchors).

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default — call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the scroll bar accepts user input. A disabled scroll bar is greyed out and does not respond to mouse or keyboard interaction. **Boolean**, default **True**.

### Height
{: .no_toc }

The scroll bar's height in twips (or in the container's **ScaleMode** units). **Double**. For a horizontal scroll bar this is the small dimension — typically the OS standard scroll-bar thickness; values larger than that simply enlarge the surrounding hit area.

### HelpContextID
{: .no_toc }

A **Long** identifying a topic in the application's help file, retrieved when the user presses **F1** while the control has focus.

### hWnd
{: .no_toc }

The Win32 window handle for the underlying scroll bar, as a **LongPtr**. Read-only. Useful for passing to API functions.

### Index
{: .no_toc }

When the scroll bar is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a non-array instance raises run-time error 343 (*Object not an array*). Read-only at run time.

### LargeChange
{: .no_toc }

The amount [**Value**](#value) is adjusted when the user clicks the track on either side of the thumb (or presses **Page Up** / **Page Down** while the scroll bar has focus). **Long**, default `1`. Also influences the visible width of the thumb: bigger values produce a wider thumb relative to the track.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the scroll bar. **Double**.

### Max
{: .no_toc }

The upper end of the scroll bar's value range. **Long**, default `32767`. May be set lower than [**Min**](#min) to invert the direction of travel — see [Range and value](#range-and-value).

Syntax: *object*.**Max** [ = *value* ]

Changing **Max** clips the current [**Value**](#value) into the new range silently if it now falls outside.

### Min
{: .no_toc }

The lower end of the scroll bar's value range. **Long**, default `0`. May be set higher than [**Max**](#max) to invert the direction of travel.

Syntax: *object*.**Min** [ = *value* ]

Changing **Min** clips the current [**Value**](#value) into the new range silently if it now falls outside.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### Opacity
{: .no_toc }

The control's opacity as a percentage (0–100, default 100). Values outside the range are clamped on **Initialize**. Requires Windows 8 or later for child controls.

### Parent
{: .no_toc }

A reference to the [**Form**](../Form/) (or **UserControl**) that ultimately contains this scroll bar. Read-only.

### RightToLeft
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. To run the scroll bar in reverse, swap [**Min**](#min) and [**Max**](#max).

### SmallChange
{: .no_toc }

The amount [**Value**](#value) is adjusted when the user clicks one of the end-arrows (or presses an arrow key while the scroll bar has focus). **Long**, default `1`.

### TabIndex
{: .no_toc }

The position of the control in the form's TAB-key navigation order. **Long**.

### TabStop
{: .no_toc }

Whether the user can reach the control by pressing the **TAB** key. **Boolean**, default **True**. A disabled control is skipped regardless of this setting.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the scroll bar. **Double**.

### TransparencyKey
{: .no_toc }

An **OLE_COLOR** that, when set, becomes fully transparent in the rendered control. Default `-1` disables the effect. Requires Windows 8 or later for child controls.

### Value
{: .no_toc }

The scroll bar's current position within `[Min, Max]`. **Long**, default `0`. **Default property.**

Syntax: *object*.**Value** [ = *value* ]

*value*
: A **Long** in the closed interval `[Min, Max]` (or `[Max, Min]` for an inverted scroll bar). Values outside that interval raise run-time error 380 (*Invalid property value*).

Assigning a value that differs from the current one moves the thumb and raises a single [**Change**](#change) event. Assigning the current value is a silent no-op.

### Visible
{: .no_toc }

Whether the scroll bar is shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

Whether the OS theme engine should be used when drawing the scroll bar. **Boolean**, default **True**.

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The scroll bar's width — i.e., the length of the track. **Double**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation. Typically called from code when [**DragMode**](#dragmode) is **vbManual**.

Syntax: *object*.**Drag** [ *Action* ]

*Action*
: *optional* A member of [**DragConstants**](../../VBRUN/Constants/DragConstants): **vbCancel** (0), **vbBeginDrag** (1, default), or **vbEndDrag** (2).

### Move
{: .no_toc }

Repositions and optionally resizes the scroll bar in a single call.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### Refresh
{: .no_toc }

Forces an immediate repaint of the scroll bar.

Syntax: *object*.**Refresh**

### SetFocus
{: .no_toc }

Moves the input focus to the scroll bar. The control must be both [**Visible**](#visible) and [**Enabled**](#enabled), or run-time error 5 (*Invalid procedure call or argument*) is raised.

Syntax: *object*.**SetFocus**

### ShowWhatsThis
{: .no_toc }

Displays the topic identified by [**WhatsThisHelpID**](#whatsthishelpid) as a "What's This?" pop-up.

Syntax: *object*.**ShowWhatsThis**

### SyncScrollBar
{: .no_toc }

Re-applies the current [**Min**](#min), [**Max**](#max), [**LargeChange**](#largechange), and [**Value**](#value) to the underlying Win32 scroll bar. Property assignments already do this implicitly — call **SyncScrollBar** only when external code (typically a Win32 API call) has reached around the control and changed its native state.

Syntax: *object*.**SyncScrollBar**

### ZOrder
{: .no_toc }

Brings the control to the front or back of its sibling stack.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Change
{: .no_toc }

Raised after [**Value**](#value) settles on a new value — when the user releases the thumb after a drag, when the user clicks an arrow or the track, when the user presses **Home**, **End**, or an arrow key with focus on the scroll bar, or when code assigns a different [**Value**](#value). Not raised for the continuous updates that happen during a drag — see [**Scroll**](#scroll) for that. **Default event.**

Syntax: *object*\_**Change**( )

### DragDrop
{: .no_toc }

Raised on the destination control when a manual drag operation ends over it.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the control under the cursor while a manual drag operation is in progress.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### GotFocus
{: .no_toc }

Raised when the scroll bar receives the input focus.

Syntax: *object*\_**GotFocus**( )

### Initialize
{: .no_toc }

Raised once, after the underlying window has been created and the scroll bar is connected to its Win32 range, but before the scroll bar is first painted. Useful for last-minute setup that needs the underlying handle.

Syntax: *object*\_**Initialize**( )

### KeyDown
{: .no_toc }

Raised when the user presses any key while the control has focus. Note that the scroll bar already handles the arrow keys, **Page Up** / **Page Down**, and **Home** / **End** internally — but **KeyDown** still fires for them in addition to the resulting [**Change**](#change).

Syntax: *object*\_**KeyDown**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### KeyPress
{: .no_toc }

Raised when the user types a character that produces an ANSI keystroke.

Syntax: *object*\_**KeyPress**( *KeyAscii* **As Integer** )

### KeyUp
{: .no_toc }

Raised when the user releases a key while the control has focus.

Syntax: *object*\_**KeyUp**( *KeyCode* **As Integer**, *Shift* **As Integer** )

### LostFocus
{: .no_toc }

Raised when the scroll bar loses the input focus.

Syntax: *object*\_**LostFocus**( )

### Scroll
{: .no_toc }

Raised continuously while the user is dragging the thumb, once for each tick that produces a different [**Value**](#value). After the user releases the thumb, a single [**Change**](#change) event fires with the final value. Use **Scroll** for a live preview while the thumb is moving; use [**Change**](#change) to react only to the final value.

Syntax: *object*\_**Scroll**( )

### Validate
{: .no_toc }

Raised when the focus is moving to another control whose [**CausesValidation**](#causesvalidation) is **True**. Setting *Cancel* to **True** keeps the focus on this control.

Syntax: *object*\_**Validate**( *Cancel* **As Boolean** )
