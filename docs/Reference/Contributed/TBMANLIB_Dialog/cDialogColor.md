---
title: cDialogColor
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogColor
has_toc: false
---

# cDialogColor class
{: .no_toc }

A **cDialogColor** shows the Windows Color dialog, in which the user picks a color from the basic colors, from 16 custom colors or, in the expanded dialog, by typing its red, green and blue parts. It holds the chosen color as a **Long**, in the same layout as the **RGB** function and the `vb` color constants (`&H00BBGGRR`), and converts it to and from the HTML form `#RRGGBB`.

**Properties:** [**AnyColor**](#anycolor), [**Blue**](#blue), [**Color**](#color), [**FullOpen**](#fullopen), [**Green**](#green), [**OwnerHwnd**](#ownerhwnd), [**PreventFullOpen**](#preventfullopen), [**Red**](#red), [**SolidColor**](#solidcolor).
**Methods:** [**FromHtmlColor**](#fromhtmlcolor), [**GetCustomColor**](#getcustomcolor), [**Reset**](#reset), [**SetCustomColor**](#setcustomcolor), [**SetRgb**](#setrgb), [**ShowDialog**](#showdialog), [**ToHtmlColor**](#tohtmlcolor), [**ToRgbString**](#torgbstring).

Create an object with `Dim dlg As New cDialogColor`. The class is declared `[COMCreatable(False)]`, so **CreateObject** cannot make one, and **New** can.

```tb check_build
Dim dlg As New cDialogColor

dlg.Color = RGB(255, 128, 0)
dlg.FullOpen = True
If dlg.ShowDialog() Then
    Debug.Print dlg.ToHtmlColor()
    Debug.Print dlg.ToRgbString()
Else
    Debug.Print "Cancelled"
End If
```

## How the dialog is shown

[**ShowDialog**](#showdialog) calls `ChooseColorW` with the current [**Color**](#color) as the starting color (flag `CC_RGBINIT`, always set) and the 16 custom colors of the object. The properties [**FullOpen**](#fullopen), [**PreventFullOpen**](#preventfullopen), [**SolidColor**](#solidcolor) and [**AnyColor**](#anycolor) set the flags `CC_FULLOPEN`, `CC_PREVENTFULLOPEN`, `CC_SOLIDCOLOR` and `CC_ANYCOLOR` when they are **True**. The class sets no hook or template, no help button and no owner other than [**OwnerHwnd**](#ownerhwnd). The dialog is modal and has the title *Color*.

When the user chooses **OK**, [**ShowDialog**](#showdialog) stores the color in [**Color**](#color) and returns **True**. When the user chooses **Cancel**, or closes the dialog, it returns **False** and leaves **Color** as it was. No error is raised in either case, and no value tells a cancel from a failure of the call.

The color is a plain number. A system color constant such as `vbButtonFace` (`&H8000000F`) is not turned into the color it names: it is passed to the dialog as it is, and [**Red**](#red), [**Green**](#green) and [**Blue**](#blue) do not read a value with the high bit set in a meaningful way (see [**Color**](#color)).

### Custom colors

The object keeps 16 custom colors, numbered 0 to 15, for the 16 custom boxes of the dialog. They start as the colors of **QBColor**(0) to **QBColor**(15) and last as long as the object does, so a second dialog of the same object shows the custom colors that the first one left. Nothing is saved to the registry or to a file.

> [!NOTE]
> The **Add to Custom Colors** button of the expanded dialog writes into the custom colors of the object at once. Choosing **Cancel** afterwards leaves [**Color**](#color) unchanged but keeps the added custom color. [**Reset**](#reset) restores the 16 starting colors.

## Properties

### AnyColor
{: .no_toc }

Whether the dialog shows all the colors of the basic set.

Syntax: *object*.**AnyColor** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `CC_ANYCOLOR`. Windows decides what the flag changes on the screen in use.

```tb check_build
Dim dlg As New cDialogColor

dlg.AnyColor = False
dlg.SolidColor = True
Debug.Print dlg.AnyColor
```

### Blue
{: .no_toc }

The blue part of the color.

Syntax: *object*.**Blue** [ **=** *value* ]

A **Long** from 0 to 255. Setting a value below 0 stores 0, and above 255 stores 255, without an error. Reading returns the third byte of [**Color**](#color). Setting **Blue** changes the other two parts not at all.

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.Color = RGB(10, 20, 30)
dlg.Blue = 300
Debug.Print dlg.Blue
Debug.Print dlg.ToRgbString()
' Output:
' 255
' RGB(10, 20, 255)
```

### Color
{: .no_toc }

The selected color.

Syntax: *object*.**Color** [ **=** *value* ]

A **Long** in the layout `&H00BBGGRR`: red in the lowest byte, then green, then blue. Its default is `vbWhite` (`&HFFFFFF`). It is the color that the dialog shows when it opens, and the color that the user chose after a [**ShowDialog**](#showdialog) that returned **True**.

Any **Long** is accepted and stored as it is. For a negative value, such as a system color constant or -1, [**Red**](#red) reads the lowest byte, but [**Green**](#green) and [**Blue**](#blue) divide the negative number, which rounds toward zero, before they take a byte, and so read other bytes than the ones of the color: -1 reads as red 255, green 0, blue 0, and `&H80000005` as red 5, green 1, blue 1.

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.Color = vbWhite
Debug.Print Hex$(dlg.Color)
dlg.Color = RGB(10, 20, 30)
Debug.Print Hex$(dlg.Color)
Debug.Print dlg.Red
Debug.Print dlg.Green
Debug.Print dlg.Blue
' Output:
' FFFFFF
' 1E140A
' 10
' 20
' 30
```

### FullOpen
{: .no_toc }

Whether the dialog opens with the part for defining custom colors already shown.

Syntax: *object*.**FullOpen** [ **=** *value* ]

A **Boolean**, **False** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `CC_FULLOPEN`: the dialog opens expanded, with the *Red*, *Green* and *Blue* boxes filled with the parts of [**Color**](#color) and enabled, and the *Define Custom Colors* button disabled. When it is **False**, those boxes are empty and disabled until the user chooses the button.

With **FullOpen** and [**PreventFullOpen**](#preventfullopen) both **True**, the dialog opens expanded and the button stays disabled.

```tb check_build
Dim dlg As New cDialogColor

dlg.FullOpen = True
dlg.Color = RGB(10, 20, 30)
Debug.Print dlg.ShowDialog()
```

### Green
{: .no_toc }

The green part of the color.

Syntax: *object*.**Green** [ **=** *value* ]

A **Long** from 0 to 255, clamped as [**Blue**](#blue) is. Reading returns the second byte of [**Color**](#color).

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.Color = RGB(10, 20, 30)
dlg.Green = -4
Debug.Print dlg.Green
Debug.Print dlg.ToHtmlColor()
' Output:
' 0
' #0A001E
```

### OwnerHwnd
{: .no_toc }

The window that owns the dialog.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

A **LongPtr** window handle, 0 by default, which gives the dialog no owner. [**ShowDialog**](#showdialog) passes it as the owner window of the call.

```tb check_build
Private Sub PickColor(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogColor

    dlg.OwnerHwnd = ownerWindow         ' the handle of a window of the program
    Debug.Print dlg.OwnerHwnd
    Debug.Print dlg.ShowDialog()
End Sub
```

### PreventFullOpen
{: .no_toc }

Whether the user is kept from defining custom colors.

Syntax: *object*.**PreventFullOpen** [ **=** *value* ]

A **Boolean**, **False** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `CC_PREVENTFULLOPEN`, which disables the *Define Custom Colors* button. A dialog that is not expanded then stays small. With [**FullOpen**](#fullopen) also **True** it opens expanded, and the user can still type values.

```tb check_build
Dim dlg As New cDialogColor

dlg.PreventFullOpen = True
Debug.Print dlg.ShowDialog()
```

### Red
{: .no_toc }

The red part of the color.

Syntax: *object*.**Red** [ **=** *value* ]

A **Long** from 0 to 255, clamped as [**Blue**](#blue) is. Reading returns the lowest byte of [**Color**](#color).

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.Red = 200
dlg.Green = 100
dlg.Blue = 50
Debug.Print Hex$(dlg.Color)
' Output:
' 3264C8
```

### SolidColor
{: .no_toc }

Whether the dialog shows only solid colors.

Syntax: *object*.**SolidColor** [ **=** *value* ]

A **Boolean**, **False** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `CC_SOLIDCOLOR`. Windows decides what the flag changes on the screen in use.

```tb check_build
Dim dlg As New cDialogColor

dlg.SolidColor = True
Debug.Print dlg.SolidColor
```

## Methods

### FromHtmlColor
{: .no_toc }

Sets the color from text of the form `#RRGGBB`.

Syntax: *object*.**FromHtmlColor** ( *htmlColor* )

*htmlColor*
: *required* A **String** of six hexadecimal digits, with or without a leading `#`. Spaces before and after are ignored, and the letters may be of either case.

The method sets [**Red**](#red), [**Green**](#green) and [**Blue**](#blue) from the three pairs of digits. It raises no error for text it cannot read, and leaves the color as it was when the text, without its `#`, is not exactly 6 characters long: `#abc`, an empty string, a seventh digit and `&HFF0000` are all ignored. A pair that is not hexadecimal ends the method at that pair, with the parts before it already set: `#12345G` sets red to `&H12` and green to `&H34` and leaves blue as it was.

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.FromHtmlColor "#00FF7F"
Debug.Print dlg.ToRgbString()
dlg.FromHtmlColor "  ff8000 "
Debug.Print dlg.ToHtmlColor()
dlg.FromHtmlColor "#abc"            ' ignored
Debug.Print dlg.ToHtmlColor()
' Output:
' RGB(0, 255, 127)
' #FF8000
' #FF8000
```

### GetCustomColor
{: .no_toc }

Returns one of the 16 custom colors.

Syntax: *object*.**GetCustomColor** ( *index* ) **As Long**

*index*
: *required* A **Long** from 0 to 15.

Returns the custom color as a **Long** in the layout of [**Color**](#color). An *index* outside 0 to 15 gives 0, which is black, without an error.

```tb check_build check_run
Dim dlg As New cDialogColor

Debug.Print Hex$(dlg.GetCustomColor(1))
Debug.Print Hex$(dlg.GetCustomColor(15))
Debug.Print dlg.GetCustomColor(16)
' Output:
' 800000
' FFFFFF
' 0
```

### Reset
{: .no_toc }

Restores every property and the 16 custom colors to their starting values.

Syntax: *object*.**Reset**

[**Color**](#color) becomes white, [**FullOpen**](#fullopen), [**PreventFullOpen**](#preventfullopen) and [**SolidColor**](#solidcolor) **False**, [**AnyColor**](#anycolor) **True**, [**OwnerHwnd**](#ownerhwnd) 0, and the custom colors the colors of **QBColor**(0) to **QBColor**(15).

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.Color = vbRed
dlg.SetCustomColor 0, vbRed
dlg.Reset
Debug.Print Hex$(dlg.Color)
Debug.Print Hex$(dlg.GetCustomColor(0))
' Output:
' FFFFFF
' 0
```

### SetCustomColor
{: .no_toc }

Sets one of the 16 custom colors.

Syntax: *object*.**SetCustomColor** ( *index*, *color* )

*index*
: *required* A **Long** from 0 to 15. Any other value is ignored, without an error.

*color*
: *required* A **Long** in the layout of [**Color**](#color).

The next [**ShowDialog**](#showdialog) shows the color in the custom box of that number.

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.SetCustomColor 3, RGB(17, 34, 51)
dlg.SetCustomColor 99, vbRed        ' ignored
Debug.Print Hex$(dlg.GetCustomColor(3))
' Output:
' 332211
```

### SetRgb
{: .no_toc }

Sets the color from its three parts.

Syntax: *object*.**SetRgb** ( *red*, *green*, *blue* )

*red*, *green*, *blue*
: *required* A **Long** for each part. A value outside 0 to 255 is clamped, as the properties [**Red**](#red), [**Green**](#green) and [**Blue**](#blue) clamp it.

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.SetRgb 255, 128, 0
Debug.Print dlg.ToHtmlColor()
dlg.SetRgb 300, -5, 7
Debug.Print dlg.ToRgbString()
' Output:
' #FF8000
' RGB(255, 0, 7)
```

### ShowDialog
{: .no_toc }

Shows the Color dialog.

Syntax: *object*.**ShowDialog** ( ) **As Boolean**

Returns **True** when the user chose **OK**, and then [**Color**](#color) holds the chosen color. Returns **False** when the user cancelled, and **Color** is unchanged. See [How the dialog is shown](#how-the-dialog-is-shown).

```tb check_build
Dim dlg As New cDialogColor

dlg.Color = vbBlue
dlg.SetCustomColor 0, RGB(255, 128, 0)
If dlg.ShowDialog() Then
    Debug.Print "Chosen: " & dlg.ToHtmlColor()
End If
```

### ToHtmlColor
{: .no_toc }

Returns the color as text of the form `#RRGGBB`.

Syntax: *object*.**ToHtmlColor** ( ) **As String**

The result has seven characters: a `#` and two upper-case hexadecimal digits each for red, green and blue.

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.Color = RGB(160, 176, 192)
Debug.Print dlg.ToHtmlColor()
' Output:
' #A0B0C0
```

### ToRgbString
{: .no_toc }

Returns the color as text of the form `RGB(r, g, b)`.

Syntax: *object*.**ToRgbString** ( ) **As String**

The three parts are decimal numbers, separated by a comma and a space.

```tb check_build check_run
Dim dlg As New cDialogColor

dlg.Color = RGB(160, 176, 192)
Debug.Print dlg.ToRgbString()
' Output:
' RGB(160, 176, 192)
```

## See Also

- [cDialogFont](cDialogFont) class -- shows the Font dialog
- [cDialogPrint](cDialogPrint) class -- shows the Print dialog
- [cDialog](cDialog/) class -- shows the Open, Save As and Browse For Folder dialogs
- [TBMANLIB_Dialog](.) package -- overview
