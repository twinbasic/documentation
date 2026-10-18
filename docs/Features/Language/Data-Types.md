---
title: Data Types
parent: Language Syntax
nav_order: 1
permalink: /Features/Language/Data-Types
---

# New Data Types

twinBASIC introduces several new data types to enhance your programming capabilities. Each has a reference page of its own, linked below.

## LongPtr

Meant primarily to handle pointers, `LongPtr` is a 4-byte (32 bits) signed integer in 32bit mode, and a signed 8-byte integer (64 bits) in 64bit mode. See [**LongPtr**](../../tB/Core/LongPtr).

## LongLong

A signed 8-byte (64 bits) integer, ranging from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807. Note that this type is available in both 32bit and 64bit mode (VBA restricts it to 64bit mode). See [**LongLong**](../../tB/Core/LongLong).

## Decimal

In twinBASIC, `Decimal` is implemented as a full, regular data type, in addition to use within a `Variant`. This is a 16-byte (128 bits) type which holds a 12-byte (96 bits) integer with variable decimal point scaling and sign bit information. Values range from -79,228,162,514,264,337,593,543,950,335 to 79,228,162,514,264,337,593,543,950,335. See [**Decimal**](../../tB/Core/Decimal).

## Type Support

All of the datatype management features also exist for these types:
- `DefDec`/`DefLngLng`/`DefLngPtr` - Default type declarations
- `CDec`/`CLngLng`/`CLngPtr` - Type conversion functions
- `vbDecimal`/`vbLongLong` - Type check constants. `VarType` of a `LongPtr` gives `vbLong` in a 32bit build and `vbLongLong` in a 64bit build.
