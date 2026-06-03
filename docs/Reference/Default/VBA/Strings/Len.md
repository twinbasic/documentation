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

### Example

This example uses **Len** to return the number of characters in a string or the number of bytes required to store a variable. The `Type...End Type` block defining `CustomerRecord` must be preceded by the keyword **Private** if it appears in a class module. In a standard module, a **Type** statement can be **Public**.

```tb
Type CustomerRecord            ' Define user-defined type.
    ID As Integer              ' Place this definition in a
    Name As String * 10        ' standard module.
    Address As String * 30
End Type

Dim Customer As CustomerRecord    ' Declare variables.
Dim MyInt As Integer, MyCur As Currency
Dim MyString, MyLen
MyString = "Hello World"     ' Initialize variable.
MyLen = Len(MyInt)           ' Returns 2.
MyLen = Len(Customer)        ' Returns 42.
MyLen = Len(MyString)        ' Returns 11.
MyLen = Len(MyCur)           ' Returns 8.
```

### See Also

- [Left](Left), [Mid](Mid), [Right](Right) functions
