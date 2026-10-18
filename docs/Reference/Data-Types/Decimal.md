---
title: Decimal
parent: Data Types
grand_parent: Reference Section
nav_order: 10
permalink: /tB/Core/Decimal
vba_attribution: true
---

# Decimal
{: .no_toc }

A decimal number of up to 29 digits, up to 28 of them after the decimal point.

Syntax:

- [**Dim**](Dim) *varname* **As Decimal** [ **=** *expression* ]
- [**DefDec**](Deftype) *letterrange*

A **Decimal** variable is declared **As Decimal**. [**DefDec**](Deftype) makes **Decimal** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. **Decimal** has no type-declaration character. A **Decimal** that is not given a value holds 0.

**Decimal** stores decimal fractions exactly, with more digits than any other numeric type. It suits money and measurements whose digits must come out as written, and results of division that must keep their precision. The **Variant** subtype for a **Decimal** is **vbDecimal** (14), and [**TypeName**](../Modules/Information/TypeName) gives `Decimal`.

> [!NOTE]
> **Decimal** is a full declared type in twinBASIC: `Dim Amount As Decimal` compiles and runs. In VBA a **Decimal** can exist only as the subtype of a **Variant**, made with [**CDec**](../Modules/Conversion/CDec), and VB6 has no **Decimal** at all: `Dim x As Decimal` is a compile error there.

## Storage and range

A **Decimal** is stored in 16 bytes, in both 32-bit and 64-bit builds: a 96-bit unsigned integer, a sign, and a scale from 0 to 28 that says how many digits of the integer are after the decimal point. With a scale of 0 the largest value is 79,228,162,514,264,337,593,543,950,335. With a scale of 28 the largest value is 7.9228162514264337593543950335, and the smallest value that is not 0 is 0.0000000000000000000000000001. The range is the same for negative values.

```tb check_run
Dim Amount As Decimal
Debug.Print Amount                  ' 0
Debug.Print LenB(Amount)            ' 16
Debug.Print TypeName(Amount)        ' Decimal
Debug.Print VarType(Amount) = vbDecimal ' True
Amount = CDec("79228162514264337593543950335")
Debug.Print Amount                  ' 79228162514264337593543950335
Debug.Print CDec("0.0000000000000000000000000001") ' 0.0000000000000000000000000001
```

## Literals

There is no **Decimal** literal. A number with a decimal point is a **Double**, and so is a whole number beyond the **Long** range, so a **Double** with 15 significant digits is all a literal can give. Convert a string with [**CDec**](../Modules/Conversion/CDec) to keep every digit: `CDec("0.1")`. A **Double** or **Long** assigned to a **Decimal** variable is converted: `Dim Amount As Decimal = 1.5`.

`CDec(0.1)` is 0.1 because a **Double** converts with 15 significant digits, so `CDec(1 / 3)` is 0.333333333333333, not 28 threes.

## Conversions

[**CDec**](../Modules/Conversion/CDec) converts an expression to a **Decimal**, and so does assigning one to a **Decimal** variable. A string is read as a number, and `True` is -1. A value with more than 28 decimal places is rounded to 28, and a value exactly halfway is rounded to the even digit: `CDec("0.00000000000000000000000000015")` is 0.0000000000000000000000000002, and `CDec("0.00000000000000000000000000005")` is 0. A value outside the range raises error 6, *Overflow*: `CDec(1E+29)` does. A string that is not a number raises error 13, *Type mismatch*.

A **Decimal** converted to a whole number is rounded to the nearest, with halves going to the even number: assigning `CDec(2.5)` to a **Long** gives 2 and `CDec(3.5)` gives 4.

```tb check_run
Dim Amount As Decimal
Dim Whole As Long
Debug.Print CDec("0.1")             ' 0.1
Debug.Print CDec("0.00000000000000000000000000015") ' 0.0000000000000000000000000002
Debug.Print CDec(True)              ' -1
Whole = CDec(2.5)
Debug.Print Whole                   ' 2
On Error Resume Next
Amount = CDec(1E+29)
Debug.Print Err.Number              ' 6
```

## Arithmetic and overflow

An operation with a **Decimal** gives a **Decimal**, whatever the type of the other operand: a **Byte**, **Integer**, **Long**, **LongLong**, **Single**, **Double**, **Currency** or **Date** beside a **Decimal** gives a **Decimal**. The exceptions are `^`, which always gives a **Double**, and `\` and `Mod`, which give a **Decimal** for two declared **Decimal** values but a **Long** when either operand is a **Variant**. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

Addition, subtraction and multiplication are exact while the result fits. Division is rounded to fit the type: `CDec(1) / 3` keeps 28 decimal places, so `CDec(1) / 3 * 3` is 0.9999999999999999999999999999, not 1. A result outside the range raises error 6, *Overflow*, and a division by zero raises error 11.

```tb check_run
Dim Total As Decimal
Dim i As Long
For i = 1 To 10
    Total = Total + CDec("0.1")
Next
Debug.Print Total                   ' 1
Debug.Print Total = 1               ' True
Debug.Print CDec("1000.01") * CDec("0.0325") ' 32.500325
Debug.Print CDec(1) / 3             ' 0.3333333333333333333333333333
Debug.Print CDec(1) / 3 * 3         ' 0.9999999999999999999999999999
Debug.Print TypeName(Total + 1#)    ' Decimal
Debug.Print TypeName(Total ^ 2)     ' Double
```

A **Variant** holding a **Decimal** raises error 6 on overflow, as the declared type does.

### Decimal or Currency for money

Both types store decimal fractions exactly, and both are suitable for money. They differ in how many decimal places they keep, how large a value they hold, and what mixing them with a **Double** gives:

| Compared | **Currency** | **Decimal** |
|:--|:--|:--|
| Decimal places | 4 | up to 28 |
| Largest value | 922,337,203,685,477.5807 | 79,228,162,514,264,337,593,543,950,335 |
| A rate of 0.03125 | stored as 0.0312 | stored as 0.03125 |
| 1000.01 × 0.0325 | 32.5003 | 32.500325 |
| 10 / 3 | a **Double**, 3.33333333333333 | a **Decimal**, 3.3333333333333333333333333333 |
| With a **Double** | **Currency** under `+` and `-`, **Double** under `*` and `/` | **Decimal** under `+`, `-`, `*` and `/` |

**Currency** is enough when every amount and every intermediate result has at most four decimal places. **Decimal** keeps more: interest rates with five or more places, per-unit prices, and the results of division. Code that holds money in a **Variant** filled by [**CDec**](../Modules/Conversion/CDec) gets the same result types from a declared **Decimal**, except under `\` and `Mod`, where the **Variant** gives a **Long**.

## Example

This example adds a tax at 7.125% to an invoice. The rate has five decimal places and is stored exactly in a **Decimal**; a **Currency** would drop its fifth decimal and store 0.0712. The tax is kept to its full four places, and rounding to cents is the last step.

```tb check_run
Dim Net As Decimal = CDec("1234.56")
Dim Rate As Decimal = CDec("0.07125")
Dim Tax As Decimal
Tax = Net * Rate
Debug.Print Tax                             ' 87.9624
Debug.Print Net + Tax                       ' 1322.5224
Debug.Print Round(Net + Tax, 2)             ' 1322.52
```

## See Also

- [Data Types](../../Reference/Data-Types#decimal) -- the summary of all fourteen intrinsic types
- [Currency](Currency), [Double](Double), [Single](Single) -- the other non-integer types
- [CDec](../Modules/Conversion/CDec) function
- [Deftype](Deftype) statement
- [New Data Types](../../Features/Language/Data-Types) -- the new types in twinBASIC
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
