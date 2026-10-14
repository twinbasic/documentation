---
title: BigNumber
parent: BigNumberLib Package
permalink: /tB/Packages/Contributed/BigNumberLib/BigNumber
has_toc: false
---

# BigNumber class
{: .no_toc }

A **BigNumber** represents an arbitrary-precision signed integer backed by the TomsFastMath (libtfm) C library, supporting numbers up to 4096 bits. A multiplication accepts operands of up to 2048 bits each. The default property is [**ValueString**](#valuestring).

```tb check_build check_run
Dim a As New BigNumber
Dim b As New BigNumber
Dim result As New BigNumber

a.ValueString = "123456789012345678901234567890"
b.ValueString = "987654321098765432109876543210"
result.AssignAddition a, b
Debug.Print result.ValueString   ' 1111111110111111111011111111100
```

> [!NOTE] since BETA 434
> The class needs this build of twinBASIC or a later one.

> [!NOTE]
> String-to-value conversions silently stop at the first invalid character --- for example, setting `ValueHex = "ABC123he"` stores `&HABC123` without raising an error.

> [!WARNING]
> Overflow is not trapped. A result that needs more bits than the library holds loses its high bits, and a string with more digits than fit gives a wrong value. No error is raised in either case. The library holds a little more than the 4096 bits the class supports, 4352 bits in a 32-bit program and 4608 in a 64-bit one, so a result a few bits over 4096 may still be right.

* TOC
{:toc}

## Properties

### ValueString
{: .no_toc }

Returns or sets the value as a decimal string representation. **Default property.**

Syntax: *object*.**ValueString** [ = *value* ]

*value*
: A **String** containing a decimal integer, optionally preceded by a minus sign. Conversion stops at the first character that is not a valid decimal digit, so a leading plus sign or space gives 0. A string with no digits gives 0.

The getter returns the decimal digits, preceded by a minus sign for a negative value.

### ValueHex
{: .no_toc }

Returns or sets the value as a hexadecimal string representation.

Syntax: *object*.**ValueHex** [ = *value* ]

*value*
: A **String** containing a hexadecimal integer (digits `0`--`9` and `A`--`F`, case-insensitive), optionally preceded by a minus sign. Conversion stops at the first character that is not a valid hex digit.

The getter returns upper-case digits without leading zeros, preceded by a minus sign for a negative value. A prefix such as `0x` or `&H` is not accepted: conversion stops at the `x` or the `&`.

```tb check_build check_run
Dim n As New BigNumber
n.ValueHex = "ABC123he"
Debug.Print n.ValueHex       ' ABC123
Debug.Print n.ValueString    ' 11256099

n.ValueString = "-255"
Debug.Print n.ValueHex       ' -FF
Debug.Print n.ValueOctal     ' -377
Debug.Print n.ValueBinary    ' -11111111
```

### ValueOctal
{: .no_toc }

Returns or sets the value as an octal string representation.

Syntax: *object*.**ValueOctal** [ = *value* ]

*value*
: A **String** containing an octal integer (digits `0`--`7`), optionally preceded by a minus sign. Conversion stops at the first character that is not a valid octal digit.

The getter returns the digits without leading zeros, preceded by a minus sign for a negative value.

### ValueBinary
{: .no_toc }

Returns or sets the value as a binary string representation.

Syntax: *object*.**ValueBinary** [ = *value* ]

*value*
: A **String** containing a binary integer (digits `0` and `1`), optionally preceded by a minus sign. Conversion stops at the first character that is not `0` or `1`.

The getter returns the digits without leading zeros, preceded by a minus sign for a negative value.

### IsNegative
{: .no_toc }

Returns or sets whether the value is negative.

Syntax: *object*.**IsNegative** [ = *value* ]

*value*
: A **Boolean**. Setting **False** makes the number non-negative. Setting **True** is meant to make it negative, but see the warning.

The getter returns **True** for a negative number, and **False** for a positive number and for zero, except the negative zero that [**AssignFromLong**](#assignfromlong) describes.

> [!WARNING]
> Setting **IsNegative** to **True** does not make the number negative. The property stores -1, the value of **True**, where the library expects 1, so the number is in a state that the library does not handle: [**ValueString**](#valuestring) and the other conversions show no minus sign, **IsNegative** still returns **True**, and arithmetic with the number gives wrong results. To make a number negative, set **ValueString** to a string that starts with a minus sign, or use [**AssignNegation**](#assignnegation). [**AssignGreatestCommonDivisor**](#assigngreatestcommondivisor) and [**AssignLeastCommonMultiple**](#assignleastcommonmultiple) set this state in a negative operand.

```tb check_build check_run
Dim n As New BigNumber
n.ValueString = "5"
n.IsNegative = True
Debug.Print n.IsNegative     ' True
Debug.Print n.ValueString    ' 5
```

## Methods

### AssignAddition
{: .no_toc }

Sets this instance to `a + b`.

Syntax: *object*.**AssignAddition** *a*, *b*

*a*
: *required* A **BigNumber** holding the first operand.

*b*
: *required* A **BigNumber** holding the second operand.

### AssignSubtraction
{: .no_toc }

Sets this instance to `a - b`.

Syntax: *object*.**AssignSubtraction** *a*, *b*

*a*
: *required* A **BigNumber** holding the minuend.

*b*
: *required* A **BigNumber** holding the subtrahend.

### AssignMultiplication
{: .no_toc }

Sets this instance to `a * b`.

Syntax: *object*.**AssignMultiplication** *a*, *b*

*a*
: *required* A **BigNumber** holding the first factor.

*b*
: *required* A **BigNumber** holding the second factor.

### AssignDivision
{: .no_toc }

Sets this instance to the integer quotient `a \ b`, truncated toward zero. Raises run-time error 5 if *b* is zero.

Syntax: *object*.**AssignDivision** *a*, *b*

*a*
: *required* A **BigNumber** holding the dividend.

*b*
: *required* A **BigNumber** holding the divisor. Must not be zero.

The error has the description "invalid operation", and this instance keeps its value when it is raised.

```tb check_build check_run
Dim a As New BigNumber
Dim b As New BigNumber
Dim q As New BigNumber
a.ValueString = "-7"
b.ValueString = "2"
q.AssignDivision a, b
Debug.Print q.ValueString               ' -3

b.ValueString = "0"
On Error Resume Next
q.AssignDivision a, b
Debug.Print Err.Number & " " & Err.Description    ' 5 invalid operation
Debug.Print q.ValueString               ' -3
```

### AssignModulus
{: .no_toc }

Sets this instance to `a Mod b`. The result is zero or has the sign of *b*, so `-7 Mod 2` is 1 and `7 Mod -2` is -1. Raises run-time error 5 if *b* is zero.

Syntax: *object*.**AssignModulus** *a*, *b*

*a*
: *required* A **BigNumber** holding the dividend.

*b*
: *required* A **BigNumber** holding the divisor. Must not be zero.

> [!WARNING]
> When *b* is negative and the result is zero, the result is a negative zero: [**IsNegative**](#isnegative) returns **True** and [**IsEqualTo**](#isequalto) does not find it equal to a zero read from a string. [**AssignFromLong**](#assignfromlong) describes it.

```tb check_build check_run
Dim a As New BigNumber
Dim b As New BigNumber
Dim r As New BigNumber
a.ValueString = "-7"
b.ValueString = "2"
r.AssignModulus a, b
Debug.Print r.ValueString    ' 1

a.ValueString = "7"
b.ValueString = "-2"
r.AssignModulus a, b
Debug.Print r.ValueString    ' -1
```

### AssignSquared
{: .no_toc }

Sets this instance to `a * a` (the square of *a*).

Syntax: *object*.**AssignSquared** *a*

*a*
: *required* A **BigNumber** holding the value to square.

> [!WARNING]
> The square of zero is a negative zero, as [**AssignFromLong**](#assignfromlong) describes.

### AssignAdditionModulus
{: .no_toc }

Sets this instance to `(a + b) Mod mod_c`. Raises run-time error 5 if *mod_c* is zero.

Syntax: *object*.**AssignAdditionModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the first addend.

*b*
: *required* A **BigNumber** holding the second addend.

*mod_c*
: *required* A **BigNumber** holding the modulus. It should be positive.

This section describes all four methods that end in **Modulus**. Each takes the remainder as [**AssignModulus**](#assignmodulus) does: for a positive modulus the result is in the range 0 up to one less than the modulus, whatever the signs of the operands. With a negative modulus the result has the sign of the modulus, except that a result of zero is the modulus itself, so `(3 + 4) Mod -7` is -7.

```tb check_build check_run
Dim a As New BigNumber
Dim b As New BigNumber
Dim m As New BigNumber
Dim r As New BigNumber
a.ValueString = "-3"
b.ValueString = "4"
m.ValueString = "7"
r.AssignAdditionModulus a, b, m
Debug.Print r.ValueString    ' 1
r.AssignSubtractionModulus a, b, m
Debug.Print r.ValueString    ' 0
r.AssignMultiplicationModulus a, b, m
Debug.Print r.ValueString    ' 2
```

### AssignSubtractionModulus
{: .no_toc }

Sets this instance to `(a - b) Mod mod_c`. Raises run-time error 5 if *mod_c* is zero. [**AssignAdditionModulus**](#assignadditionmodulus) describes the sign of the result.

Syntax: *object*.**AssignSubtractionModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the minuend.

*b*
: *required* A **BigNumber** holding the subtrahend.

*mod_c*
: *required* A **BigNumber** holding the modulus. It should be positive.

### AssignMultiplicationModulus
{: .no_toc }

Sets this instance to `(a * b) Mod mod_c`. Raises run-time error 5 if *mod_c* is zero. [**AssignAdditionModulus**](#assignadditionmodulus) describes the sign of the result.

Syntax: *object*.**AssignMultiplicationModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the first factor.

*b*
: *required* A **BigNumber** holding the second factor.

*mod_c*
: *required* A **BigNumber** holding the modulus. It should be positive.

### AssignSquaredModulus
{: .no_toc }

Sets this instance to `(a * a) Mod mod_b`. Raises run-time error 5 if *mod_b* is zero. [**AssignAdditionModulus**](#assignadditionmodulus) describes the sign of the result.

Syntax: *object*.**AssignSquaredModulus** *a*, *mod_b*

*a*
: *required* A **BigNumber** holding the value to square.

*mod_b*
: *required* A **BigNumber** holding the modulus. It should be positive.

### AssignModularMultiplicativeInverse
{: .no_toc }

Sets this instance to the modular multiplicative inverse of *a* modulo *mod_b* --- the value *x* such that `(a * x) Mod mod_b = 1`. Raises run-time error 5 if the inverse does not exist, which is the case when *a* and *mod_b* have a common factor and when *a* is a multiple of *mod_b*. For a negative *a* the result is negative: the inverse of -3 modulo 7 is -5, because `(-3 * -5) Mod 7` is 1.

Syntax: *object*.**AssignModularMultiplicativeInverse** *a*, *mod_b*

*a*
: *required* A **BigNumber** holding the value to invert.

*mod_b*
: *required* A **BigNumber** holding the modulus. It must be positive.

> [!WARNING]
> The call does not return, and the program stops responding, when *mod_b* is odd and either *a* is zero or *mod_b* is negative. A zero *a* with an even *mod_b*, and any *a* with a negative even *mod_b*, raise error 5.

```tb check_build check_run
Dim a As New BigNumber
Dim m As New BigNumber
Dim x As New BigNumber
a.ValueString = "3"
m.ValueString = "11"
x.AssignModularMultiplicativeInverse a, m
Debug.Print x.ValueString    ' 4

a.ValueString = "6"
m.ValueString = "9"
On Error Resume Next
x.AssignModularMultiplicativeInverse a, m
Debug.Print Err.Number & " " & Err.Description    ' 5 invalid operation
```

### AssignGreatestCommonDivisor
{: .no_toc }

Sets this instance to the greatest common divisor of *a* and *b*. The signs of *a* and *b* are ignored; the result is always non-negative. The greatest common divisor of zero and *b* is the absolute value of *b*, and that of two zeros is zero.

Syntax: *object*.**AssignGreatestCommonDivisor** *a*, *b*

*a*
: *required* A **BigNumber** holding the first value.

*b*
: *required* A **BigNumber** holding the second value.

> [!WARNING]
> A negative *a* or *b* is changed by the call. The method clears the sign of each operand and puts it back with [**IsNegative**](#isnegative), which leaves the operand in the state that the warning there describes: it shows no minus sign, and arithmetic with it gives wrong results.

```tb check_build check_run
Dim a As New BigNumber
Dim b As New BigNumber
Dim g As New BigNumber
a.ValueString = "-12"
b.ValueString = "18"
g.AssignGreatestCommonDivisor a, b
Debug.Print g.ValueString    ' 6
Debug.Print a.ValueString    ' 12
```

### AssignLeastCommonMultiple
{: .no_toc }

Sets this instance to the least common multiple of *a* and *b*. The signs of *a* and *b* are ignored; the result is non-negative. The least common multiple of zero and any value is zero.

Syntax: *object*.**AssignLeastCommonMultiple** *a*, *b*

*a*
: *required* A **BigNumber** holding the first value.

*b*
: *required* A **BigNumber** holding the second value.

> [!WARNING]
> A negative *a* or *b* is changed by the call, as [**AssignGreatestCommonDivisor**](#assigngreatestcommondivisor) describes.

### AssignShiftRight
{: .no_toc }

Sets this instance to *a* right-shifted by *shiftAmount_b* bits (equivalent to integer division by 2^*shiftAmount_b*, truncated toward zero, so shifting -1 right by any positive amount gives 0).

Syntax: *object*.**AssignShiftRight** *a*, *shiftAmount_b*

*a*
: *required* A **BigNumber** holding the value to shift.

*shiftAmount_b*
: *required* A **Long** specifying the number of bit positions to shift right. It must not be negative: a negative amount leaves the value unchanged.

```tb check_build check_run
Dim a As New BigNumber
Dim r As New BigNumber
a.ValueString = "-7"
r.AssignShiftRight a, 1
Debug.Print r.ValueString    ' -3
a.ValueString = "-1"
r.AssignShiftRight a, 1
Debug.Print r.ValueString    ' 0
```

### AssignShiftLeft
{: .no_toc }

Sets this instance to *a* left-shifted by *shiftAmount_b* bits (equivalent to multiplication by 2^*shiftAmount_b*).

Syntax: *object*.**AssignShiftLeft** *a*, *shiftAmount_b*

*a*
: *required* A **BigNumber** holding the value to shift.

*shiftAmount_b*
: *required* A **Long** specifying the number of bit positions to shift left. It must not be negative: a negative amount gives a wrong result, not a shift to the right.

```tb check_build check_run
Dim a As New BigNumber
Dim r As New BigNumber
a.ValueString = "5"
r.AssignShiftLeft a, 100
Debug.Print r.ValueString    ' 6338253001141147007483516026880
```

### AssignNegation
{: .no_toc }

Sets this instance to the arithmetic negation of *a* (`-a`).

Syntax: *object*.**AssignNegation** *a*

*a*
: *required* A **BigNumber** holding the value to negate.

**AssignNegation** is declared as a **Function** returning **Boolean**, but the return value is never set and is always **False**.

### AssignAbsolute
{: .no_toc }

Sets this instance to the absolute value of *a*.

Syntax: *object*.**AssignAbsolute** *a*

*a*
: *required* A **BigNumber** holding the value whose absolute value is taken.

**AssignAbsolute** is declared as a **Function** returning **Boolean**, but the return value is never set and is always **False**.

### AssignFromLong
{: .no_toc }

Sets this instance to a value from a native **Long** integer.

Syntax: *object*.**AssignFromLong** *a*

*a*
: *required* A **Long** holding the value to assign. Negative values (including `&H80000000`) are handled correctly.

> [!WARNING]
> Assigning 0 gives a negative zero: [**IsNegative**](#isnegative) returns **True**, [**IsLessThan**](#islessthan) finds the number less than a zero read from the string `"0"`, and [**IsEqualTo**](#isequalto) does not find it equal. Its text is still `0`, and adding it to another number or subtracting it gives the right result. The same negative zero comes from [**AssignSquared**](#assignsquared) with a zero argument, and from [**AssignModulus**](#assignmodulus) when the divisor is negative and the result is zero. To get a true zero, set [**ValueString**](#valuestring) to `"0"`, or set **IsNegative** to **False** after the assignment.

```tb check_build check_run
Dim z As New BigNumber
Dim s As New BigNumber
z.AssignFromLong 0
s.ValueString = "0"
Debug.Print z.ValueString     ' 0
Debug.Print z.IsNegative      ' True
Debug.Print z.IsEqualTo(s)    ' False
Debug.Print z.IsLessThan(s)   ' True
```

### HandleError
{: .no_toc }

Examines the last status code the class stored from the library and raises run-time error 5 if it is a failure. The error description is "invalid operation" or "out of memory".

Syntax: *object*.**HandleError**

The string-conversion properties, **AssignDivision**, **AssignModulus**, the four modular-arithmetic methods (**AssignAdditionModulus**, **AssignSubtractionModulus**, **AssignMultiplicationModulus**, **AssignSquaredModulus**) and **AssignModularMultiplicativeInverse** store the library's status and call **HandleError** themselves. The other methods do not store a status. The stored status stays in place until one of those members runs again, so calling **HandleError** later raises the error again.

## Comparison functions

### IsEqualTo
{: .no_toc }

Returns **True** if this instance equals *b*.

Syntax: *object*.**IsEqualTo**( *b* )

*b*
: *required* A **BigNumber** to compare against.

### IsLessThan
{: .no_toc }

Returns **True** if this instance is less than *b*.

Syntax: *object*.**IsLessThan**( *b* )

*b*
: *required* A **BigNumber** to compare against.

### IsLessThanOrEqualTo
{: .no_toc }

Returns **True** if this instance is less than or equal to *b*.

Syntax: *object*.**IsLessThanOrEqualTo**( *b* )

*b*
: *required* A **BigNumber** to compare against.

### IsGreaterThan
{: .no_toc }

Returns **True** if this instance is greater than *b*.

Syntax: *object*.**IsGreaterThan**( *b* )

*b*
: *required* A **BigNumber** to compare against.

### IsGreaterThanOrEqualTo
{: .no_toc }

Returns **True** if this instance is greater than or equal to *b*.

Syntax: *object*.**IsGreaterThanOrEqualTo**( *b* )

*b*
: *required* A **BigNumber** to compare against.

## Example

This example computes the factorial of 50 using **BigNumber** arithmetic.

```tb check_build check_run
Dim result As New BigNumber
Dim factor As New BigNumber
Dim temp As New BigNumber

result.AssignFromLong 1

Dim i As Long
For i = 2 To 50
    factor.AssignFromLong i
    temp.AssignMultiplication result, factor
    result.ValueString = temp.ValueString   ' copy temp into result
Next i

Debug.Print result.ValueString   ' 30414093201713378043612608166064768844377641568960512000000000000
```

## See Also

- [BigNumberLib](.) package -- overview
