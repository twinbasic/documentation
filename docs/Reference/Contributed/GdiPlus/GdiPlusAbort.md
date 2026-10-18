---
title: GdiPlusAbort
parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/GdiPlusAbort
has_toc: false
---

# GdiPlusAbort interface
{: .no_toc }

An object that GDI+ can ask whether a long operation should stop.

**GdiPlusAbort** declares one method, **Abort**. A class that implements it can be passed to [**Image**](Image)**.SetAbort**, which hands it to GDI+. It mirrors the `GdiplusAbort` interface of GDI+ 1.1.

```tb check_build
Class StopWhenAsked
    Implements GdiPlusAbort

    Public StopNow As Boolean

    Private Function GdiPlusAbort_Abort() As Long Implements GdiPlusAbort.Abort
        Return If(StopNow, 1, 0)
    End Function
End Class
```

## Abort

Syntax: *object*.**Abort**( ) As **Long**

GDI+ calls it from time to time during a long operation on the image. Returning a value other than 0 asks GDI+ to stop the operation; returning 0 lets it go on.

<!-- test: Gr_LibraryTests.SetAbort_ThenDrawingTheImage_Works -->
> [!WARNING] 0.9.45.0
> Do not use this interface. GDI+ 1.0 and 1.1 do not implement the aborts, and an image that has been given an implementation with **SetAbort** causes an access violation in GDI+ the next time it is drawn.

## See Also

- [Image](Image) class -- **SetAbort**
- [Graphics](Graphics) class -- **SetAbort**, which takes a raw pointer
- [Types](Types/) -- the types of the package
