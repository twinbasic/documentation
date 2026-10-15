---
title: ColorLUTParams
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/ColorLUTParams
---

# ColorLUTParams type
{: .no_toc }

The parameters of a [**ColorLUT**](../ColorLUT) effect: one lookup table for each of blue, green, red and alpha.

The type mirrors the GDI+ [ColorLUTParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-colorlutparams) structure. A **ColorLUT** takes it in its **Parameters** property.

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **lutB** | a table of 256 bytes | The table for the blue channel. |
| **lutG** | a table of 256 bytes | The table for the green channel. |
| **lutR** | a table of 256 bytes | The table for the red channel. |
| **lutA** | a table of 256 bytes | The table for the alpha channel. |

Each table is a [**ColorChannelLUT**](ColorChannelLUT), a structure with one field, **b**, an array of 256 **Byte** values numbered 0 to 255: the channel value *v* becomes `table.b(v)`. A variable declared **As ColorLUTParams** has all-zero tables, which turn every channel to 0, so a program fills every table, with the identity `b(i) = i` for a channel that stays as it is.

## Creating

Syntax: *params* **= ColorLUTParams**( *lutB*, *lutG*, *lutR*, *lutA* )

*lutB*, *lutG*, *lutR*, *lutA*
: *required* Arrays of **Byte** with 256 elements, any lower bound. If one of the arrays has another length, the function returns a structure of zeros.

> [!WARNING] 0.9.45.0
> The function copies the alpha table from the array *lutB*. The structure it returns maps alpha through the blue table. Fill the fields yourself instead, as the example does.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim p As ColorLUTParams
Dim i As Long
For i = 0 To 255
    p.lutB.b(i) = 255 - i
    p.lutG.b(i) = i
    p.lutR.b(i) = i
    p.lutA.b(i) = i
Next
Debug.Print p.lutB.b(0) & " " & p.lutB.b(255) & " " & p.lutG.b(100)

Dim fx As ColorLUT = ColorLUT()
fx.Parameters = p
Debug.Print fx.LastResult
' Output:
' 255 0 100
' 0
```

## See Also

- [ColorLUTParams](https://learn.microsoft.com/en-us/windows/win32/api/gdipluseffects/ns-gdipluseffects-colorlutparams) -- Microsoft's documentation of the GDI+ structure
- [ColorLUT](../ColorLUT) class
