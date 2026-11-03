---
title: Double
parent: Data Types
grand_parent: Reference Section
nav_order: 8
permalink: /tB/Core/Double
vba_attribution: true
---

# Double
{: .no_toc }

A 64-bit IEEE 754 double-precision floating-point number.

Syntax:

- [**Dim**](Dim) *varname* **As Double** [ **=** *expression* ]
- **Dim** *varname*`#`
- [**DefDbl**](Deftype) *letterrange*

A **Double** variable is declared **As Double**, or by the type-declaration character `#` after its name. [**DefDbl**](Deftype) makes **Double** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. A **Double** that is not given a value holds 0.

**Double** is the usual type for general floating-point arithmetic. It has about 15 significant decimal digits. The **Variant** subtype for a **Double** is **vbDouble** (5), and [**TypeName**](../Modules/Information/TypeName) gives `Double`.

## Storage and range

A **Double** is stored in 8 bytes: a sign bit, an 11-bit exponent and a 52-bit fraction. It holds values from -1.79769313486231E308 to -4.94065645841247E-324 and from 4.94065645841247E-324 to 1.79769313486232E308, and 0. It has the same size in a 32-bit and a 64-bit build. A value too small for the type becomes 0 with no error.

A **Double** holds whole numbers exactly up to 2^53, which is 9,007,199,254,740,992. Most decimal fractions are not stored exactly, so a calculation can differ from the decimal answer in its last digits, and two results that look equal can compare as different. **Debug.Print** and conversion to a **String** with [**CStr**](../Modules/Conversion/CStr) show 15 significant digits.

```tb check_run
Dim Value As Double
Dim Rate#
Debug.Print Value                   ' 0
Debug.Print LenB(Value)             ' 8
Debug.Print TypeName(Rate)          ' Double
Debug.Print VarType(Value) = vbDouble ' True
Debug.Print 1 / 3                   ' 0.333333333333333
Debug.Print 0.1 + 0.2 = 0.3         ' False
Debug.Print (0.1 + 0.2) - 0.3       ' 5.55111512312578E-17
```

## Literals

A number with a decimal point or an exponent is a **Double**, and so is a whole number above 2,147,483,647. The suffix `#` makes any number a **Double**: `1#`. An exponent is written with `E` or `D`; `1E5` and `1D5` are both 100000. A decimal point can have no digits before it or after it: `.5` and `5.`.

```tb check_run
Debug.Print TypeName(3.14)          ' Double
Debug.Print TypeName(.5)            ' Double
Debug.Print TypeName(5.)            ' Double
Debug.Print TypeName(1E5)           ' Double
Debug.Print TypeName(1D5)           ' Double
Debug.Print TypeName(1#)            ' Double
Debug.Print TypeName(2147483648)    ' Double
Debug.Print 1.79769313486231E+308   ' 1.79769313486231E+308
Debug.Print 4.94065645841247E-324   ' 4.94065645841247E-324
```

## Conversions

[**CDbl**](../Modules/Conversion/CDbl) converts an expression to a **Double**, and so does assigning one to a **Double** variable. A string is read as a number using the regional settings of the computer that runs the program, so `CDbl("1,5")` depends on whether the comma is the decimal separator there. `True` is -1. A string that is not a number raises error 13, *Type mismatch*, and a string too large for the type, such as `"1E309"`, raises error 6, *Overflow*.

```tb check_run
Debug.Print CDbl("1.5")             ' 1.5
Debug.Print CDbl(True)              ' -1
Debug.Print CDbl(0.1!)              ' 0.100000001490116
On Error Resume Next
Debug.Print CDbl("1E309")
Debug.Print Err.Number              ' 6
```

## Arithmetic and overflow

An operation on two **Double** values gives a **Double**. A **Double** combined with a **Byte**, **Integer**, **Long**, **LongLong**, **Single** or **Boolean** gives a **Double**; combined with a **Currency** it gives a **Currency** under `+` and `-` and a **Double** under `*` and `/`; combined with a **Decimal**, a **Decimal**. `^` always gives a **Double**. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

A result too large for the type raises error 6, *Overflow*: `1E+308 * 10` does, and so does `1E+308 + 1E+308`. Dividing by zero raises error 11, *Division by zero*; `0 / 0` raises error 6, and `Sqr(-1)` raises error 5, *Invalid procedure call or argument*. A result too small for the type is 0, with no error. A **Variant** holding a **Double** raises error 6 on overflow too, where a **Variant** holding a smaller type widens.

A **Double** can hold the IEEE values infinity and NaN, which can arrive from memory or from a COM component, but **Double** arithmetic never produces one: it raises an error instead. A comparison with NaN does not follow the IEEE rules: `NaN = NaN` is True, as in VB6, and so is `NaN = 0`, so a comparison cannot tell a NaN from a number. A **Double** can also hold negative zero, which `Round(-0.5)`, `Fix(-0.5)` and `-x` for an *x* of 0 give; it equals 0.

<!-- test: sample double-text-win32, sample double-text-win64 -->
How these values print depends on the build. A 32-bit build prints them as VB6 does: infinity and NaN as `1.#INF`, `-1.#INF`, `1.#QNAN` and, for the indeterminate value, `-1.#IND`, and negative zero as `0`; **Format** with a number picture such as `"0.00"` gives `1.#INF` and `1.#R`. A 64-bit build prints them as 64-bit VBA does: `inf`, `-inf`, `nan`, `-nan(ind)` and `-0`; **Format** gives `inf.00` and `nan.00`. Do not test or parse the text of these values.
<!-- /test -->

```tb hidden slot=module
' Context for the probes below: a Double made from its eight bytes.
Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef Destination As Any, ByRef Source As Any, ByVal Length As LongPtr)

Public Function DoubleFromBits(ByVal Bits As LongLong) As Double
    Dim Result As Double
    CopyMemory Result, Bits, 8
    DoubleFromBits = Result
End Function
```

```tb probe check_run id=double-text-win32
Dim Zero As Double, ZeroS As Single
Zero = -Zero
ZeroS = -ZeroS
Debug.Print CStr(Zero)                                              ' 0
Debug.Print "[" & Str(Zero) & "]"                                   ' [ 0]
Debug.Print Format(Zero)                                            ' 0
Debug.Print "x" & Zero                                              ' x0
Debug.Print CStr(ZeroS)                                             ' 0
Debug.Print CStr(Round(-0.5))                                       ' 0
Debug.Print CStr(DoubleFromBits(&H7FF0000000000000^))               ' 1.#INF
Debug.Print CStr(DoubleFromBits(&HFFF0000000000000^))               ' -1.#INF
Debug.Print CStr(DoubleFromBits(&H7FF8000000000000^))               ' 1.#QNAN
Debug.Print CStr(DoubleFromBits(&HFFF8000000000000^))               ' -1.#IND
Debug.Print Format(DoubleFromBits(&H7FF0000000000000^), "0.00")     ' 1.#INF
Debug.Print Format(DoubleFromBits(&H7FF8000000000000^), "0.00")     ' 1.#R
```

```tb probe check_run id=double-text-win64 arch=win64
Dim Zero As Double, ZeroS As Single
Zero = -Zero
ZeroS = -ZeroS
Debug.Print CStr(Zero)                                              ' -0
Debug.Print "[" & Str(Zero) & "]"                                   ' [-0]
Debug.Print Format(Zero)                                            ' -0
Debug.Print "x" & Zero                                              ' x-0
Debug.Print CStr(ZeroS)                                             ' -0
Debug.Print CStr(Round(-0.5))                                       ' -0
Debug.Print CStr(DoubleFromBits(&H7FF0000000000000^))               ' inf
Debug.Print CStr(DoubleFromBits(&HFFF0000000000000^))               ' -inf
Debug.Print CStr(DoubleFromBits(&H7FF8000000000000^))               ' nan
Debug.Print CStr(DoubleFromBits(&HFFF8000000000000^))               ' -nan(ind)
Debug.Print Format(DoubleFromBits(&H7FF0000000000000^), "0.00")     ' inf.00
Debug.Print Format(DoubleFromBits(&H7FF8000000000000^), "0.00")     ' nan.00
```

```tb check_run
Dim Value As Double = 1E+308
On Error Resume Next
Value = Value * 10
Debug.Print Err.Number              ' 6
Err.Clear
Value = 1
Value = Value / 0
Debug.Print Err.Number              ' 11
Err.Clear
Value = 1E-300
Value = Value * 1E-300
Debug.Print Err.Number              ' 0
Debug.Print Value                   ' 0
```

<!-- test: bug llvm-double-overflow-no-error, llvm win32-llvm, llvm win64-llvm -->
> [!WARNING] BETA 1034
> An exponentiation (`^`) that overflows raises no error in code compiled with LLVM, and its result is 0. In a 32-bit build compiled with LLVM, and not for SSE2, a **Double** addition, subtraction or multiplication that overflows raises no error either, and its result is infinity. Code compiled without LLVM raises error 6, as VB6 does. See [Language support](../../LLVM/Getting-Started#language-support).

## Example

This example adds 0.1 to a **Double** a million times. The total is close to 100,000 but not equal to it, so the comparison allows a small difference.

```tb check_run
Dim Total As Double
Dim i As Long
For i = 1 To 1000000
    Total = Total + 0.1
Next
Debug.Print Total                           ' 100000.000001333
Debug.Print Total = 100000                  ' False
Debug.Print Abs(Total - 100000) < 0.001     ' True
```

## See Also

- [Data Types](../../Reference/Data-Types#double) -- the summary of all fourteen intrinsic types
- [Single](Single), [Currency](Currency), [Decimal](Decimal) -- the other non-integer types
- [CDbl](../Modules/Conversion/CDbl) function
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
