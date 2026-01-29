---
title: Data Types
parent: Language Syntax
nav_order: 1
---

# New Data Types

twinBASIC introduces several new data types to enhance your programming capabilities.

## LongPtr

Meant primarily to handle pointers, `LongPtr` is a 4-byte (32 bits) signed integer in 32bit mode, and a signed 8-byte integer (64 bits) in 64bit mode.

## LongLong

A signed 8-byte (64 bits) integer, ranging from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807. Note that this type is available in both 32bit and 64bit mode (VBA restricts it to 64bit mode).

## Decimal

In twinBASIC, `Decimal` is implemented as a full, regular data type, in addition to use within a `Variant`. This is a 16-byte (128 bits) type which holds a 12-byte (96 bits) integer with variable decimal point scaling and sign bit information. Values range from -79,228,162,514,264,337,593,543,950,335 to 79,228,162,514,264,337,593,543,950,335.

## Type Support

All of the datatype management features also exist for these types:
- `DefDec`/`DefLngLng`/`DefLongPtr` - Default type declarations
- `CDec`/`CLngLng`/`CLongPtr` - Type conversion functions
- `vbDecimal`/`vbLongLong`/`vbLongPtr` - Type check constants
