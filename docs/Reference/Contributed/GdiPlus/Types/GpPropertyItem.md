---
title: GpPropertyItem
parent: Types
grand_parent: GdiPlus Package
permalink: /tB/Packages/Contributed/GdiPlus/Types/GpPropertyItem
---

# GpPropertyItem type
{: .no_toc }

One property of an image file: an identifier, a type, and a value.

Image files hold properties such as the camera model, the date a photograph was taken or the delay of a GIF frame. [**Image.PropertyItem**](../Image#propertyitem) sets one, and [**GetAllPropertyItems**](../Image#getallpropertyitems) returns all of them. The `PropertyTag...` constants of the package name the identifiers of the common properties, and the type of the value is a [**GpPropertyTagType**](../Enumerations/GpPropertyTagType). The type mirrors the GDI+ [PropertyItem](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-propertyitem) class.

* TOC
{:toc}

## Fields

| Field | Type | Meaning |
|:------|:-----|:--------|
| **Id** | **Long** | The identifier of the property. |

The length of the value in bytes, the type and the address of the value are kept in fields that begin with an underscore (`_length`, `_type`, `_address`), which a program sets to describe a value it supplies. They are read through the properties below.

## Type tests

Syntax: *t* **=** *item*.**Type**

Syntax: *b* **=** *item*.**IsASCII**

**Type** returns the [**GpPropertyTagType**](../Enumerations/GpPropertyTagType) of the value. **IsASCII**, **IsByte**, **IsShort**, **IsLong**, **IsRational**, **IsSByte**, **IsSShort**, **IsSLong**, **IsSRational**, **IsSingle** and **IsDouble** are **True** when **Type** is the type the name gives, and **IsUndefined** is **True** for the undefined type and for a type number out of range.

## Reading the value

Syntax: *v* **=** *item*.**TheLong**

| Property | Reads |
|:---------|:------|
| **TheASCII** | A **String**, from the ASCII text. |
| **TheByte** | An unsigned byte, as an **Integer**. |
| **TheSByte** | A signed byte, as a **Byte**. |
| **TheShort** | An unsigned 16-bit number, as a **Long**. |
| **TheSShort** | A signed 16-bit number, as an **Integer**. |
| **TheLong** | An unsigned 32-bit number, as a **LongLong**. |
| **TheSLong** | A signed 32-bit number, as a **Long**. |
| **TheRational** | A pair of unsigned 32-bit numbers, as their quotient, a **Double**. |
| **TheSRational** | A pair of signed 32-bit numbers, as their quotient, a **Double**. |
| **TheSingle** | A 32-bit floating-point number. |
| **TheDouble** | A 64-bit floating-point number. |
| **AsDouble** | Any of the byte, short, long and floating-point types, as a **Double**. |

A property returns 0 when the type of the value is not the one it reads.

> [!WARNING] 0.9.45.0
> Several of the readers test the wrong type and so return 0 for the values they are meant to read: **TheSByte** works only for a byte (not signed), **TheSLong** only for a short, **TheSShort** only for an unsigned short, and **TheDouble** only for a single. **AsDouble** returns 0 for the signed byte, signed short, signed long and double types for the same reason. **TheSRational** and the other readers work.

### GetRational, GetSRational

Syntax: *item*.**GetRational**( *num*, *denom* )

Syntax: *item*.**GetSRational**( *num*, *denom* )

Read a rational value as its numerator and denominator without dividing: **GetRational** as unsigned numbers (**LongLong**), **GetSRational** as signed ones (**Long**).

> [!WARNING] 0.9.45.0
> **GetSRational** tests for an unsigned rational, so it reads nothing from a signed one.

```tb check_build check_run
Dim user As GdiPlusUser = GdiPlusUser()

Dim ratio(0 To 1) As Long
ratio(0) = 7
ratio(1) = 2

Dim item As GpPropertyItem
item.Id = PropertyTagXResolution
item._type = PropertyTagTypeRational
item._length = 8
item._address = VarPtr(ratio(0))

Debug.Print Hex$(item.Id) & " " & item.IsRational & " " & item.IsLong
Debug.Print item.TheRational
Dim num As LongLong, denom As LongLong
item.GetRational num, denom
Debug.Print num & "/" & denom
Debug.Print item.AsDouble                          ' a rational is not covered by AsDouble
' Output:
' 11A True False
' 3.5
' 7/2
' 0
```

## See Also

- [PropertyItem](https://learn.microsoft.com/en-us/windows/win32/api/gdiplusimaging/ns-gdiplusimaging-propertyitem) -- Microsoft's documentation of the GDI+ class
- [Image](../Image) class
- [GpPropertyTagType](../Enumerations/GpPropertyTagType) enumeration
