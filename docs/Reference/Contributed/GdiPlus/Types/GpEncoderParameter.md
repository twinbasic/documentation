---
title: GpEncoderParameter
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpEncoderParameter
---

# GpEncoderParameter type
{: .no_toc }

One parameter of an image encoder: an identifier, a type, and a list of values.

Encoder parameters tell an encoder how to write a picture, for instance the quality of a JPEG. [**Image.GetEncoderParameterList**](../Image#getencoderparameterlist) returns the parameters an encoder accepts, and [**Image.Save**](../Image#save) takes an array of them. The identifiers come from the functions of [**ImageCodec**](../ImageCodec#encoder-parameters). The type mirrors the GDI+ [EncoderParameter](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-encoderparameter) structure. It is 28 bytes long in a 32-bit program and 32 bytes in a 64-bit one.

<!-- test: Im_ImageTests.Save_JpegQualityChangesFileSize, Im_ImageTests.GetEncoderParameterList_JpegListsTheQuality -->
> [!WARNING] 0.9.45.0
> **Image.Save** and **Image.GetEncoderParameterList** do not work, so a program cannot pass these parameters to an encoder or get them from one. See the warnings on [**Image**](../Image#save).

* TOC
{:toc}

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Guid** | **UUID** | The identifier of the parameter, such as the value of **EncoderQuality**( ). |

The count, the type and the address of the values are kept in fields that begin with an underscore (`_count`, `_type`, `_address`), which a program sets to describe values it supplies. They are read through the properties below.

## Properties

### Type, Count

Syntax: *t* **=** *param*.**Type**

Syntax: *n* **=** *param*.**Count**

**Type** is the [**GpEncoderParameterValueType**](../Enumerations/GpEncoderParameterValueType) of the values: byte, ASCII, short, long, rational, long range, rational range, undefined or pointer. **Count** is the number of values.

### IsASCII, IsByte, IsShort, IsLong, IsRational, IsLongRange, IsRationalRange, IsBinary, IsUndefined

Syntax: *b* **=** *param*.**IsLong**

Each is **True** when **Type** is the type its name gives. **IsBinary** is for the pointer type. **IsUndefined** is **True** for the undefined type and for a type number that is out of range.

### ASCII, Byte, Short, Long, Rational, Binary

Syntax: *v* **=** *param*.**Long**( *index* )

*index*
: *required* The number of the value, from 1 to **Count**.

Return the value with that number, or 0 (an empty string for **ASCII**) when the parameter is not of that type. **Byte** returns an **Integer** and **Short** a **Long**, so that the unsigned values fit. **Long** returns a **LongLong** for the same reason. **Rational** returns the quotient of the two numbers of the pair as a **Double**. **Binary** returns the pointer.

### LongRange, RationalRange

Syntax: *v* **=** *param*.**LongRange**( *index* )

Return a range as an array of two values with the lower bound 1: two **LongLong** values for **LongRange**, and the two quotients as **Double** values for **RationalRange**.

### AsDouble

Syntax: *v* **=** *param*.**AsDouble**( *index* )

Returns a byte, short, long or rational value as a **Double**.

## Methods

### GetRational, GetLongRange, GetRationalRange

Syntax: *param*.**GetRational**( *index*, *num*, *denom* )

Syntax: *param*.**GetLongRange**( *index*, *from*, *to* )

Syntax: *param*.**GetRationalRange**( *index*, *values*( ) )

Read a rational as its numerator and denominator, a long range as its two ends, and a rational range as an array of its four numbers (lower bound 1), without dividing. All the numbers are **LongLong** values.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim qualities(0 To 1) As Long
qualities(0) = 70
qualities(1) = 80

Dim ep As GpEncoderParameter
ep.Guid = EncoderQuality()
ep._count = 2
ep._type = EncoderParameterValueTypeLong
ep._address = VarPtr(qualities(0))

Debug.Print ep.Count & " " & ep.Type & " " & ep.IsLong & " " & ep.IsByte
Debug.Print ep.Long(1) & " " & ep.Long(2) & " " & ep.AsDouble(2)
Debug.Print ep.Short(1)                          ' not a short parameter
' Output:
' 2 4 True False
' 70 80 80
' 0
```

## See Also

- [EncoderParameter](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-encoderparameter) -- Microsoft's documentation of the GDI+ structure
- [Image](../Image) class
- [ImageCodec](../ImageCodec) -- the parameter identifiers
- [GpEncoderParameterValueType](../Enumerations/GpEncoderParameterValueType) enumeration
