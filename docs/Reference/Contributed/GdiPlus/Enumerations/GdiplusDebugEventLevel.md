---
title: GdiplusDebugEventLevel
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GdiplusDebugEventLevel
---

# GdiplusDebugEventLevel enumeration
{: .no_toc }

Specifies the severity of a debug event that GDI+ reports to a debug callback.

The *level* argument of a **DebugEventProc** callback is one of these members. GDI+ calls the callback on debug builds only, for assertions and warnings. The callback is the **DebugEventCallback** field of the [**GdiplusStartupInput**](../Types/GdiplusStartupInput).

| Member | Value | Description |
|:-------|:------|:------------|
| **DebugEventLevelFatal**{: #DebugEventLevelFatal } | `0` | A fatal event. The assertion has failed. |
| **DebugEventLevelWarning**{: #DebugEventLevelWarning } | `1` | A warning. |

## Used by

- the *level* argument of the **DebugEventProc** callback

## See Also

- [GdiplusDebugEventLevel](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusinit/ne-gdiplusinit-debugeventlevel) -- Microsoft's documentation of the GDI+ enumeration
- [Enumerations](.) -- all the enumerations of the package
