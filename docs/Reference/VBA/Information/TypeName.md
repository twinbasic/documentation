---
title: TypeName
parent: Information Module
permalink: /tB/Modules/Information/TypeName
redirect_from:
-  /tB/Core/TypeName
---
# TypeName
{: .no_toc }

Returns a **String** that names the type of a variable.

Syntax: **TypeName(** *varname* **)**

*varname*
: *required* A **Variant** containing any variable except a variable of a user-defined type.

The string returned by **TypeName** is one of the following:

| String returned | Variable |
|-----------------|----------|
| *objecttype* | An object whose type is *objecttype*. |
| `Byte` | **Byte** value. |
| `Integer` | **Integer**. |
| `Long` | **Long** integer. |
| `Single` | Single-precision floating-point number. |
| `Double` | Double-precision floating-point number. |
| `Currency` | **Currency**. |
| `Decimal` | **Decimal**. |
| `Date` | **Date**. |
| `String` | **String**. |
| `Boolean` | **Boolean**. |
| `Error` | An error value. |
| `Empty` | Uninitialized. |
| `Null` | No valid data. |
| `Object` | An object. |
| `Unknown` | An object whose type is unknown. |
| `Nothing` | An object variable that doesn't refer to an object. |

If *varname* is an array, the returned string can be any of the strings above (or `Variant`) with empty parentheses appended. For example, **TypeName** of an array of integers returns `"Integer()"`.

### Example

This example uses **TypeName** to return information about a variable.

```tb
Dim NullVar As Variant, MyType As String
Dim StrVar As String, IntVar As Integer, CurVar As Currency
Dim ArrayVar(1 To 5) As Integer
NullVar = Null
MyType = TypeName(StrVar)             ' Returns "String".
MyType = TypeName(IntVar)             ' Returns "Integer".
MyType = TypeName(CurVar)             ' Returns "Currency".
MyType = TypeName(NullVar)            ' Returns "Null".
MyType = TypeName(ArrayVar)           ' Returns "Integer()".
```

### See Also

- [VarType](VarType) function

{% include VBA-Attribution.md %}
