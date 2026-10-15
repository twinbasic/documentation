---
title: GpStringAlignment
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpStringAlignment
---

# GpStringAlignment enumeration
{: .no_toc }

Specifies how a string is aligned relative to its layout rectangle.

The enumeration is used for the horizontal alignment (**Alignment**) and for the vertical, or line, alignment (**LineAlignment**) of a [**StringFormat**](../StringFormat). For horizontal text, *near* is the left edge for text that reads from left to right and the right edge for text that reads from right to left. For vertical text it is the top.

| Member | Value | Description |
|:-------|:------|:------------|
| **StringAlignmentNear**{: #StringAlignmentNear } | `0` | The text is aligned near the origin of the layout rectangle. |
| **StringAlignmentCenter**{: #StringAlignmentCenter } | `1` | The text is centred in the layout rectangle. |
| **StringAlignmentFar**{: #StringAlignmentFar } | `2` | The text is aligned far from the origin of the layout rectangle. |

## Used by

- [**StringFormat**](../StringFormat) class: [**Alignment**](../StringFormat#alignment), [**LineAlignment**](../StringFormat#linealignment)

## See Also

- [StringAlignment](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-stringalignment) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [StringFormat](../StringFormat) class
