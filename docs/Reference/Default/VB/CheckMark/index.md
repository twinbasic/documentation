---
title: CheckMark
parent: VB Package
permalink: /tB/Packages/VB/CheckMark/
has_toc: false
---

# CheckMark class
{: .no_toc }

A **CheckMark** is a windowless control that draws a single check glyph --- checked, unchecked, or grey --- that scales to fill its rectangle. Unlike [**CheckBox**](../CheckBox), it has no caption, no font, and cannot take focus or receive keyboard input; it is essentially the box from a check-box rendered at whatever size the layout requires. This makes it especially useful inside reports and other dense layouts where the fixed-size system check would look out of place, but it is also available on a **Form** or **UserControl**.

The default property is [**Value**](#value) and the default event is [**Click**](#click).

```tb
Private Sub Form_Load()
    Check1.Value = vbUnchecked
End Sub

Private Sub Check1_Click()
    Debug.Print "Check is now: " & Check1.Value
End Sub
```

* TOC
{:toc}

## Three-state behaviour

[**Value**](#value) is typed as [**CheckBoxConstants**](../../VBRUN/Constants/CheckBoxConstants):

| Constant         | Value | Meaning                                                |
|------------------|-------|--------------------------------------------------------|
| **vbUnchecked**  | 0     | The check is cleared.                                  |
| **vbChecked**    | 1     | The check is selected.                                 |
| **vbGrayed**     | 2     | The check is in an indeterminate (grey) state.         |

A user click toggles **Value** between **vbChecked** and **vbUnchecked** only. The grey state is reachable from code --- assign **vbGrayed** to **Value** to display it.

```tb
Check1.Value = vbGrayed     ' show the indeterminate state
```

## Drawing modes

[**VisualStyles**](#visualstyles) selects how the glyph is rendered:

- **VisualStyles = False** (default) --- drawn with the GDI **DrawFrameControl** primitive. Honours [**Appearance**](#appearance): **vbAppear3d** uses the classic raised/sunken look, **vbAppearFlat** uses a single-pixel outline. A disabled check, or one in the **vbGrayed** state, is drawn over the dotted three-state pattern.
- **VisualStyles = True** --- drawn through the OS theme engine (UXTHEME), so the glyph uses the current visual-style theme. **Appearance** is ignored in this mode.

## Background

[**BackStyle**](#backstyle) controls whether the rectangle behind the glyph is filled before the glyph is drawn:

- **vbBFTransparent** (default) --- only the glyph is painted; whatever the container draws shows through.
- **vbBFOpaque** --- the rectangle is filled with [**BackColor**](#backcolor) first.

## Properties

### Anchors
{: .no_toc }

The **Anchors** object that determines which sides of the control follow the corresponding sides of its container as the container is resized. Read-only --- set the individual sides through the returned object.

### Appearance
{: .no_toc }

How the glyph is shaded when [**VisualStyles**](#visualstyles) is **False**. A member of [**AppearanceConstants**](../../VBRUN/Constants/AppearanceConstants): **vbAppear3d** (default) or **vbAppearFlat**. Ignored when [**VisualStyles**](#visualstyles) is **True**.

### BackColor
{: .no_toc }

The background colour, as an **OLE_COLOR**. Defaults to the system 3-D face colour. Used only when [**BackStyle**](#backstyle) is **vbBFOpaque**.

### BackStyle
{: .no_toc }

Whether the control fills its rectangle before drawing the glyph. A member of **BackFillStyleConstants**: **vbBFTransparent** (default) or **vbBFOpaque**.

### Container
{: .no_toc }

The immediate container (a **Form**, **Frame**, **PictureBox**, or other container control) that hosts this **CheckMark**. Assigning a new value with **Set** moves the control to a different container.

### ControlType
{: .no_toc }

A read-only [**ControlTypeConstants**](../../VBRUN/Constants/ControlTypeConstants) value identifying this control as a check mark. Always **vbCheckMark**.

### Dock
{: .no_toc }

Whether the control fills one edge of, or the entire interior of, its container. A member of **DockModeConstants**, default **vbDockNone**.

### DragIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor while the control is being drag-and-dropped (see [**Drag**](#drag) and [**DragMode**](#dragmode)).

### DragMode
{: .no_toc }

Whether the control should drag itself when the user holds the mouse over it. A member of [**DragModeConstants**](../../VBRUN/Constants/DragModeConstants): **vbManual** (0, default --- call [**Drag**](#drag) from code) or **vbAutomatic** (1).

### Enabled
{: .no_toc }

Determines whether the control reacts to mouse input. A disabled **CheckMark** still shows its current value but is drawn dimmed and ignores clicks. **Boolean**, default **True**.

### Height
{: .no_toc }

The control's height, in twips by default (or in the container's **ScaleMode** units). **Single**.

### Index
{: .no_toc }

When the control is part of a control array, the **Long** zero-based index of this instance within the array. Reading **Index** on a control that is not part of an array raises run-time error 343 (*Object not an array*). Read-only at run time.

### Left
{: .no_toc }

The horizontal distance from the left edge of the container to the left edge of the control. **Single**.

### MouseIcon
{: .no_toc }

A **StdPicture** used as the mouse cursor when [**MousePointer**](#mousepointer) is **vbCustom** and the pointer is over the control.

### MousePointer
{: .no_toc }

The mouse cursor shown when the pointer is over the control. A member of [**MousePointerConstants**](../../VBRUN/Constants/MousePointerConstants).

### Name
{: .no_toc }

The unique design-time name of the control on its parent form. Read-only at run time.

### Parent
{: .no_toc }

A reference to the **Form** (or **UserControl**) that contains this control. Read-only.

### TabIndex
{: .no_toc }

> [!NOTE]
> Reserved for compatibility with VB6; not currently implemented in twinBASIC. The control is not focusable, so the property has no effect at run time.

### Tag
{: .no_toc }

A free-form **String** the application can use to associate custom data with the control. Ignored by the framework.

### ToolTipText
{: .no_toc }

A multi-line **String** displayed as a tooltip when the user hovers over the control.

### Top
{: .no_toc }

The vertical distance from the top of the container to the top of the control. **Single**.

### Value
{: .no_toc }

The current state of the check. **Default property.**

Syntax: *object*.**Value** [ = *value* ]

*value*
: A member of [**CheckBoxConstants**](../../VBRUN/Constants/CheckBoxConstants): **vbUnchecked** (0), **vbChecked** (1), or **vbGrayed** (2).

A user click toggles **Value** between **vbChecked** and **vbUnchecked** only; **vbGrayed** is settable from code.

### Visible
{: .no_toc }

Whether the control is shown. **Boolean**, default **True**.

### VisualStyles
{: .no_toc }

When **True**, the glyph is drawn through the OS theme engine; when **False** (default), it is drawn with **DrawFrameControl** and obeys [**Appearance**](#appearance). **Boolean**.

### WhatsThisHelpID
{: .no_toc }

A **Long** identifying a "What's This?" help-pop-up topic in the application's help file. See [**ShowWhatsThis**](#showwhatsthis).

### Width
{: .no_toc }

The control's width. **Single**.

## Methods

### Drag
{: .no_toc }

Begins, completes, or cancels a manual drag-and-drop operation. Typically called from a [**MouseDown**](#mousedown) handler when [**DragMode**](#dragmode) is **vbManual**.

Syntax: *object*.**Drag** [ *Action* ]

*Action*
: *optional* A member of [**DragConstants**](../../VBRUN/Constants/DragConstants): **vbCancel** (0), **vbBeginDrag** (1, default), or **vbEndDrag** (2).

### Move
{: .no_toc }

Repositions and optionally resizes the control in a single call.

Syntax: *object*.**Move** *Left* [, *Top* [, *Width* [, *Height* ] ] ]

*Left*
: *required* A **Single** giving the new horizontal position.

*Top*, *Width*, *Height*
: *optional* New values for the corresponding properties. Omitted values are left unchanged.

### OLEDrag
{: .no_toc }

Initiates an OLE drag operation from the control, raising the [**OLEStartDrag**](#olestartdrag) event so the application can populate the **DataObject**.

Syntax: *object*.**OLEDrag**

### Refresh
{: .no_toc }

Forces an immediate repaint of the control.

Syntax: *object*.**Refresh**

### ShowWhatsThis
{: .no_toc }

Displays the topic identified by [**WhatsThisHelpID**](#whatsthishelpid) as a "What's This?" pop-up.

Syntax: *object*.**ShowWhatsThis**

### ZOrder
{: .no_toc }

Brings the control to the front or back of its sibling stack.

Syntax: *object*.**ZOrder** [ *Position* ]

*Position*
: *optional* A member of [**ZOrderConstants**](../../VBRUN/Constants/ZOrderConstants): **vbBringToFront** (0, default) or **vbSendToBack** (1).

## Events

### Click
{: .no_toc }

Raised when the user clicks the control with the left mouse button --- after [**Value**](#value) has toggled between **vbChecked** and **vbUnchecked**. **Default event.**

Syntax: *object*\_**Click**( )

### DblClick
{: .no_toc }

Raised when the user double-clicks the control.

Syntax: *object*\_**DblClick**( )

### DragDrop
{: .no_toc }

Raised on the destination control when a manual drag operation ends over it.

Syntax: *object*\_**DragDrop**( *Source* **As Control**, *X* **As Single**, *Y* **As Single** )

### DragOver
{: .no_toc }

Raised on the control under the cursor while a manual drag operation is in progress.

Syntax: *object*\_**DragOver**( *Source* **As Control**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### MouseDown
{: .no_toc }

Raised when the user presses any mouse button over the control.

Syntax: *object*\_**MouseDown**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseMove
{: .no_toc }

Raised when the cursor moves over the control.

Syntax: *object*\_**MouseMove**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### MouseUp
{: .no_toc }

Raised when the user releases a mouse button over the control.

Syntax: *object*\_**MouseUp**( *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### OLECompleteDrag
{: .no_toc }

Raised on the source control when the OLE drag operation finishes, indicating which effect (copy, move, none) the destination accepted.

Syntax: *object*\_**OLECompleteDrag**( *Effect* **As Long** )

### OLEDragDrop
{: .no_toc }

Raised on the destination control when the user drops data on it.

Syntax: *object*\_**OLEDragDrop**( *Data* **As DataObject**, *Effect* **As Long**, *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single** )

### OLEDragOver
{: .no_toc }

Raised on the destination control while an OLE drag passes over it.

Syntax: *object*\_**OLEDragOver**( *Data* **As DataObject**, *Effect* **As Long**, *Button* **As Integer**, *Shift* **As Integer**, *X* **As Single**, *Y* **As Single**, *State* **As Integer** )

### OLEGiveFeedback
{: .no_toc }

Raised on the source control during a drag so the application can adjust the cursor or other visual feedback.

Syntax: *object*\_**OLEGiveFeedback**( *Effect* **As Long**, *DefaultCursors* **As Boolean** )

### OLESetData
{: .no_toc }

Raised on the source control when the destination requests data in a format that was registered but not yet supplied.

Syntax: *object*\_**OLESetData**( *Data* **As DataObject**, *DataFormat* **As Integer** )

### OLEStartDrag
{: .no_toc }

Raised on the source control at the start of an OLE drag, so the application can populate the **DataObject** and choose the allowed effects.

Syntax: *object*\_**OLEStartDrag**( *Data* **As DataObject**, *AllowedEffects* **As Long** )
