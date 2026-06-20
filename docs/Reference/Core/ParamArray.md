---
title: ParamArray
parent: Statements
permalink: /tB/Core/ParamArray
vba_attribution: true
---
# ParamArray
{: .no_toc }

Used in the argument list of a [**Sub**](Sub), [**Function**](Function), or [**Property**](Property) procedure to indicate that the final parameter is an open-ended list of arguments. The **ParamArray** keyword permits the procedure to accept an arbitrary number of arguments at the call site.

Syntax:
> [ **Public** \| **Private** \| **Friend** ] [ **Static** ] **Sub** \| **Function** \| **Property Get** \| **Property Let** \| **Property Set** *name* **(** [ *arglist*, ] **ParamArray** *varname*[ **()** ] [ **As** *type* ] **)**

*varname*
: Name of the variable representing the **ParamArray**; follows standard variable naming conventions.

*type*
: *optional* Must be **Variant** (explicitly or by default). Each argument supplied at the call site can be of a different data type, so **ParamArray** must always be an array of **Variant** elements.

**ParamArray** must be the last parameter in the argument list of a **Sub**, **Function**, or **Property Get** procedure. In a **Property Let** or **Property Set** procedure it must precede the *value*/*reference* parameter and so cannot be the only parameter.

**ParamArray** cannot be combined with **Optional**, **ByVal**, or **ByRef** on the same parameter --- arguments supplied to a **ParamArray** are always passed by reference as elements of a **Variant** array.

When the procedure is called, each argument supplied in the call becomes a corresponding element of the **Variant** array. If no arguments are supplied for the **ParamArray** position, the array is empty.

> [!NOTE]
> A procedure that defines a **ParamArray** parameter cannot be called using named-argument syntax. All arguments to such a procedure must be positional. To omit individual elements within the **ParamArray** position at a call site, leave the position blank between commas.

### Example

This example defines a function that sums an arbitrary number of numeric arguments by using **ParamArray**.

```tb
Function CalcSum(ParamArray Args() As Variant) As Double
    Dim Total As Double, i As Long
    For i = LBound(Args) To UBound(Args)
        Total = Total + CDbl(Args(i))
    Next i
    CalcSum = Total
End Function

' Calls of varying arity:
Debug.Print CalcSum()              ' 0
Debug.Print CalcSum(1)             ' 1
Debug.Print CalcSum(1, 2, 3, 4)    ' 10
Debug.Print CalcSum(1.5, 2.5, 3#)  ' 7
```

A **ParamArray** can follow ordinary positional parameters; only those that come after a fixed leading list participate in the variadic tail.

```tb
Function Concat(ByVal Separator As String, ParamArray Parts() As Variant) As String
    Dim i As Long, s As String
    For i = LBound(Parts) To UBound(Parts)
        If i > LBound(Parts) Then s = s & Separator
        s = s & CStr(Parts(i))
    Next i
    Concat = s
End Function

Debug.Print Concat(", ", "one", "two", "three")  ' "one, two, three"
```

### See Also

- [**Sub** statement](Sub)
- [**Function** statement](Function)
- [**Property** statement](Property)
- [**Call** statement](Call)
