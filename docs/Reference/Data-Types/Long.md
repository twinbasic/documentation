---
title: Long
parent: Data Types
grand_parent: Reference Section
nav_order: 4
permalink: /tB/Core/Long
vba_attribution: true
---

# Long
{: .no_toc }

A signed 32-bit integer, from -2,147,483,648 to 2,147,483,647.

Syntax:

- [**Dim**](Dim) *varname* **As Long** [ **=** *expression* ]
- **Dim** *varname*`&`
- [**DefLng**](Deftype) *letterrange*

A **Long** variable is declared **As Long**, or by the type-declaration character `&` after its name. [**DefLng**](Deftype) makes **Long** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. A **Long** that is not given a value holds 0.

**Long** is the usual type for counters, indexes and 32-bit Win32 values. The **Variant** subtype for a **Long** is **vbLong** (3), and [**TypeName**](../Modules/Information/TypeName) gives `Long`.

## Storage and range

A **Long** is stored in 4 bytes as a two's-complement number. It holds the whole numbers from -2,147,483,648 to 2,147,483,647. It has the same size in a 32-bit and a 64-bit build; [**LongPtr**](LongPtr) is the type that changes size with the build.

```tb check_run
Dim Count As Long
Dim Total&
Debug.Print Count                   ' 0
Debug.Print LenB(Count)             ' 4
Debug.Print TypeName(Total)         ' Long
Debug.Print VarType(Count) = vbLong ' True
```

## Literals

A whole-number literal with no type-declaration character is an **Integer** from -32,768 to 32,767, a **Long** beyond that up to 2,147,483,647, and a **Double** beyond that. The minus sign is not part of the literal, so `-32768` is a **Long**: the literal 32768 is a **Long**, then negated. The suffix `&` makes any whole-number literal in the range a **Long**: `5&`.

A hexadecimal (`&H`), octal (`&O`) or binary (`&B`) literal is an **Integer** when its value fits in 16 bits and a **Long** when it fits in 32: `&HFFFF` is the **Integer** -1, and `&H80000000` is the **Long** -2,147,483,648. The suffix `&` makes a 16-bit pattern a positive **Long**: `&HFFFF&` is 65,535. A pattern wider than 32 bits is a [**LongLong**](LongLong). The digits of a `&H`, `&O` or `&B` literal can be grouped with underscores, as in `&HFFFF_0000`; a decimal literal cannot.

```tb check_run
Debug.Print TypeName(32767)         ' Integer
Debug.Print TypeName(32768)         ' Long
Debug.Print TypeName(2147483648)    ' Double
Debug.Print TypeName(5&)            ' Long
Debug.Print &HFFFF                  ' -1
Debug.Print &HFFFF&                 ' 65535
Debug.Print &H80000000              ' -2147483648
Debug.Print &B1010_1010&            ' 170
```

> [!NOTE]
> Binary literals (`&B`) and the underscores that group digits are twinBASIC additions; VBA and VB6 have `&H` and `&O` only. See [Literals](../../Features/Language/Literals).

## Conversions

[**CLng**](../Modules/Conversion/CLng) converts an expression to a **Long**, and so does assigning one to a **Long** variable. A number with a fraction is rounded to the nearest whole number, and a number exactly halfway between two is rounded to the even one: 2.5 becomes 2, 3.5 becomes 4, and -2.5 becomes -2. A string is read as a number, so `CLng(" 42 ")` is 42, and `True` is -1.

A value outside the range after rounding raises error 6, *Overflow*: `CLng(2147483647.5)` does, because it rounds to 2,147,483,648. A string that is not a number raises error 13, *Type mismatch*.

```tb check_run
Dim n As Long
n = 2.5
Debug.Print n                       ' 2
n = 3.5
Debug.Print n                       ' 4
Debug.Print CLng(-2.5)              ' -2
Debug.Print CLng(" 42 ")            ' 42
Debug.Print CLng(True)              ' -1
```

## Arithmetic and overflow

An operation on two **Long** values gives a **Long**, and so does a **Long** combined with a **Byte**, **Integer** or **Boolean**. Combined with a **LongLong** it gives a **LongLong**; with a **Single** or **Double**, a **Double**; with a **Currency**, a **Currency**; with a **Decimal**, a **Decimal**. `^` always gives a **Double**, and so does `/` unless the other operand is a **Decimal**. `\` and `Mod` on two **Long** values give a **Long**. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

A result outside the range raises error 6, *Overflow*: adding 1 to 2,147,483,647 does, and so does negating -2,147,483,648. The type of the result is set by the operands, not by the variable that receives it, so `n = i * 200` overflows when `i` is an **Integer** holding 300, even with `n` a **Long**: the product of two **Integer** values is an **Integer**. Writing `200&` makes it a **Long** product.

```tb check_run
Dim n As Long = 1000
Dim i As Integer = 300
Debug.Print TypeName(n + i)         ' Long
Debug.Print TypeName(n * 1.5)       ' Double
Debug.Print n * i                   ' 300000
On Error Resume Next
n = i * 200
Debug.Print Err.Number              ' 6
```

[**IntegerOverflowChecks(False)**](Attributes#integeroverflowchecks) turns the overflow check off for a class, a module or a procedure, and a **Long** result outside the range then wraps around instead: 2,147,483,647 plus 1 is -2,147,483,648. Dividing -2,147,483,648 by -1 with [`\`](IntegerDivide) raises error 6 even then.

```tb check_build slot=module
[IntegerOverflowChecks(False)]
Public Function NextHash(ByVal Hash As Long, ByVal Code As Long) As Long
    Return Hash * 31 + Code     ' NextHash(100000000, 7) is -1194967289
End Function
```

> [!NOTE]
> A VB6 program compiled to native code raises no error when it negates a **Long** holding -2,147,483,648: the result is -2,147,483,648. twinBASIC raises error 6.

A **Variant** holding a **Long** does not overflow: a result that does not fit becomes a **Double**, so a **Variant** holding 2,147,483,647 plus 1 holds the **Double** 2,147,483,648.

## Long and 64-bit code

A **Long** is 4 bytes in a 64-bit build too, so it cannot hold an address or a handle there. Declare a pointer or a handle --- in a [**Declare**](Declare) statement, a **Type** or a variable --- as [**LongPtr**](LongPtr), which is a **Long** in a 32-bit build and a **LongLong** in a 64-bit one. Keep **Long** for values that are 32 bits wide in both, such as a Win32 `DWORD`, `INT` or `BOOL`.

## Example

This example adds the whole numbers from 1 to 100,000. The sum, 5,000,050,000, is too large for a **Long**: a **Long** total raises error 6 when it passes 2,147,483,647, at the 65,536th addition. A **LongLong** total holds it.

```tb check_run
Dim i As Long
Dim Wide As LongLong
For i = 1 To 100000
    Wide = Wide + i
Next
Debug.Print Wide                            ' 5000050000

Dim Total As Long
On Error GoTo Overflowed
For i = 1 To 100000
    Total = Total + i
Next
Exit Sub
Overflowed:
Debug.Print "Error " & Err.Number & " at " & i  ' Error 6 at 65536
```

## See Also

- [Data Types](../../Reference/Data-Types#long) -- the summary of all fourteen intrinsic types
- [Integer](Integer), [LongLong](LongLong), [LongPtr](LongPtr) -- the other integer types
- [CLng](../Modules/Conversion/CLng) function
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
