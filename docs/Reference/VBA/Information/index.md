---
title: Information Module
parent: VBA Package
permalink: /tB/Modules/Information/
has_toc: false
---

# Information module

The **Information** module groups together standalone procedures for asking questions about a value at run time — its subtype, whether it has been initialised, whether an optional argument was supplied — together with related utilities for querying array bounds, building **Variant** arrays, taking raw addresses, decomposing colour values, and reaching the current run-time error state.

## Inspecting a value

The `Is...` family of functions test whether an expression has a particular state or subtype, returning a **Boolean**: [**IsArray**](IsArray), [**IsArrayInitialized**](IsArrayInitialized), [**IsDate**](IsDate), [**IsEmpty**](IsEmpty), [**IsError**](IsError), [**IsMissing**](IsMissing), [**IsNull**](IsNull), [**IsNumeric**](IsNumeric), and [**IsObject**](IsObject). For richer queries, [**VarType**](VarType) returns the [**VbVarType**](../Constants/VbVarType) enumeration value identifying the subtype of a **Variant**, and [**TypeName**](TypeName) returns its name as a **String**.

```tb
Dim v As Variant
v = "1/1/2000"
Debug.Print IsDate(v)        ' True
Debug.Print VarType(v)       ' 8  (vbString)
Debug.Print TypeName(v)      ' "String"
```

## Array bounds

[**LBound**](LBound) and [**UBound**](UBound) return the smallest and largest valid subscript for a chosen dimension of an array. With a single argument they report on the first dimension; pass an explicit *Dimension* index to query a multidimensional array.

```tb
Dim Grid(1 To 4, 0 To 9) As Long
Debug.Print LBound(Grid)        ' 1   — first dimension lower bound
Debug.Print UBound(Grid)        ' 4   — first dimension upper bound
Debug.Print LBound(Grid, 2)     ' 0   — second dimension lower bound
Debug.Print UBound(Grid, 2)     ' 9   — second dimension upper bound
```

## Building Variant arrays

[**Array**](Array) creates a **Variant** array from a comma-separated list of values; the lower bound follows the source file's **Option Base** setting. As a special form, the same name doubles as a destructuring `Property Let` for unpacking an array on the right-hand side into individual variables on the left.

```tb
Dim a As Variant = Array("one", "two", "three")
Dim x As Variant, y As Variant, z As Variant
Array(x, y, z) = a              ' destructuring assignment
```

## Raw pointers

Three functions return raw addresses for use with API calls or unsafe interop: [**ObjPtr**](ObjPtr) for an object's COM identity, [**StrPtr**](StrPtr) for the underlying buffer of a **String**, and [**VarPtr**](VarPtr) for any variable. The result is a **LongPtr** valid only while the underlying object, string, or variable stays alive — taking a pointer never holds a reference of its own. To read or write the memory at a known address, pair these with the [**GetMem**](../HiddenModule/GetMem4) / [**PutMem**](../HiddenModule/PutMem4) family from the [(Default)](../HiddenModule/) module.

```tb
Dim n As Long = &H12345678
Dim Bytes(0 To 3) As Byte
vbaCopyBytes 4, VarPtr(Bytes(0)), VarPtr(n)
Debug.Print Hex(Bytes(0))        ' "78" — little-endian
```

## Working with colour values

[**RGB**](RGB) and [**RGBA**](RGBA) build a 32-bit colour value from individual red, green, blue, and (optionally) alpha components; [**RGB_R**](RGB_R), [**RGB_G**](RGB_G), [**RGB_B**](RGB_B), and [**RGBA_A**](RGBA_A) extract those components back out. [**QBColor**](QBColor) returns the RGB value of one of the sixteen QuickBASIC colour indexes, and [**TranslateColor**](TranslateColor) converts an OLE colour value (which may reference an entry in the system palette) into a plain RGB colour.

```tb
Dim C As Long
C = RGB(255, 100, 150)
Debug.Print RGB_R(C)         ' 255
Debug.Print RGB_G(C)         ' 100
Debug.Print RGB_B(C)         ' 150
```

## Run-time error state

[**Err**](Err) returns the [**ErrObject**](../ErrObject) describing the run-time error currently in effect — its number, description, source, and so on. [**Erl**](Erl) returns the line number of the statement that raised the most recent error, when one was supplied as a numeric label.

## Members

- [Array](Array) -- creates a **Variant** array from a comma-separated list of values, or destructures one when used on the left of an assignment
- [Erl](Erl) -- returns the line number where the most recent run-time error occurred
- [Err](Err) -- returns the [**ErrObject**](../ErrObject) describing the current run-time error state
- [IMEStatus](IMEStatus) -- returns the status of the Input Method Editor
- [IsArray](IsArray) -- returns whether a variable is an array
- [IsArrayInitialized](IsArrayInitialized) -- returns whether an array has been dimensioned
- [IsDate](IsDate) -- returns whether an expression can be evaluated as a date
- [IsEmpty](IsEmpty) -- returns whether a **Variant** is uninitialised
- [IsError](IsError) -- returns whether an expression is an error subtype
- [IsMissing](IsMissing) -- returns whether an optional argument was supplied
- [IsNull](IsNull) -- returns whether a variable contains a **Null** value
- [IsNumeric](IsNumeric) -- returns whether an expression can be evaluated as a number
- [IsObject](IsObject) -- returns whether a variable refers to an object
- [LBound](LBound) -- returns the smallest valid subscript for a dimension of an array
- [ObjPtr](ObjPtr) -- returns the COM-identity address of an object
- [QBColor](QBColor) -- returns the RGB colour value for a QuickBASIC colour index
- [RGB](RGB) -- builds an RGB colour value from red, green, and blue components
- [RGBA](RGBA) -- builds an RGBA colour value from red, green, blue, and alpha components
- [RGBA_A](RGBA_A) -- returns the alpha component of an RGBA colour value
- [RGB_B](RGB_B) -- returns the blue component of an RGB colour value
- [RGB_G](RGB_G) -- returns the green component of an RGB colour value
- [RGB_R](RGB_R) -- returns the red component of an RGB colour value
- [StrPtr](StrPtr) -- returns the address of the underlying buffer of a **String**
- [TranslateColor](TranslateColor) -- translates an OLE colour value to a plain RGB colour value
- [TypeName](TypeName) -- returns the name of a variable's data type as a **String**
- [UBound](UBound) -- returns the largest valid subscript for a dimension of an array
- [VarPtr](VarPtr) -- returns the address of a variable
- [VarType](VarType) -- returns the [**VbVarType**](../Constants/VbVarType) enumeration value identifying a variable's subtype
