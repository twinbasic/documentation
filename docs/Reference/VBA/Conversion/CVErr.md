---
title: CVErr
parent: Conversion Module
permalink: /tB/Modules/Conversion/CVErr
redirect_from:
-  /tB/Core/CVErr
---
# CVErr
{: .no_toc }

Returns a **Variant** of subtype **Error** containing an error number specified by the user.

Syntax: **CVErr(** *errornumber* **)**

*errornumber*
: *required* Any valid error number.

Use the **CVErr** function to create user-defined errors in user-created procedures. For example, if you create a function that accepts several arguments and normally returns a string, you can have your function evaluate the input arguments to ensure they are within an acceptable range. If they aren't, it is likely your function will not return what you expect. In this event, **CVErr** allows you to return an error number that tells the caller what action to take.

Note that implicit conversion of an **Error** is not allowed. For example, you can't directly assign the return value of **CVErr** to a variable that is not a **Variant**. However, you can perform an explicit conversion (by using [**CInt**](CInt), [**CDbl**](CDbl), and so on) of the value returned by **CVErr** and assign that to a variable of the appropriate data type.

### Example

This example uses the **CVErr** function to return a **Variant** whose **VarType** is **vbError** (10). The user-defined function `CalculateDouble` returns an error if the argument passed to it isn't a number. Use **CVErr** to return user-defined errors from user-defined procedures or to defer handling of a run-time error. Use the **IsError** function to test whether the value represents an error.

```tb
' Call CalculateDouble with an error-producing argument.
Sub Test()
    Debug.Print CalculateDouble("345.45robert")
End Sub

' Define CalculateDouble Function procedure.
Function CalculateDouble(Number)
    If IsNumeric(Number) Then
        CalculateDouble = Number * 2    ' Return result.
    Else
        CalculateDouble = CVErr(2001)   ' Return a user-defined error number.
    End If
End Function
```

### See Also

- [Error](Error) function

{% include VBA-Attribution.md %}
