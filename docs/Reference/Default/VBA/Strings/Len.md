---
title: Len
parent: Strings Module
permalink: /tB/Modules/Strings/Len
vba_attribution: true
---
# Len, LenB
{: .no_toc }

Returns a **Long** containing the number of characters in a string or the number of bytes required to store a variable.

Syntax:

- **Len(** *string* **)**, **Len(** *varname* **)**
- **LenB(** *string* **)**, **LenB(** *varname* **)**

*string*
: Any valid string expression. If *string* contains **Null**, **Null** is returned.

*varname*
: Any valid variable name. If *varname* contains **Null**, **Null** is returned. If *varname* is a **Variant**, **Len** treats it the same as a **String** and always returns the number of characters it contains.

One (and only one) of the two possible arguments must be specified. With user-defined types, **Len** returns the size as it will be written to the file.

> [!NOTE]
> Use the **LenB** function with byte data contained in a string, as in double-byte character set (DBCS) languages. Instead of returning the number of characters in a string, **LenB** returns the number of bytes used to represent that string. With user-defined types, **LenB** returns the in-memory size, including any padding between elements.

> [!NOTE]
> **Len** may not be able to determine the actual number of storage bytes required when used with variable-length strings in user-defined data types.

> [!WARNING] BETA 1010
> **Len** and **LenB** accept an array as *varname* and return a number that is not its size in bytes: 40 for a fixed-size one-dimensional array of any element type or length in a 32-bit build (48 in a 64-bit build), 48 (56) for two dimensions, and 4 (8) for a dynamic array. VB6 refuses an array here when the program is compiled. Multiply the element count by the size of one element instead: `(UBound(Buffer) - LBound(Buffer) + 1) * LenB(Buffer(LBound(Buffer)))`.

### Example

This example uses **Len** to return the number of characters in a string or the number of bytes required to store a variable. The `Type...End Type` block defining `CustomerRecord` must be preceded by the keyword **Private** if it appears in a class module. In a standard module, a **Type** statement can be **Public**.

```tb check_build
Type CustomerRecord            ' Define user-defined type.
    ID As Integer              ' Place this definition in a
    Name As String * 10        ' standard module.
    Address As String * 30
End Type

Sub Demo()
    Dim Customer As CustomerRecord    ' Declare variables.
    Dim MyInt As Integer, MyCur As Currency
    Dim MyString, MyLen
    MyString = "Hello World"     ' Initialize variable.
    MyLen = Len(MyInt)           ' Returns 2.
    MyLen = Len(Customer)        ' Returns 42.
    MyLen = Len(MyString)        ' Returns 11.
    MyLen = Len(MyCur)           ' Returns 8.
End Sub
```

### See Also

- [Left](Left), [Mid](Mid), [Right](Right) functions
