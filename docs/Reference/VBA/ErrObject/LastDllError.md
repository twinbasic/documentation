---
title: LastDllError
parent: ErrObject
permalink: /tB/Modules/ErrObject/LastDllError
vba_attribution: true
---
# LastDllError
{: .no_toc }

Returns the last system error code produced by a call into a dynamic-link library (DLL). Read-only.

Syntax: **Err**.**LastDllError**

The **LastDllError** property applies to DLL calls made through a [**Declare**](../../Core/Declare) statement. When such a call is made, the called function usually returns a code indicating success or failure, and **LastDllError** is filled with the value of the operating system's last-error code (`GetLastError`). No exception is raised when **LastDllError** is set.

The value is preserved only until the next external call. Read it immediately after the failing call to be sure of the result.

> [!NOTE]
>
> **LastDllError** is Windows-specific.

Check the documentation for the DLL's functions to determine the return values that indicate success or failure. Whenever a failure code is returned, the application should immediately check the **LastDllError** property.

### Example

The following code calls a DLL function with an invalid argument so that the call fails. The code following the call checks the return value, and then displays the **LastDllError** property of the **Err** object to reveal the OS error code.

```tb
Private Declare PtrSafe Function SQLCancel Lib "ODBC32.dll" _
    (ByVal hstmt As LongPtr) As Integer

Private Sub Demo()
    Dim retVal As Integer
    ' Call with invalid handle.
    retVal = SQLCancel(0)
    If retVal = -2 Then
        ' Display the underlying OS error code.
        MsgBox "Error code is: " & Err.LastDllError
    End If
End Sub
```

### See Also

- [LastHresult](LastHresult) property
- [Number](Number) property
