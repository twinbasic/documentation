---
title: GpConvertToEmfPlusFlags
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpConvertToEmfPlusFlags
---

# GpConvertToEmfPlusFlags enumeration
{: .no_toc }

Reports what happened to records during the conversion of a metafile to the EMF+ format.

The members combine with **Or**. They describe the outcome of **Metafile.ConvertToEmfPlus**. No public member takes or returns this enumeration.

| Member | Value | Description |
|:-------|:------|:------------|
| **ConvertToEmfPlusFlagsDefault**{: #ConvertToEmfPlusFlagsDefault } | `&H00000000` | The conversion met nothing special. |
| **ConvertToEmfPlusFlagsRopUsed**{: #ConvertToEmfPlusFlagsRopUsed } | `&H00000001` | A raster operation could not be converted. |
| **ConvertToEmfPlusFlagsText**{: #ConvertToEmfPlusFlagsText } | `&H00000002` | Text records were converted. |
| **ConvertToEmfPlusFlagsInvalidRecord**{: #ConvertToEmfPlusFlagsInvalidRecord } | `&H00000004` | A record was not valid and was not converted. |

## See Also

- [Enumerations](.) -- all the enumerations of the package
