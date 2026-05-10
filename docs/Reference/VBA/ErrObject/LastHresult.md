---
title: LastHresult
parent: ErrObject Module
permalink: /tB/Modules/ErrObject/LastHresult
---
# LastHresult
{: .no_toc }

Returns the last **HRESULT** returned from a COM object method call. Read-only.

Syntax: **Err**.**LastHresult**

**LastHresult** allows examination of return values from COM object method calls that do not necessarily trigger an error in the runtime. Negative HRESULT values correspond to failures and are the ones that raise a run-time error inside twinBASIC, which can then be captured through the **Err** object. Positive HRESULT values, which indicate success or non-failure status, do not raise an error and so do not interrupt normal program flow.

To inspect both success and non-failure status codes, read **LastHresult** immediately after the object method call; subsequent calls may overwrite its value.

### Example

```tb
' Assume comObject exposes a method whose HRESULT carries status information.
Sub CheckHresult()
    comObject.SomeMethod
    Dim status As Long
    status = Err.LastHresult
    If status > 0 Then
        ' Handle a non-failure HRESULT (success with status).
    End If
End Sub
```

### See Also

- [ReturnHResult](ReturnHResult) property
- [LastDllError](LastDllError) property
- [Number](Number) property
- [Raise](Raise) method
