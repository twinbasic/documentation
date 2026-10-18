---
title: Integer
parent: Data Types
grand_parent: Reference Section
nav_order: 3
permalink: /tB/Core/Integer
vba_attribution: true
---

# Integer
{: .no_toc }

A signed 16-bit integer, from -32,768 to 32,767.

Syntax:

- [**Dim**](Dim) *varname* **As Integer** [ **=** *expression* ]
- **Dim** *varname*`%`
- [**DefInt**](Deftype) *letterrange*

An **Integer** variable is declared **As Integer**, or by the type-declaration character `%` after its name. [**DefInt**](Deftype) makes **Integer** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. An **Integer** that is not given a value holds 0.

**Integer** suits 16-bit fields in structures and API calls, and small enumerated values. For counters and indexes use [**Long**](Long): it is no slower, and it does not overflow at 32,767. The **Variant** subtype for an **Integer** is **vbInteger** (2), and [**TypeName**](../Modules/Information/TypeName) gives `Integer`.

## Storage and range

An **Integer** is stored in 2 bytes as a two's-complement number. It holds the whole numbers from -32,768 to 32,767. It has the same size in a 32-bit and a 64-bit build.

```tb check_run
Dim Count As Integer
Dim Total%
Debug.Print Count                   ' 0
Debug.Print LenB(Count)             ' 2
Debug.Print TypeName(Total)         ' Integer
Debug.Print VarType(Count) = vbInteger ' True
```

## Literals

A whole-number literal with no type-declaration character is an **Integer** from -32,768 to 32,767, a **Long** beyond that up to 2,147,483,647, and a **Double** beyond that. The minus sign is not part of the literal, so `-32768` is a **Long**: the literal 32768 is a **Long**, then negated. The suffix `%` makes a whole-number literal an **Integer**: `5%`.

A hexadecimal (`&H`), octal (`&O`) or binary (`&B`) literal is an **Integer** when its value fits in 16 bits: `&H7FFF` is 32,767, `&H8000` is -32,768 and `&HFFFF` is -1. With one more digit it is a **Long**. The suffix `&` makes a 16-bit pattern a positive **Long**: `&H8000&` is 32,768. The digits can be grouped with underscores, as in `&B1111_0000`; a decimal literal cannot be.

```tb check_run
Debug.Print TypeName(32767)         ' Integer
Debug.Print TypeName(32768)         ' Long
Debug.Print TypeName(5%)            ' Integer
Debug.Print &H7FFF                  ' 32767
Debug.Print &H8000                  ' -32768
Debug.Print &HFFFF                  ' -1
Debug.Print TypeName(&H10000)       ' Long
Debug.Print &H8000&                 ' 32768
```

> [!NOTE]
> Binary literals (`&B`) and the underscores that group digits are twinBASIC additions; VBA and VB6 have `&H` and `&O` only. See [Literals](../../Features/Language/Literals).

## Conversions

[**CInt**](../Modules/Conversion/CInt) converts an expression to an **Integer**, and so does assigning one to an **Integer** variable. A number with a fraction is rounded to the nearest whole number, and a number exactly halfway between two is rounded to the even one: 2.5 becomes 2, 3.5 becomes 4 and -2.5 becomes -2. A string is read as a number, so `CInt("&HFFFF")` is -1, and `True` is -1.

A value outside the range after rounding raises error 6, *Overflow*: `CInt(32767.5)` does, because it rounds to 32,768, and so does `CInt("65535")`. A string that is not a number raises error 13, *Type mismatch*.

```tb check_run
Dim Count As Integer
Count = 2.5
Debug.Print Count                   ' 2
Count = 3.5
Debug.Print Count                   ' 4
Debug.Print CInt(-2.5)              ' -2
Debug.Print CInt("&HFFFF")          ' -1
On Error Resume Next
Count = 40000
Debug.Print Err.Number              ' 6
```

## Arithmetic and overflow

An operation on two **Integer** values gives an **Integer**, and so does an **Integer** combined with a **Byte** or a **Boolean**. Combined with a **Long** it gives a **Long**, and with a **LongLong** a **LongLong**; with a **Single**, a **Single**; with a **Double**, a **Double**. `^` always gives a **Double**, and so does `/` unless the other operand is a **Single** or a **Decimal**. `\` and `Mod` on two **Integer** values give an **Integer**. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

A result outside the range raises error 6, *Overflow*: adding 1 to 32,767 does, and so does negating -32,768. The type of the result is set by the operands, not by the variable that receives it, so `Total = Count * 200` overflows when `Count` is an **Integer** holding 300, even with `Total` a **Long**, because the literal `200` is an **Integer** too. Writing `200&` makes it a **Long** product.

```tb check_run
Dim Count As Integer = 300
Dim Total As Long
Debug.Print TypeName(Count + Count) ' Integer
Debug.Print TypeName(Count / Count) ' Double
Debug.Print Count * 200&            ' 60000
On Error Resume Next
Total = Count * 200
Debug.Print Err.Number              ' 6
```

[**IntegerOverflowChecks(False)**](Attributes#integeroverflowchecks) turns the overflow check off for a class, a module or a procedure, and an **Integer** result outside the range then wraps around: 32,767 plus 1 is -32,768. Dividing -32,768 by -1 with [`\`](IntegerDivide) raises error 6 even then.

> [!NOTE]
> A VB6 program compiled to native code raises no error when it negates an **Integer** holding -32,768, or divides it by -1 with `\`. twinBASIC raises error 6 for both.

A **Variant** holding an **Integer** does not overflow: a result that does not fit becomes a **Long**, so a **Variant** holding 32,767 plus 1 holds the **Long** 32,768.

## Example

A Win32 API reports a signed coordinate in a 16-bit field of a **Long**, read as an unsigned value between 0 and 65,535. This example converts such a value to the **Integer** it represents, and back.

```tb check_run
Dim Raw As Long = 65534
Dim Coordinate As Integer
If Raw > 32767 Then
    Coordinate = Raw - 65536
Else
    Coordinate = Raw
End If
Debug.Print Coordinate                      ' -2
Debug.Print Coordinate And &HFFFF&          ' 65534
```

## See Also

- [Data Types](../../Reference/Data-Types#integer) -- the summary of all fourteen intrinsic types
- [Byte](Byte), [Long](Long), [LongLong](LongLong) -- the other integer types
- [CInt](../Modules/Conversion/CInt) function
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
