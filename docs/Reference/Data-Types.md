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

Integer overflow raises a run-time error (error 6) by default. Overflow does not wrap silently, with one exception: integer division of the most negative value by -1, described under [the **\\** operator](../tB/Core/IntegerDivide). Which type an arithmetic result has, and so where it overflows, is set out in [Result types and promotion](Operators#result-types-and-promotion).

---

## Floating-point types

**Single** and **Double** follow the IEEE 754 standard for single-precision and double-precision floating-point respectively. Both can represent `NaN` and `Infinity` as bit patterns, though the VBA runtime raises an error on most operations that would produce them.

**Double** is the default type of untyped numeric literals that contain a decimal point (`3.14` is a **Double**). It is accurate to approximately 15--16 significant decimal digits. Choose it for general-purpose floating-point arithmetic.

**Single** is accurate to approximately 6--7 significant decimal digits. It is smaller and may be faster in tight loops, but the reduced precision makes it unsuitable for financial or scientific calculations where rounding error matters.

**Currency** is a fixed-point type, stored internally as a 64-bit signed integer scaled by 10,000. It avoids the binary rounding errors of IEEE 754 types and has exactly four decimal places; a value with more places is rounded to four, and a value exactly halfway is rounded to the even digit, so `CCur("0.12345")` is 0.1234. It suits monetary values whose amounts and intermediate results never need more than four decimal places --- [Decimal or Currency for money](#decimal-or-currency-for-money) compares the two types.

---

## Decimal

**Decimal** is a 16-byte type using a 12-byte (96-bit) integer with a variable decimal-point scale and a sign bit. It provides up to 29 significant digits and up to 28 decimal places, making it the highest-precision numeric type available.

**Decimal** stores decimal fractions exactly: ten additions of `CDec("0.1")` equal 1, where the same sum of **Double** values does not, and `CDec("1000.01") * CDec("0.0325")` is exactly 32.500325. Division is rounded to fit the type --- `CDec(1) / 3` keeps 28 decimal places --- so `CDec(1) / 3 * 3` is 0.9999999999999999999999999999, not 1.

**Decimal** ranks above every other numeric type in arithmetic: a **Decimal** combined with any other type, including **Double**, **Currency** and **Date**, gives a **Decimal**. The exceptions are `^`, which always gives a **Double**, and `\` and `Mod`, which give a **Long** or **LongLong** when either operand is a **Variant**. See [Result types and promotion](Operators#result-types-and-promotion).

> [!NOTE]
> In twinBASIC, **Decimal** is available both as a **Variant** subtype (as in VBA) and as a standalone declared type --- `Dim x As Decimal` compiles and runs. The conversion function [**CDec**](../tB/Modules/Conversion/CDec) returns a **Decimal** value.

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

**Currency** is enough when every amount and every intermediate result has at most four decimal places. **Decimal** keeps more: interest rates with five or more places, per-unit prices, and the results of division. Code that holds money in a **Variant** filled by [**CDec**](../tB/Modules/Conversion/CDec) gets the same result types from a declared **Decimal**, except under `\` and `Mod`, where the **Variant** gives a **Long**.

---

## Date

**Date** is stored as an IEEE 754 double: the integer part counts days from the epoch (December 30, 1899), and the fractional part represents the time of day (0.0 at midnight, 0.5 at noon). The representable range is January 1, 100 to December 31, 9999.

The [**Date**](../tB/Modules/DateTime/Date) and [**Time**](../tB/Modules/DateTime/Time) properties return the current date and time. [**Now**](../tB/Modules/DateTime/Now) returns both combined. Because **Date** is ultimately a **Double**, arithmetic on **Date** values works: adding 1 advances by one day, subtracting two dates gives the number of days between them. A **Date** plus or minus a number is still a **Date**, and the difference of two **Date** values is a **Double** --- see [Result types and promotion](Operators#result-types-and-promotion).

### Date literals

A date literal is a date, a time of day, or both, written between number signs (`#`). Its type is **Date**, and its value is fixed when the project is compiled: the executable holds the number, not the text, so the regional settings of the machine that runs the program do not affect it.

```tb check_build
Dim Deadline As Date = #2026-03-17#          ' March 17, 2026
Dim Reminder As Date = #1:45 PM#             ' 1:45 PM on December 30, 1899, which is day 0
Dim Meeting As Date = #3/17/2026 13:45:30#   ' March 17, 2026, 1:45:30 PM
```

The date can be written month first with `/` or `-` between the parts (`#3/17/2026#`, `#3-17-2026#`), year first (`#2026-03-17#`, `#2026/3/17#`), or with an English month name (`#Mar 17, 2026#`, `#17 March 2026#`). The time can be 24-hour (`#13:45#`, `#13:45:30#`) or 12-hour with `AM` or `PM` in either case (`#1:45 PM#`, `#1:45 pm#`). A literal with both puts a space between the date and the time. A time on its own has the date part December 30, 1899.

The compiler reads the parts in the same order whatever the regional format of the machine that compiles the project. These results were measured under English (United States) and under English (United Kingdom), whose short dates put the month and the day in opposite orders:

- `#1/2/2026#` is January 2, 2026, under both: the first number is always the month.
- When the first number cannot be a month, the first two numbers are swapped: `#13/1/2026#` is January 13, 2026. So a day-first literal compiles without a diagnostic, and is read correctly only when its day is 13 or more.
- A two-digit year was placed between 1950 and 2049, the range the machine's Windows settings specify for two-digit years: `#1/2/49#` is 2049, and `#1/2/50#` is 1950.
- A literal with no year, such as `#1/2#`, takes the year in which the project is compiled.
- A literal that is not a real date or time is a compile error, *TB5085 bad date*: `#2/29/2026#`, `#2/30/2026#`, `#24:00#` and `#13:60#` are all refused. So are fractional seconds (`#13:45:30.5#`), a `T` between the date and the time (`#2026-01-02T13:45:30#`), and, under English (United States), dots between the parts of a date (`#1.2.2026#`).

> [!NOTE]
> A date literal and [**CDate**](../tB/Modules/Conversion/CDate) can read the same text differently. The literal is read month first, when the project is compiled; **CDate** reads a string in the order of the regional format of the machine the program runs on. Under English (United Kingdom), `#1/2/2026#` is January 2 and `CDate("1/2/2026")` is February 1. Written year first, `#2026-01-02#` and `CDate("2026-01-02")` are January 2 under both formats.

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
