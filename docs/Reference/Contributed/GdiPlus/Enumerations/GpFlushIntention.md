---
title: GpFlushIntention
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpFlushIntention
---

# GpFlushIntention enumeration
{: .no_toc }

Says whether **Graphics.Flush** waits for the batched operations to finish.

| Member | Value | Description |
|:-------|:------|:------------|
| **FlushIntentionFlush**{: #FlushIntentionFlush } | `0` | Flushes all batched drawing operations and returns at once, without waiting for them to finish. |
| **FlushIntentionSync**{: #FlushIntentionSync } | `1` | Flushes all batched drawing operations and waits for them to finish. |

## Used by

- [**Graphics**](../Graphics) class: [**Flush**](../Graphics#flush)

## See Also

- [FlushIntention](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusenums/ne-gdiplusenums-flushintention) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
- [Graphics](../Graphics) class
