---
title: GpErrorHandlingStrategy
parent: Enumerations
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Enumerations/GpErrorHandlingStrategy
---

# GpErrorHandlingStrategy enumeration
{: .no_toc }

Selects what the package does when a GDI+ call returns a status other than **Ok**.

This enumeration belongs to the package; GDI+ has no counterpart. The module variable **GdipErrorHandlingStrategy** holds the strategy for the whole program. In every strategy the status is also left in the **LastResult** of the object. With **RaiseErrors** the error number is **GdipErrorCodeBase** plus the status, 3300 plus the status unless the base is changed. **GdipErrorHandler** holds the address of the handler for **HandleErrors**.

| Member | Value | Description |
|:-------|:------|:------------|
| **IgnoreErrors**{: #IgnoreErrors } | `0` | The status is recorded and otherwise ignored. This is the default. |
| **RaiseErrors**{: #RaiseErrors } | `1` | The status is recorded, and then a run-time error is raised with the number **GdipErrorCodeBase** plus the status. |
| **HandleErrors**{: #HandleErrors } | `2` | The status is recorded, and then the handler in **GdipErrorHandler** is called, when one is set. |
| **StopOnErrors**{: #StopOnErrors } | `3` | The status is recorded, and then a **Stop** statement runs, which acts as a breakpoint in the debugger. |

## Used by

The module variable **GdipErrorHandlingStrategy** is declared as a **GpErrorHandlingStrategy**. The package reads it every time an object records a status.

## Example

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()
GdipErrorHandlingStrategy = RaiseErrors
On Error Resume Next
Dim bad As Bitmap = Bitmap(Environ$("TEMP") & "\no-such-file.png")
Debug.Print Err.Number
Debug.Print Err.Number - GdipErrorCodeBase = InvalidParameter
GdipErrorHandlingStrategy = IgnoreErrors
' Output:
' 3302
' True
```

The status of a file that does not exist is **InvalidParameter**, 2, so the error number is 3302.

## See Also

- [Enumerations](.) -- all the enumerations of the package
