---
title: CheckBoxW
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/CheckBoxW
has_toc: false
symbols:
  - CheckBoxW
  - ChkImageListAlignmentConstants
  - ChkDrawModeConstants
---

# CheckBoxW class
{: .no_toc }

A **CheckBoxW** is a check box: a small box with a caption beside it, which the user checks and unchecks, and which the program can also show grayed. It can show a picture, look like a push button that stays down while it is checked, and leave its drawing to the program.

```tb check_build check_run arch=win32,win64
CheckBoxW1.Caption = "&Remember " & ChrW$(&H3A9)     ' the caption is Unicode: a Greek capital omega
CheckBoxW1.Value = vbChecked
Debug.Print CheckBoxW1.Value
CheckBoxW1.Value = vbGrayed
Debug.Print CheckBoxW1.Value; Len(CheckBoxW1.Caption)
' Output:
'  1
'  2  11
```

The control stands in place of the CheckBox of VB6, which in twinBASIC is the [**CheckBox**](../../VB/CheckBox/) of the VB package. This one adds a picture from an image list beside the caption ([**ImageList**](#imagelist)), [**PushLike**](#pushlike), [**WordWrap**](#wordwrap), [**TextAlignment**](#textalignment) and [**VerticalAlignment**](#verticalalignment), [**Transparent**](#transparent), and drawing by the program ([**DrawMode**](#drawmode)).

Of the [common members](Common), the control has those under [Name and place](Common#name-and-place), [Window handles](Common#window-handles), [Font and visual styles](Common#font-and-visual-styles), [Mouse](Common#mouse) but **DblClick**, [Keyboard and focus](Common#keyboard-and-focus), [Dragging the control](Common#dragging-the-control), [OLE drag and drop](Common#ole-drag-and-drop) and [Right-to-left](Common#right-to-left) but **RightToLeftLayout**. Its [**Click**](#click) event has a meaning of its own.

* TOC
{:toc}

## Checked, unchecked and grayed

[**Value**](#value) is the state of the box: **vbUnchecked**, **vbChecked** or **vbGrayed**. The user changes it with a click on the control, with the space key while the control has the focus, and with the Alt key and the character that follows an `&` in the [**Caption**](#caption).

<!-- test: CheckBoxWTests.Click_ByTheUser_ChecksAndUnchecks, CheckBoxWTests.Click_ByTheUser_OnGrayed_Unchecks -->
Each of these checks an unchecked box and unchecks a checked or a grayed one. Only the program makes the box grayed.
<!-- /test -->

<!-- test: CheckBoxWTests.Value_TrueAndFalse_AreCheckedAndUnchecked, CheckBoxWTests.Value_OutOfRange_Raises380 -->
**Value** also takes **True** and **False**, as checked and unchecked. Any other number raises run-time error 380, *Invalid property value*.

```tb check_build check_run arch=win32,win64
CheckBoxW1.Value = True
Debug.Print CheckBoxW1.Value
On Error Resume Next
CheckBoxW1.Value = 3
Debug.Print Err.Number; CheckBoxW1.Value
' Output:
'  1
'  380  1
```
<!-- /test -->

Every change of **Value** raises [**Click**](#click), whether the user or the program made it:

```tb check_build
Private Sub CheckBoxW1_Click()
    Debug.Print "The box is now "; IIf(CheckBoxW1.Value = vbChecked, "checked", "not checked")
End Sub
```

## Caption and pictures

In the standard [**Style**](#style) the control shows its box and, beside it, either the [**Caption**](#caption) or a picture. [**Alignment**](#alignment) puts the box at the left or the right of the control. [**TextAlignment**](#textalignment), [**VerticalAlignment**](#verticalalignment) and [**WordWrap**](#wordwrap) place the caption in the room that is left.

A picture comes from one of two places:

- [**Picture**](#picture) is shown in place of the caption.
- An [**ImageList**](ImageList/) control assigned to the [**ImageList**](#imagelist) property is shown together with the caption, at the side that [**ImageListAlignment**](#imagelistalignment) names and at the distance of [**ImageListMargin**](#imagelistmargin) from the edge. The control shows the image list's pictures when the program has visual styles. While an image list is assigned, **Picture** is not shown.

The image list holds one picture, which the control shows in every state, or one picture for each state in this order: normal, under the mouse, pressed, disabled, with the focus, under a pen.

```tb check_build
CheckBoxW1.ImageList = ImageList1
CheckBoxW1.ImageListAlignment = ChkImageListAlignmentRight
CheckBoxW1.Caption = "Show &hidden files"
```

## The graphical style

With [**Style**](#style) set to **vbButtonGraphical** the control is a push button that stays down while it is checked, drawn by the control itself: the picture in the middle and the caption under it, centered. [**Picture**](#picture) is the picture of the button when it is up, [**DownPicture**](#downpicture) when it is down or checked, and [**DisabledPicture**](#disabledpicture) when it is disabled. With [**UseMaskColor**](#usemaskcolor) the color [**MaskColor**](#maskcolor) of a bitmap is not drawn. The button has the [**BackColor**](#backcolor) and the caption the [**ForeColor**](#forecolor).

In this style [**Alignment**](#alignment), [**TextAlignment**](#textalignment), [**VerticalAlignment**](#verticalalignment), [**WordWrap**](#wordwrap), [**PushLike**](#pushlike) and [**ImageList**](#imagelist) have no effect.

[**PushLike**](#pushlike) is the other way to a button that stays down: it keeps the standard style, so the caption's alignment and the image list still apply, and Windows draws the button.

## Drawing the control in code

With [**DrawMode**](#drawmode) set to **ChkDrawModeOwnerDraw** the control draws nothing. It raises [**OwnerDraw**](#ownerdraw) each time it has to be drawn, and the handler draws the whole control, its state included, on the device context the event gives it.

<!-- test: CheckBoxWTests.Style_GraphicalInOwnerDrawMode_Raises383, CheckBoxWTests.DrawMode_OwnerDraw_MakesStyleStandard -->
The graphical style and this mode exclude each other. Setting **Style** to **vbButtonGraphical** in this mode raises run-time error 383, and setting **DrawMode** to **ChkDrawModeOwnerDraw** makes a graphical **Style** standard.

```tb check_build check_run arch=win32,win64
CheckBoxW1.Style = vbButtonGraphical
CheckBoxW1.DrawMode = ChkDrawModeOwnerDraw
Debug.Print CheckBoxW1.Style
On Error Resume Next
CheckBoxW1.Style = vbButtonGraphical
Debug.Print Err.Number; CheckBoxW1.Style
' Output:
'  0
'  383  0
```
<!-- /test -->

Properties
----------

### Alignment
{: .no_toc }

The side of the control that the box is at. A member of [**CCLeftRightAlignmentConstants**](Common#ccleftrightalignmentconstants). Default: **CCLeftRightAlignmentLeft**, with the caption to the right of the box. Another value raises run-time error 380.

### Appearance
{: .no_toc }

Whether the box is drawn flat or with a sunken edge. A member of [**CCAppearanceConstants**](Common#ccappearanceconstants). Default: **CCAppearance3D**. Another value raises run-time error 380. The flat box shows where the control is drawn without visual styles.

<!-- test: CheckBoxWTests.Appearance_SetsForeColor -->
Setting the property also sets [**ForeColor**](#forecolor): to **vbWindowText** for the flat appearance and to **vbButtonText** for the other.
<!-- /test -->

### BackColor
{: .no_toc }

The color behind the box and the caption, and the color of the button in the graphical style where the control is drawn without visual styles. **OLE_COLOR**. Default: **vbButtonFace**.

### Caption
{: .no_toc }

The text beside the box. **String**. A control newly drawn on a form has its own name.

The character after an `&` is underlined, and the Alt key with that character changes [**Value**](#value) as a click does. Two of them, `&&`, show one `&`.

### DisabledPicture
{: .no_toc }

The picture of a disabled control in the graphical [**Style**](#style). A picture object, or **Nothing** (the default): the control then shows [**Picture**](#picture), grayed.

### DownPicture
{: .no_toc }

The picture of the control in the graphical [**Style**](#style) while it is held down or checked. A picture object, or **Nothing** (the default): the control then shows [**Picture**](#picture).

### DrawMode
{: .no_toc }

Whether the control draws itself or leaves the drawing to the [**OwnerDraw**](#ownerdraw) event. A member of [**ChkDrawModeConstants**](#chkdrawmodeconstants). Default: **ChkDrawModeNormal**. Another value raises run-time error 380. A change makes the control's window again, so [**hWnd**](Common#hwnd) changes. See [Drawing the control in code](#drawing-the-control-in-code).

### ForeColor
{: .no_toc }

The color of the caption. **OLE_COLOR**. A control newly drawn on a form has black. [**Appearance**](#appearance) changes it.

The control uses it in the graphical [**Style**](#style). In the standard style a control drawn with visual styles has the caption color of the visual style.

### Hot
{: .no_toc }

Whether the mouse is over the control, as Windows reports it for a control with visual styles. **Boolean**, read-only.

<!-- test: CheckBoxWTests.Hot_Assigned_Raises383 -->
Assigning to it raises run-time error 383.
<!-- /test -->

### ImageList
{: .no_toc }

The image list whose pictures the control shows beside its caption. See [Caption and pictures](#caption-and-pictures).

<!-- test: CheckBoxWTests.ImageList_TakesAControlANameOrAHandle -->
The property takes one of three things:

- an [**ImageList**](ImageList/) control of the package. The property then returns the control.
- a **String**: the name of an **ImageList** control on the same form. The property then returns the control.
- a **Long** or a **LongLong**: the handle of an image list of Windows. The property then returns the handle.
<!-- /test -->

<!-- test: CheckBoxWTests.ImageList_UnknownName_IsNothing, CheckBoxWTests.ImageList_OtherObject_Raises35610, CheckBoxWTests.ImageList_OtherType_Raises13 -->
**Nothing**, the handle 0, a name that no **ImageList** control on the form has, and an image list that holds no picture all leave the control without an image list: the property then returns **Nothing**. An object of another class raises run-time error 35610, and a value of another type, an **Integer** included, raises run-time error 13.
<!-- /test -->

### ImageListAlignment
{: .no_toc }

Where the picture of the image list is, relative to the caption. A member of [**ChkImageListAlignmentConstants**](#chkimagelistalignmentconstants). Default: **ChkImageListAlignmentLeft**. Another value raises run-time error 380.

Setting [**RightToLeft**](Common#righttoleft) to **True** changes **ChkImageListAlignmentLeft** to **ChkImageListAlignmentRight**, and setting it to **False** changes it back.

### ImageListMargin
{: .no_toc }

The distance between the picture of the image list and the edge of the control that [**ImageListAlignment**](#imagelistalignment) names, in the scale units of the control's container. **Single**. Default: 0. The control keeps it as a whole number of pixels. With **ChkImageListAlignmentCenter** it has no effect.

<!-- test: CheckBoxWTests.ImageListMargin_Negative_Raises380 -->
A negative value raises run-time error 380.
<!-- /test -->

### MaskColor
{: .no_toc }

The color of a bitmap that the control does not draw, in the graphical [**Style**](#style) and while [**UseMaskColor**](#usemaskcolor) is **True**. **OLE_COLOR**. Default: `&HC0C0C0`, light gray.

### Picture
{: .no_toc }

The picture the control shows. A picture object, or **Nothing** (the default).

In the standard [**Style**](#style) an icon or a bitmap is shown in place of the caption, unless an [**ImageList**](#imagelist) is assigned. In the graphical style the picture is drawn in the middle of the button, above the caption.

### Pushed
{: .no_toc }

Whether the control is drawn as held down. **Boolean**. It is **True** while the user holds the mouse button or the space key down on the control. Setting it changes how the control is drawn and raises no event.

### PushLike
{: .no_toc }

Whether the control, in the standard [**Style**](#style), looks like a push button that stays down while it is checked. **Boolean**. Default: **False**.

### Style
{: .no_toc }

Whether Windows draws the control as a check box or the control draws itself as a button with a picture. A member of [**ButtonConstants**](../../VBRUN/Constants/ButtonConstants): **vbButtonStandard** (the default) or **vbButtonGraphical**. Another value raises run-time error 380. See [The graphical style](#the-graphical-style).

Setting it to **vbButtonGraphical** while [**DrawMode**](#drawmode) is **ChkDrawModeOwnerDraw** raises run-time error 383. A change makes the control's window again, so [**hWnd**](Common#hwnd) changes.

### TextAlignment
{: .no_toc }

Where the caption is in the room beside the box. A member of [**AlignmentConstants**](../../VBRUN/Constants/AlignmentConstants). Default: **vbLeftJustify**. Another value raises run-time error 380.

Setting [**RightToLeft**](Common#righttoleft) to **True** changes **vbLeftJustify** to **vbRightJustify**, and setting it to **False** changes it back.

### Transparent
{: .no_toc }

Whether the control's background is a copy of what its container draws behind it, so that a picture or a gradient on the form shows through. **Boolean**. Default: **False**. The control takes the copy when it is first drawn, and again after a change of its size and after [**Refresh**](Common#refresh).

### UseMaskColor
{: .no_toc }

Whether the color [**MaskColor**](#maskcolor) of a bitmap is left out when the control draws the bitmap in the graphical [**Style**](#style). **Boolean**. Default: **False**.

### Value
{: .no_toc }

The state of the box. **Integer**, one of the [**CheckBoxConstants**](../../VBRUN/Constants/CheckBoxConstants): **vbUnchecked** (0, the default), **vbChecked** (1) or **vbGrayed** (2). It is the control's default property.

**True** is taken as **vbChecked** and **False** as **vbUnchecked**. Another value raises run-time error 380. A change raises [**Click**](#click). See [Checked, unchecked and grayed](#checked-unchecked-and-grayed).

### VerticalAlignment
{: .no_toc }

Whether the caption is at the top, the middle or the bottom of the control. A member of [**CCVerticalAlignmentConstants**](Common#ccverticalalignmentconstants). Default: **CCVerticalAlignmentCenter**. Another value raises run-time error 380.

### WordWrap
{: .no_toc }

Whether a caption too long for one line continues on the next. **Boolean**. Default: **True**.

Events
------

### Click
{: .no_toc }

<!-- test: CheckBoxWTests.Click_RaisedForEachChangeOfValue -->
Raised when [**Value**](#value) has changed: by the user, or by an assignment in code. Assigning the value the control already has raises nothing.
<!-- /test -->

Syntax: *object*\_**Click**( )

A mouse button other than the left one raises no **Click**.

### HotChanged
{: .no_toc }

Raised when the mouse moves onto the control or leaves it, where the control is drawn with visual styles. [**Hot**](#hot) tells which.

Syntax: *object*\_**HotChanged**( )

### OwnerDraw
{: .no_toc }

Raised when the control has to be drawn, while [**DrawMode**](#drawmode) is **ChkDrawModeOwnerDraw**.

Syntax: *object*\_**OwnerDraw**( **ByVal** *Action* **As Long**, **ByVal** *State* **As Long**, **ByVal** *hDC* **As Long**, **ByVal** *Left* **As Long**, **ByVal** *Top* **As Long**, **ByVal** *Right* **As Long**, **ByVal** *Bottom* **As Long** )

*Action*
: Why the control is drawn, as a sum of: 1, the whole control has to be drawn; 2, it was pressed or released; 4, it took or lost the focus.

*State*
: The state to draw, as a sum of: 1, held down; 4, disabled; `&H10`, with the focus; `&H40`, under the mouse, which the control reports only while [**MouseTrack**](Common#mousetrack) is **True**; `&H100`, without the underline of the access key; `&H200`, without the focus rectangle.

*hDC*
: The handle of the device context to draw on.

*Left*, *Top*, *Right*, *Bottom*
: The rectangle of the control, in pixels.

The event does not give the control's [**Value**](#value): the handler reads it and draws the box accordingly.

## ChkImageListAlignmentConstants
{: #chkimagelistalignmentconstants }

The values of [**ImageListAlignment**](#imagelistalignment).

| Member | Value | Description |
|---|---|---|
| **ChkImageListAlignmentLeft**{: #ChkImageListAlignmentConstants_ChkImageListAlignmentLeft } | 0 | The picture is to the left of the caption. |
| **ChkImageListAlignmentRight**{: #ChkImageListAlignmentConstants_ChkImageListAlignmentRight } | 1 | The picture is to the right of the caption. |
| **ChkImageListAlignmentTop**{: #ChkImageListAlignmentConstants_ChkImageListAlignmentTop } | 2 | The picture is above the caption. |
| **ChkImageListAlignmentBottom**{: #ChkImageListAlignmentConstants_ChkImageListAlignmentBottom } | 3 | The picture is under the caption. |
| **ChkImageListAlignmentCenter**{: #ChkImageListAlignmentConstants_ChkImageListAlignmentCenter } | 4 | The picture is in the middle of the control. |

## ChkDrawModeConstants
{: #chkdrawmodeconstants }

The values of [**DrawMode**](#drawmode).

| Member | Value | Description |
|---|---|---|
| **ChkDrawModeNormal**{: #ChkDrawModeConstants_ChkDrawModeNormal } | 0 | The control is drawn by Windows, or by itself in the graphical style. |
| **ChkDrawModeOwnerDraw**{: #ChkDrawModeConstants_ChkDrawModeOwnerDraw } | 1 | The program draws the control, in the [**OwnerDraw**](#ownerdraw) event. |

## See Also

- [Common members](Common) -- the members this control shares with the package's other controls
- [OptionButtonW](OptionButtonW) class -- an option button with the same pictures, styles and drawing
- [CommandButtonW](CommandButtonW) class -- a push button
- [CheckBox](../../VB/CheckBox/) -- the check box of the VB package
