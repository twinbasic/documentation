---
title: Data Types
parent: Reference Section
nav_order: 10
has_toc: false
permalink: /Reference/Data-Types
---

# Data Types

twinBASIC supports fourteen intrinsic data types. They fall into four broad categories: numeric (integer and floating-point), text, date/time, and reference/generic. This page is the canonical lookup for storage size, value range, and the type-declaration suffix where one exists.

For the twinBASIC-specific additions to this set --- **LongLong**, **LongPtr**, and **Decimal** as a standalone type --- see [Features → New Data Types](../Features/Language/Data-Types).

---

## Quick reference

| Type | Suffix | Storage | Range |
|------|--------|---------|-------|
| **Boolean** | (none) | 2 bytes | `True` or `False` |
| **Byte** | (none) | 1 byte | 0 to 255 |
| **Integer** | `%` | 2 bytes | -32,768 to 32,767 |
| **Long** | `&` | 4 bytes | -2,147,483,648 to 2,147,483,647 |
| **LongLong** | `^` | 8 bytes | -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 |
| **LongPtr** | (none) | 4 bytes (32-bit) / 8 bytes (64-bit) | Same as **Long** or **LongLong** depending on target |
| **Single** | `!` | 4 bytes | ±1.401298E-45 to ±3.402823E38 |
| **Double** | `#` | 8 bytes | ±4.94065645841246E-324 to ±1.79769313486232E308 |
| **Currency** | `@` | 8 bytes | -922,337,203,685,477.5808 to 922,337,203,685,477.5807 |
| **Decimal** | (none) | 16 bytes | ±79,228,162,514,264,337,593,543,950,335 (up to 28 decimal places) |
| **Date** | (none) | 8 bytes | January 1, 100 to December 31, 9999 |
| **String** | `$` | variable | Up to ~2 billion characters |
| **Variant** | (none) | 16 bytes (+ heap data) | Any of the above |
| **Object** | (none) | 4 bytes (32-bit) / 8 bytes (64-bit) | A COM interface reference |

The suffix column lists the character that can optionally follow a literal or identifier to force its type in source code --- for example, `42&` is a **Long** literal, `3.14#` is a **Double**, and `Total!` declares a **Single** variable in a type-implicit context.

---

## Integer types

**Boolean** stores `True` (-1) or `False` (0). The runtime treats any non-zero value as `True` when a **Boolean** is expected; only -1 is the canonical `True`. Assigning any non-zero integer to a **Boolean** normalises it to -1.

**Byte** is the only unsigned integer type. It holds values 0--255, which makes it the natural element type for byte arrays used in binary I/O and buffer operations.

**Integer** holds small signed integers. In most code, **Long** is a better choice: it is no slower on 32-bit hardware and never overflows on values above 32,767. **Integer** is useful when interfacing with structures or APIs that declare 16-bit fields.

**Long** is the most common integer type. It covers the full range of Win32 `DWORD` and `int` values and is the default type for index variables and counters.

**LongLong** is an 8-byte signed integer available in both 32-bit and 64-bit builds. In VBA it is restricted to 64-bit targets; twinBASIC lifts that restriction and allows **LongLong** in 32-bit projects. Use it when a value can exceed 2,147,483,647 --- file sizes, tick counts, GUIDs, and 64-bit Win32 handles. The suffix `^` marks a **LongLong** literal: `9_000_000_000^`.

**LongPtr** changes width with the compilation target: 4 bytes in a 32-bit build, 8 bytes in a 64-bit build. It is the correct type for Win32 handles, window handles (**HWND**), and pointers in `Declare` statements that must work in both modes. It has no literal suffix --- declare the variable with `Dim x As LongPtr` and assign it a numeric expression.

Integer overflow raises a run-time error (error 6) by default. Overflow does not wrap silently.

---

## Floating-point types

**Single** and **Double** follow the IEEE 754 standard for single-precision and double-precision floating-point respectively. Both can represent `NaN` and `Infinity` as bit patterns, though the VBA runtime raises an error on most operations that would produce them.

**Double** is the default type of untyped numeric literals that contain a decimal point (`3.14` is a **Double**). It is accurate to approximately 15--16 significant decimal digits. Choose it for general-purpose floating-point arithmetic.

**Single** is accurate to approximately 6--7 significant decimal digits. It is smaller and may be faster in tight loops, but the reduced precision makes it unsuitable for financial or scientific calculations where rounding error matters.

**Currency** is a fixed-point type, stored internally as a 64-bit signed integer scaled by 10,000. It avoids the binary rounding errors of IEEE 754 types and carries exactly four decimal places. Use it for monetary values and any calculation where exact decimal rounding is required.

---

## Decimal

**Decimal** is a 16-byte type using a 12-byte (96-bit) integer with a variable decimal-point scale and a sign bit. It provides up to 29 significant digits and up to 28 decimal places, making it the highest-precision numeric type available.

> [!NOTE]
> In twinBASIC, **Decimal** is available both as a **Variant** subtype (as in VBA) and as a standalone declared type --- `Dim x As Decimal` compiles and runs. The conversion function [**CDec**](../tB/Modules/Conversion/CDec) returns a **Decimal** value.

---

## Date

**Date** is stored as an IEEE 754 double: the integer part counts days from the epoch (December 30, 1899), and the fractional part represents the time of day (0.0 at midnight, 0.5 at noon). The representable range is January 1, 100 to December 31, 9999.

The [**Date**](../tB/Core/Date) and [**Time**](../tB/Core/Time) properties return the current date and time. [**Now**](../tB/Modules/DateTime/Now) returns both combined. Because **Date** is ultimately a **Double**, arithmetic on **Date** values works: adding 1 advances by one day, subtracting two dates gives the number of days between them.

---

## String

**String** holds a sequence of Unicode characters, stored internally as a COM `BSTR` (a length-prefixed wide-character string). The length is measured in characters, not bytes; each character is 2 bytes wide (UTF-16 LE). A **String** can hold up to approximately 2 billion characters, limited in practice by available memory.

A **String** variable initialises to `vbNullString` (a null `BSTR` pointer), which is distinct from a zero-length string (`""`). Most string operations treat both as empty, but the distinction matters when passing strings to APIs that distinguish a null pointer from an empty buffer. See [**StrPtr**](../tB/Modules/Information/StrPtr) for the address of the underlying buffer.

Fixed-length strings --- `Dim s As String * 20` --- occupy exactly the specified number of characters, padded with spaces on the right or truncated on assignment. They are useful for fixed-width binary file records.

---

## Variant

**Variant** is a tagged union that can hold any of the types in the table above, plus `Null`, `Empty`, and arrays. Its 16-byte header stores a type tag ([**VbVarType**](../tB/Modules/Constants/VbVarType)) followed by type-specific data. When the value is a **String**, **Object**, or array, the 8-byte data slot holds a pointer to heap-allocated storage.

`Empty` is the default state of an uninitialised **Variant** --- it is distinct from `0`, `""`, `False`, and `Null`. Test for it with [**IsEmpty**](../tB/Modules/Information/IsEmpty). `Null` propagates through arithmetic and comparison; use [**IsNull**](../tB/Modules/Information/IsNull) to detect it.

**Variant** is the required type for parameters and return values in late-bound COM calls, and for any function whose return type varies at runtime. It carries a small overhead on each operation compared to a typed variable because the runtime must check the tag. Prefer typed variables when the type is known at design time.

---

## Object

**Object** holds a COM interface reference --- a pointer to a vtable. In a 32-bit build it occupies 4 bytes; in a 64-bit build, 8 bytes. The runtime calls `AddRef` on assignment and `Release` when the variable goes out of scope or is set to `Nothing`.

`Nothing` is the zero-valued **Object** reference. Test for it with `If obj Is Nothing Then`.

An **Object** variable can hold any COM-compatible object; the runtime resolves member calls through `IDispatch` (late binding). Declaring the variable with a specific class or interface type --- `Dim fs As FileSystemObject` --- enables early binding, which is faster and produces compile-time type checking.

---

### See Also

- [New Data Types](../Features/Language/Data-Types) -- **LongLong**, **LongPtr**, and **Decimal** in depth
- [Enumerations](Enumerations) -- index of all enumeration types across all packages
- [VbVarType](../tB/Modules/Constants/VbVarType) -- **Variant** subtype tag constants
- [CDec](../tB/Modules/Conversion/CDec), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr) -- conversion functions for the three extended numeric types
