---
title: QBColor
parent: Information Module
permalink: /tB/Modules/Information/QBColor
redirect_from:
-  /tB/Core/QBColor
vba_attribution: true
---
# QBColor
{: .no_toc }

Returns a **Long** representing the RGB colour code corresponding to the specified colour number.

Syntax: **QBColor(** *color* **)**

*color*
: *required* A whole number in the range 0–15.

The *color* argument has these settings:

| Number | Colour | Number | Colour |
|--------|--------|--------|--------|
| 0 | Black | 8 | Gray |
| 1 | Blue | 9 | Light Blue |
| 2 | Green | 10 | Light Green |
| 3 | Cyan | 11 | Light Cyan |
| 4 | Red | 12 | Light Red |
| 5 | Magenta | 13 | Light Magenta |
| 6 | Yellow | 14 | Light Yellow |
| 7 | White | 15 | Bright White |

The *color* argument represents colour values used by earlier versions of Basic — Microsoft Visual Basic for MS-DOS and the QuickBASIC compiler. Starting with the least-significant byte, the returned value specifies the red, green, and blue components used to set the corresponding colour in the RGB system, exactly as if [**RGB**](RGB) had been called with those components.

### Example

This example uses **QBColor** to set a form's background colour from a numeric colour code.

```tb
Sub ChangeBackColor(ByVal ColorCode As Integer, ByVal MyForm As Form)
    MyForm.BackColor = QBColor(ColorCode)
End Sub
```

### See Also

- [RGB](RGB), [RGBA](RGBA) functions
- [TranslateColor](TranslateColor) function
