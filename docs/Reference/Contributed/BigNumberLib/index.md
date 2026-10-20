---
title: BigNumberLib Package
parent: Contributed Packages
has_toc: false
indexed_from: 1.0.4.0
exclude_from_docs:
  - Absolute
  - AddModulus
  - Addition
  - BigNumberTests
  - Comparisons
  - Divide
  - GreatestCommonDivisor
  - LeastCommonMultiple
  - ModularMultiplicativeInverse
  - Modulus
  - Multiply
  - MultiplyModulus
  - Negate
  - ShiftLeft
  - ShiftRight
  - Square
  - SquareModulus
  - Subtract
  - SubtractModulus
  - ValueBinary
  - ValueHex
  - ValueOctal
  - ValueString
  - fp_int
permalink: /tB/Packages/Contributed/BigNumberLib/
---

# BigNumberLib Package
{: .no_toc }

**Author:** WaynePhillipsEA. **Version:** 1.0.4.0. **On GitHub:** [libtom/tomsfastmath](https://github.com/libtom/tomsfastmath), the C library that the package wraps.

The **BigNumberLib** contributed package provides arbitrary-precision signed integer arithmetic for twinBASIC. Its one class, [**BigNumber**](BigNumber), holds an integer of up to 4096 bits. The arithmetic is done by version 0.13.1 of the TomsFastMath (libtfm) C library, which the package links as a static library, one build for 32-bit programs and one for 64-bit programs.

A number is set and read as a string in decimal, hexadecimal, octal or binary, or is set from a **Long**. The class adds, subtracts, multiplies, divides and squares; takes a remainder, also of a sum, a difference, a product or a square; finds a modular inverse, a greatest common divisor and a least common multiple; shifts; and compares.

<!-- test: GcdLcmTests.Lcm_OfTwoZeros_64Bit, OverflowTests.Overflow_SubtractionBeyondTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_MultiplicationOneBitOverTheLibrary_RaisesErrorOrIsRight, OverflowTests.Overflow_ValueBinaryWithTooManyDigits_RaisesErrorOrIsRight, OverflowTests.Overflow_ModulusOfANumberThatFillsTheLibrary_RaisesErrorOrIsRight -->
> [!WARNING] 1.0.4.0
> Some members give wrong results with no error, or do not return. The [**BigNumber**](BigNumber) page describes each:
>
> - [**AssignLeastCommonMultiple**](BigNumber#assignleastcommonmultiple) of two zeros leaves the number as it was.
> - Overflow is trapped by some members only. A value of more bits than the library holds, a little over 4096, gives a wrong result with no error in subtraction, squaring, the modular operations, some multiplications, and **ValueOctal** and **ValueBinary**. A remainder of a number within one word of what the library holds does not return.

## Classes

- [BigNumber](BigNumber) -- arbitrary-precision signed integer backed by the TomsFastMath (libtfm) C library, supporting numbers up to 4096 bits.

## Test code

The package also contains **BigNumberTests**, a module with one **Sub**, **RunAllTests**, which runs the **RunTests** Sub of 22 test modules, one for each operation and each string conversion (**Addition**, **Divide**, **Modulus**, **ShiftLeft**, **ValueHex**, **Comparisons** and so on). Together they make 777 checks with **Debug.Assert**, which a built program skips. Run in the IDE, version 1.0.4.0 passes all of them. These modules have no pages of their own here.

**BigNumber** also declares a structure type, **fp_int**, which holds the number for the library, and a program does not use it.

## Test cases

The notes and warnings of this section are checked by the test cases in [BigNumberLib-tests.twinproj](BigNumberLib-tests.twinproj), a twinBASIC project. It uses BigNumberLib as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
