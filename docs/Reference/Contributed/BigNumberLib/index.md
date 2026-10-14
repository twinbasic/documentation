---
title: BigNumberLib Package
parent: Experimental Packages
has_toc: false
indexed_from: 1.0.2.0
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

**Author:** WaynePhillipsEA. **Version:** 1.0.2.0. **On GitHub:** [libtom/tomsfastmath](https://github.com/libtom/tomsfastmath), the C library that the package wraps.

The **BigNumberLib** contributed package provides arbitrary-precision signed integer arithmetic for twinBASIC. Its one class, [**BigNumber**](BigNumber), holds an integer of up to 4096 bits. The arithmetic is done by version 0.13.1 of the TomsFastMath (libtfm) C library, which the package links as a static library, one build for 32-bit programs and one for 64-bit programs.

A number is set and read as a string in decimal, hexadecimal, octal or binary, or is set from a **Long**. The class adds, subtracts, multiplies, divides and squares; takes a remainder, also of a sum, a difference, a product or a square; finds a modular inverse, a greatest common divisor and a least common multiple; shifts; and compares.

> [!WARNING] 1.0.2.0
> Some members give wrong results, or do not return. Each is described under its member on the [**BigNumber**](BigNumber) page:
>
> - Setting [**IsNegative**](BigNumber#isnegative) to **True** does not make a number negative. [**AssignGreatestCommonDivisor**](BigNumber#assigngreatestcommondivisor) and [**AssignLeastCommonMultiple**](BigNumber#assignleastcommonmultiple) leave a negative operand in the same state, with its minus sign gone.
> - [**AssignFromLong**](BigNumber#assignfromlong) with 0 gives a zero that is flagged negative, which [**IsEqualTo**](BigNumber#isequalto) does not find equal to a zero read from a string. [**AssignSquared**](BigNumber#assignsquared) of zero and [**AssignModulus**](BigNumber#assignmodulus) with a negative divisor can give the same zero.
> - [**AssignModularMultiplicativeInverse**](BigNumber#assignmodularmultiplicativeinverse) does not return when the modulus is odd and the value is zero or the modulus is negative.
> - Overflow is not trapped: a result of more than the library holds, a little over 4096 bits, loses its high bits, with no error.

## Classes

- [BigNumber](BigNumber) -- arbitrary-precision signed integer backed by the TomsFastMath (libtfm) C library, supporting numbers up to 4096 bits.

## Test code

The package also contains **BigNumberTests**, a module with one **Sub**, **RunAllTests**, which runs the **RunTests** Sub of 22 test modules, one for each operation and each string conversion (**Addition**, **Divide**, **Modulus**, **ShiftLeft**, **ValueHex**, **Comparisons** and so on). Together they make 777 checks with **Debug.Assert**, which a built program skips. Run in the IDE, version 1.0.2.0 passes all of them. These modules have no pages of their own here.

**BigNumber** also declares a structure type, **fp_int**, which holds the number for the library, and a program does not use it.
