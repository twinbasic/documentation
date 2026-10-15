---
title: GpStringTrimming
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpStringTrimming
---

# GpStringTrimming enumeration
{: .no_toc }

Specifies how characters are trimmed from a string so that it fits into the layout rectangle.

Trimming affects only the last visible or partly visible line of text.

| Member | Value | Description |
|:-------|:------|:------------|
| **StringTrimmingNone**{: #StringTrimmingNone } | `0` | No trimming. |
| **StringTrimmingCharacter**{: #StringTrimmingCharacter } | `1` | The string is cut at the last character that fits in the layout rectangle. |
| **StringTrimmingWord**{: #StringTrimmingWord } | `2` | The string is cut at the last word that fits in the layout rectangle. |
| **StringTrimmingEllipsisCharacter**{: #StringTrimmingEllipsisCharacter } | `3` | The string is cut at the last character that fits, and an ellipsis (...) follows that character. |
| **StringTrimmingEllipsisWord**{: #StringTrimmingEllipsisWord } | `4` | The string is cut at the last word that fits, and an ellipsis (...) follows that word. |
| **StringTrimmingEllipsisPath**{: #StringTrimmingEllipsisPath } | `5` | The middle of the string is removed and replaced with an ellipsis. As much as possible of the last part of the string is kept. |

## Used by

- [**StringFormat**](../StringFormat) class: [**Trimming**](../StringFormat#trimming)

## See Also

- [StringTrimming](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-stringtrimming) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [StringFormat](../StringFormat) class
