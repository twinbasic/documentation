---
title: BigNumber
parent: BigNumberLib Package
permalink: /tB/Packages/Contributed/BigNumberLib/BigNumber
has_toc: false
---

# BigNumber class
{: .no_toc }

A **BigNumber** represents an arbitrary-precision signed integer backed by the TomsFastMath (libtfm) C library, supporting numbers up to 4096 bits. A multiplication accepts operands of up to 2048 bits each. The default property is [**ValueString**](#valuestring).

```tb
Dim a As New BigNumber
Dim b As New BigNumber
Dim result As New BigNumber

a.ValueString = "123456789012345678901234567890"
b.ValueString = "987654321098765432109876543210"
result.AssignAddition a, b
Debug.Print result.ValueString
```

> [!NOTE]
> This class requires twinBASIC BETA 434 or newer. Overflow errors are not trapped. String-to-value conversions silently stop at the first invalid character --- for example, setting `ValueHex = "ABC123he"` stores `&HABC123` without raising an error.

* TOC
{:toc}

## Properties

### ValueString
{: .no_toc }

Returns or sets the value as a decimal string representation. **Default property.**

Syntax: *object*.**ValueString** [ = *value* ]

*value*
: A **String** containing a decimal integer, optionally preceded by a minus sign. Conversion stops at the first character that is not a valid decimal digit.

The getter returns the decimal digits, preceded by a minus sign for a negative value.

### ValueHex
{: .no_toc }

Returns or sets the value as a hexadecimal string representation.

Syntax: *object*.**ValueHex** [ = *value* ]

*value*
: A **String** containing a hexadecimal integer (digits `0`--`9` and `A`--`F`, case-insensitive), optionally preceded by a minus sign. Conversion stops at the first character that is not a valid hex digit.

The getter returns upper-case digits without leading zeros, preceded by a minus sign for a negative value.

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
: A **Boolean**. Setting **True** marks the number as negative; setting **False** marks it as positive.

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

### AssignModulus
{: .no_toc }

Sets this instance to `a Mod b`. The result is zero or has the sign of *b*, so `-7 Mod 2` is 1 and `7 Mod -2` is -1. Raises run-time error 5 if *b* is zero.

Syntax: *object*.**AssignModulus** *a*, *b*

*a*
: *required* A **BigNumber** holding the dividend.

*b*
: *required* A **BigNumber** holding the divisor. Must not be zero.

### AssignSquared
{: .no_toc }

Sets this instance to `a * a` (the square of *a*).

Syntax: *object*.**AssignSquared** *a*

*a*
: *required* A **BigNumber** holding the value to square.

### AssignAdditionModulus
{: .no_toc }

Sets this instance to `(a + b) Mod mod_c`.

Syntax: *object*.**AssignAdditionModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the first addend.

*b*
: *required* A **BigNumber** holding the second addend.

*mod_c*
: *required* A **BigNumber** holding the modulus.

### AssignSubtractionModulus
{: .no_toc }

Sets this instance to `(a - b) Mod mod_c`.

Syntax: *object*.**AssignSubtractionModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the minuend.

*b*
: *required* A **BigNumber** holding the subtrahend.

*mod_c*
: *required* A **BigNumber** holding the modulus.

### AssignMultiplicationModulus
{: .no_toc }

Sets this instance to `(a * b) Mod mod_c`.

Syntax: *object*.**AssignMultiplicationModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the first factor.

*b*
: *required* A **BigNumber** holding the second factor.

*mod_c*
: *required* A **BigNumber** holding the modulus.

### AssignSquaredModulus
{: .no_toc }

Sets this instance to `(a * a) Mod mod_b`.

Syntax: *object*.**AssignSquaredModulus** *a*, *mod_b*

*a*
: *required* A **BigNumber** holding the value to square.

*mod_b*
: *required* A **BigNumber** holding the modulus.

### AssignModularMultiplicativeInverse
{: .no_toc }

Sets this instance to the modular multiplicative inverse of *a* modulo *mod_b* --- the value *x* such that `(a * x) Mod mod_b = 1`. Raises run-time error 5 if the inverse does not exist.

Syntax: *object*.**AssignModularMultiplicativeInverse** *a*, *mod_b*

*a*
: *required* A **BigNumber** holding the value to invert.

*mod_b*
: *required* A **BigNumber** holding the modulus.

### AssignGreatestCommonDivisor
{: .no_toc }

Sets this instance to the greatest common divisor of *a* and *b*. The signs of *a* and *b* are ignored; the result is always non-negative.

Syntax: *object*.**AssignGreatestCommonDivisor** *a*, *b*

*a*
: *required* A **BigNumber** holding the first value.

*b*
: *required* A **BigNumber** holding the second value.

### AssignLeastCommonMultiple
{: .no_toc }

Sets this instance to the least common multiple of *a* and *b*. The signs of *a* and *b* are ignored.

Syntax: *object*.**AssignLeastCommonMultiple** *a*, *b*

*a*
: *required* A **BigNumber** holding the first value.

*b*
: *required* A **BigNumber** holding the second value.

### AssignShiftRight
{: .no_toc }

Sets this instance to *a* right-shifted by *shiftAmount_b* bits (equivalent to integer division by 2^*shiftAmount_b*, truncated toward zero, so shifting -1 right by any positive amount gives 0).

Syntax: *object*.**AssignShiftRight** *a*, *shiftAmount_b*

*a*
: *required* A **BigNumber** holding the value to shift.

*shiftAmount_b*
: *required* A **Long** specifying the number of bit positions to shift right.

### AssignShiftLeft
{: .no_toc }

Sets this instance to *a* left-shifted by *shiftAmount_b* bits (equivalent to multiplication by 2^*shiftAmount_b*).

Syntax: *object*.**AssignShiftLeft** *a*, *shiftAmount_b*

*a*
: *required* A **BigNumber** holding the value to shift.

*shiftAmount_b*
: *required* A **Long** specifying the number of bit positions to shift left.

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

```tb
Public Function Factorial50() As String
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

    Factorial50 = result.ValueString
End Function
```

## See Also

- [BigNumberLib](.) package -- overview
