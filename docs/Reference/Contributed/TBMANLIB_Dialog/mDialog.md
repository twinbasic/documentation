---
title: mDialog
parent: TBMANLIB_Dialog Package
permalink: /tB/Packages/Contributed/TBMANLIB_Dialog/mDialog
has_toc: false
---

# mDialog module
{: .no_toc }

Holds the constants, the four structure types and the eight conversion functions that the dialog classes of the package share. The conversions change between inches, millimetres, points and twips, and between an HTML colour text and its red, green and blue parts.

**Functions:** [HtmlToRGB](#htmltorgb), [InchesToMM](#inchestomm), [InchesToPoints](#inchestopoints), [InchesToTwips](#inchestotwips), [MMToInches](#mmtoinches), [PointsToInches](#pointstoinches), [RGBToHtml](#rgbtohtml), [TwipsToInches](#twipstoinches).

**Constants:** [MM_PER_INCH](#constants), [POINTS_PER_INCH](#constants), [TWIPS_PER_INCH](#constants) and the eight [paper sizes](#paper-sizes).

**Types:** [COMDLG_FILTERSPEC](#types), [GUID](#types), [POINT](#types), [RECT](#types).

The members of **mDialog** are global: a program writes `InchesToMM(1)` and also `mDialog.InchesToMM(1)`.

```tb check_build check_run
Debug.Print InchesToMM(8.5)         ' 215.9
Debug.Print InchesToPoints(1)       ' 72
Debug.Print InchesToTwips(1.5)      ' 2160
Debug.Print RGBToHtml(255, 128, 0)  ' #FF8000

Dim r As Long, g As Long, b As Long
HtmlToRGB "#00ff7f", r, g, b
Debug.Print r; g; b                 '  0  255  127
```

## Functions

### HtmlToRGB
{: .no_toc }

Splits an HTML colour text into its red, green and blue parts.

Syntax: **HtmlToRGB** ( *htmlColor*, *r*, *g*, *b* )

*htmlColor*
: *required* A **String** of six hexadecimal digits, with a leading `#` or without one, and with or without spaces at its ends: `#FF8000`, `ff8000`.

*r*, *g*, *b*
: *required* **Long** variables, passed by reference. They receive the red, green and blue parts, each from 0 to 255.

The text must have exactly six characters after the optional `#`. Any other text sets all three variables to 0: three-digit colours (`#FFF`), eight-digit colours (`#FF8000FF`), colour names, an empty string and text with characters that are not hexadecimal digits (`#GG0000`) give black, and no error is raised. A text with a sign character (`#-10000`, `#+12345`) gives black too. A space inside six characters is not always rejected: `#1 2345` gives 1, 35 and 69.

### InchesToMM
{: .no_toc }

Converts inches to millimetres.

Syntax: **InchesToMM** ( *inches* ) **As Double**

Returns *inches* multiplied by 25.4: 215.9 for 8.5.

### InchesToPoints
{: .no_toc }

Converts inches to points.

Syntax: **InchesToPoints** ( *inches* ) **As Double**

Returns *inches* multiplied by 72: 72 for 1.

### InchesToTwips
{: .no_toc }

Converts inches to twips.

Syntax: **InchesToTwips** ( *inches* ) **As Long**

Returns *inches* multiplied by 1,440, rounded to the nearest whole number with **CLng**: 2160 for 1.5, 0 for 0.0003 and 1 for 0.0004.

### MMToInches
{: .no_toc }

Converts millimetres to inches.

Syntax: **MMToInches** ( *mm* ) **As Double**

Returns *mm* divided by 25.4: 1 for 25.4, and 8.26771653543307 for 210.

### PointsToInches
{: .no_toc }

Converts points to inches.

Syntax: **PointsToInches** ( *points* ) **As Double**

Returns *points* divided by 72: 0.5 for 36.

### RGBToHtml
{: .no_toc }

Builds an HTML colour text from red, green and blue parts.

Syntax: **RGBToHtml** ( *r*, *g*, *b* ) **As String**

Each argument is a **Long**. The function takes the lowest eight bits of each (`And &HFF`), writes each as two upper-case hexadecimal digits and puts a `#` first. A value outside 0 to 255 is not rejected: it wraps, so `RGBToHtml(256, -1, 300)` gives `#00FF2C`.

### TwipsToInches
{: .no_toc }

Converts twips to inches.

Syntax: **TwipsToInches** ( *twips* ) **As Double**

*twips* is a **Long**. Returns it divided by 1,440: 0.5 for 720.

## Constants

| Constant | Type | Value |
|---|---|---|
| **MM_PER_INCH** | **Double** | 25.4 |
| **POINTS_PER_INCH** | **Long** | 72 |
| **TWIPS_PER_INCH** | **Long** | 1440 |

### Paper sizes

Paper sizes in inches, all **Double**. The A sizes are rounded to two decimals.

| Constant | Value |
|---|---|
| **PAPER_LETTER_WIDTH**, **PAPER_LETTER_HEIGHT** | 8.5, 11 |
| **PAPER_LEGAL_WIDTH**, **PAPER_LEGAL_HEIGHT** | 8.5, 14 |
| **PAPER_A4_WIDTH**, **PAPER_A4_HEIGHT** | 8.27, 11.69 |
| **PAPER_A3_WIDTH**, **PAPER_A3_HEIGHT** | 11.69, 16.54 |

## Types

The structures are those of the Windows API, written for the dialog classes of the package.

| Type | Members | Size, 32-bit and 64-bit |
|---|---|---|
| **COMDLG_FILTERSPEC** | **pszName** and **pszSpec**, both **LongPtr** | 8 and 16 bytes |
| **GUID** | **Data1** (**Long**), **Data2** and **Data3** (**Integer**), **Data4** (8 **Byte** values) | 16 bytes |
| **POINT** | **X** and **Y**, both **Long** | 8 bytes |
| **RECT** | **Left**, **Top**, **Right** and **Bottom**, all **Long** | 16 bytes |

Declare **GUID** as `mDialog.GUID`: the name **GUID** alone refers to another type, and `Dim g As GUID` is refused with error TB5106 in a project that references the package. Writing the module name before **RECT**, **POINT** and **COMDLG_FILTERSPEC** as well makes sure that the type of the package is the one used.

```tb check_build check_run
Dim g As mDialog.GUID
Dim rc As mDialog.RECT

g.Data1 = 5
rc.Left = 2
rc.Right = 9
Debug.Print g.Data1                ' 5
Debug.Print rc.Right - rc.Left     ' 7
Debug.Print LenB(rc)               ' 16
```

## See Also

- [TBMANLIB_Dialog](.) package -- overview
- [cDialogEx](cDialogEx) class -- uses **GUID** and **COMDLG_FILTERSPEC**
