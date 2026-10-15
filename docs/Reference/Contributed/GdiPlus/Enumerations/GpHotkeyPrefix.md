---
title: GpHotkeyPrefix
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpHotkeyPrefix
---

# GpHotkeyPrefix enumeration
{: .no_toc }

Specifies how the ampersand prefix of a hot key in a string is displayed.

| Member | Value | Description |
|:-------|:------|:------------|
| **HotkeyPrefixNone**{: #HotkeyPrefixNone } | `0` | No hot key processing. An ampersand is displayed like any other character. |
| **HotkeyPrefixShow**{: #HotkeyPrefixShow } | `1` | The ampersand is removed and the character after it is underlined. |
| **HotkeyPrefixHide**{: #HotkeyPrefixHide } | `2` | The ampersand is removed and no character is underlined. |

## Used by

- [**StringFormat**](../StringFormat) class: [**HotkeyPrefix**](../StringFormat#hotkeyprefix)

## See Also

- [HotkeyPrefix](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-hotkeyprefix) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [StringFormat](../StringFormat) class
