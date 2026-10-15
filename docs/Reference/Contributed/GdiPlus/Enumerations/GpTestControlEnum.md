---
title: GpTestControlEnum
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpTestControlEnum
---

# GpTestControlEnum enumeration
{: .no_toc }

Names the internal test controls of GDI+, for the test function of the **GdiPlusUser** class.

GDI+ has an undocumented function that sets test options. The package offers it as the **TestControl** function, and as the two methods **TestControlForceBilinear** and **TestControlNoICM** of [**GdiPlusUser**](../GdiPlusUser).

| Member | Value | Description |
|:-------|:------|:------------|
| **TestControlForceBilinear**{: #TestControlForceBilinear } | `0` | Forces bilinear interpolation. |
| **TestControlNoICM**{: #TestControlNoICM } | `1` | Turns off image colour management (ICM). |
| **TestControlGetBuildNumber**{: #TestControlGetBuildNumber } | `2` | Returns the build number of GDI+. |

## Used by

- [Helper functions](../Helpers): **TestControl**

## See Also

- [Enumerations](.) -- all the enumerations of the package
