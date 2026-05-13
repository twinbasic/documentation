---
title: VarType
parent: Information Module
permalink: /tB/Modules/Information/VarType
redirect_from:
-  /tB/Core/VarType
vba_attribution: true
---
# VarType
{: .no_toc }

Returns a [**VbVarType**](../Constants/VbVarType) value identifying the subtype of a variable, or the type of an object's default property.

Syntax: **VarType(** *varname* **)**

*varname*
: *required* A **Variant** containing any variable except a variable of a user-defined type.

The return value is one of the constants from the [**VbVarType**](../Constants/VbVarType) enumeration, or the sum of one of those constants and `vbArray`. The most useful values are:

| Constant | Value | Description |
|----------|-------|-------------|
| **vbEmpty** | 0 | **Empty** (uninitialized). |
| **vbNull** | 1 | **Null** (no valid data). |
| **vbInteger** | 2 | **Integer**. |
| **vbLong** | 3 | **Long** integer. |
| **vbSingle** | 4 | Single-precision floating-point number. |
| **vbDouble** | 5 | Double-precision floating-point number. |
| **vbCurrency** | 6 | **Currency**. |
| **vbDate** | 7 | **Date**. |
| **vbString** | 8 | **String**. |
| **vbObject** | 9 | Object reference. |
| **vbError** | 10 | Error value. |
| **vbBoolean** | 11 | **Boolean**. |
| **vbVariant** | 12 | **Variant** (used only with arrays of variants). |
| **vbDecimal** | 14 | **Decimal**. |
| **vbByte** | 17 | **Byte**. |
| **vbLongLong** | 20 | **LongLong** (64-bit only). |
| **vbUserDefinedType** | 36 | **Variant** containing a user-defined type. |
| **vbArray** | 8192 | Array. Always added to another value when returned. |

If an object is passed and has a default property, **VarType(*object*)** returns the type of that default property.

**VarType** never returns **vbArray** by itself; it is always added to another value to indicate an array of a particular subtype. For example, an array of **Integer** returns `vbInteger + vbArray`, or 8194. The constant **vbVariant** is only returned in conjunction with **vbArray**, indicating an array of **Variant**.

> [!NOTE]
> twinBASIC also exposes a generic form, **VarType(Of *T*)**, which is useful for compile-time verification of generic type specifiers. The non-generic call uses special internal bindings and so may not behave like a regular function.

### Example

This example uses **VarType** to determine the subtype of several variables.

```tb
Dim MyCheck As VbVarType
Dim IntVar As Integer, StrVar As String, DateVar As Date
Dim ArrayVar As Variant
IntVar = 459
StrVar = "Hello World"
DateVar = #2/12/1969#
ArrayVar = Array("1st Element", "2nd Element")

MyCheck = VarType(IntVar)             ' Returns 2  (vbInteger).
MyCheck = VarType(DateVar)            ' Returns 7  (vbDate).
MyCheck = VarType(StrVar)             ' Returns 8  (vbString).
MyCheck = VarType(ArrayVar)           ' Returns 8204 — vbArray + vbVariant.
```

### See Also

- [TypeName](TypeName) function
- [VbVarType](../Constants/VbVarType) enumeration
