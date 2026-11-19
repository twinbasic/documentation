---
title: ToolBar
parent: VBCCR18 Package
permalink: /tB/Packages/Contributed/VBCCR18/ToolBar/
has_toc: false
symbols:
  - ToolBar
  - TbrButtonStyleConstants
  - TbrButtonValueConstants
  - TbrOrientationConstants
  - TbrStyleConstants
  - TbrTextAlignConstants
---

# ToolBar class
{: .no_toc }

A **ToolBar** is a row of buttons that start the commands of a program. A button can show a picture, a caption or both, can stay pressed like a check box, can open a drop-down menu, and a separator puts a gap between groups of buttons. The user can also rearrange the buttons in a dialog of Windows.

```tb check_build check_run arch=win32,win64
ToolBar1.Buttons.Add , "new", "New"
ToolBar1.Buttons.Add , "open", "Open"
ToolBar1.Buttons.Add , , , TbrButtonStyleSeparator
ToolBar1.Buttons.Add , "save", "Save"
Debug.Print ToolBar1.Buttons.Count
Debug.Print ToolBar1.Buttons("open").Index
' Output:
'  4
'  2
```

```tb hidden
Public Type SquarePictDesc
    Size As Long
    Kind As Long
    Handle As LongPtr
    Palette As LongPtr
End Type
Public Type SquareGuid
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type
Public Declare PtrSafe Function SqGetDC Lib "user32" Alias "GetDC" (ByVal hWnd As LongPtr) As LongPtr
Public Declare PtrSafe Function SqReleaseDC Lib "user32" Alias "ReleaseDC" (ByVal hWnd As LongPtr, ByVal hDC As LongPtr) As Long
Public Declare PtrSafe Function SqCreateCompatibleDC Lib "gdi32" Alias "CreateCompatibleDC" (ByVal hDC As LongPtr) As LongPtr
Public Declare PtrSafe Function SqCreateCompatibleBitmap Lib "gdi32" Alias "CreateCompatibleBitmap" (ByVal hDC As LongPtr, ByVal W As Long, ByVal H As Long) As LongPtr
Public Declare PtrSafe Function SqSelectObject Lib "gdi32" Alias "SelectObject" (ByVal hDC As LongPtr, ByVal hObject As LongPtr) As LongPtr
Public Declare PtrSafe Function SqCreateSolidBrush Lib "gdi32" Alias "CreateSolidBrush" (ByVal Color As Long) As LongPtr
Public Declare PtrSafe Function SqPatBlt Lib "gdi32" Alias "PatBlt" (ByVal hDC As LongPtr, ByVal X As Long, ByVal Y As Long, ByVal W As Long, ByVal H As Long, ByVal Rop As Long) As Long
Public Declare PtrSafe Function SqDeleteObject Lib "gdi32" Alias "DeleteObject" (ByVal hObject As LongPtr) As Long
Public Declare PtrSafe Function SqDeleteDC Lib "gdi32" Alias "DeleteDC" (ByVal hDC As LongPtr) As Long
Public Declare PtrSafe Function SqOleCreatePictureIndirect Lib "oleaut32" Alias "OleCreatePictureIndirect" (ByRef Desc As SquarePictDesc, ByRef IID As SquareGuid, ByVal Own As Long, ByRef Pic As IPictureDisp) As Long

' A bitmap of one color.
Public Function ColorSquare(ByVal Color As Long, Optional ByVal Width As Long = 16, Optional ByVal Height As Long = 16) As StdPicture
    Dim screenDC As LongPtr, memDC As LongPtr, bmp As LongPtr, brush As LongPtr, oldBmp As LongPtr, oldBrush As LongPtr
    screenDC = SqGetDC(0)
    memDC = SqCreateCompatibleDC(screenDC)
    bmp = SqCreateCompatibleBitmap(screenDC, Width, Height)
    brush = SqCreateSolidBrush(Color)
    oldBmp = SqSelectObject(memDC, bmp)
    oldBrush = SqSelectObject(memDC, brush)
    SqPatBlt memDC, 0, 0, Width, Height, &HF00021
    SqSelectObject memDC, oldBrush
    SqSelectObject memDC, oldBmp
    SqDeleteObject brush
    SqDeleteDC memDC
    SqReleaseDC 0, screenDC
    Dim desc As SquarePictDesc, iid As SquareGuid, pic As IPictureDisp
    desc.Size = LenB(desc)
    desc.Kind = 1
    desc.Handle = bmp
    iid.Data1 = &H7BF80981
    iid.Data2 = &HBF32
    iid.Data3 = &H101A
    iid.Data4(0) = &H8B
    iid.Data4(1) = &HBB
    iid.Data4(3) = &HAA
    iid.Data4(5) = &H30
    iid.Data4(6) = &HC
    iid.Data4(7) = &HAB
    SqOleCreatePictureIndirect desc, iid, 1, pic
    Set ColorSquare = pic
End Function
```

The control stands in place of the Toolbar of the Microsoft common controls (`MSCOMCTL.OCX`). The package's classes for its parts are [**TbrButtons**](TbrButtons), the collection of the buttons, [**TbrButton**](TbrButton), one button, [**TbrButtonMenus**](TbrButtonMenus), the collection of the menu items of a drop-down button, and [**TbrButtonMenu**](TbrButtonMenu), one menu item.

Of the [common members](../Common), the control has those under [Name and place](../Common#name-and-place) but **HelpContextID**, [Window handles](../Common#window-handles), [Font and visual styles](../Common#font-and-visual-styles), [Mouse](../Common#mouse), [Dragging the control](../Common#dragging-the-control), [OLE drag and drop](../Common#ole-drag-and-drop) and [Right-to-left](../Common#right-to-left), **RightToLeftLayout** included. It never takes the focus, so it has no keyboard events.

* TOC
{:toc}

## Buttons

[**Buttons**](#buttons-1) returns the collection of the buttons. [**Add**](TbrButtons#add) puts a button into it, and the [**Style**](TbrButton#style) of the button decides what it does. A button of the default style is a push button: a click raises [**ButtonClick**](#buttonclick). A check button stays pressed until the next click, and a check group button does the same while it is the only button pressed among the group buttons next to it. A separator is a gap and takes no click. A drop-down button has an arrow beside the button, and a whole drop-down button opens its menu wherever it is clicked.

```tb check_build check_run arch=win32,win64
ToolBar1.Buttons.Add , "left", "Left", TbrButtonStyleCheckGroup
ToolBar1.Buttons.Add , "center", "Center", TbrButtonStyleCheckGroup
ToolBar1.Buttons.Add , "bold", "Bold", TbrButtonStyleCheck
ToolBar1.Buttons("left").Value = TbrButtonValuePressed
ToolBar1.Buttons("center").Value = TbrButtonValuePressed
ToolBar1.Buttons("bold").Value = TbrButtonValuePressed
Debug.Print ToolBar1.Buttons("left").Value; ToolBar1.Buttons("center").Value; ToolBar1.Buttons("bold").Value
' Output:
'  0  1  1
```

A button has two places. Its **Index** is its place in the collection, and stays when the user or the program moves the button. Its [**Position**](TbrButton#position) is its place on the toolbar.

<!-- test: ToolBarTests.Button_Position_MovesTheButtonNotItsIndex -->
```tb check_build check_run arch=win32,win64
ToolBar1.Buttons.Add , "a", "A"
ToolBar1.Buttons.Add , "b", "B"
ToolBar1.Buttons.Add , "c", "C"
ToolBar1.Buttons("a").Position = 3
Debug.Print ToolBar1.Buttons("a").Position; ToolBar1.Buttons("a").Index
Debug.Print ToolBar1.Buttons(1).Key
' Output:
'  3  1
' a
```
<!-- /test -->

<!-- test: ToolBarTests.Buttons_HeldAcrossTextAlignmentChange_StillReachTheirButtons, ToolBarTests.Buttons_HeldAcrossOrientationChange_StillReachTheirButtons, ToolBarTests.Buttons_HeldAcrossRightToLeftChange_StillReachTheirButtons -->
> [!WARNING] 1.8.136.0
> A change of [**TextAlignment**](#textalignment), of [**Orientation**](#orientation) that turns the buttons to the other direction, and any assignment to [**RightToLeft**](../Common#righttoleft), [**RightToLeftLayout**](../Common#righttoleftlayout) or [**RightToLeftMode**](../Common#righttoleftmode), makes the toolbar window again and gives each button a new [**TbrButton**](TbrButton) object. A variable that held a button before the change does not reach it afterwards: its **Position** is 0, and what the program sets on it is lost. The program gets the button again from [**Buttons**](#buttons-1) after such a change.

<!-- test: ToolBarTests.Buttons_HeldAcrossStyleChange_StillReachTheirButtons -->
A change of [**Style**](#style) or of the **Font** keeps the objects.
<!-- /test -->

## Pictures

A button shows a picture from an image list: an [**ImageList**](../ImageList/) control, which the program gives to [**ImageList**](#imagelist). The [**Image**](TbrButton#image) of a button, and the *Image* argument of [**Add**](TbrButtons#add), is the number of the picture or its key. The toolbar draws a button that is under the pointer with the pictures of [**HotImageList**](#hotimagelist), a disabled button with those of [**DisabledImageList**](#disabledimagelist), and, in a program with visual styles, a pressed button with those of [**PressedImageList**](#pressedimagelist). A state whose list the toolbar does not have uses the pictures of **ImageList**.

```tb check_build check_run arch=win32,win64
ImageList1.ListImages.Add , "new", ColorSquare(vbWhite)
ImageList1.ListImages.Add , "open", ColorSquare(vbYellow)
Set ToolBar1.ImageList = ImageList1         ' after the list has its pictures
Dim Button As TbrButton
Set Button = ToolBar1.Buttons.Add(, "open", "Open", , "open")
Debug.Print Button.ImageIndex
' Output:
'  2
```

**ColorSquare** in the sample is a function of the program's own that returns a bitmap of one color, 16 pixels wide and high. An image list that has no picture is not taken, so a program fills the list first and gives it to the toolbar afterwards, as [**ImageList**](../ImageList/#giving-the-list-to-a-control) says.

<!-- test: ToolBarTests.ImageList_ListOfAnotherSize_Raises380, ToolBarTests.ImageList_AnotherObject_Raises35610, ToolBarTests.ImageList_ImageListOnTheForm_CanBeGivenByName -->
All the lists of one toolbar have pictures of the same size. A list whose pictures have another size than those of the lists the toolbar already has raises run-time error 380. A control that is not an **ImageList** raises error 35610, and a value of another type than an object, a string or a **Long** raises error 13. A **Long** is the handle that the [**hImageList**](../ImageList/#himagelist) property of an image list gives, and a string is the name of an **ImageList** control on the same form as the toolbar. A name that no such control has, and **Nothing**, take the image list away.
<!-- /test -->

## How the buttons are laid out

A button is as wide as [**ButtonWidth**](#buttonwidth) and as high as [**ButtonHeight**](#buttonheight), or as the picture and the caption need, if that is more. A button whose [**AutoSize**](TbrButton#autosize) is **True** is as wide as its caption and picture need, and [**CustomWidth**](TbrButton#customwidth) gives a button a width of its own. [**MinButtonWidth**](#minbuttonwidth) and [**MaxButtonWidth**](#maxbuttonwidth) limit the width. [**TextAlignment**](#textalignment) puts a caption under its picture or beside it, and [**MaxTextRows**](#maxtextrows) lets a caption under its picture use more than one row.

<!-- test: ToolBarTests.Height_Assigned_FollowsTheButtons -->
A horizontal toolbar sets its own height to that of its rows of buttons, so that a **Height** the program assigns does not stay.
<!-- /test -->

With [**Wrappable**](#wrappable) set to **True** the buttons that do not fit in the toolbar's width go on to another row. [**Orientation**](#orientation) set to **TbrOrientationVertical** stacks the buttons in a column, and the toolbar then sets its width instead of its height.

[**GetIdealSize**](#getidealsize) returns the size at which the toolbar shows every button, and a program uses it to size the toolbar.

```tb check_build
Dim IdealWidth As Single, IdealHeight As Single
ToolBar1.GetIdealSize IdealWidth, IdealHeight
ToolBar1.Width = IdealWidth
```

## Hot buttons

The button that the pointer is over is the hot button. With [**HotTracking**](#hottracking) set to **True**, a toolbar of the standard style draws it in the highlight color, and [**AnchorHot**](#anchorhot) keeps the last hot button hot when the pointer leaves the toolbar. [**HotItem**](#hotitem) returns the hot button, or makes one hot, and [**ButtonHotChanged**](#buttonhotchanged) is raised each time the hot button changes.

<!-- test: ToolBarTests.ButtonHotChanged_HotAssigned_RaisesTheNewButtonBeforeTheOldOne -->
A change of the hot button raises two events: one with **Hot** **True** for the new button, then one with **Hot** **False** for the old one.
<!-- /test -->

## Menus of drop-down buttons

A button of style **TbrButtonStyleDropDown** or **TbrButtonStyleWholeDropDown** shows a menu when the user clicks its arrow, or the whole button for the second style. The toolbar raises [**ButtonDropDown**](#buttondropdown) first, so that a program can fill the menu, then shows it. The menu holds the items of the button's [**ButtonMenus**](TbrButton#buttonmenus) collection, or, where the program has given the button an [**hMenu**](TbrButton#hmenu), that menu of Windows. A chosen item raises [**ButtonMenuClick**](#buttonmenuclick) with its [**TbrButtonMenu**](TbrButtonMenu), or, for an **hMenu**, [**ButtonMenuClick2**](#buttonmenuclick2) with the identifier of the item.

```tb check_build check_run arch=win32,win64
Dim Button As TbrButton
Set Button = ToolBar1.Buttons.Add(, "paste", "Paste", TbrButtonStyleDropDown)
Button.ButtonMenus.Add , "plain", "Paste as plain text"
Button.ButtonMenus.Add , "special", "Paste special..."
Button.ButtonMenus("special").Enabled = False
Debug.Print Button.ButtonMenus.Count
' Output:
'  2
```

```tb check_build
Private Sub ToolBar1_ButtonMenuClick(ByVal ButtonMenu As TbrButtonMenu)
    Debug.Print ButtonMenu.Parent.Key; ButtonMenu.Key
End Sub
```

## Events of the mouse

<!-- test: ToolBarTests.ButtonClick_AMouseClick_IsRaisedBetweenMouseDownAndMouseUp, ToolBarTests.ButtonClick_ASeparator_RaisesNoButtonClick -->
A click on a button raises [**ButtonClick**](#buttonclick) with the button. The events of the control come around it: **MouseDown** first, then **ButtonClick**, then **MouseUp**, then **Click**. A click on a separator raises the same events without **ButtonClick**.
<!-- /test -->

```tb check_build
Private Sub ToolBar1_ButtonClick(ByVal Button As TbrButton)
    Select Case Button.Key
        Case "new": Debug.Print "New"
        Case "open": Debug.Print "Open"
    End Select
End Sub
```

<!-- test: ToolBarTests.ButtonMouseEnter_MouseTrackTrue_RaisedAfterMouseEnterAndBeforeMouseLeave -->
With [**MouseTrack**](../Common#mousetrack) set to **True** the toolbar raises [**ButtonMouseEnter**](#buttonmouseenter) and [**ButtonMouseLeave**](#buttonmouseleave) as well. When the pointer moves onto a button from outside the toolbar, **MouseEnter** comes first, then **ButtonMouseEnter**. When it moves from one button to another, **ButtonMouseLeave** for the first comes before **ButtonMouseEnter** for the second, and when it leaves the toolbar, **ButtonMouseLeave** comes before **MouseLeave**.
<!-- /test -->

## Keys and mnemonics

A caption with an ampersand before a letter, such as `&Open`, has that letter as its mnemonic. [**FindMnemonic**](#findmnemonic) returns the button for a character, and [**ContainerKeyDown**](#containerkeydown) makes the Alt key with the mnemonic press the button. The toolbar takes no focus, so the form passes it the keys, with its **KeyPreview** set to **True**.

```tb check_build
Private Sub Form_KeyDown(KeyCode As Integer, Shift As Integer)
    ToolBar1.ContainerKeyDown KeyCode, Shift
End Sub
```

## Customizing

With [**AllowCustomize**](#allowcustomize) set to **True**, the user can move a button along the toolbar by dragging it with the Shift key held down (the Alt key with [**AltDrag**](#altdrag)), drag it off to remove it, and double-click the toolbar to open the dialog of Windows that adds, removes and moves buttons. [**Customize**](#customize) opens that dialog from code. The dialog names a button by its [**Description**](TbrButton#description), where it has one.

The events of a customization are [**BeginCustomization**](#begincustomization), [**InitCustomizationDialog**](#initcustomizationdialog), [**CustomizationChange**](#customizationchange), [**ResetCustomizations**](#resetcustomizations), [**CustomizationHelp**](#customizationhelp) and [**EndCustomization**](#endcustomization). [**SaveToolBar**](#savetoolbar) and [**RestoreToolBar**](#restoretoolbar) keep the arrangement the user made in the registry between runs of a program.

## Moving a button by dragging

A program that lets the user drag a button to another place shows where the button will go with an insertion mark, a vertical line between two buttons. [**HitTestInsertMark**](#hittestinsertmark) says which button a point is nearest to and on which side of it, and [**InsertMark**](#insertmark) draws the line, in [**InsertMarkColor**](#insertmarkcolor).

```tb check_build
Private Sub ToolBar1_OLEDragOver(Data As DataObject, Effect As Long, Button As Integer, Shift As Integer, X As Single, Y As Single, State As Integer)
    Dim After As Boolean
    Set ToolBar1.InsertMark(After) = ToolBar1.HitTestInsertMark(X, Y, After)
End Sub
```

Properties
----------

### Align
{: .no_toc }

The edge of the form that the control is attached to, where it takes the form's whole width or height. A member of [**AlignConstants**](../../../VBRUN/Constants/AlignConstants). Default: **vbAlignNone**.

<!-- test: sample toolbar-align -->
> [!NOTE] 1.8.136.0, BETA 1042
> twinBASIC has not implemented **Align**: an assignment compiles with the warning TB0009 and changes nothing, and the property goes on returning **vbAlignNone**. A program places and sizes the toolbar itself.

```tb probe check_run arch=win32,win64 id=toolbar-align
ToolBar1.Align = vbAlignTop
Debug.Print ToolBar1.Align
' Output:
'  0
```

### AllowCustomize
{: .no_toc }

Whether the user can customize the toolbar. **Boolean**. Default: **True**. See [Customizing](#customizing).

### AltDrag
{: .no_toc }

Whether the user drags a button along the toolbar with the Alt key held down instead of the Shift key. **Boolean**. Default: **False**. It has an effect while [**AllowCustomize**](#allowcustomize) is **True**.

### AnchorHot
{: .no_toc }

Whether the hot button stays hot when the pointer leaves the toolbar. **Boolean**. Default: **False**.

### BackColor
{: .no_toc }

The color behind the buttons. **OLE_COLOR**. Default: **vbButtonFace**. With [**Transparent**](#transparent) set to **True** the toolbar draws what is behind it over the color.

### ButtonHeight
{: .no_toc }

The height of a button, in the container's scale units. **Single**. Default: 22 device-independent pixels.

<!-- test: ToolBarTests.ButtonHeight_SmallerThanTheMinimum_IsRaisedToIt -->
A height below the default is raised to it.
<!-- /test -->

A negative value raises run-time error 380. The property returns the height the toolbar uses for its buttons once it has buttons, which is more than the value assigned where a caption or a picture needs the room.

### ButtonWidth
{: .no_toc }

The width of a button, in the container's scale units. **Single**. Default: 24 device-independent pixels. The rules are those of [**ButtonHeight**](#buttonheight).

### Buttons
{: .no_toc }

The collection of the buttons. A [**TbrButtons**](TbrButtons) object, read-only.

### ContainedControls
{: .no_toc }

The controls that were put into the toolbar. A [**ContainedControls**](../../../VBRUN/ContainedControls/) collection, read-only.

### DisabledImageList
{: .no_toc }

The image list whose pictures a disabled button shows. A **Variant**: an [**ImageList**](../ImageList/) control, the handle of an image list, or the name of an **ImageList** control on the form. Reading it returns what was assigned, or **Nothing**. See [Pictures](#pictures).

### Divider
{: .no_toc }

Whether a line of two pixels is drawn along the top edge of the toolbar. **Boolean**. Default: **True**.

### DoubleBuffer
{: .no_toc }

Whether the toolbar paints in a bitmap and draws that, which avoids flicker. **Boolean**. Default: **True**.

### HideClippedButtons
{: .no_toc }

Whether a button that the edge of the toolbar cuts off is hidden, in place of drawn in part. **Boolean**. Default: **False**.

### HotImageList
{: .no_toc }

The image list whose pictures the hot button shows. A **Variant**, as [**DisabledImageList**](#disabledimagelist) is.

### HotItem
{: .no_toc }

The hot button, or **Nothing** when no button is hot. A [**TbrButton**](TbrButton). Assigned with **Set**, it makes that button hot, and **Nothing** takes the hot state away. Each change raises [**ButtonHotChanged**](#buttonhotchanged).

### HotTracking
{: .no_toc }

Whether the toolbar of the standard style draws the button under the pointer in the highlight color. **Boolean**. Default: **False**. See [Hot buttons](#hot-buttons).

### hWndToolTip
{: .no_toc }

The handle of the window that shows the buttons' tips. **LongPtr**, read-only. It is 0 until [**ShowTips**](#showtips) has been set to **True**.

### ImageHeight
{: .no_toc }

The height of the pictures, in the container's scale units. **Single**. It follows the pictures of the image lists the toolbar has. A negative value raises run-time error 380.

### ImageList
{: .no_toc }

The image list whose pictures the buttons show. A **Variant**, as [**DisabledImageList**](#disabledimagelist) is. See [Pictures](#pictures).

### ImageWidth
{: .no_toc }

The width of the pictures, in the container's scale units. **Single**. The rules are those of [**ImageHeight**](#imageheight).

### InsertMark
{: .no_toc }

The button next to which the insertion mark is drawn, and on which side. A [**TbrButton**](TbrButton), or **Nothing** where there is no mark. Assigned with **Set**, it draws the mark; **Nothing** takes it away. See [Moving a button by dragging](#moving-a-button-by-dragging).

<!-- test: ToolBarTests.InsertMark_Set_IsReadBackWithItsSide -->
The property gives back the button and the side that were set, and **Nothing** while there is no mark.
<!-- /test -->

Syntax: *object*.**InsertMark**( [ *After* ] ) **As TbrButton**

*After*
: *optional* A **Boolean**: **True** for the mark after the button, **False** for the mark before it. When the property is read, the argument gets the side of the mark.

### InsertMarkColor
{: .no_toc }

The color of the insertion mark. **OLE_COLOR**. Default: **vbBlack**.

### MaxButtonWidth
{: .no_toc }

The largest width of a button, in the container's scale units. **Single**. Default: 0, which is no limit. A negative value raises run-time error 380.

### MaxTextRows
{: .no_toc }

The number of rows a caption under its picture can use. **Integer**. Default: 1. A negative value raises run-time error 380. It has an effect where [**TextAlignment**](#textalignment) is **TbrTextAlignBottom** and [**MaxButtonWidth**](#maxbuttonwidth) is above 0.

<!-- test: ToolBarTests.MaxTextRows_MoreThanOneWithTextAlignRight_Raises383 -->
With **TextAlignment** set to **TbrTextAlignRight**, a value above 1 raises run-time error 383, and the assignment of **TbrTextAlignRight** sets a larger value back to 1.
<!-- /test -->

### MinButtonWidth
{: .no_toc }

The smallest width of a button, in the container's scale units. **Single**. Default: 0. A negative value raises run-time error 380.

### Orientation
{: .no_toc }

Whether the buttons run in a row or in a column. A member of [**TbrOrientationConstants**](#tbrorientationconstants). Default: **TbrOrientationHorizontal**. A change exchanges the toolbar's width and height. See [How the buttons are laid out](#how-the-buttons-are-laid-out).

<!-- test: ToolBarTests.ToolBar_Properties_ValuesOutOfRange_Raise380 -->
A value that is not a member raises run-time error 380.
<!-- /test -->

### PressedImageList
{: .no_toc }

The image list whose pictures a pressed button shows, in a program with visual styles. A **Variant**, as [**DisabledImageList**](#disabledimagelist) is.

### ShowTips
{: .no_toc }

Whether the toolbar shows the [**ToolTipText**](TbrButton#tooltiptext) of a button in a small window when the pointer rests on it. **Boolean**. Default: **False**.

### Style
{: .no_toc }

How the buttons are drawn. A member of [**TbrStyleConstants**](#tbrstyleconstants). Default: **TbrStyleStandard**. Another value raises run-time error 380.

### TextAlignment
{: .no_toc }

Where a caption stands against its picture. A member of [**TbrTextAlignConstants**](#tbrtextalignconstants). Default: **TbrTextAlignBottom**. Another value raises run-time error 380. A change makes the buttons new objects: see [Buttons](#buttons).

### Transparent
{: .no_toc }

Whether the toolbar draws what is behind it, a copy of its container's background, over its [**BackColor**](#backcolor). **Boolean**. Default: **False**.

### Wrappable
{: .no_toc }

Whether the buttons that do not fit the toolbar's width go on to another row. **Boolean**. Default: **True**.

Methods
-------

### ContainerKeyDown
{: .no_toc }

Presses the button whose mnemonic goes with the Alt key held down, and returns it. The form calls it from its **KeyDown** event, with its **KeyPreview** set to **True**.

Syntax: *object*.**ContainerKeyDown**( *KeyCode*, *Shift* ) **As TbrButton**

*KeyCode*
: *required* An **Integer**, by reference: the key code of the event. It is set to 0 when the key is used.

*Shift*
: *required* An **Integer**, by reference: the state of the Shift, Ctrl and Alt keys. A key is used where the state is Alt, or Alt and Shift.

The method returns the button that was pressed, or **Nothing**. It uses no key while the toolbar is disabled, the button is disabled or a separator, or the button's [**NoPrefix**](TbrButton#noprefix) is **True**. A check button changes its [**Value**](TbrButton#value); another button is pressed and released, and raises [**ButtonClick**](#buttonclick); a whole drop-down button, or a drop-down button with the Shift key as well, shows its menu.

### Customize
{: .no_toc }

Opens the dialog of Windows that adds, removes and moves buttons.

Syntax: *object*.**Customize**

### FindMnemonic
{: .no_toc }

Returns the button that a character belongs to.

Syntax: *object*.**FindMnemonic**( *CharCode* ) **As TbrButton**

*CharCode*
: *required* A **Long**: the character code, such as `Asc("O")`. Capital and small letters are the same.

<!-- test: ToolBarTests.FindMnemonic_CharacterOfAMnemonicOrOfAFirstLetter_ReturnsTheButton -->
The button is the one with that mnemonic. A button whose caption has no mnemonic matches the first letter of its caption. Where no button matches, the method returns **Nothing**.
<!-- /test -->

### GetIdealSize
{: .no_toc }

Gives the size at which the toolbar shows all its buttons.

Syntax: *object*.**GetIdealSize** *Width*, *Height*

*Width*, *Height*
: *required* **Single**, by reference: they get the size in the container's scale units.

<!-- test: ToolBarTests.GetIdealSize_ReachesTheLastButton -->
The width reaches the right edge of the last button, and the height is that of the toolbar.
<!-- /test -->

### HitTest
{: .no_toc }

Returns the button at a point.

Syntax: *object*.**HitTest**( *X*, *Y* ) **As TbrButton**

*X*, *Y*
: *required* **Single**: the point, in the container's scale units, measured from the toolbar's top left corner.

<!-- test: ToolBarTests.HitTest_PointOnAButton_ReturnsTheButton -->
Where the point is not on a button, the method returns **Nothing**.
<!-- /test -->

### HitTestInsertMark
{: .no_toc }

Returns the button that is nearest to a point, and says on which side of it the insertion mark would go.

Syntax: *object*.**HitTestInsertMark**( *X*, *Y* [, *After* ] ) **As TbrButton**

*X*, *Y*
: *required* **Single**: the point, as in [**HitTest**](#hittest).

*After*
: *optional* A **Boolean**, by reference: **True** where the point is in the right half of the button, **False** where it is in the left half.

<!-- test: ToolBarTests.HitTestInsertMark_HalfOfAButton_GivesTheSide -->
The side is the one of the half of the button that the point is in.
<!-- /test -->

Where the point is on the toolbar's background and no button is near, the method returns **Nothing** and **After** is **False**.

### RestoreToolBar
{: .no_toc }

Reads back the arrangement of the buttons that [**SaveToolBar**](#savetoolbar) wrote.

Syntax: *object*.**RestoreToolBar** *Key*, *SubKey*, *Value*

*Key*, *SubKey*
: *required* **String**: the path of a key of the registry under `HKEY_CURRENT_USER`, written as *Key*\\*SubKey*.

*Value*
: *required* A **String**: the name of the value that holds the arrangement.

### SaveToolBar
{: .no_toc }

Writes the arrangement of the buttons to a value of the registry, so that a program can restore it at the next run.

Syntax: *object*.**SaveToolBar** *Key*, *SubKey*, *Value*

*Key*, *SubKey*
: *required* **String**: the path of a key under `HKEY_CURRENT_USER`, written as *Key*\\*SubKey*.

*Value*
: *required* A **String**: the name of the value.

Events
------

### BeginCustomization
{: .no_toc }

Raised when the customization of the toolbar begins.

Syntax: *object*\_**BeginCustomization**( )

### ButtonClick
{: .no_toc }

Raised when the user clicks a button, or presses it with [**ContainerKeyDown**](#containerkeydown). A whole drop-down button raises [**ButtonDropDown**](#buttondropdown) instead. See [Events of the mouse](#events-of-the-mouse).

Syntax: *object*\_**ButtonClick**( *Button* **As TbrButton** )

*Button*
: The button.

### ButtonDrag
{: .no_toc }

Raised when the user presses a button and drags the pointer out of it, with the mouse button still down.

Syntax: *object*\_**ButtonDrag**( *Button* **As TbrButton**, *MouseButton* **As Integer** )

*Button*
: The button.

*MouseButton*
: The mouse button that is down, a member of [**MouseButtonConstants**](../../../VBRUN/Constants/MouseButtonConstants).

### ButtonDropDown
{: .no_toc }

Raised when the user clicks the arrow of a drop-down button, or a whole drop-down button, before the menu is shown. A handler can change the button's [**ButtonMenus**](TbrButton#buttonmenus) or its [**hMenu**](TbrButton#hmenu).

Syntax: *object*\_**ButtonDropDown**( *Button* **As TbrButton** )

*Button*
: The button.

### ButtonHotChanged
{: .no_toc }

Raised when a button becomes hot and when it stops being hot. See [Hot buttons](#hot-buttons).

Syntax: *object*\_**ButtonHotChanged**( *Button* **As TbrButton**, *Hot* **As Boolean** )

*Button*
: The button.

*Hot*
: **True** when the button became hot, **False** when it stopped being hot.

### ButtonMenuClick
{: .no_toc }

Raised when the user chooses an item of the menu of a button that has [**ButtonMenus**](TbrButton#buttonmenus).

Syntax: *object*\_**ButtonMenuClick**( *ButtonMenu* **As TbrButtonMenu** )

*ButtonMenu*
: The item. Its [**Parent**](TbrButtonMenu#parent) is the button.

### ButtonMenuClick2
{: .no_toc }

Raised when the user chooses an item of the menu that the button's [**hMenu**](TbrButton#hmenu) names.

Syntax: *object*\_**ButtonMenuClick2**( *Button* **As TbrButton**, *ID* **As Long** )

*Button*
: The button.

*ID*
: The identifier of the item in the menu of Windows.

### ButtonMouseEnter
{: .no_toc }

Raised while [**MouseTrack**](../Common#mousetrack) is **True**, when the pointer moves onto a button. See [Events of the mouse](#events-of-the-mouse).

Syntax: *object*\_**ButtonMouseEnter**( *Button* **As TbrButton** )

*Button*
: The button.

### ButtonMouseLeave
{: .no_toc }

Raised while [**MouseTrack**](../Common#mousetrack) is **True**, when the pointer moves off a button.

Syntax: *object*\_**ButtonMouseLeave**( *Button* **As TbrButton** )

*Button*
: The button.

### CustomizationChange
{: .no_toc }

Raised when the user has changed the toolbar in the customization dialog or by dragging a button.

Syntax: *object*\_**CustomizationChange**( )

### CustomizationHelp
{: .no_toc }

Raised when the user presses the Help button of the customization dialog.

Syntax: *object*\_**CustomizationHelp**( )

### EndCustomization
{: .no_toc }

Raised when the customization of the toolbar ends.

Syntax: *object*\_**EndCustomization**( )

### InitCustomizationDialog
{: .no_toc }

Raised when the customization dialog has been made and is about to be shown.

Syntax: *object*\_**InitCustomizationDialog**( *hDlg* **As LongPtr**, *HideHelpButton* **As Boolean** )

*hDlg*
: The handle of the dialog window.

*HideHelpButton*
: By reference. A handler sets it to **True** to hide the dialog's Help button.

### ResetCustomizations
{: .no_toc }

Raised when the user presses the Reset button of the customization dialog. The toolbar has put the buttons back as they were when the customization began before it raises the event.

Syntax: *object*\_**ResetCustomizations**( *CloseDialog* **As Boolean** )

*CloseDialog*
: By reference. A handler sets it to **True** to close the dialog.

### Resize
{: .no_toc }

Raised when the size of the toolbar changes, also where the toolbar changes its own height to that of its buttons.

Syntax: *object*\_**Resize**( )

## TbrButtonStyleConstants
{: #tbrbuttonstyleconstants }

The values of the [**Style**](TbrButton#style) of a button, and of the *Style* argument of [**Add**](TbrButtons#add).

| Member | Value | Description |
|---|---|---|
| **TbrButtonStyleDefault**{: #TbrButtonStyleConstants_TbrButtonStyleDefault } | 0 | A push button. |
| **TbrButtonStyleCheck**{: #TbrButtonStyleConstants_TbrButtonStyleCheck } | 1 | A button that stays pressed until it is clicked again. |
| **TbrButtonStyleCheckGroup**{: #TbrButtonStyleConstants_TbrButtonStyleCheckGroup } | 2 | A button that stays pressed until another button of its group is pressed: the group is the check group buttons that follow each other. |
| **TbrButtonStyleSeparator**{: #TbrButtonStyleConstants_TbrButtonStyleSeparator } | 3 | A gap between buttons. |
| **TbrButtonStyleDropDown**{: #TbrButtonStyleConstants_TbrButtonStyleDropDown } | 4 | A push button with an arrow that opens a menu. |
| **TbrButtonStyleWholeDropDown**{: #TbrButtonStyleConstants_TbrButtonStyleWholeDropDown } | 5 | A button that opens a menu wherever it is clicked, and raises no **ButtonClick**. |

## TbrButtonValueConstants
{: #tbrbuttonvalueconstants }

The values of the [**Value**](TbrButton#value) of a button.

| Member | Value | Description |
|---|---|---|
| **TbrButtonValueUnpressed**{: #TbrButtonValueConstants_TbrButtonValueUnpressed } | 0 | The button is up. |
| **TbrButtonValuePressed**{: #TbrButtonValueConstants_TbrButtonValuePressed } | 1 | The button is down. |

## TbrOrientationConstants
{: #tbrorientationconstants }

The values of [**Orientation**](#orientation).

| Member | Value | Description |
|---|---|---|
| **TbrOrientationHorizontal**{: #TbrOrientationConstants_TbrOrientationHorizontal } | 0 | The buttons run in a row. |
| **TbrOrientationVertical**{: #TbrOrientationConstants_TbrOrientationVertical } | 1 | The buttons run in a column. |

## TbrStyleConstants
{: #tbrstyleconstants }

The values of [**Style**](#style).

| Member | Value | Description |
|---|---|---|
| **TbrStyleStandard**{: #TbrStyleConstants_TbrStyleStandard } | 0 | Each button is drawn as a push button. |
| **TbrStyleFlat**{: #TbrStyleConstants_TbrStyleFlat } | 1 | A button is flat, and drawn as a push button while the pointer is over it. |

## TbrTextAlignConstants
{: #tbrtextalignconstants }

The values of [**TextAlignment**](#textalignment).

| Member | Value | Description |
|---|---|---|
| **TbrTextAlignBottom**{: #TbrTextAlignConstants_TbrTextAlignBottom } | 0 | The caption is under the picture. |
| **TbrTextAlignRight**{: #TbrTextAlignConstants_TbrTextAlignRight } | 1 | The caption is at the right of the picture. |

## See Also

- [TbrButtons](TbrButtons) class -- the collection of the buttons
- [TbrButton](TbrButton) class -- one button
- [TbrButtonMenus](TbrButtonMenus) class -- the menu items of a drop-down button
- [TbrButtonMenu](TbrButtonMenu) class -- one menu item
- [ImageList](../ImageList/) class -- the pictures of the buttons
- [Common members](../Common) -- the members this control shares with the package's other controls
