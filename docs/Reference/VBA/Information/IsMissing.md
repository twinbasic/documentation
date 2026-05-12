---
title: IsMissing
parent: Information Module
permalink: /tB/Modules/Information/IsMissing
redirect_from:
-  /tB/Core/IsMissing
vba_attribution: true
---
# IsMissing
{: .no_toc }

Returns a **Boolean** indicating whether an optional **Variant** argument has been passed to a procedure.

Syntax: **IsMissing(** *argname* **)**

*argname*
: *required* The name of an optional **Variant** procedure argument.

**IsMissing** returns **True** if no value was supplied for the specified argument; otherwise, **False**. Using a missing argument elsewhere in code may raise a run-time error.

If **IsMissing** is used on a **ParamArray** argument, it always returns **False**. To detect an empty **ParamArray**, test whether the array's upper bound is less than its lower bound.

**IsMissing** does not work on simple data types such as **Integer** or **Double**: unlike **Variant**s, they have no provision for a "missing" flag. For typed optional arguments, specify a default value instead — if the argument is omitted, it takes that default. In many cases the default-value form removes the need for a separate **IsMissing** check entirely.

```tb
Sub MySub(Optional ByVal MyVar As String = "specialvalue")
    If MyVar = "specialvalue" Then
        ' MyVar was omitted.
    End If
End Sub
```

### Example

This example uses **IsMissing** to check whether an optional argument has been passed to a user-defined procedure.

```tb
Dim ReturnValue As Variant
ReturnValue = ReturnTwice()           ' Returns Null.
ReturnValue = ReturnTwice(2)          ' Returns 4.

Function ReturnTwice(Optional A As Variant) As Variant
    If IsMissing(A) Then
        ReturnTwice = Null            ' Argument missing — return Null.
    Else
        ReturnTwice = A * 2           ' Otherwise return twice the value.
    End If
End Function
```

### See Also

- [IsNull](IsNull), [IsEmpty](IsEmpty) functions
