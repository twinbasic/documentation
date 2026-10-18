---
title: Single
parent: Data Types
grand_parent: Reference Section
nav_order: 7
permalink: /tB/Core/Single
vba_attribution: true
---

# Single
{: .no_toc }

A 32-bit IEEE 754 single-precision floating-point number.

Syntax:

- [**Dim**](Dim) *varname* **As Single** [ **=** *expression* ]
- **Dim** *varname*`!`
- [**DefSng**](Deftype) *letterrange*

A **Single** variable is declared **As Single**, or by the type-declaration character `!` after its name. [**DefSng**](Deftype) makes **Single** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. A **Single** that is not given a value holds 0.

A **Single** has about 7 significant decimal digits. It takes half the space of a [**Double**](Double), which makes it suited to large arrays of approximate values and to API structures with 4-byte floating-point fields. It is not suited to money or to results that depend on small differences. The **Variant** subtype for a **Single** is **vbSingle** (4), and [**TypeName**](../Modules/Information/TypeName) gives `Single`.

## Storage and range

A **Single** is stored in 4 bytes: a sign bit, an 8-bit exponent and a 23-bit fraction. It holds values from -3.402823E38 to -1.401298E-45 and from 1.401298E-45 to 3.402823E38, and 0. It has the same size in a 32-bit and a 64-bit build. A value too small for the type becomes 0 with no error.

Most decimal fractions are not stored exactly, and a **Single** keeps only about 7 digits of them. `0.1` is stored as the nearest **Single**, which is about 0.100000001490116 when read as a **Double**, and 16,777,216 plus 1 is 16,777,216 again, because the type has no room for the 1.

```tb check_run
Dim Ratio As Single
Dim Level!
Debug.Print Ratio                   ' 0
Debug.Print LenB(Ratio)             ' 4
Debug.Print TypeName(Level)         ' Single
Debug.Print VarType(Ratio) = vbSingle ' True
Ratio = 0.1
Debug.Print CDbl(Ratio)             ' 0.100000001490116
Debug.Print CSng(1 / 3)             ' 0.3333333
Dim Big As Single = 16777216
Debug.Print Big + 1 = Big           ' True
```

## Literals

A number with a decimal point or an exponent is a **Double**, so `1.5` and `1E3` are **Double** values. The suffix `!` makes a literal a **Single**: `1.5!`, `1E3!` and `1!`. A **Single** literal can be written with an exponent: `3.402823E+38!`.

```tb check_run
Debug.Print TypeName(1.5)           ' Double
Debug.Print TypeName(1.5!)          ' Single
Debug.Print TypeName(1!)            ' Single
Debug.Print TypeName(1E3!)          ' Single
Debug.Print 3.402823E+38!           ' 3.402823E+38
Debug.Print 1.401298E-45!           ' 1.401298E-45
```

## Conversions

[**CSng**](../Modules/Conversion/CSng) converts an expression to a **Single**, and so does assigning one to a **Single** variable. A string is read as a number, so `CSng("1.5")` is 1.5, and `True` is -1. A string that is not a number raises error 13, *Type mismatch*.

A value too large for the type raises error 6, *Overflow*: `CSng(1E+39)` does, and so does assigning a **Double** that is too large, as `Ratio = 1E+300`.
> [!NOTE]
> VB6 raises no error when a **Double** that is too large is assigned to a **Single**: the **Single** then holds infinity (`1.#INF`). twinBASIC raises error 6.

```tb check_run
Dim Ratio As Single
Debug.Print CSng("1.5")             ' 1.5
Debug.Print CSng(True)              ' -1
On Error Resume Next
Ratio = 1E+39
Debug.Print Err.Number              ' 6
Err.Clear
Ratio = CSng("abc")
Debug.Print Err.Number              ' 13
```

## Arithmetic and overflow

An operation on two **Single** values gives a **Single**, and so does a **Single** combined with a **Byte**, **Integer** or **Boolean**, with `/` as well as with `+`, `-` and `*`. Combined with a **Long** or **LongLong** it gives a **Double**, and so it does with a **Double**; with a **Currency**, a **Currency** under `+` and `-` and a **Double** under `*` and `/`; with a **Decimal**, a **Decimal**. `^` always gives a **Double**, and `\` and `Mod` give a **Long** or a wider integer type. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

```tb check_run
Dim Ratio As Single = 0.5
Debug.Print TypeName(Ratio + Ratio) ' Single
Debug.Print TypeName(Ratio * 2)     ' Single
Debug.Print TypeName(Ratio / 2)     ' Single
Debug.Print TypeName(Ratio + 1&)    ' Double
Debug.Print TypeName(Ratio ^ 2)     ' Double
Debug.Print TypeName(Ratio \ 1)     ' Long
Debug.Print 0.1! + 0.2! = 0.3!      ' True
Debug.Print 0.1 + 0.2 = 0.3         ' False
```

> [!WARNING] BETA 1010
> An addition, subtraction, multiplication or division whose result is a declared **Single** raises no error when the result overflows: the **Single** holds infinity (`1.#INF`) instead. VB6 raises error 6, *Overflow*. Declare the variable **Double** where an overflow must be caught. Code compiled with LLVM has a similar defect for **Double**; see [Language support](../../LLVM/Getting-Started#language-support).

A **Variant** holding a **Single** does not overflow: a result that does not fit becomes a **Double**.

## Example

This example adds 0.1 to a **Single** ten times. The total prints as 1 but is not equal to 1, so a comparison of floating-point values should allow a small difference.

```tb check_run
Dim Total As Single
Dim i As Long
For i = 1 To 10
    Total = Total + 0.1!
Next
Debug.Print Total                           ' 1
Debug.Print Total = 1                       ' False
Debug.Print Abs(Total - 1) < 0.000001       ' True
```

## See Also

- [Data Types](../../Reference/Data-Types#single) -- the summary of all fourteen intrinsic types
- [Double](Double), [Currency](Currency), [Decimal](Decimal) -- the other non-integer types
- [CSng](../Modules/Conversion/CSng) function
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
