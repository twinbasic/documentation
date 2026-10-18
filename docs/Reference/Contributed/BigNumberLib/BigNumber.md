---
title: BigNumber
parent: BigNumberLib Package
permalink: /tB/Packages/Contributed/BigNumberLib/BigNumber
has_toc: false
---

# BigNumber class
{: .no_toc }

<!-- test: OverflowTests.Capacity_4096BitNumberIsHeld, ArithmeticTests.AssignMultiplication_OperandsOf2048Bits, ArithmeticTests.AssignAddition_ManualExample -->
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
<!-- /test -->

<!-- test: none -- a statement about the twinBASIC build the class needs -->
> [!NOTE] since BETA 434
> The class needs this build of twinBASIC or a later one.

<!-- test: ConversionTests.ValueString_StopsAtFirstInvalidCharacter, ConversionTests.ValueHex_StopsAtFirstInvalidCharacter -->
> [!NOTE] 1.0.4.0
> String-to-value conversions silently stop at the first invalid character --- for example, setting `ValueHex = "ABC123he"` stores `&HABC123` without raising an error.

<!-- test: OverflowTests.Overflow_ShiftLeftBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_MultiplicationBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_AdditionBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_ValueStringWithTooManyDigits_RaisesErrorOrIsRight, OverflowTests.Overflow_ValueHexWithTooManyDigits_RaisesErrorOrIsRight, OverflowTests.Capacity_ShiftLeftToTheLibraryLimitIsRight, OverflowTests.Capacity_AFewBitsOver4096IsStillRight, OverflowTests.Capacity_ProductOfTheLargestWholeNumberOfDigitsIsRight, OverflowTests.Overflow_NegationOfA4200BitNumber_RaisesErrorOrIsRight -->
The library holds a little more than the 4096 bits the class supports, 4352 bits in a 32-bit program and 4608 in a 64-bit one, so a result a few bits over 4096 may still be right. [**AssignAddition**](#assignaddition), [**AssignMultiplication**](#assignmultiplication) and [**AssignShiftLeft**](#assignshiftleft) raise run-time error 6 for a result that needs more bits than the library holds, and so do [**ValueString**](#valuestring) and [**ValueHex**](#valuehex) for a string with more digits than fit.
<!-- /test -->

<!-- test: OverflowTests.Overflow_SubtractionBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_SquareBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_SquareOneBitOverTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_MultiplicationOneBitOverTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_MultiplicationOfUnequalSizesOneBitOverTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_ProductOfExactlyTheLibraryBits_RaisesErrorOrIsRight, OverflowTests.Overflow_AdditionModulusIntermediateBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_SubtractionModulusIntermediateBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_MultiplicationModulusIntermediateBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_SquaredModulusIntermediateBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_ValueOctalWithTooManyDigits_RaisesErrorOrIsRight, OverflowTests.Overflow_ValueBinaryWithTooManyDigits_RaisesErrorOrIsRight, OverflowTests.Overflow_ModulusOfANumberThatFillsTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_AdditionModulusWhoseSumFillsTheLibrary_RaisesErrorOrIsRight -->
> [!WARNING] 1.0.4.0
> Overflow is not trapped everywhere. [**AssignModulus**](#assignmodulus) and [**AssignAdditionModulus**](#assignadditionmodulus) do not return, and the program stops responding, when the dividend or the sum comes within one word (32 bits in a 32-bit program, 64 bits in a 64-bit one) of what the library holds: how close depends on the divisor. A two-factor product that **AssignMultiplication** accepts can be that large. These members raise no error when a value needs more bits than the library holds, and give a wrong result, often zero:
>
> - [**AssignSubtraction**](#assignsubtraction), and [**AssignSquared**](#assignsquared) for a square of more than about 4320 bits in a 32-bit program, or 4544 bits in a 64-bit one.
> - [**AssignMultiplication**](#assignmultiplication) for a product of more than 4320 bits (4544 in a 64-bit program) and up to one bit more than the library holds. A larger product raises error 6.
> - [**AssignAdditionModulus**](#assignadditionmodulus), [**AssignSubtractionModulus**](#assignsubtractionmodulus), [**AssignMultiplicationModulus**](#assignmultiplicationmodulus) and [**AssignSquaredModulus**](#assignsquaredmodulus), when the sum, difference, product or square that they compute before taking the remainder does not fit, even with a small modulus. For the last two, that is the case with operands of more than about 2160 bits (2270 in a 64-bit program).
> - [**ValueOctal**](#valueoctal) and [**ValueBinary**](#valuebinary), which keep only the low bits of a string with more digits than fit.
>
> Values within the limits that the class states, numbers of up to 4096 bits and multiplication operands of up to 2048 bits, are not affected.

* TOC
{:toc}

## Properties

### ValueString
{: .no_toc }

<!-- test: ConversionTests.ValueString_NewNumberIsZero, ConversionTests.ValueString_RoundTrip, ConversionTests.ValueString_IsTheDefaultMember, ConversionTests.ValueString_LeadingPlusOrSpaceGivesZero, ConversionTests.ValueString_NoDigitsGivesZero -->
Returns or sets the value as a decimal string representation. **Default property.**

Syntax: *object*.**ValueString** [ = *value* ]

*value*
: A **String** containing a decimal integer, optionally preceded by a minus sign. Conversion stops at the first character that is not a valid decimal digit, so a leading plus sign or space gives 0. A string with no digits gives 0.

The getter returns the decimal digits, preceded by a minus sign for a negative value.
<!-- /test -->

### ValueHex
{: .no_toc }

<!-- test: ConversionTests.ValueHex_UpperCaseWithoutLeadingZeros, ConversionTests.ValueHex_PrefixIsNotAccepted, ConversionTests.ValueHex_Negative, ConversionTests.Conversions_NegativeNumberInEveryBase, ConversionTests.Conversions_PowerOfTwoInEveryBase, ConversionTests.Conversions_LargeNumberSameInEveryBase -->
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
<!-- /test -->

### ValueOctal
{: .no_toc }

<!-- test: ConversionTests.ValueOctal_RoundTripAndStop -->
Returns or sets the value as an octal string representation.

Syntax: *object*.**ValueOctal** [ = *value* ]

*value*
: A **String** containing an octal integer (digits `0`--`7`), optionally preceded by a minus sign. Conversion stops at the first character that is not a valid octal digit.

The getter returns the digits without leading zeros, preceded by a minus sign for a negative value.
<!-- /test -->

### ValueBinary
{: .no_toc }

<!-- test: ConversionTests.ValueBinary_RoundTripAndStop -->
Returns or sets the value as a binary string representation.

Syntax: *object*.**ValueBinary** [ = *value* ]

*value*
: A **String** containing a binary integer (digits `0` and `1`), optionally preceded by a minus sign. Conversion stops at the first character that is not `0` or `1`.

The getter returns the digits without leading zeros, preceded by a minus sign for a negative value.
<!-- /test -->

### IsNegative
{: .no_toc }

<!-- test: SignTests.IsNegative_ReadsTheSignOfTheValue, SignTests.IsNegative_SetFalseMakesNumberNonNegative, SignTests.IsNegative_SetTrueShowsMinusSign, SignTests.IsNegative_SetTrueShowsMinusSignInEveryBase, SignTests.IsNegative_SetTrueMakesArithmeticRight, SignTests.IsNegative_SetTrueMakesNumberLessThanZero -->
Returns or sets whether the value is negative.

Syntax: *object*.**IsNegative** [ = *value* ]

*value*
: A **Boolean**. Setting **True** makes the number negative, and setting **False** makes it non-negative.

The getter returns **True** for a negative number, and **False** for a positive number and for zero.

```tb check_build check_run
Dim n As New BigNumber
n.ValueString = "5"
n.IsNegative = True
Debug.Print n.IsNegative     ' True
Debug.Print n.ValueString    ' -5
```
<!-- /test -->

## Methods

### AssignAddition
{: .no_toc }

<!-- test: ArithmeticTests.AssignAddition_Signs, ArithmeticTests.AssignAddition_LargeNumbers -->
Sets this instance to `a + b`.

Syntax: *object*.**AssignAddition** *a*, *b*

*a*
: *required* A **BigNumber** holding the first operand.

*b*
: *required* A **BigNumber** holding the second operand.
<!-- /test -->

### AssignSubtraction
{: .no_toc }

<!-- test: ArithmeticTests.AssignSubtraction_Signs, ArithmeticTests.AssignSubtraction_LargeNumbers -->
Sets this instance to `a - b`.

Syntax: *object*.**AssignSubtraction** *a*, *b*

*a*
: *required* A **BigNumber** holding the minuend.

*b*
: *required* A **BigNumber** holding the subtrahend.
<!-- /test -->

### AssignMultiplication
{: .no_toc }

<!-- test: ArithmeticTests.AssignMultiplication_Signs, ArithmeticTests.AssignMultiplication_LargeNumbers -->
Sets this instance to `a * b`.

Syntax: *object*.**AssignMultiplication** *a*, *b*

*a*
: *required* A **BigNumber** holding the first factor.

*b*
: *required* A **BigNumber** holding the second factor.
<!-- /test -->

### AssignDivision
{: .no_toc }

<!-- test: ArithmeticTests.AssignDivision_TruncatesTowardZero, ArithmeticTests.AssignDivision_LargeNumbers, ErrorTests.AssignDivision_ByZero_RaisesError5, ErrorTests.AssignDivision_ByZero_KeepsTheValue -->
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
<!-- /test -->

### AssignModulus
{: .no_toc }

<!-- test: ModulusTests.AssignModulus_PositiveDivisor, ModulusTests.AssignModulus_NegativeDivisor, ModulusTests.AssignModulus_ManualExamples, ModulusTests.AssignModulus_LargeNumbers, ErrorTests.AssignModulus_ByZero_RaisesError5, ModulusTests.AssignModulus_NegativeDivisor_ZeroResultIsNotNegative, ModulusTests.AssignModulus_NegativeDivisor_ZeroResultEqualsZero -->
Sets this instance to `a Mod b`. The result is zero or has the sign of *b*, so `-7 Mod 2` is 1 and `7 Mod -2` is -1. Raises run-time error 5 if *b* is zero.

Syntax: *object*.**AssignModulus** *a*, *b*

*a*
: *required* A **BigNumber** holding the dividend.

*b*
: *required* A **BigNumber** holding the divisor. Must not be zero.
<!-- /test -->

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

<!-- test: ArithmeticTests.AssignSquared_Signs, ArithmeticTests.AssignSquared_LargeNumber, SignTests.AssignSquared_Zero_IsNotNegative, SignTests.AssignSquared_Zero_EqualsZeroFromString -->
Sets this instance to `a * a` (the square of *a*).

Syntax: *object*.**AssignSquared** *a*

*a*
: *required* A **BigNumber** holding the value to square.
<!-- /test -->

### AssignAdditionModulus
{: .no_toc }

<!-- test: ModulusTests.AssignAdditionModulus_PositiveModulus, ModulusTests.AssignAdditionModulus_NegativeModulus, ModulusTests.AssignAdditionModulus_ManualExamples, ErrorTests.AssignAdditionModulus_ByZero_RaisesError5 -->
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
<!-- /test -->

### AssignSubtractionModulus
{: .no_toc }

<!-- test: ModulusTests.AssignSubtractionModulus_PositiveModulus, ModulusTests.AssignSubtractionModulus_NegativeModulus, ErrorTests.AssignSubtractionModulus_ByZero_RaisesError5 -->
Sets this instance to `(a - b) Mod mod_c`. Raises run-time error 5 if *mod_c* is zero. [**AssignAdditionModulus**](#assignadditionmodulus) describes the sign of the result.

Syntax: *object*.**AssignSubtractionModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the minuend.

*b*
: *required* A **BigNumber** holding the subtrahend.

*mod_c*
: *required* A **BigNumber** holding the modulus. It should be positive.
<!-- /test -->

### AssignMultiplicationModulus
{: .no_toc }

<!-- test: ModulusTests.AssignMultiplicationModulus_PositiveModulus, ModulusTests.AssignMultiplicationModulus_NegativeModulus, ModulusTests.AssignMultiplicationModulus_LargeNumbers, ErrorTests.AssignMultiplicationModulus_ByZero_RaisesError5 -->
Sets this instance to `(a * b) Mod mod_c`. Raises run-time error 5 if *mod_c* is zero. [**AssignAdditionModulus**](#assignadditionmodulus) describes the sign of the result.

Syntax: *object*.**AssignMultiplicationModulus** *a*, *b*, *mod_c*

*a*
: *required* A **BigNumber** holding the first factor.

*b*
: *required* A **BigNumber** holding the second factor.

*mod_c*
: *required* A **BigNumber** holding the modulus. It should be positive.
<!-- /test -->

### AssignSquaredModulus
{: .no_toc }

<!-- test: ModulusTests.AssignSquaredModulus_PositiveModulus, ModulusTests.AssignSquaredModulus_NegativeModulus, ErrorTests.AssignSquaredModulus_ByZero_RaisesError5 -->
Sets this instance to `(a * a) Mod mod_b`. Raises run-time error 5 if *mod_b* is zero. [**AssignAdditionModulus**](#assignadditionmodulus) describes the sign of the result.

Syntax: *object*.**AssignSquaredModulus** *a*, *mod_b*

*a*
: *required* A **BigNumber** holding the value to square.

*mod_b*
: *required* A **BigNumber** holding the modulus. It should be positive.
<!-- /test -->

### AssignModularMultiplicativeInverse
{: .no_toc }

<!-- test: InverseTests.Inverse_ManualExample, InverseTests.Inverse_ProductWithResultIsOneModuloModulus, InverseTests.Inverse_KnownValues, InverseTests.Inverse_NegativeValueGivesNegativeResult, InverseTests.Inverse_CommonFactorRaisesError5, InverseTests.Inverse_MultipleOfModulusRaisesError5, InverseTests.Inverse_ModulusOneRaisesNoError, InverseTests.Inverse_ZeroModulusRaisesError5, InverseTests.Inverse_ZeroValueOddModulus_RaisesError5, InverseTests.Inverse_NegativeOddModulus_RaisesError5, InverseTests.Inverse_ZeroValueEvenModulusRaisesError5, InverseTests.Inverse_NegativeEvenModulusRaisesError5 -->
Sets this instance to the modular multiplicative inverse of *a* modulo *mod_b* --- the value *x* such that `(a * x) Mod mod_b = 1`. Raises run-time error 5 if the inverse does not exist, which is the case when *a* and *mod_b* have a common factor greater than 1, such as when *a* is a multiple of *mod_b* or is zero. For a negative *a* the result is negative: the inverse of -3 modulo 7 is -5, because `(-3 * -5) Mod 7` is 1. Modulo 1 there is no error: the inverse of 5 modulo 1 is 0.

Syntax: *object*.**AssignModularMultiplicativeInverse** *a*, *mod_b*

*a*
: *required* A **BigNumber** holding the value to invert.

*mod_b*
: *required* A **BigNumber** holding the modulus. It must be positive: a zero or negative *mod_b* raises run-time error 5.
<!-- /test -->

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

<!-- test: GcdLcmTests.Gcd_PositiveValues, GcdLcmTests.Gcd_WithZero, GcdLcmTests.Gcd_ResultIsNonNegativeWhateverTheSigns, GcdLcmTests.Gcd_LargeNumbers, GcdLcmTests.Gcd_NegativeFirstOperandKeepsItsValue, GcdLcmTests.Gcd_NegativeSecondOperandKeepsItsValue, GcdLcmTests.Gcd_NegativeOperandStillAddsCorrectly -->
Sets this instance to the greatest common divisor of *a* and *b*. The signs of *a* and *b* are ignored; the result is always non-negative, and *a* and *b* keep their values. The greatest common divisor of zero and *b* is the absolute value of *b*, and that of two zeros is zero.

Syntax: *object*.**AssignGreatestCommonDivisor** *a*, *b*

*a*
: *required* A **BigNumber** holding the first value.

*b*
: *required* A **BigNumber** holding the second value.

```tb check_build check_run
Dim a As New BigNumber
Dim b As New BigNumber
Dim g As New BigNumber
a.ValueString = "-12"
b.ValueString = "18"
g.AssignGreatestCommonDivisor a, b
Debug.Print g.ValueString    ' 6
Debug.Print a.ValueString    ' -12
```
<!-- /test -->

### AssignLeastCommonMultiple
{: .no_toc }

<!-- test: GcdLcmTests.Lcm_PositiveValues, GcdLcmTests.Lcm_WithZero, GcdLcmTests.Lcm_ResultIsNonNegativeWhateverTheSigns, GcdLcmTests.Lcm_LargeNumbers, GcdLcmTests.Lcm_NegativeFirstOperandKeepsItsValue, GcdLcmTests.Lcm_NegativeSecondOperandKeepsItsValue, GcdLcmTests.Lcm_NegativeOperandStillAddsCorrectly -->
Sets this instance to the least common multiple of *a* and *b*. The signs of *a* and *b* are ignored; the result is non-negative, and *a* and *b* keep their values. The least common multiple of zero and a value that is not zero is zero.

Syntax: *object*.**AssignLeastCommonMultiple** *a*, *b*

*a*
: *required* A **BigNumber** holding the first value.

*b*
: *required* A **BigNumber** holding the second value.
<!-- /test -->

<!-- test: GcdLcmTests.Lcm_OfTwoZeros_64Bit -->
> [!WARNING] 1.0.4.0
> In a 64-bit program, when *a* and *b* are both zero, this instance keeps the value it had: the result is not set to zero. In a 32-bit program the result is zero or the value the instance had, differing from one build of the program to the next.

### AssignShiftRight
{: .no_toc }

<!-- test: ShiftTests.ShiftRight_DividesByPowerOfTwoTruncatingTowardZero, ShiftTests.ShiftRight_ManualExamples, ShiftTests.ShiftRight_LargeNumber, ShiftTests.ShiftRight_NegativeAmountLeavesValueUnchanged -->
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
<!-- /test -->

### AssignShiftLeft
{: .no_toc }

<!-- test: ShiftTests.ShiftLeft_MultipliesByPowerOfTwo, ShiftTests.ShiftLeft_ManualExample, ShiftTests.ShiftLeft_ByThousandsOfBits, ShiftTests.ShiftLeft_NegativeAmountRaisesError5OrShiftsRight -->
Sets this instance to *a* left-shifted by *shiftAmount_b* bits (equivalent to multiplication by 2^*shiftAmount_b*).

Syntax: *object*.**AssignShiftLeft** *a*, *shiftAmount_b*

*a*
: *required* A **BigNumber** holding the value to shift.

*shiftAmount_b*
: *required* A **Long** specifying the number of bit positions to shift left. It must not be negative: a negative amount raises run-time error 5, and this instance keeps its value.

```tb check_build check_run
Dim a As New BigNumber
Dim r As New BigNumber
a.ValueString = "5"
r.AssignShiftLeft a, 100
Debug.Print r.ValueString    ' 6338253001141147007483516026880
```
<!-- /test -->

### AssignNegation
{: .no_toc }

<!-- test: SignTests.AssignNegation_ChangesTheSign, SignTests.AssignNegation_OfZeroIsZero, SignTests.AssignNegation_ResultOfNegationAddsToZero, SignTests.AssignNegation_ReturnValueIsFalse -->
Sets this instance to the arithmetic negation of *a* (`-a`).

Syntax: *object*.**AssignNegation** *a*

*a*
: *required* A **BigNumber** holding the value to negate.

**AssignNegation** is declared as a **Function** returning **Boolean**, but the return value is never set and is always **False**.
<!-- /test -->

### AssignAbsolute
{: .no_toc }

<!-- test: SignTests.AssignAbsolute_DropsTheSign, SignTests.AssignAbsolute_ReturnValueIsFalse -->
Sets this instance to the absolute value of *a*.

Syntax: *object*.**AssignAbsolute** *a*

*a*
: *required* A **BigNumber** holding the value whose absolute value is taken.

**AssignAbsolute** is declared as a **Function** returning **Boolean**, but the return value is never set and is always **False**.
<!-- /test -->

### AssignFromLong
{: .no_toc }

<!-- test: SignTests.AssignFromLong_Values, SignTests.AssignFromLong_MostNegativeLong, SignTests.AssignFromLong_ReplacesThePreviousValue, SignTests.AssignFromLong_Zero_IsNotNegative, SignTests.AssignFromLong_Zero_EqualsZeroFromString, SignTests.AssignFromLong_Zero_IsNotLessThanZeroFromString, SignTests.AssignFromLong_Zero_TextIsZero, SignTests.AssignFromLong_Zero_AddsAndSubtractsAsZero, SignTests.AssignFromLong_Zero_ValueStringZeroGivesTrueZero, SignTests.AssignFromLong_Zero_IsNegativeFalseGivesTrueZero -->
Sets this instance to a value from a native **Long** integer.

Syntax: *object*.**AssignFromLong** *a*

*a*
: *required* A **Long** holding the value to assign. Negative values (including `&H80000000`) are handled correctly.

```tb check_build check_run
Dim n As New BigNumber
n.AssignFromLong -42
Debug.Print n.ValueString    ' -42
n.AssignFromLong &H80000000
Debug.Print n.ValueString    ' -2147483648
```
<!-- /test -->

### HandleError
{: .no_toc }

<!-- test: ErrorTests.HandleError_NewNumberRaisesNothing, ErrorTests.HandleError_AfterAFailureRaisesAgain, ErrorTests.HandleError_StaysAfterAMethodThatStoresNoStatus, ErrorTests.HandleError_ClearedByAMemberThatStoresStatus -->
Examines the last status code the class stored from the library and raises run-time error 5 if it is a failure. The error description is "invalid operation" or "out of memory".

Syntax: *object*.**HandleError**

The string-conversion properties, **AssignDivision**, **AssignModulus**, the four modular-arithmetic methods (**AssignAdditionModulus**, **AssignSubtractionModulus**, **AssignMultiplicationModulus**, **AssignSquaredModulus**) and **AssignModularMultiplicativeInverse** store the library's status and call **HandleError** themselves. The other methods do not store a status. The stored status stays in place until one of those members runs again, so calling **HandleError** later raises the error again.
<!-- /test -->

## Comparison functions

### IsEqualTo
{: .no_toc }

<!-- test: ComparisonTests.IsEqualTo_AllPairs, ComparisonTests.IsEqualTo_SameValueFromDifferentBases, ComparisonTests.Comparisons_LargeNumbers -->
Returns **True** if this instance equals *b*.

Syntax: *object*.**IsEqualTo**( *b* )

*b*
: *required* A **BigNumber** to compare against.
<!-- /test -->

### IsLessThan
{: .no_toc }

<!-- test: ComparisonTests.IsLessThan_AllPairs -->
Returns **True** if this instance is less than *b*.

Syntax: *object*.**IsLessThan**( *b* )

*b*
: *required* A **BigNumber** to compare against.
<!-- /test -->

### IsLessThanOrEqualTo
{: .no_toc }

<!-- test: ComparisonTests.IsLessThanOrEqualTo_AllPairs -->
Returns **True** if this instance is less than or equal to *b*.

Syntax: *object*.**IsLessThanOrEqualTo**( *b* )

*b*
: *required* A **BigNumber** to compare against.
<!-- /test -->

### IsGreaterThan
{: .no_toc }

<!-- test: ComparisonTests.IsGreaterThan_AllPairs -->
Returns **True** if this instance is greater than *b*.

Syntax: *object*.**IsGreaterThan**( *b* )

*b*
: *required* A **BigNumber** to compare against.
<!-- /test -->

### IsGreaterThanOrEqualTo
{: .no_toc }

<!-- test: ComparisonTests.IsGreaterThanOrEqualTo_AllPairs -->
Returns **True** if this instance is greater than or equal to *b*.

Syntax: *object*.**IsGreaterThanOrEqualTo**( *b* )

*b*
: *required* A **BigNumber** to compare against.
<!-- /test -->

## Example

<!-- test: ArithmeticTests.Example_Factorial50 -->
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
<!-- /test -->

## See Also

- [BigNumberLib](.) package -- overview
