---
title: CColor
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/CColor
---

# CColor enumeration
{: .no_toc }

Names 140 common colours, and one fully transparent colour, as 32-bit ARGB values.

This enumeration belongs to the package; GDI+ has no counterpart. Each member is a **Long** in the layout of a [**Color**](../Types/Color): alpha in the highest byte, then red, green and blue. Every member is opaque (alpha 255), except **Transparent**. The names and the red, green and blue values are those of the named colours of HTML and CSS.

A member can be written with or without the name of the enumeration: `White` or `CColor.White`. The exact way to use one is to give it to the **Color** function, as in `Color(CColor.Orange)`, which keeps all four bytes.

> [!WARNING] 0.9.45.0
> A member passed straight to a method that has an overload taking a **Long** (the *rgb* parameters of **SolidBrush**, **Pen**, **Graphics.Clear** and others) binds to that overload, which reads the value as `&H00RRGGBB` and sets the alpha to 255. The red, green and blue of an opaque member come out right, but the alpha is lost: `SolidBrush(CColor.Transparent)` is opaque white, not transparent. Write `SolidBrush(Color(CColor.Transparent))` instead.

> [!NOTE] 0.9.45.0
> A **CColor** member is not a VB colour. A VB colour constant such as **vbRed**, and the result of **RGB**, put red in the lowest byte and have no alpha. The **BGR** property of a **Color** returns its value in that layout.

| Member | Value | Description |
|:-------|:------|:------------|
| **AliceBlue**{: #AliceBlue } | `&HFFF0F8FF` | Opaque, `#F0F8FF`. |
| **AntiqueWhite**{: #AntiqueWhite } | `&HFFFAEBD7` | Opaque, `#FAEBD7`. |
| **Aqua**{: #Aqua } | `&HFF00FFFF` | Opaque, `#00FFFF`. |
| **Aquamarine**{: #Aquamarine } | `&HFF7FFFD4` | Opaque, `#7FFFD4`. |
| **Azure**{: #Azure } | `&HFFF0FFFF` | Opaque, `#F0FFFF`. |
| **Beige**{: #Beige } | `&HFFF5F5DC` | Opaque, `#F5F5DC`. |
| **Bisque**{: #Bisque } | `&HFFFFE4C4` | Opaque, `#FFE4C4`. |
| **Black**{: #Black } | `&HFF000000` | Opaque, `#000000`. |
| **BlanchedAlmond**{: #BlanchedAlmond } | `&HFFFFEBCD` | Opaque, `#FFEBCD`. |
| **Blue**{: #Blue } | `&HFF0000FF` | Opaque, `#0000FF`. |
| **BlueViolet**{: #BlueViolet } | `&HFF8A2BE2` | Opaque, `#8A2BE2`. |
| **Brown**{: #Brown } | `&HFFA52A2A` | Opaque, `#A52A2A`. |
| **BurlyWood**{: #BurlyWood } | `&HFFDEB887` | Opaque, `#DEB887`. |
| **CadetBlue**{: #CadetBlue } | `&HFF5F9EA0` | Opaque, `#5F9EA0`. |
| **Chartreuse**{: #Chartreuse } | `&HFF7FFF00` | Opaque, `#7FFF00`. |
| **Chocolate**{: #Chocolate } | `&HFFD2691E` | Opaque, `#D2691E`. |
| **Coral**{: #Coral } | `&HFFFF7F50` | Opaque, `#FF7F50`. |
| **CornflowerBlue**{: #CornflowerBlue } | `&HFF6495ED` | Opaque, `#6495ED`. |
| **Cornsilk**{: #Cornsilk } | `&HFFFFF8DC` | Opaque, `#FFF8DC`. |
| **Crimson**{: #Crimson } | `&HFFDC143C` | Opaque, `#DC143C`. |
| **Cyan**{: #Cyan } | `&HFF00FFFF` | Opaque, `#00FFFF`. |
| **DarkBlue**{: #DarkBlue } | `&HFF00008B` | Opaque, `#00008B`. |
| **DarkCyan**{: #DarkCyan } | `&HFF008B8B` | Opaque, `#008B8B`. |
| **DarkGoldenrod**{: #DarkGoldenrod } | `&HFFB8860B` | Opaque, `#B8860B`. |
| **DarkGray**{: #DarkGray } | `&HFFA9A9A9` | Opaque, `#A9A9A9`. |
| **DarkGreen**{: #DarkGreen } | `&HFF006400` | Opaque, `#006400`. |
| **DarkKhaki**{: #DarkKhaki } | `&HFFBDB76B` | Opaque, `#BDB76B`. |
| **DarkMagenta**{: #DarkMagenta } | `&HFF8B008B` | Opaque, `#8B008B`. |
| **DarkOliveGreen**{: #DarkOliveGreen } | `&HFF556B2F` | Opaque, `#556B2F`. |
| **DarkOrange**{: #DarkOrange } | `&HFFFF8C00` | Opaque, `#FF8C00`. |
| **DarkOrchid**{: #DarkOrchid } | `&HFF9932CC` | Opaque, `#9932CC`. |
| **DarkRed**{: #DarkRed } | `&HFF8B0000` | Opaque, `#8B0000`. |
| **DarkSalmon**{: #DarkSalmon } | `&HFFE9967A` | Opaque, `#E9967A`. |
| **DarkSeaGreen**{: #DarkSeaGreen } | `&HFF8FBC8B` | Opaque, `#8FBC8B`. |
| **DarkSlateBlue**{: #DarkSlateBlue } | `&HFF483D8B` | Opaque, `#483D8B`. |
| **DarkSlateGray**{: #DarkSlateGray } | `&HFF2F4F4F` | Opaque, `#2F4F4F`. |
| **DarkTurquoise**{: #DarkTurquoise } | `&HFF00CED1` | Opaque, `#00CED1`. |
| **DarkViolet**{: #DarkViolet } | `&HFF9400D3` | Opaque, `#9400D3`. |
| **DeepPink**{: #DeepPink } | `&HFFFF1493` | Opaque, `#FF1493`. |
| **DeepSkyBlue**{: #DeepSkyBlue } | `&HFF00BFFF` | Opaque, `#00BFFF`. |
| **DimGray**{: #DimGray } | `&HFF696969` | Opaque, `#696969`. |
| **DodgerBlue**{: #DodgerBlue } | `&HFF1E90FF` | Opaque, `#1E90FF`. |
| **Firebrick**{: #Firebrick } | `&HFFB22222` | Opaque, `#B22222`. |
| **FloralWhite**{: #FloralWhite } | `&HFFFFFAF0` | Opaque, `#FFFAF0`. |
| **ForestGreen**{: #ForestGreen } | `&HFF228B22` | Opaque, `#228B22`. |
| **Fuchsia**{: #Fuchsia } | `&HFFFF00FF` | Opaque, `#FF00FF`. |
| **Gainsboro**{: #Gainsboro } | `&HFFDCDCDC` | Opaque, `#DCDCDC`. |
| **GhostWhite**{: #GhostWhite } | `&HFFF8F8FF` | Opaque, `#F8F8FF`. |
| **Gold**{: #Gold } | `&HFFFFD700` | Opaque, `#FFD700`. |
| **Goldenrod**{: #Goldenrod } | `&HFFDAA520` | Opaque, `#DAA520`. |
| **Gray**{: #Gray } | `&HFF808080` | Opaque, `#808080`. |
| **Green**{: #Green } | `&HFF008000` | Opaque, `#008000`. |
| **GreenYellow**{: #GreenYellow } | `&HFFADFF2F` | Opaque, `#ADFF2F`. |
| **Honeydew**{: #Honeydew } | `&HFFF0FFF0` | Opaque, `#F0FFF0`. |
| **HotPink**{: #HotPink } | `&HFFFF69B4` | Opaque, `#FF69B4`. |
| **IndianRed**{: #IndianRed } | `&HFFCD5C5C` | Opaque, `#CD5C5C`. |
| **Indigo**{: #Indigo } | `&HFF4B0082` | Opaque, `#4B0082`. |
| **Ivory**{: #Ivory } | `&HFFFFFFF0` | Opaque, `#FFFFF0`. |
| **Khaki**{: #Khaki } | `&HFFF0E68C` | Opaque, `#F0E68C`. |
| **Lavender**{: #Lavender } | `&HFFE6E6FA` | Opaque, `#E6E6FA`. |
| **LavenderBlush**{: #LavenderBlush } | `&HFFFFF0F5` | Opaque, `#FFF0F5`. |
| **LawnGreen**{: #LawnGreen } | `&HFF7CFC00` | Opaque, `#7CFC00`. |
| **LemonChiffon**{: #LemonChiffon } | `&HFFFFFACD` | Opaque, `#FFFACD`. |
| **LightBlue**{: #LightBlue } | `&HFFADD8E6` | Opaque, `#ADD8E6`. |
| **LightCoral**{: #LightCoral } | `&HFFF08080` | Opaque, `#F08080`. |
| **LightCyan**{: #LightCyan } | `&HFFE0FFFF` | Opaque, `#E0FFFF`. |
| **LightGoldenrodYellow**{: #LightGoldenrodYellow } | `&HFFFAFAD2` | Opaque, `#FAFAD2`. |
| **LightGray**{: #LightGray } | `&HFFD3D3D3` | Opaque, `#D3D3D3`. |
| **LightGreen**{: #LightGreen } | `&HFF90EE90` | Opaque, `#90EE90`. |
| **LightPink**{: #LightPink } | `&HFFFFB6C1` | Opaque, `#FFB6C1`. |
| **LightSalmon**{: #LightSalmon } | `&HFFFFA07A` | Opaque, `#FFA07A`. |
| **LightSeaGreen**{: #LightSeaGreen } | `&HFF20B2AA` | Opaque, `#20B2AA`. |
| **LightSkyBlue**{: #LightSkyBlue } | `&HFF87CEFA` | Opaque, `#87CEFA`. |
| **LightSlateGray**{: #LightSlateGray } | `&HFF778899` | Opaque, `#778899`. |
| **LightSteelBlue**{: #LightSteelBlue } | `&HFFB0C4DE` | Opaque, `#B0C4DE`. |
| **LightYellow**{: #LightYellow } | `&HFFFFFFE0` | Opaque, `#FFFFE0`. |
| **Lime**{: #Lime } | `&HFF00FF00` | Opaque, `#00FF00`. |
| **LimeGreen**{: #LimeGreen } | `&HFF32CD32` | Opaque, `#32CD32`. |
| **Linen**{: #Linen } | `&HFFFAF0E6` | Opaque, `#FAF0E6`. |
| **Magenta**{: #Magenta } | `&HFFFF00FF` | Opaque, `#FF00FF`. |
| **Maroon**{: #Maroon } | `&HFF800000` | Opaque, `#800000`. |
| **MediumAquamarine**{: #MediumAquamarine } | `&HFF66CDAA` | Opaque, `#66CDAA`. |
| **MediumBlue**{: #MediumBlue } | `&HFF0000CD` | Opaque, `#0000CD`. |
| **MediumOrchid**{: #MediumOrchid } | `&HFFBA55D3` | Opaque, `#BA55D3`. |
| **MediumPurple**{: #MediumPurple } | `&HFF9370DB` | Opaque, `#9370DB`. |
| **MediumSeaGreen**{: #MediumSeaGreen } | `&HFF3CB371` | Opaque, `#3CB371`. |
| **MediumSlateBlue**{: #MediumSlateBlue } | `&HFF7B68EE` | Opaque, `#7B68EE`. |
| **MediumSpringGreen**{: #MediumSpringGreen } | `&HFF00FA9A` | Opaque, `#00FA9A`. |
| **MediumTurquoise**{: #MediumTurquoise } | `&HFF48D1CC` | Opaque, `#48D1CC`. |
| **MediumVioletRed**{: #MediumVioletRed } | `&HFFC71585` | Opaque, `#C71585`. |
| **MidnightBlue**{: #MidnightBlue } | `&HFF191970` | Opaque, `#191970`. |
| **MintCream**{: #MintCream } | `&HFFF5FFFA` | Opaque, `#F5FFFA`. |
| **MistyRose**{: #MistyRose } | `&HFFFFE4E1` | Opaque, `#FFE4E1`. |
| **Moccasin**{: #Moccasin } | `&HFFFFE4B5` | Opaque, `#FFE4B5`. |
| **NavajoWhite**{: #NavajoWhite } | `&HFFFFDEAD` | Opaque, `#FFDEAD`. |
| **Navy**{: #Navy } | `&HFF000080` | Opaque, `#000080`. |
| **OldLace**{: #OldLace } | `&HFFFDF5E6` | Opaque, `#FDF5E6`. |
| **Olive**{: #Olive } | `&HFF808000` | Opaque, `#808000`. |
| **OliveDrab**{: #OliveDrab } | `&HFF6B8E23` | Opaque, `#6B8E23`. |
| **Orange**{: #Orange } | `&HFFFFA500` | Opaque, `#FFA500`. |
| **OrangeRed**{: #OrangeRed } | `&HFFFF4500` | Opaque, `#FF4500`. |
| **Orchid**{: #Orchid } | `&HFFDA70D6` | Opaque, `#DA70D6`. |
| **PaleGoldenrod**{: #PaleGoldenrod } | `&HFFEEE8AA` | Opaque, `#EEE8AA`. |
| **PaleGreen**{: #PaleGreen } | `&HFF98FB98` | Opaque, `#98FB98`. |
| **PaleTurquoise**{: #PaleTurquoise } | `&HFFAFEEEE` | Opaque, `#AFEEEE`. |
| **PaleVioletRed**{: #PaleVioletRed } | `&HFFDB7093` | Opaque, `#DB7093`. |
| **PapayaWhip**{: #PapayaWhip } | `&HFFFFEFD5` | Opaque, `#FFEFD5`. |
| **PeachPuff**{: #PeachPuff } | `&HFFFFDAB9` | Opaque, `#FFDAB9`. |
| **Peru**{: #Peru } | `&HFFCD853F` | Opaque, `#CD853F`. |
| **Pink**{: #Pink } | `&HFFFFC0CB` | Opaque, `#FFC0CB`. |
| **Plum**{: #Plum } | `&HFFDDA0DD` | Opaque, `#DDA0DD`. |
| **PowderBlue**{: #PowderBlue } | `&HFFB0E0E6` | Opaque, `#B0E0E6`. |
| **Purple**{: #Purple } | `&HFF800080` | Opaque, `#800080`. |
| **Red**{: #Red } | `&HFFFF0000` | Opaque, `#FF0000`. |
| **RosyBrown**{: #RosyBrown } | `&HFFBC8F8F` | Opaque, `#BC8F8F`. |
| **RoyalBlue**{: #RoyalBlue } | `&HFF4169E1` | Opaque, `#4169E1`. |
| **SaddleBrown**{: #SaddleBrown } | `&HFF8B4513` | Opaque, `#8B4513`. |
| **Salmon**{: #Salmon } | `&HFFFA8072` | Opaque, `#FA8072`. |
| **SandyBrown**{: #SandyBrown } | `&HFFF4A460` | Opaque, `#F4A460`. |
| **SeaGreen**{: #SeaGreen } | `&HFF2E8B57` | Opaque, `#2E8B57`. |
| **SeaShell**{: #SeaShell } | `&HFFFFF5EE` | Opaque, `#FFF5EE`. |
| **Sienna**{: #Sienna } | `&HFFA0522D` | Opaque, `#A0522D`. |
| **Silver**{: #Silver } | `&HFFC0C0C0` | Opaque, `#C0C0C0`. |
| **SkyBlue**{: #SkyBlue } | `&HFF87CEEB` | Opaque, `#87CEEB`. |
| **SlateBlue**{: #SlateBlue } | `&HFF6A5ACD` | Opaque, `#6A5ACD`. |
| **SlateGray**{: #SlateGray } | `&HFF708090` | Opaque, `#708090`. |
| **Snow**{: #Snow } | `&HFFFFFAFA` | Opaque, `#FFFAFA`. |
| **SpringGreen**{: #SpringGreen } | `&HFF00FF7F` | Opaque, `#00FF7F`. |
| **SteelBlue**{: #SteelBlue } | `&HFF4682B4` | Opaque, `#4682B4`. |
| **Tan**{: #Tan } | `&HFFD2B48C` | Opaque, `#D2B48C`. |
| **Teal**{: #Teal } | `&HFF008080` | Opaque, `#008080`. |
| **Thistle**{: #Thistle } | `&HFFD8BFD8` | Opaque, `#D8BFD8`. |
| **Tomato**{: #Tomato } | `&HFFFF6347` | Opaque, `#FF6347`. |
| **Transparent**{: #Transparent } | `&H00FFFFFF` | White with alpha 0: fully transparent. |
| **Turquoise**{: #Turquoise } | `&HFF40E0D0` | Opaque, `#40E0D0`. |
| **Violet**{: #Violet } | `&HFFEE82EE` | Opaque, `#EE82EE`. |
| **Wheat**{: #Wheat } | `&HFFF5DEB3` | Opaque, `#F5DEB3`. |
| **White**{: #White } | `&HFFFFFFFF` | Opaque, `#FFFFFF`. |
| **WhiteSmoke**{: #WhiteSmoke } | `&HFFF5F5F5` | Opaque, `#F5F5F5`. |
| **Yellow**{: #Yellow } | `&HFFFFFF00` | Opaque, `#FFFF00`. |
| **YellowGreen**{: #YellowGreen } | `&HFF9ACD32` | Opaque, `#9ACD32`. |

## Used by

- [**Color**](../Types/Color) type: the **Color** function takes a member as its *argb* argument

## Example

```tb check_build check_run
Dim orange As Color = Color(CColor.Orange)
Debug.Print Hex$(orange.Value)
Debug.Print orange.Alpha, orange.Red, orange.Green, orange.Blue
Debug.Print Hex$(orange.BGR)
' Output:
' FFFFA500
' 255           255           165           0
' A5FF
```

## See Also

- [Enumerations](.) -- all the enumerations of the package
