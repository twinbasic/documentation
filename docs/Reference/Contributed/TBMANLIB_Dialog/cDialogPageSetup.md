---
title: cDialogPageSetup
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/cDialogPageSetup
has_toc: false
---

# cDialogPageSetup class
{: .no_toc }

A **cDialogPageSetup** shows the Windows Page Setup dialog, in which the user picks the paper, its orientation and the four margins of a page. It holds the page as properties, in inches, with ready-made sizes and margins, and works out the printable area.

<!-- test: CDialogPageSetupTests.ToDescription_WithMillimetersWritesMillimeters, CDialogPageSetupTests.ShowDialog_PaperSizeSetBeforeTheCallIsTheOneTheDialogOpensWith, CDialogPageSetupTests.ShowDialog_OrientationSetBeforeTheCallSelectsLandscape, CDialogPageSetupTests.ShowDialog_OrientationChosenInTheDialogIsReadBack -->
> [!WARNING] 1.1.0.0
> Three things give a wrong result without an error. [**PaperWidth**](#paperwidth) and [**PaperHeight**](#paperheight) are not passed to the dialog, so it opens with the paper of the default printer whatever they hold. [**Orientation**](#orientation) is neither passed to the dialog nor read from it: a user who chooses *Landscape* leaves **Orientation** at **Portrait** and swaps the paper width and height instead. With [**Unit**](#unit) set to **Millimeters**, [**ToDescription**](#todescription) writes the values in inches and labels them `mm`.

**Properties:** [**AllowMargins**](#allowmargins), [**AllowOrientation**](#alloworientation), [**AllowPaper**](#allowpaper), [**DefaultMinMargins**](#defaultminmargins), [**MarginBottom**](#marginbottom), [**MarginLeft**](#marginleft), [**MarginRight**](#marginright), [**MarginTop**](#margintop), [**Orientation**](#orientation), [**OwnerHwnd**](#ownerhwnd), [**PaperHeight**](#paperheight), [**PaperWidth**](#paperwidth), [**Unit**](#unit).
**Methods:** [**GetPrintableHeight**](#getprintableheight), [**GetPrintableWidth**](#getprintablewidth), [**Reset**](#reset), [**SetA4Size**](#seta4size), [**SetDefaultMargins**](#setdefaultmargins), [**SetLegalSize**](#setlegalsize), [**SetLetterSize**](#setlettersize), [**SetNarrowMargins**](#setnarrowmargins), [**ShowDialog**](#showdialog), [**ToDescription**](#todescription).
**Enumerations:** [**MeasurementUnit**](#measurementunit), [**PaperOrientation**](#paperorientation).

Create an object with `Dim dlg As New cDialogPageSetup`. The class is declared `[COMCreatable(False)]`, so **CreateObject** cannot make one, and **New** can.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.SetNarrowMargins
If dlg.ShowDialog() Then
    Debug.Print dlg.ToDescription()
    Debug.Print dlg.GetPrintableWidth() & " x " & dlg.GetPrintableHeight() & " inches"
Else
    Debug.Print "Cancelled"
End If
```

<!-- test: CDialogPageSetupTests.ShowDialog_CancelReturnsFalseAndKeepsTheProperties -->
## How the dialog is shown

[**ShowDialog**](#showdialog) calls `PageSetupDlgW` with the flag `PSD_MARGINS`, which is always set, and one of `PSD_INTHOUSANDTHSOFINCHES` and `PSD_INHUNDREDTHSOFMILLIMETERS`, which [**Unit**](#unit) selects. [**AllowMargins**](#allowmargins), [**AllowOrientation**](#alloworientation) and [**AllowPaper**](#allowpaper) set `PSD_DISABLEMARGINS`, `PSD_DISABLEORIENTATION` and `PSD_DISABLEPAPER` when they are **False**. The class sets no hook, template, minimum margins, help button or printer. The dialog is modal and has the title *Page Setup*.

All the values the class holds are in **inches**, whatever [**Unit**](#unit) says. **Unit** decides only the unit in which the class talks to Windows: the margins are converted to thousandths of an inch or to hundredths of a millimeter on the way in, and converted back on the way out. The dialog shows its margins in that unit, with the heading *Margins (inches)* or *Margins (millimeters)*: one inch appears as `1` or `25.4`.

When the user chooses **OK**, [**ShowDialog**](#showdialog) stores the paper size and the four margins that the dialog returns and returns **True**. When the user chooses **Cancel**, or closes the dialog, it returns **False** and leaves every property as it was. No error is raised in either case.

The class gives the dialog no printer data and frees the data Windows returns, so the printer the user chose, the paper source and the other settings of the printer are lost. What remains is the size of the paper that the dialog shows when it closes, in [**PaperWidth**](#paperwidth) and [**PaperHeight**](#paperheight). The paper that the dialog offers first is the one of the default printer.

<!-- /test -->

<!-- test: CDialogPageSetupTests.Defaults_AreThoseOfThePage, CDialogPageSetupTests.Margins_AreStoredWithoutACheck, CDialogPageSetupTests.Unit_Millimeters_KeepsThePropertiesInInches -->
## Properties

### AllowMargins
{: .no_toc }

Whether the user may change the margins.

Syntax: *object*.**AllowMargins** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, [**ShowDialog**](#showdialog) sets `PSD_DISABLEMARGINS`, and the four margin boxes are shown disabled with the values of [**MarginLeft**](#marginleft), [**MarginTop**](#margintop), [**MarginRight**](#marginright) and [**MarginBottom**](#marginbottom).

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.AllowMargins = False
Debug.Print dlg.AllowMargins
```

### AllowOrientation
{: .no_toc }

Whether the user may change the orientation.

Syntax: *object*.**AllowOrientation** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, [**ShowDialog**](#showdialog) sets `PSD_DISABLEORIENTATION`, and the *Portrait* and *Landscape* buttons are shown disabled.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.AllowOrientation = False
Debug.Print dlg.AllowOrientation
```

### AllowPaper
{: .no_toc }

Whether the user may change the paper size and source.

Syntax: *object*.**AllowPaper** [ **=** *value* ]

A **Boolean**, **True** by default. When it is **False**, [**ShowDialog**](#showdialog) sets `PSD_DISABLEPAPER`, and the *Size* and *Source* boxes are shown disabled.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.AllowPaper = False
Debug.Print dlg.AllowPaper
```

### DefaultMinMargins
{: .no_toc }

Whether the dialog uses the default minimum margins.

Syntax: *object*.**DefaultMinMargins** [ **=** *value* ]

A **Boolean**, **True** by default. It has no effect: when it is **True**, [**ShowDialog**](#showdialog) combines the flags with `PSD_DEFAULTMINMARGINS`, whose value is 0, and no minimum margin is ever passed.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.DefaultMinMargins = False
Debug.Print dlg.DefaultMinMargins
```

### MarginBottom
{: .no_toc }

The bottom margin, in inches.

Syntax: *object*.**MarginBottom** [ **=** *value* ]

A **Double**, 1 by default. It is shown in the *Bottom* box of the dialog and is replaced by the value the user leaves there. A value is not checked.

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.MarginBottom = 2
Debug.Print dlg.MarginBottom
' Output:
' 2
```

### MarginLeft
{: .no_toc }

The left margin, in inches.

Syntax: *object*.**MarginLeft** [ **=** *value* ]

A **Double**, 1 by default, handled as [**MarginBottom**](#marginbottom) is.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.MarginLeft = 1.25
Debug.Print dlg.MarginLeft
```

### MarginRight
{: .no_toc }

The right margin, in inches.

Syntax: *object*.**MarginRight** [ **=** *value* ]

A **Double**, 1 by default, handled as [**MarginBottom**](#marginbottom) is.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.MarginRight = 1.25
Debug.Print dlg.MarginRight
```

### MarginTop
{: .no_toc }

The top margin, in inches.

Syntax: *object*.**MarginTop** [ **=** *value* ]

A **Double**, 1 by default, handled as [**MarginBottom**](#marginbottom) is.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.MarginTop = 0.75
Debug.Print dlg.MarginTop
```

### Orientation
{: .no_toc }

The orientation of the page.

Syntax: *object*.**Orientation** [ **=** *value* ]

A [**PaperOrientation**](#paperorientation), **Portrait** by default.

<!-- /test -->

<!-- test: CDialogPageSetupTests.ShowDialog_OrientationSetBeforeTheCallSelectsLandscape, CDialogPageSetupTests.ShowDialog_OrientationChosenInTheDialogIsReadBack -->
> [!WARNING] 1.1.0.0
> The property is only stored. [**ShowDialog**](#showdialog) does not pass it to the dialog, so a **Landscape** set before the call does not select *Landscape* in the dialog, and it does not read the orientation back. After a user chose *Landscape*, **Orientation** is as it was and [**PaperWidth**](#paperwidth) and [**PaperHeight**](#paperheight) have changed places. To find the orientation after the dialog, compare the two: the page is landscape when **PaperWidth** is the larger. [**ToDescription**](#todescription) names the stored value.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.Orientation = PaperOrientation.Landscape
If dlg.ShowDialog() Then
    Debug.Print IIf(dlg.PaperWidth > dlg.PaperHeight, "Landscape", "Portrait")
End If
```

### OwnerHwnd
{: .no_toc }

The window that owns the dialog.

Syntax: *object*.**OwnerHwnd** [ **=** *value* ]

A **LongPtr** window handle, 0 by default, which gives the dialog no owner. [**ShowDialog**](#showdialog) passes it as the owner window of the call. [**Reset**](#reset) does not change it.

```tb check_build
Private Sub SetupPage(ByVal ownerWindow As LongPtr)
    Dim dlg As New cDialogPageSetup

    dlg.OwnerHwnd = ownerWindow         ' the handle of a window of the program
    Debug.Print dlg.OwnerHwnd
    Debug.Print dlg.ShowDialog()
End Sub
```

### PaperHeight
{: .no_toc }

The height of the paper, in inches.

Syntax: *object*.**PaperHeight** [ **=** *value* ]

A **Double**, 11 by default. The value assigned is not passed to the dialog. After a [**ShowDialog**](#showdialog) that returned **True** it holds the height of the paper that the dialog shows, so it follows the printer and the orientation the user chose: for Letter paper it is 11 in portrait and 8.5 in landscape.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.SetA4Size
Debug.Print dlg.PaperHeight
```

### PaperWidth
{: .no_toc }

The width of the paper, in inches.

Syntax: *object*.**PaperWidth** [ **=** *value* ]

A **Double**, 8.5 by default, handled as [**PaperHeight**](#paperheight) is.

<!-- test: CDialogPageSetupTests.ShowDialog_PaperSizeSetBeforeTheCallIsTheOneTheDialogOpensWith -->
> [!WARNING] 1.1.0.0
> Setting **PaperWidth** and **PaperHeight**, or calling [**SetA4Size**](#seta4size) or [**SetLegalSize**](#setlegalsize), does not make the dialog open with that paper. The margins are passed, and the paper is the one of the default printer. After **OK** the two properties hold what the dialog returned, not what was set.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.PaperWidth = 8.5
Debug.Print dlg.PaperWidth
```

### Unit
{: .no_toc }

The unit in which the dialog shows the margins.

Syntax: *object*.**Unit** [ **=** *value* ]

A [**MeasurementUnit**](#measurementunit), **Inches** by default. It selects the unit of the dialog; the properties of the class stay in inches. See [How the dialog is shown](#how-the-dialog-is-shown).

<!-- test: CDialogPageSetupTests.ToDescription_WithMillimetersWritesMillimeters -->
> [!WARNING] 1.1.0.0
> With **Millimeters**, [**ToDescription**](#todescription) still writes inches and labels them `mm`: a 1 inch margin is described as `1.00 mm`.

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.Unit = MeasurementUnit.Millimeters
dlg.MarginLeft = 2          ' still inches: 50.8 mm
Debug.Print dlg.MarginLeft
Debug.Print dlg.Unit
' Output:
' 2
' 1
```

<!-- test: CDialogPageSetupTests.GetPrintableHeight_And_Width_SubtractTheMargins, CDialogPageSetupTests.SetPaperSizes_SetWidthAndHeight, CDialogPageSetupTests.SetMargins_SetAllFour, CDialogPageSetupTests.Reset_RestoresTheStartingValuesButNotTheOwner, CDialogPageSetupTests.ToDescription_HasTheDocumentedForm -->
## Methods

### GetPrintableHeight
{: .no_toc }

Returns the height of the area inside the margins, in inches.

Syntax: *object*.**GetPrintableHeight** ( ) **As Double**

[**PaperHeight**](#paperheight) minus [**MarginTop**](#margintop) and [**MarginBottom**](#marginbottom). The result is negative when the margins are larger than the paper.

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.PaperHeight = 12
dlg.MarginTop = 2
dlg.MarginBottom = 1
Debug.Print dlg.GetPrintableHeight()
' Output:
' 9
```

### GetPrintableWidth
{: .no_toc }

Returns the width of the area inside the margins, in inches.

Syntax: *object*.**GetPrintableWidth** ( ) **As Double**

[**PaperWidth**](#paperwidth) minus [**MarginLeft**](#marginleft) and [**MarginRight**](#marginright).

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.SetNarrowMargins
Debug.Print dlg.GetPrintableWidth() * 2
' Output:
' 15
```

### Reset
{: .no_toc }

Restores every property except the owner window to its starting value.

Syntax: *object*.**Reset**

[**Orientation**](#orientation) becomes **Portrait**, the paper Letter (8.5 by 11), the four margins 1, [**Unit**](#unit) **Inches**, the three **Allow** properties and [**DefaultMinMargins**](#defaultminmargins) **True**. [**OwnerHwnd**](#ownerhwnd) is not changed.

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.SetLegalSize
dlg.SetNarrowMargins
dlg.Reset
Debug.Print dlg.PaperHeight
Debug.Print dlg.MarginLeft
' Output:
' 11
' 1
```

### SetA4Size
{: .no_toc }

Sets the paper to A4.

Syntax: *object*.**SetA4Size**

[**PaperWidth**](#paperwidth) becomes 210 / 25.4 and [**PaperHeight**](#paperheight) 297 / 25.4 inches, 8.2677 by 11.6929. [**Orientation**](#orientation) is not changed. See the warning on **PaperWidth**: the dialog does not take the size.

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.SetA4Size
Debug.Print Int(dlg.PaperWidth * 100)
Debug.Print Int(dlg.PaperHeight * 100)
' Output:
' 826
' 1169
```

### SetDefaultMargins
{: .no_toc }

Sets all four margins to 1 inch.

Syntax: *object*.**SetDefaultMargins**

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.SetNarrowMargins
dlg.SetDefaultMargins
Debug.Print dlg.MarginTop + dlg.MarginBottom
' Output:
' 2
```

### SetLegalSize
{: .no_toc }

Sets the paper to Legal.

Syntax: *object*.**SetLegalSize**

[**PaperWidth**](#paperwidth) becomes 8.5 and [**PaperHeight**](#paperheight) 14 inches. See the warning on **PaperWidth**.

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.SetLegalSize
Debug.Print dlg.PaperHeight
' Output:
' 14
```

### SetLetterSize
{: .no_toc }

Sets the paper to Letter.

Syntax: *object*.**SetLetterSize**

[**PaperWidth**](#paperwidth) becomes 8.5 and [**PaperHeight**](#paperheight) 11 inches. See the warning on **PaperWidth**.

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.SetA4Size
dlg.SetLetterSize
Debug.Print dlg.PaperHeight
' Output:
' 11
```

### SetNarrowMargins
{: .no_toc }

Sets all four margins to half an inch.

Syntax: *object*.**SetNarrowMargins**

```tb check_build check_run
Dim dlg As New cDialogPageSetup

dlg.SetNarrowMargins
Debug.Print dlg.MarginLeft * 2
' Output:
' 1
```

### ShowDialog
{: .no_toc }

Shows the Page Setup dialog.

Syntax: *object*.**ShowDialog** ( ) **As Boolean**

Returns **True** when the user chose **OK**, and then the paper size and the margins hold what the dialog returned. Returns **False** when the user cancelled, and the properties are unchanged. See [How the dialog is shown](#how-the-dialog-is-shown) and the warning at the head of the page.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.Unit = MeasurementUnit.Millimeters
dlg.AllowOrientation = False
If dlg.ShowDialog() Then
    Debug.Print dlg.MarginLeft, dlg.MarginRight
End If
```

### ToDescription
{: .no_toc }

Returns the page as a line of text.

Syntax: *object*.**ToDescription** ( ) **As String**

The form is `Paper: 8.50 x 11.00 in, Portrait, Margins: 1.00/1.00/1.00/1.00 in`: the paper width and height, the stored [**Orientation**](#orientation) as `Portrait` or `Landscape`, and the left, right, top and bottom margins, each with two decimals, and the unit `in` or `mm`. The numbers are formatted with the decimal separator of the regional settings of the computer. With [**Unit**](#unit) **Millimeters** the numbers are still inches and the label is `mm`: see the warning on **Unit**.

```tb check_build
Dim dlg As New cDialogPageSetup

dlg.SetA4Size
dlg.SetNarrowMargins
Debug.Print dlg.ToDescription()
```

<!-- /test -->

## Enumerations

<!-- test: compile PaperOrientationQualifiedByTheClass, CDialogPageSetupTests.Enumerations_HaveTheDocumentedValues -->
The enumerations are declared inside the class. A program names their members with the name of the enumeration in front, as in the samples, or by the member alone, such as `Landscape`. The name of the class cannot be put in front: `cDialogPageSetup.PaperOrientation.Landscape` is refused with TB5079, *Unrecognized symbol 'cDialogPageSetup'*.
<!-- /test -->

### MeasurementUnit
{: .no_toc }

The unit in which the dialog shows margins, the type of [**Unit**](#unit).

| Member | Value | Meaning |
|:-------|------:|:--------|
| **Inches** | 0 | Thousandths of an inch are passed to Windows. |
| **Millimeters** | 1 | Hundredths of a millimeter are passed to Windows. |

### PaperOrientation
{: .no_toc }

The orientation of a page, the type of [**Orientation**](#orientation).

| Member | Value |
|:-------|------:|
| **Portrait** | 1 |
| **Landscape** | 2 |

## See Also

- [cDialogPrint](cDialogPrint) class -- shows the Print dialog
- [cDialogFont](cDialogFont) class -- shows the Font dialog
- [cDialog](cDialog/) class -- shows the Open, Save As and Browse For Folder dialogs
- [TBMANLIB_Dialog](.) package -- overview
