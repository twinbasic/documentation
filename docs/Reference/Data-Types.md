---
title: Data Types
parent: Reference Section
nav_order: 10
has_toc: false
permalink: /Reference/Data-Types
symbols: [Boolean, Byte, Integer, Long, LongLong, LongPtr, Single, Double, Currency, Decimal, Date, String, Variant, Object]
---

# Data Types

twinBASIC supports fourteen intrinsic data types. They fall into four broad categories: numeric (integer and floating-point), text, date/time, and reference/generic. This page is the canonical lookup for storage size, value range, and the type-declaration suffix where one exists, with a short section for each type. Each type has a page of its own with its literals, conversions and arithmetic.

For the twinBASIC-specific additions to this set --- **LongLong**, **LongPtr**, and **Decimal** as a standalone type --- see [Features → New Data Types](../Features/Language/Data-Types).

---

## Quick reference
{: index="type-declaration character; type character; type char; typedecl character; typedecl char" }

| Type | Suffix | Storage | Range |
|------|--------|---------|-------|
| [**Boolean**](#boolean) | (none) | 2 bytes | `True` or `False` |
| [**Byte**](#byte) | (none) | 1 byte | 0 to 255 |
| [**Integer**](#integer) | `%` | 2 bytes | -32,768 to 32,767 |
| [**Long**](#long) | `&` | 4 bytes | -2,147,483,648 to 2,147,483,647 |
| [**LongLong**](#longlong) | `^` | 8 bytes | -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 |
| [**LongPtr**](#longptr) | (none) | 4 bytes (32-bit) / 8 bytes (64-bit) | Same as **Long** or **LongLong** depending on target |
| [**Single**](#single) | `!` | 4 bytes | ±1.401298E-45 to ±3.402823E38 |
| [**Double**](#double) | `#` | 8 bytes | ±4.94065645841247E-324 to ±1.79769313486232E308 |
| [**Currency**](#currency) | `@` | 8 bytes | -922,337,203,685,477.5808 to 922,337,203,685,477.5807 |
| [**Decimal**](#decimal) | (none) | 16 bytes | ±79,228,162,514,264,337,593,543,950,335 (up to 28 decimal places) |
| [**Date**](#date) | (none) | 8 bytes | January 1, 100 to December 31, 9999 |
| [**String**](#string) | `$` | variable | Up to ~2 billion characters |
| [**Variant**](#variant) | (none) | 16 bytes (32-bit) / 24 bytes (64-bit) (+ heap data) | Any of the above |
| [**Object**](#object) | (none) | 4 bytes (32-bit) / 8 bytes (64-bit) | A COM interface reference |

The suffix column lists the character that can optionally follow a literal or identifier to force its type in source code --- for example, `42&` is a **Long** literal, `3.14#` is a **Double**, and `Total!` declares a **Single** variable in a type-implicit context.

Integer overflow raises a run-time error (error 6) by default. Overflow does not wrap silently, with one exception: integer division of the most negative value by -1, described under [the **\\** operator](../tB/Core/IntegerDivide). Which type an arithmetic result has, and so where it overflows, is set out in [Result types and promotion](Operators#result-types-and-promotion).

**Any** is not a data type. A parameter of a [**Declare**](../tB/Core/Declare) statement declared **As Any** takes an argument of any type, which the compiler does not check:

```tb check_build slot=module
Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" _
    (ByRef Destination As Any, ByRef Source As Any, ByVal Length As LongPtr)
```

> [!NOTE] BETA 1010
> A local variable, a **Static** variable, or a module or class field declared **As Any** compiles with no diagnostic; VB6 refuses each of them. The variable cannot be used: assigning to it is refused (TB5028), reading it into a **Variant** makes the build fail, and **TypeName** of it raises error 458 in a built program. Declare such a variable with a real type. A **Function**'s return type, a **Sub**'s parameter, a UDT field and an array **As Any** are refused (TB5079).

---

## Boolean

**Boolean** stores `True` (-1) or `False` (0) in 2 bytes, and has no type-declaration character. [**Boolean**](../tB/Core/Boolean) describes its conversions and its use in logic and arithmetic.

---

## Byte

**Byte** is the only unsigned integer type: 1 byte, from 0 to 255, with no type-declaration character. It is the natural element type for byte arrays used in binary I/O and buffer operations. [**Byte**](../tB/Core/Byte) describes its conversions, overflow and arrays.

---

## Integer

**Integer** is a signed 16-bit integer: 2 bytes, from -32,768 to 32,767. Its type-declaration character is `%`. In most code **Long** is a better choice; **Integer** is useful when interfacing with structures or APIs that declare 16-bit fields. [**Integer**](../tB/Core/Integer) describes its literals, conversions and overflow.

---

## Long

**Long** is a signed 32-bit integer: 4 bytes, from -2,147,483,648 to 2,147,483,647, in 32-bit and 64-bit builds alike. Its type-declaration character is `&`. It is the most common integer type, the usual choice for counters, indexes and 32-bit Win32 values. [**Long**](../tB/Core/Long) describes its literals, conversions and overflow.

---

## LongLong

**LongLong** is an 8-byte signed integer available in both 32-bit and 64-bit builds. In VBA it is restricted to 64-bit targets; twinBASIC lifts that restriction and allows **LongLong** in 32-bit projects. Use it when a value can exceed 2,147,483,647 --- file sizes, tick counts, GUIDs, and 64-bit Win32 handles. The suffix `^` marks a **LongLong** literal: `9000000000^`. [**LongLong**](../tB/Core/LongLong) describes its literals, conversions and overflow.

---

## LongPtr

**LongPtr** changes width with the compilation target: 4 bytes in a 32-bit build, 8 bytes in a 64-bit build. It is the correct type for Win32 handles, window handles (**HWND**), and pointers in `Declare` statements that must work in both modes. It has no literal suffix --- declare the variable with `Dim x As LongPtr` and assign it a numeric expression. [**LongPtr**](../tB/Core/LongPtr) describes how it is declared, converted and used in calculations.

---

## Single

**Single** is a 32-bit IEEE 754 floating-point number: 4 bytes, accurate to approximately 6--7 significant decimal digits. Its type-declaration character is `!`. It is smaller than a **Double**, but the reduced precision makes it unsuitable for financial or scientific calculations where rounding error matters. [**Single**](../tB/Core/Single) describes its literals, conversions and overflow.

---

## Double

**Double** is a 64-bit IEEE 754 floating-point number: 8 bytes, accurate to approximately 15--16 significant decimal digits. Its type-declaration character is `#`. It is the default type of untyped numeric literals that contain a decimal point (`3.14` is a **Double**), and the choice for general-purpose floating-point arithmetic. [**Double**](../tB/Core/Double) describes its literals, conversions and overflow.

---

## Currency

**Currency** is a fixed-point type, stored internally as a 64-bit signed integer scaled by 10,000. It avoids the binary rounding errors of IEEE 754 types and has exactly four decimal places; a value with more places is rounded to four, and a value exactly halfway is rounded to the even digit, so `CCur("0.12345")` is 0.1234. Its type-declaration character is `@`. [**Currency**](../tB/Core/Currency) describes its literals, conversions and arithmetic, and [Decimal or Currency for money](../tB/Core/Decimal#decimal-or-currency-for-money) compares the two types.

---

## Decimal

**Decimal** is a 16-byte type using a 96-bit integer with a variable decimal-point scale and a sign. It provides up to 29 significant digits and up to 28 decimal places, making it the highest-precision numeric type available, and it stores decimal fractions exactly. It has no type-declaration character. In twinBASIC it is a standalone declared type as well as a **Variant** subtype. [**Decimal**](../tB/Core/Decimal) describes its conversions and arithmetic.

---

## Date

**Date** is stored as an IEEE 754 double: the integer part counts days from the epoch (December 30, 1899), and the fractional part represents the time of day (0.0 at midnight, 0.5 at noon). The representable range is January 1, 100 to December 31, 9999. A **Date** literal is written between number signs: `#2026-03-17#`. [**Date**](../tB/Core/Date-Type) describes its literals, conversions and arithmetic.

### Date literals

A date literal is a date, a time of day, or both, between number signs (`#`). The forms the compiler accepts, and how it reads the month, day and year, are described under [Date literals](../tB/Core/Date-Type#date-literals) on the **Date** page.

---

## String

**String** holds a sequence of Unicode characters, stored as a COM `BSTR` (UTF-16, 2 bytes for each character) with a length measured in characters. A variable-length **String** holds up to about 2 billion characters. Its type-declaration character is `$`. A fixed-length **String** --- `Dim s As String * 20` --- has exactly the declared length, padded with spaces or cut off on assignment. [**String**](../tB/Core/String) describes both kinds, the null string, and joining and converting strings. The [**String**](../tB/Modules/Strings/String) function is a different page.

---

## Variant

**Variant** holds a value of any type and carries its type with it, together with the special values `Empty`, `Null` and error values. It takes 16 bytes in a 32-bit build and 24 in a 64-bit build. A variable declared with no type is a **Variant**. [**Variant**](../tB/Core/Variant) describes its subtypes, `Empty` and `Null`, and arithmetic. Prefer typed variables when the type is known when the program is written.

---

## Object
{: index="late binding" }

**Object** holds a reference to a COM object, in 4 bytes in a 32-bit build and 8 bytes in a 64-bit build. `Nothing` is the reference to no object. An **Object** variable can hold any COM-compatible object; the runtime resolves member calls through `IDispatch` (late binding). Declaring the variable with a specific class or interface type --- `Dim fs As FileSystemObject` --- enables early binding, which produces compile-time checking of member names. [**Object**](../tB/Core/Object) describes assignment with `Set`, `Is` and late binding.

---

## See Also

- [New Data Types](../Features/Language/Data-Types) -- **LongLong**, **LongPtr**, and **Decimal** in depth
- [Literal Keywords](Literal-Keywords) -- **Nothing**, **Null**, **Empty**, **True** and **False**
- [Enumerations](Enumerations) -- index of all enumeration types across all packages
- [VbVarType](../tB/Modules/Constants/VbVarType) -- **Variant** subtype tag constants
- [CDec](../tB/Modules/Conversion/CDec), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr) -- conversion functions for the three extended numeric types
