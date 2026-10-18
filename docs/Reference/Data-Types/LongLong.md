---
title: LongLong
parent: Data Types
grand_parent: Reference Section
nav_order: 5
permalink: /tB/Core/LongLong
vba_attribution: true
---

# LongLong
{: .no_toc }

A signed 64-bit integer, from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807.

Syntax:

- [**Dim**](Dim) *varname* **As LongLong** [ **=** *expression* ]
- **Dim** *varname*`^`
- [**DefLngLng**](Deftype) *letterrange*

A **LongLong** variable is declared **As LongLong**, or by the type-declaration character `^` after its name. [**DefLngLng**](Deftype) makes **LongLong** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. A **LongLong** that is not given a value holds 0.

Use **LongLong** for whole numbers that can pass 2,147,483,647: file sizes, tick counts and 64-bit Win32 values. The **Variant** subtype for a **LongLong** is **vbLongLong** (20), and [**TypeName**](../Modules/Information/TypeName) gives `LongLong`.

> [!NOTE]
> **LongLong** is available in 32-bit builds as well as 64-bit ones. VBA allows it only in 64-bit builds, and VB6 has no **LongLong**.

## Storage and range

A **LongLong** is stored in 8 bytes as a two's-complement number. It has the same size in a 32-bit and a 64-bit build; [**LongPtr**](LongPtr) is the type that changes size with the build.

```tb check_run
Dim Big As LongLong
Dim Ticks^
Debug.Print Big                     ' 0
Debug.Print LenB(Big)               ' 8
Debug.Print TypeName(Ticks)         ' LongLong
Debug.Print VarType(Big) = vbLongLong ' True
```

## Literals

A whole-number literal beyond the **Long** range is a **Double**, so `3000000000` is not a **LongLong**. The suffix `^` makes a whole-number literal a **LongLong**: `3000000000^`. It reaches 9,223,372,036,854,775,807^; the literal 9,223,372,036,854,775,808^ is refused with *TB5174, Invalid number*, so write the smallest value as `-9223372036854775807^ - 1` or `&H8000000000000000`.

A hexadecimal (`&H`), octal (`&O`) or binary (`&B`) literal wider than 32 bits is a **LongLong**: `&H100000000` is 4,294,967,296 and `&HFFFFFFFFFFFFFFFF` is -1. The suffix `^` makes a 32-bit pattern a positive **LongLong**: `&HFFFFFFFF^` is 4,294,967,295, where `&HFFFFFFFF` is the **Long** -1. The digits can be grouped with underscores, as in `&HFFFF_FFFF_0000_0000`; a decimal literal cannot be.

```tb check_run
Debug.Print TypeName(3000000000)    ' Double
Debug.Print TypeName(3000000000^)   ' LongLong
Debug.Print TypeName(5^)            ' LongLong
Debug.Print TypeName(&H100000000)   ' LongLong
Debug.Print &HFFFFFFFF              ' -1
Debug.Print &HFFFFFFFF^             ' 4294967295
Debug.Print &H8000000000000000      ' -9223372036854775808
```

> [!NOTE]
> Binary literals (`&B`) and the underscores that group digits are twinBASIC additions; VBA and VB6 have `&H` and `&O` only. See [Literals](../../Features/Language/Literals).

## Conversions

[**CLngLng**](../Modules/Conversion/CLngLng) converts an expression to a **LongLong**, and so does assigning one to a **LongLong** variable. A number with a fraction is rounded to the nearest whole number, and a number exactly halfway between two is rounded to the even one: 2.5 becomes 2 and 3.5 becomes 4. A string is read as a number, so `CLngLng("9223372036854775807")` is the largest value, and `True` is -1.

A value outside the range raises error 6, *Overflow*: `CLngLng(1E+19)` does. A string that is not a number raises error 13, *Type mismatch*.

Assigning a **LongLong** variable to a **Long** or **Integer** variable, as `Small = Big`, is refused at compile time with *TB5001*; write `CLng(Big)` or `CInt(Big)`, which raises error 6 when the value does not fit.

```tb check_run
Dim Big As LongLong
Big = 4.5
Debug.Print Big                     ' 4
Debug.Print CLngLng(3.5)            ' 4
Debug.Print CLngLng("9223372036854775807") ' 9223372036854775807
Debug.Print CLngLng(True)           ' -1
On Error Resume Next
Big = CLngLng(1E+19)
Debug.Print Err.Number              ' 6
```

> [!WARNING] BETA 1010
> The constant 2^63, one past the largest **LongLong**, converts to -9223372036854775808 with no error: `CLngLng(2 ^ 63)`, `CLngLng(9223372036854775808#)` and `CLngLng(CSng(2 ^ 63))` all do, and so does `Big = 9223372036854775807`, because a whole-number literal without the `^` suffix is a **Double** that rounds to 2^63. A **Double** variable holding 2^63 raises error 6, and so does `1E+19`. VB6 has no **LongLong**; it raises error 6 for the first **Double** beyond the **Long** range. Write the largest value as `9223372036854775807^`.

## Arithmetic and overflow

An operation on two **LongLong** values gives a **LongLong**, and so does a **LongLong** combined with a **Byte**, **Integer**, **Long** or **Boolean**. Combined with a **Single** or **Double** it gives a **Double**; with a **Currency**, a **Currency**; with a **Decimal**, a **Decimal**. `^` always gives a **Double**, and so does `/` unless the other operand is a **Decimal**. `\` and `Mod` on two **LongLong** values give a **LongLong**. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

A result outside the range raises error 6, *Overflow*: adding 1 to 9,223,372,036,854,775,807 does, and so does negating the smallest value. [**IntegerOverflowChecks(False)**](Attributes#integeroverflowchecks) turns the overflow check off for a class, a module or a procedure, and a **LongLong** result then wraps around: the largest value plus 1 is -9,223,372,036,854,775,808.

A **Variant** holding a **LongLong** does not overflow: a result that does not fit becomes a **Double**, so a **Variant** holding 9,223,372,036,854,775,807 plus 1 holds the **Double** 9.22337203685478E+18. A **Double** holds integers exactly only up to 2^53, so the result is not exact.

```tb check_run
Dim Big As LongLong = 3000000000^
Debug.Print TypeName(Big + 1)       ' LongLong
Debug.Print TypeName(Big * 1.5)     ' Double
Debug.Print Big \ 7                 ' 428571428
Debug.Print Big Mod 7               ' 4
Debug.Print 1^ << 40                ' 1099511627776
Dim Wide As Variant = 9223372036854775807^
Wide = Wide + 1
Debug.Print TypeName(Wide)          ' Double
On Error Resume Next
Big = 9223372036854775807^
Big = Big + 1
Debug.Print Err.Number              ' 6
```

## LongLong and 64-bit code

In a 64-bit build [**LongPtr**](LongPtr) is a **LongLong**, so a pointer or handle that a 64-bit build holds in 8 bytes is declared **LongPtr**, not **LongLong**. Use **LongLong** for values that are 64 bits wide in both builds, such as a Win32 `ULONGLONG`, `LARGE_INTEGER` or `FILETIME` value.

## Example

The Win32 file functions return a file's size as two 32-bit halves. The low half is a **Long**, so a size above 2 GB makes it negative; masking it with `&HFFFFFFFF^` reads it as unsigned, and the sum is a **LongLong**.

```tb check_run
Dim High As Long = 2
Dim Low As Long = -1
Dim Size As LongLong
Size = High * 4294967296^ + (Low And &HFFFFFFFF^)
Debug.Print Size                    ' 12884901887
Debug.Print Size \ 1073741824       ' 11
```

## See Also

- [Data Types](../../Reference/Data-Types#longlong) -- the summary of all fourteen intrinsic types
- [Long](Long), [LongPtr](LongPtr), [Integer](Integer) -- the other integer types
- [CLngLng](../Modules/Conversion/CLngLng) function
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
