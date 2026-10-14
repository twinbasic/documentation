---
title: cDialogFont
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogFont
has_toc: false
---

# cDialogFont class
{: .no_toc }

A **cDialogFont** shows the Windows Font dialog, in which the user picks a face, a style, a size and, optionally, a color and the effects underline and strikeout. It holds the choice as properties, and describes it as text: a short description and a line of CSS.

**Properties:** [**Bold**](#bold), [**Color**](#color), [**FaceName**](#facename), [**FixedPitchOnly**](#fixedpitchonly), [**ForceFontExist**](#forcefontexist), [**Italic**](#italic), [**MaxSize**](#maxsize), [**MinSize**](#minsize), [**OwnerHwnd**](#ownerhwnd), [**ScreenFontsOnly**](#screenfontsonly), [**ShowEffects**](#showeffects), [**Size**](#size), [**StrikeOut**](#strikeout), [**Style**](#style), [**Underline**](#underline).
**Methods:** [**Reset**](#reset), [**ShowDialog**](#showdialog), [**ToCssFont**](#tocssfont), [**ToDescription**](#todescription).
**Enumerations:** [**FontFamily**](#fontfamily), [**FontPitch**](#fontpitch), [**FontStyle**](#fontstyle), [**FontWeight**](#fontweight).

Create an object with `Dim dlg As New cDialogFont`. The class is declared `[COMCreatable(False)]`, so **CreateObject** cannot make one, and **New** can.

```tb check_build
Dim dlg As New cDialogFont

dlg.FaceName = "Consolas"
dlg.Size = 11
If dlg.ShowDialog() Then
    Debug.Print dlg.ToDescription()
    Debug.Print dlg.ToCssFont()
Else
    Debug.Print "Cancelled"
End If
```

## How the dialog is shown

[**ShowDialog**](#showdialog) calls `ChooseFontW` with a `LOGFONT` made from the properties and the flag `CF_INITTOLOGFONTSTRUCT`, which is always set. The size is passed in points, as the structure holds it in tenths of a point, and as a height in pixels at 96 dots per inch (`-Size * 96 / 72`). Four properties set a flag when they are **True**: [**ScreenFontsOnly**](#screenfontsonly) (`CF_SCREENFONTS`), [**ShowEffects**](#showeffects) (`CF_EFFECTS`), [**ForceFontExist**](#forcefontexist) (`CF_FORCEFONTEXIST`) and [**FixedPitchOnly**](#fixedpitchonly) (`CF_FIXEDPITCHONLY`, together with a fixed pitch in the `LOGFONT`). `CF_LIMITSIZE` is set when [**MinSize**](#minsize) or [**MaxSize**](#maxsize) is above 0. The class sets no hook, template, printer device context or help button. The dialog is modal and has the title *Font*.

When the user chooses **OK**, [**ShowDialog**](#showdialog) stores the face, the size, the bold and italic parts of the style, the underline and strikeout effects and the color in the properties, and returns **True**. When the user chooses **Cancel**, or closes the dialog, it returns **False** and leaves every property as it was. No error is raised in either case.

The face list holds every font that Windows lists for the screen, including the vertical variants, whose names begin with `@`: the class sets no flag that hides them. The list of styles, the script box and the colors depend on the face and on Windows, and the class reads neither the style name nor the script that the user chose, only the weight and the italic bit.

> [!WARNING] 1.1.0.0
> **ShowDialog** also returns **False**, without showing a dialog, when the call to Windows fails. A **MinSize** above 0 with **MaxSize** left at 0, or a **MinSize** above **MaxSize**, makes it fail. The class does not read the error code, so the program cannot tell such a failure from a **Cancel**. Set both [**MinSize**](#minsize) and [**MaxSize**](#maxsize), or neither.

## Properties

### Bold
{: .no_toc }

Whether the font is bold.

Syntax: *object*.**Bold** [ **=** *value* ]

A **Boolean**, **False** by default. It is bit 1 of [**Style**](#style): setting it sets or clears that bit and leaves bit 2 (italic) alone. After a [**ShowDialog**](#showdialog) that returned **True** it is **True** when the weight of the chosen font is 700 or more, so a style such as *Semibold* (600) gives **False**.

```tb check_build check_run
Dim dlg As New cDialogFont

dlg.Bold = True
dlg.Italic = True
dlg.Bold = False
Debug.Print dlg.Style
Debug.Print dlg.Italic
' Output:
' 2
' True
```

### Color
{: .no_toc }

The color of the text.

Syntax: *object*.**Color** [ **=** *value* ]

A **Long** in the layout of the **RGB** function (`&H00BBGGRR`), black by default. It is the color the dialog shows when [**ShowEffects**](#showeffects) is **True**, and after **OK** it holds one of the 16 colors of the dialog's color box, such as `&H8000` for *Green*. Any **Long** is accepted and stored as it is.

```tb check_build
Dim dlg As New cDialogFont

dlg.Color = RGB(0, 0, 128)
dlg.ShowEffects = True
Debug.Print Hex$(dlg.Color)
```

### FaceName
{: .no_toc }

The name of the font face.

Syntax: *object*.**FaceName** [ **=** *value* ]

A **String**, `Segoe UI` by default. The dialog opens with that face selected. A name that is not an installed face leaves the face box empty, and then the property [**ForceFontExist**](#forcefontexist) decides what **OK** does.

```tb check_build
Dim dlg As New cDialogFont

dlg.FaceName = "Courier New"
Debug.Print dlg.FaceName
```

### FixedPitchOnly
{: .no_toc }

Whether the dialog lists only fixed-pitch fonts.

Syntax: *object*.**FixedPitchOnly** [ **=** *value* ]

A **Boolean**, **False** by default. When it is **True**, the dialog lists only fonts whose characters have one width, such as `Consolas` and `Courier New`. Set [**FaceName**](#facename) to one of them, or the face box opens without a selection.

```tb check_build
Dim dlg As New cDialogFont

dlg.FixedPitchOnly = True
dlg.FaceName = "Consolas"
Debug.Print dlg.ShowDialog()
```

### ForceFontExist
{: .no_toc }

Whether the dialog accepts only the name of an installed face.

Syntax: *object*.**ForceFontExist** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **True** and the face box holds a name that is not in the list, **OK** shows a message, *There is no font with that name. Choose a font from the list of fonts.*, and the dialog stays open; **Cancel** then returns **False** and keeps [**FaceName**](#facename). When it is **False**, **OK** closes the dialog.

> [!NOTE] 1.1.0.0
> With **ForceFontExist** **False** and a [**FaceName**](#facename) that is not installed, **OK** returns **True** and sets **FaceName** to an empty string.

```tb check_build
Dim dlg As New cDialogFont

dlg.ForceFontExist = False
dlg.FaceName = "A Face Of My Own"
If dlg.ShowDialog() Then
    Debug.Print "[" & dlg.FaceName & "]"
End If
```

### Italic
{: .no_toc }

Whether the font is italic.

Syntax: *object*.**Italic** [ **=** *value* ]

A **Boolean**, **False** by default. It is bit 2 of [**Style**](#style), set and cleared as [**Bold**](#bold) sets and clears bit 1.

```tb check_build check_run
Dim dlg As New cDialogFont

dlg.Italic = True
Debug.Print dlg.Style
Debug.Print dlg.Bold
' Output:
' 2
' False
```

### MaxSize
{: .no_toc }

The largest size, in points, that the dialog accepts.

Syntax: *object*.**MaxSize** [ **=** *value* ]

A **Long**, 0 by default, which means no limit. Above 0, [**ShowDialog**](#showdialog) sets `CF_LIMITSIZE` and passes the value as the largest size. The size list then ends at the largest standard size not above it, and a size that the user types above it is refused with a message and the dialog stays open. The message, for the limits 10 and 14, is *Size must be between 10 and 14 points.*

A **MaxSize** alone is valid. A [**MinSize**](#minsize) above it makes the call fail: see the warning on [**ShowDialog**](#showdialog).

```tb check_build
Dim dlg As New cDialogFont

dlg.MinSize = 10
dlg.MaxSize = 14
dlg.Size = 12
Debug.Print dlg.ShowDialog()
```

### MinSize
{: .no_toc }

The smallest size, in points, that the dialog accepts.

Syntax: *object*.**MinSize** [ **=** *value* ]

A **Long**, 0 by default, which means no limit. Above 0, [**ShowDialog**](#showdialog) sets `CF_LIMITSIZE` and passes the value as the smallest size. The size list then starts at the smallest standard size not below it.

> [!WARNING] 1.1.0.0
> A **MinSize** above 0 needs a [**MaxSize**](#maxsize) of at least the same value. With **MaxSize** left at 0, [**ShowDialog**](#showdialog) returns **False** at once, without a dialog, as if the user had cancelled.

```tb check_build
Dim dlg As New cDialogFont

dlg.MinSize = 8
dlg.MaxSize = 72
Debug.Print dlg.MinSize
```

### OwnerHwnd
{: .no_toc }

The window that owns the dialog.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

A **LongPtr** window handle, 0 by default, which gives the dialog no owner. [**ShowDialog**](#showdialog) passes it as the owner window of the call.

```tb check_build
Private Sub PickFont(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogFont

    dlg.OwnerHwnd = ownerWindow         ' the handle of a window of the program
    Debug.Print dlg.OwnerHwnd
    Debug.Print dlg.ShowDialog()
End Sub
```

### ScreenFontsOnly
{: .no_toc }

Whether the dialog lists the fonts of the screen.

Syntax: *object*.**ScreenFontsOnly** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `CF_SCREENFONTS`. The class never sets the flag for printer fonts, and the documentation of `ChooseFont` asks for one of the two, so leave the property **True**. On Windows 10 a **False** still shows the same dialog with the same fonts.

```tb check_build
Dim dlg As New cDialogFont

dlg.ScreenFontsOnly = True
Debug.Print dlg.ScreenFontsOnly
```

### ShowEffects
{: .no_toc }

Whether the dialog offers the effects strikeout and underline, and the color.

Syntax: *object*.**ShowEffects** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **True**, [**ShowDialog**](#showdialog) sets `CF_EFFECTS` and the dialog shows the *Strikeout* and *Underline* check boxes and the *Color* box. When it is **False** they are hidden, and [**Underline**](#underline), [**StrikeOut**](#strikeout) and [**Color**](#color) keep the values they had.

```tb check_build
Dim dlg As New cDialogFont

dlg.ShowEffects = False
dlg.Underline = True
If dlg.ShowDialog() Then Debug.Print dlg.Underline      ' still True
```

### Size
{: .no_toc }

The size of the font, in points.

Syntax: *object*.**Size** [ **=** *value* ]

A **Double**, 9 by default. A value of 0 or less is ignored, without an error, and the size is not changed. After **OK** it holds the size the dialog returns, which is a number of tenths of a point divided by 10.

```tb check_build check_run
Dim dlg As New cDialogFont

dlg.Size = 12
dlg.Size = 0            ' ignored
dlg.Size = -3           ' ignored
Debug.Print dlg.Size
' Output:
' 12
```

### StrikeOut
{: .no_toc }

Whether the text is struck out.

Syntax: *object*.**StrikeOut** [ **=** *value* ]

A **Boolean**, **False** by default. It is the strikeout effect of the dialog. [**ToDescription**](#todescription) names it, and [**ToCssFont**](#tocssfont) leaves it out.

```tb check_build
Dim dlg As New cDialogFont

dlg.StrikeOut = True
Debug.Print dlg.ToDescription()
```

### Style
{: .no_toc }

The bold and italic parts of the style, as one number.

Syntax: *object*.**Style** [ **=** *value* ]

A [**FontStyle**](#fontstyle). Bit 1 is [**Bold**](#bold) and bit 2 is [**Italic**](#italic). The property holds the number that was assigned, whatever it is: `4` is accepted and gives **Bold** and **Italic** both **False**.

```tb check_build check_run
Dim dlg As New cDialogFont

dlg.Style = FontStyle.StyleBoldItalic
Debug.Print dlg.Bold
Debug.Print dlg.Italic
dlg.Style = 4
Debug.Print dlg.Bold
' Output:
' True
' True
' False
```

### Underline
{: .no_toc }

Whether the text is underlined.

Syntax: *object*.**Underline** [ **=** *value* ]

A **Boolean**, **False** by default. It is the underline effect of the dialog. [**ToCssFont**](#tocssfont) writes it as `text-decoration`.

```tb check_build
Dim dlg As New cDialogFont

dlg.Underline = True
Debug.Print dlg.ToCssFont()
```

## Methods

### Reset
{: .no_toc }

Restores every property to its starting value.

Syntax: *object*.**Reset**

[**FaceName**](#facename) becomes `Segoe UI`, [**Size**](#size) 9, [**Style**](#style) regular, [**Color**](#color) black, [**Underline**](#underline), [**StrikeOut**](#strikeout) and [**FixedPitchOnly**](#fixedpitchonly) **False**, [**ForceFontExist**](#forcefontexist), [**ShowEffects**](#showeffects) and [**ScreenFontsOnly**](#screenfontsonly) **True**, and [**OwnerHwnd**](#ownerhwnd), [**MinSize**](#minsize) and [**MaxSize**](#maxsize) 0.

```tb check_build check_run
Dim dlg As New cDialogFont

dlg.FaceName = "Courier New"
dlg.Size = 14
dlg.Bold = True
dlg.Reset
Debug.Print dlg.ToDescription()
' Output:
' Segoe UI 9pt
```

### ShowDialog
{: .no_toc }

Shows the Font dialog.

Syntax: *object*.**ShowDialog** ( ) **As Boolean**

Returns **True** when the user chose **OK**, and then the properties hold the choice. Returns **False** when the user cancelled, and the properties are unchanged. Any error inside the method is trapped and also gives **False**. See [How the dialog is shown](#how-the-dialog-is-shown), and the warning there: **False** is also the answer to a call that Windows refused.

```tb check_build
Dim dlg As New cDialogFont

dlg.FaceName = "Courier New"
dlg.Size = 10
If dlg.ShowDialog() Then
    Debug.Print dlg.ToDescription()
End If
```

### ToCssFont
{: .no_toc }

Returns the font as a line of CSS.

Syntax: *object*.**ToCssFont** ( ) **As String**

The result has the form

`font-family: 'Segoe UI'; font-size: 9pt; font-weight: normal; font-style: normal; text-decoration: none;`

with the face name between single quotes, the size in points, `bold` or `normal`, `italic` or `normal`, and `underline` or `none`. It does not write [**StrikeOut**](#strikeout) or [**Color**](#color). A single quote in the face name is written as it is, without an escape, and ends the quoted name early. A fractional size is written with the decimal separator of the regional settings of the computer, so the CSS is wrong where that is a comma.

```tb check_build check_run
Dim dlg As New cDialogFont

dlg.FaceName = "Courier New"
dlg.Size = 14
dlg.Bold = True
dlg.Italic = True
dlg.Underline = True
Debug.Print dlg.ToCssFont()
' Output:
' font-family: 'Courier New'; font-size: 14pt; font-weight: bold; font-style: italic; text-decoration: underline;
```

### ToDescription
{: .no_toc }

Returns the font as a short line of text.

Syntax: *object*.**ToDescription** ( ) **As String**

The face name, a space, the size and `pt`, then ` Bold`, ` Italic`, ` Underline` and ` Strikeout` for each that is set, in that order. The color is not part of it. A fractional size is written with the decimal separator of the regional settings of the computer.

```tb check_build check_run
Dim dlg As New cDialogFont

Debug.Print dlg.ToDescription()
dlg.FaceName = "Courier New"
dlg.Size = 14
dlg.Style = FontStyle.StyleBoldItalic
dlg.Underline = True
dlg.StrikeOut = True
Debug.Print dlg.ToDescription()
' Output:
' Segoe UI 9pt
' Courier New 14pt Bold Italic Underline Strikeout
```

## Enumerations

The enumerations are declared inside the class. A program names their members with the name of the enumeration in front, as in the samples, or by the member alone, such as `StyleBold`. The name of the class cannot be put in front: `cDialogFont.FontStyle.StyleBold` is refused with TB5079, *Unrecognized symbol 'cDialogFont'*. Only **FontStyle** is used by a member, the property [**Style**](#style). The other three hold Windows constants for the font structure and are not taken or returned by any member.

### FontFamily
{: .no_toc }

The font families of Windows.

| Member | Value |
|:-------|------:|
| **FF_DONTCARE** | 0 |
| **FF_ROMAN** | 16 |
| **FF_SWISS** | 32 |
| **FF_MODERN** | 48 |
| **FF_SCRIPT** | 64 |
| **FF_DECORATIVE** | 80 |

### FontPitch
{: .no_toc }

The pitch of a font.

| Member | Value |
|:-------|------:|
| **DEFAULT_PITCH** | 0 |
| **FIXED_PITCH** | 1 |
| **VARIABLE_PITCH** | 2 |

### FontStyle
{: .no_toc }

The bold and italic parts of a style, the type of [**Style**](#style).

| Member | Value | Meaning |
|:-------|------:|:--------|
| **StyleRegular** | 0 | Neither bold nor italic. |
| **StyleBold** | 1 | Bold. |
| **StyleItalic** | 2 | Italic. |
| **StyleBoldItalic** | 3 | Bold and italic. |

### FontWeight
{: .no_toc }

The weights of a font, as Windows numbers them.

| Member | Value |
|:-------|------:|
| **FW_DONTCARE** | 0 |
| **FW_THIN** | 100 |
| **FW_EXTRALIGHT** | 200 |
| **FW_LIGHT** | 300 |
| **FW_NORMAL** | 400 |
| **FW_MEDIUM** | 500 |
| **FW_SEMIBOLD** | 600 |
| **FW_BOLD** | 700 |
| **FW_EXTRABOLD** | 800 |
| **FW_HEAVY** | 900 |

```tb check_build check_run
Debug.Print FontWeight.FW_BOLD
Debug.Print FontFamily.FF_SWISS
Debug.Print FontPitch.FIXED_PITCH
Debug.Print FontStyle.StyleBoldItalic
' Output:
' 700
' 32
' 1
' 3
```

## See Also

- [cDialogColor](cDialogColor) class -- shows the Color dialog
- [cDialogPrint](cDialogPrint) class -- shows the Print dialog
- [cDialog](cDialog/) class -- shows the Open, Save As and Browse For Folder dialogs
- [TBMANLIB_Dialog](.) package -- overview
