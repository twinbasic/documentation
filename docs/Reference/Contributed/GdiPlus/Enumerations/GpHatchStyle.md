---
title: GpHatchStyle
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpHatchStyle
---

# GpHatchStyle enumeration
{: .no_toc }

Selects the pattern of a hatch brush.

A hatch pattern is lines or shapes in the foreground colour drawn over a solid background colour. The last four members are not patterns: **HatchStyleTotal** is the number of styles, **HatchStyleLargeGrid** is another name for **HatchStyleCross**, and **HatchStyleMin** and **HatchStyleMax** give the range of valid values.

| Member | Value | Description |
|:-------|:------|:------------|
| **HatchStyleHorizontal**{: #HatchStyleHorizontal } | `0` | Horizontal lines. |
| **HatchStyleVertical**{: #HatchStyleVertical } | `1` | Vertical lines. |
| **HatchStyleForwardDiagonal**{: #HatchStyleForwardDiagonal } | `2` | Diagonal lines that slant to the right from the top to the bottom, antialiased. |
| **HatchStyleBackwardDiagonal**{: #HatchStyleBackwardDiagonal } | `3` | Diagonal lines that slant to the left from the top to the bottom, antialiased. |
| **HatchStyleCross**{: #HatchStyleCross } | `4` | Horizontal and vertical lines that cross at 90 degrees. |
| **HatchStyleDiagonalCross**{: #HatchStyleDiagonalCross } | `5` | Forward and backward diagonal lines that cross at 90 degrees, antialiased. |
| **HatchStyle05Percent**{: #HatchStyle05Percent } | `6` | A 5 percent hatch. The ratio of foreground colour to background colour is 5:100. |
| **HatchStyle10Percent**{: #HatchStyle10Percent } | `7` | A 10 percent hatch. The ratio of foreground colour to background colour is 10:100. |
| **HatchStyle20Percent**{: #HatchStyle20Percent } | `8` | A 20 percent hatch. The ratio of foreground colour to background colour is 20:100. |
| **HatchStyle25Percent**{: #HatchStyle25Percent } | `9` | A 25 percent hatch. The ratio of foreground colour to background colour is 25:100. |
| **HatchStyle30Percent**{: #HatchStyle30Percent } | `10` | A 30 percent hatch. The ratio of foreground colour to background colour is 30:100. |
| **HatchStyle40Percent**{: #HatchStyle40Percent } | `11` | A 40 percent hatch. The ratio of foreground colour to background colour is 40:100. |
| **HatchStyle50Percent**{: #HatchStyle50Percent } | `12` | A 50 percent hatch. The ratio of foreground colour to background colour is 50:100. |
| **HatchStyle60Percent**{: #HatchStyle60Percent } | `13` | A 60 percent hatch. The ratio of foreground colour to background colour is 60:100. |
| **HatchStyle70Percent**{: #HatchStyle70Percent } | `14` | A 70 percent hatch. The ratio of foreground colour to background colour is 70:100. |
| **HatchStyle75Percent**{: #HatchStyle75Percent } | `15` | A 75 percent hatch. The ratio of foreground colour to background colour is 75:100. |
| **HatchStyle80Percent**{: #HatchStyle80Percent } | `16` | An 80 percent hatch. The ratio of foreground colour to background colour is 80:100. |
| **HatchStyle90Percent**{: #HatchStyle90Percent } | `17` | A 90 percent hatch. The ratio of foreground colour to background colour is 90:100. |
| **HatchStyleLightDownwardDiagonal**{: #HatchStyleLightDownwardDiagonal } | `18` | Diagonal lines that slant to the right from the top to the bottom, spaced 50 percent closer together than **HatchStyleForwardDiagonal** and not antialiased. |
| **HatchStyleLightUpwardDiagonal**{: #HatchStyleLightUpwardDiagonal } | `19` | Diagonal lines that slant to the left from the top to the bottom, spaced 50 percent closer together than **HatchStyleBackwardDiagonal** and not antialiased. |
| **HatchStyleDarkDownwardDiagonal**{: #HatchStyleDarkDownwardDiagonal } | `20` | Like **HatchStyleLightDownwardDiagonal**, and twice the width of **HatchStyleForwardDiagonal**. |
| **HatchStyleDarkUpwardDiagonal**{: #HatchStyleDarkUpwardDiagonal } | `21` | Like **HatchStyleLightUpwardDiagonal**, and twice the width of **HatchStyleBackwardDiagonal**. |
| **HatchStyleWideDownwardDiagonal**{: #HatchStyleWideDownwardDiagonal } | `22` | Diagonal lines that slant to the right from the top to the bottom, with the spacing of **HatchStyleForwardDiagonal** and three times its width, not antialiased. |
| **HatchStyleWideUpwardDiagonal**{: #HatchStyleWideUpwardDiagonal } | `23` | Diagonal lines that slant to the left from the top to the bottom, with the spacing of **HatchStyleBackwardDiagonal** and three times its width, not antialiased. |
| **HatchStyleLightVertical**{: #HatchStyleLightVertical } | `24` | Vertical lines spaced 50 percent closer together than **HatchStyleVertical**. |
| **HatchStyleLightHorizontal**{: #HatchStyleLightHorizontal } | `25` | Horizontal lines spaced 50 percent closer together than **HatchStyleHorizontal**. |
| **HatchStyleNarrowVertical**{: #HatchStyleNarrowVertical } | `26` | Vertical lines spaced 75 percent closer together than **HatchStyleVertical**. |
| **HatchStyleNarrowHorizontal**{: #HatchStyleNarrowHorizontal } | `27` | Horizontal lines spaced 75 percent closer together than **HatchStyleHorizontal**. |
| **HatchStyleDarkVertical**{: #HatchStyleDarkVertical } | `28` | Vertical lines spaced 50 percent closer together than **HatchStyleVertical** and twice its width. |
| **HatchStyleDarkHorizontal**{: #HatchStyleDarkHorizontal } | `29` | Horizontal lines spaced 50 percent closer together than **HatchStyleHorizontal** and twice its width. |
| **HatchStyleDashedDownwardDiagonal**{: #HatchStyleDashedDownwardDiagonal } | `30` | Horizontal lines made of forward diagonals, like a row of slash characters. |
| **HatchStyleDashedUpwardDiagonal**{: #HatchStyleDashedUpwardDiagonal } | `31` | Horizontal lines made of backward diagonals, like a row of backslash characters. |
| **HatchStyleDashedHorizontal**{: #HatchStyleDashedHorizontal } | `32` | Dashed horizontal lines. |
| **HatchStyleDashedVertical**{: #HatchStyleDashedVertical } | `33` | Dashed vertical lines. |
| **HatchStyleSmallConfetti**{: #HatchStyleSmallConfetti } | `34` | A pattern that looks like confetti. |
| **HatchStyleLargeConfetti**{: #HatchStyleLargeConfetti } | `35` | A pattern that looks like confetti made of larger pieces than **HatchStyleSmallConfetti**. |
| **HatchStyleZigZag**{: #HatchStyleZigZag } | `36` | Horizontal lines of zigzags. |
| **HatchStyleWave**{: #HatchStyleWave } | `37` | Horizontal lines of tildes. |
| **HatchStyleDiagonalBrick**{: #HatchStyleDiagonalBrick } | `38` | A pattern that looks like a wall of bricks laid in a backward diagonal direction. |
| **HatchStyleHorizontalBrick**{: #HatchStyleHorizontalBrick } | `39` | A pattern that looks like a wall of bricks laid horizontally. |
| **HatchStyleWeave**{: #HatchStyleWeave } | `40` | A pattern that looks like woven material. |
| **HatchStylePlaid**{: #HatchStylePlaid } | `41` | A pattern that looks like plaid material. |
| **HatchStyleDivot**{: #HatchStyleDivot } | `42` | A pattern that looks like divots. |
| **HatchStyleDottedGrid**{: #HatchStyleDottedGrid } | `43` | Horizontal and vertical dotted lines that cross at 90 degrees. |
| **HatchStyleDottedDiamond**{: #HatchStyleDottedDiamond } | `44` | Forward and backward diagonal dotted lines that cross at 90 degrees. |
| **HatchStyleShingle**{: #HatchStyleShingle } | `45` | A pattern that looks like shingles laid in a forward diagonal direction. |
| **HatchStyleTrellis**{: #HatchStyleTrellis } | `46` | A pattern that looks like a trellis. |
| **HatchStyleSphere**{: #HatchStyleSphere } | `47` | A pattern that looks like a checkerboard of spheres. |
| **HatchStyleSmallGrid**{: #HatchStyleSmallGrid } | `48` | Horizontal and vertical lines that cross at 90 degrees, spaced 50 percent closer together than **HatchStyleCross**. |
| **HatchStyleSmallCheckerBoard**{: #HatchStyleSmallCheckerBoard } | `49` | A pattern that looks like a checkerboard. |
| **HatchStyleLargeCheckerBoard**{: #HatchStyleLargeCheckerBoard } | `50` | A checkerboard with squares twice the size of **HatchStyleSmallCheckerBoard**. |
| **HatchStyleOutlinedDiamond**{: #HatchStyleOutlinedDiamond } | `51` | Forward and backward diagonal lines that cross at 90 degrees and are not antialiased. |
| **HatchStyleSolidDiamond**{: #HatchStyleSolidDiamond } | `52` | A pattern that looks like a checkerboard placed diagonally. |
| **HatchStyleTotal**{: #HatchStyleTotal } | `53` | The number of hatch styles. It is not a pattern. |
| **HatchStyleLargeGrid**{: #HatchStyleLargeGrid } | `4` | Same value as **HatchStyleCross**. |
| **HatchStyleMin**{: #HatchStyleMin } | `0` | The lowest hatch style, same value as **HatchStyleHorizontal**. |
| **HatchStyleMax**{: #HatchStyleMax } | `52` | The highest hatch style, same value as **HatchStyleSolidDiamond**. |

## Used by

- [**HatchBrush**](../HatchBrush) class: [**HatchStyle**](../HatchBrush#hatchstyle), [constructor](../HatchBrush#creating)

## See Also

- [HatchStyle](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-hatchstyle) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [HatchBrush](../HatchBrush) class
