---
title: IsError
parent: Information Module
permalink: /tB/Modules/Information/IsError
redirect_from:
-  /tB/Core/IsError
vba_attribution: true
---
# IsError
{: .no_toc }

Returns a **Boolean** indicating whether an expression is an error value.

Syntax: **IsError(** *expression* **)**

*expression*
: *required* Any valid expression.

Error values are produced by passing an error number through the [**CVErr**](../Conversion/CVErr) function. **IsError** returns **True** if *expression* indicates an error; otherwise, **False**.

### Example

This example uses **IsError** to check whether a value is an error. **CVErr** is used to return an **Error**-subtype **Variant** from a user-defined function. `UserFunction` is assumed to return an error value, for example via `UserFunction = CVErr(32767)`.

```tb hidden
' Context for the sample below: the user-defined function it calls, which
' belongs to the reader's program.
Public Function UserFunction() As Variant
    UserFunction = CVErr(32767)
End Function
```

```tb check_build
Dim ReturnVal As Variant
Dim MyCheck As Boolean
ReturnVal = UserFunction()
MyCheck = IsError(ReturnVal)          ' Returns True.
```

### See Also

- [CVErr](../Conversion/CVErr) function
- [Err](Err) property
