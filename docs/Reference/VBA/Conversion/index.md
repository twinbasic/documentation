---
title: Conversion Module
parent: VBA Package
permalink: /tB/Modules/Conversion/
has_toc: false
---

# Conversion module

The **Conversion** module groups together the procedures that produce a value of one type from a value of another — coercing between the intrinsic numeric types, parsing numbers out of strings, formatting numbers as strings, and a handful of related utilities for handling **Null**, error values, and alternate numeric bases.

## Coercing to a specific type

The largest group is the family of **C**-prefixed functions, one per intrinsic data type. Each accepts any valid expression and produces a value of the named type, raising a run-time error if the conversion is not possible: [**CBool**](CBool), [**CByte**](CByte), [**CCur**](CCur), [**CDate**](CDate), [**CDbl**](CDbl), [**CDec**](CDec), [**CInt**](CInt), [**CLng**](CLng), [**CLngLng**](CLngLng), [**CLngPtr**](CLngPtr), [**CSng**](CSng), [**CStr**](CStr), and [**CVar**](CVar).

Beyond their narrowing or widening behaviour, the C-prefix functions are *locale-aware* — they honour the current decimal separator and short date format — which makes them the right choice for parsing values that originated as user input. They also serve as documentation: writing `CLng(x)` makes the intended type of an intermediate result explicit even where the surrounding context would coerce *x* implicitly.

```tb
Dim Amount As Currency
Amount = CCur("1,234.56")        ' parses with the local decimal separator
```

Two further constructors return a **Variant** whose subtype is fixed: [**CVDate**](CVDate) builds a **Variant** of subtype **Date** (kept for compatibility with code written before **Date** became an intrinsic type), and [**CVErr**](CVErr) builds a **Variant** of subtype **Error** containing a chosen error number — the canonical way for a **Variant**-returning function to signal "this call failed with this error code" without raising a run-time error.

## Generic conversion

[**CType**](CType) is a twinBASIC extension that takes its target type as a generic parameter, written `CType(Of `*type*`)(`*value*`)`. It plays the same role as the C-prefix functions but for any type known to the compiler, which makes it the standard cast for **Enum** values, interfaces, and user-defined types where no fixed-name function exists. **CType** doubles as a pointer-to-UDT cast — see [Enhanced Pointer Functionality](../../../Features/Language/Pointers#ctypeof-type).

```tb
Dim day As VbDayOfWeek
day = CType(Of VbDayOfWeek)(1)
```

## Truncating to an integer

[**Int**](Int) and [**Fix**](Fix) both discard the fractional part of a number, but they round in opposite directions for negative input. **Int** rounds toward negative infinity, so `Int(-8.4)` is `-9`; **Fix** truncates toward zero, so `Fix(-8.4)` is `-8`. For positive values the two coincide. Neither changes the data type of its argument, in contrast to [**CInt**](CInt) and [**CLng**](CLng), which both round and narrow to a specific integer type.

```tb
Debug.Print Int(-8.4)            ' -9
Debug.Print Fix(-8.4)            ' -8
```

## Numbers, strings, and bases

[**Str**](Str), [**Hex**](Hex), and [**Oct**](Oct) all return a printable string representation of a number — **Str** in decimal, **Hex** in base 16, and **Oct** in base 8. Going the other way, [**Val**](Val) and [**ValDec**](ValDec) parse leading digits out of a string, returning a **Double** or **Decimal** respectively; both stop at the first unrecognised character and both honour the `&H` and `&O` radix prefixes for hexadecimal and octal literals.

These five functions are *culture-invariant* — they always use the period (`.`) as the decimal separator and never read or write a thousands separator — which makes them appropriate for round-tripping through a fixed file format or wire protocol. For locale-aware conversion to and from text, use [**CStr**](CStr) and [**CDbl**](CDbl) (or [**CDec**](CDec)) instead.

```tb
Debug.Print Hex(255)             ' "FF"
Debug.Print Oct(8)               ' "10"
Debug.Print Val("&HFF")          ' 255
```

## Working with Null and error values

[**Nz**](Nz) returns a substitute value when its argument is **Null**, leaving any other value unchanged. It is most useful for reading nullable columns from a database recordset, where directly concatenating or arithmetically combining the field with another value would otherwise propagate **Null** through the rest of the expression.

[**Error**](Error) returns the descriptive text associated with an error number — the same text that would appear as the **Description** of an [**ErrObject**](../ErrObject) raised with that number. It is the function counterpart to the same-named [**Error** statement](../../Core/Error), which *raises* a run-time error rather than describing one.

## Macintosh compatibility

[**MacID**](MacID) packs a four-character Macintosh resource type or application signature into a **Long** for use with [**Dir**](../FileSystem/Dir), [**Kill**](../FileSystem/Kill), **Shell**, or [**AppActivate**](../Interaction/AppActivate). twinBASIC currently targets Windows, where the value has no special meaning to those functions; **MacID** is provided for source compatibility with VBA code originally written for the classic Mac.

## Members

- [CBool](CBool) -- converts an expression to a **Boolean**
- [CByte](CByte) -- converts an expression to a **Byte**
- [CCur](CCur) -- converts an expression to a **Currency**
- [CDate](CDate) -- converts a date/time expression to a **Date**
- [CDbl](CDbl) -- converts an expression to a **Double**
- [CDec](CDec) -- converts an expression to a **Decimal**
- [CInt](CInt) -- converts an expression to an **Integer**
- [CLng](CLng) -- converts an expression to a **Long**
- [CLngLng](CLngLng) -- converts an expression to a **LongLong**
- [CLngPtr](CLngPtr) -- converts an expression to a **LongPtr**
- [CSng](CSng) -- converts an expression to a **Single**
- [CStr](CStr) -- converts an expression to a **String**
- [CType](CType) -- generic type conversion supporting the **CType(Of *type*)** cast operator
- [CVar](CVar) -- converts an expression to a **Variant**
- [CVDate](CVDate) -- converts a date/time expression to a **Variant** of subtype **Date**
- [CVErr](CVErr) -- converts a numeric expression to a **Variant** of subtype **Error**
- [Error](Error) -- returns the error message that corresponds to a given error number
- [Fix](Fix) -- returns the integer portion of a number, truncating toward zero
- [Hex](Hex) -- returns the hexadecimal representation of a number as a string
- [Int](Int) -- returns the integer portion of a number, rounding toward negative infinity
- [MacID](MacID) -- on the Macintosh, converts a 4-character constant to a value usable by **Dir**, **Kill**, **Shell**, or **AppActivate**
- [Nz](Nz) -- replaces a **Null** value with a specified replacement value
- [Oct](Oct) -- returns the octal representation of a number as a string
- [Str](Str) -- returns the string representation of a number
- [Val](Val) -- parses a string into a **Double**
- [ValDec](ValDec) -- parses a string into a **Decimal**
