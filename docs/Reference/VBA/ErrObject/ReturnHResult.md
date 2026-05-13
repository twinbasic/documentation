---
title: ReturnHResult
parent: ErrObject
permalink: /tB/Modules/ErrObject/ReturnHResult
---
# ReturnHResult
{: .no_toc }

Sets the **HRESULT** to be returned from the current object method when it exits normally. Write-only.

Syntax: **Err**.**ReturnHResult** **=** *value*

*value*
: A **Long** containing the raw HRESULT to be returned. Positive values indicate a non-failure result.

**ReturnHResult** provides a mechanism to set an HRESULT explicitly when exiting an object method. This is particularly useful for returning non-failure (positive) HRESULTs that indicate success or status information not conveyed by the standard `S_OK` success code. Whereas [**Raise**](Raise) is used to generate failure HRESULTs (negative values), **ReturnHResult** allows for setting specific non-failure results.

A calling procedure can then use [**LastHresult**](LastHresult) to read the positive HRESULT that was returned from the method. Set **ReturnHResult** only when needed, typically just before the method exit point, so that the intended HRESULT is the one that's actually returned.

### Example

This example demonstrates setting a non-failure HRESULT upon successfully completing a method within a COM object.

```tb
Function MyMethod() As Variant
    ' ... perform method actions here ...

    ' Indicate success with a specific non-failure HRESULT.
    Err.ReturnHResult = 123
End Function
```

After the method completes, the caller can read **Err.LastHresult** to retrieve this specific HRESULT value.

### See Also

- [LastHresult](LastHresult) property
- [Number](Number) property
- [Description](Description) property
- [Raise](Raise) method
