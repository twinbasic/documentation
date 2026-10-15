---
title: ColorChannelLUT
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/ColorChannelLUT
has_toc: false
---

# ColorChannelLUT type
{: .no_toc }

A lookup table that maps each value of one colour channel to a new value.

A **ColorChannelLUT** has one field, the array **b**(0 To 255) of **Byte**, and no methods: element **b**(*n*) is the value that a channel value of *n* is changed to. It is 256 bytes. A [**ColorLUTParams**](ColorLUTParams) holds one table for each of the blue, green, red and alpha channels, and the [**ColorLUT**](../ColorLUT) effect applies them to a bitmap.

A variable declared with `Dim` holds all zeros, which maps every value to 0. Fill the table before using it; a table with **b**(*n*) equal to *n* leaves the channel as it is.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
Dim negative As ColorChannelLUT
Dim n As Long
For n = 0 To 255
    negative.b(n) = 255 - n
Next
Debug.Print negative.b(0) & " " & negative.b(255)                ' 255 0
Debug.Print LenB(Of ColorChannelLUT)                              ' 256
```

## See Also

- [ColorMatrix](ColorMatrix) type -- a transformation of colours by a matrix
- [ColorLUT](../ColorLUT) class -- the effect that uses the tables
- [Types](.) -- the types of the package
