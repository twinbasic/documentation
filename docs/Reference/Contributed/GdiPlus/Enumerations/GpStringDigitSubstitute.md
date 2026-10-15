---
title: GpStringDigitSubstitute
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpStringDigitSubstitute
---

# GpStringDigitSubstitute enumeration
{: .no_toc }

Specifies how digits in a string are replaced according to the locale or the language of the user.

| Member | Value | Description |
|:-------|:------|:------------|
| **StringDigitSubstituteUser**{: #StringDigitSubstituteUser } | `0` | A substitution scheme defined by the user, the setting of the national language support (NLS) of the system. |
| **StringDigitSubstituteNone**{: #StringDigitSubstituteNone } | `1` | No substitution. |
| **StringDigitSubstituteNational**{: #StringDigitSubstituteNational } | `2` | Digits of the official national language of the locale of the user. |
| **StringDigitSubstituteTraditional**{: #StringDigitSubstituteTraditional } | `3` | Digits of the native script or language of the user, which can differ from the official national language of the locale. |

## Used by

- [**StringFormat**](../StringFormat) class: [**DigitSubstitutionMethod**](../StringFormat#digitsubstitutionmethod), [**SetDigitSubstitution**](../StringFormat#setdigitsubstitution)

## See Also

- [StringDigitSubstitute](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-stringdigitsubstitute) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [StringFormat](../StringFormat) class
