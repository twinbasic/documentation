---
title: String
parent: Data Types
grand_parent: Reference Section
nav_order: 12
permalink: /tB/Core/String
vba_attribution: true
---

# String
{: .no_toc }

A sequence of Unicode characters, of variable or of fixed length.

Syntax:

- [**Dim**](Dim) *varname* **As String** [ **=** *expression* ]
- [**Dim**](Dim) *varname* **As String \*** *length*
- **Dim** *varname*`$`
- [**DefStr**](Deftype) *letterrange*

A variable-length **String** variable is declared **As String**, or by the type-declaration character `$` after its name. A fixed-length one is declared **As String \*** *length*, where *length* is the number of characters. [**DefStr**](Deftype) makes **String** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. A variable-length **String** that is not given a value holds the null string, which is empty; a fixed-length one holds spaces.

The **Variant** subtype for a **String** is **vbString** (8), and [**TypeName**](../Modules/Information/TypeName) gives `String`. This page describes the type. The [**String**](../Modules/Strings/String) function builds a string of one repeated character.

## Storage and range

A variable-length **String** is a COM `BSTR`: a pointer to the characters, which are stored as UTF-16, 2 bytes each. [**Len**](../Modules/Strings/Len) counts characters, and **LenB** counts bytes, so `Len` of `"abc"` is 3 and `LenB` is 6. A character outside the Basic Multilingual Plane takes two UTF-16 units, and `Len` counts both. A variable-length **String** holds up to about 2 billion characters, limited in practice by memory.

A **String** variable that was never assigned holds the null string, a null pointer: `Len` is 0 and [**StrPtr**](../Modules/Information/StrPtr) is 0. `vbNullString` is the null string, and `""` is an empty string with a pointer to an empty buffer. The two compare equal and most code treats them alike; the difference matters for an API that distinguishes a null pointer from an empty string.

```tb check_run
Dim Text As String
Dim Title$
Debug.Print Len(Text)               ' 0
Debug.Print StrPtr(Text)            ' 0
Debug.Print TypeName(Title)         ' String
Debug.Print VarType(Text) = vbString ' True
Text = "abc"
Debug.Print Len(Text)               ' 3
Debug.Print LenB(Text)              ' 6
Text = ""
Debug.Print StrPtr(Text) <> 0       ' True
Debug.Print Text = vbNullString     ' True
Dim Pair As String = ChrW(&HD83D) & ChrW(&HDE00)
Debug.Print Len(Pair)               ' 2
```

## Fixed-length strings

A fixed-length **String** always has the length it is declared with. A value shorter than that is padded on the right with spaces when it is assigned, and a longer one is cut off. `LenB` is twice the length, and a fixed-length member of a **Type** takes that many bytes. Join a fixed-length string to another with `&`, and the result is a variable-length **String**.

```tb check_run
Dim Code As String * 3
Debug.Print "[" & Code & "]"        ' [   ]
Code = "a"
Debug.Print "[" & Code & "]"        ' [a  ]
Code = "abcdef"
Debug.Print "[" & Code & "]"        ' [abc]
Debug.Print Len(Code)               ' 3
Debug.Print LenB(Code)              ' 6
```

> [!NOTE]
> A fixed-length **String** can have more characters in twinBASIC than in VB6, whose limit is 65,526: `String * 1000000` compiles and runs. VB6 refuses a longer one with the error *Invalid length for fixed-length string*.

## Literals

A string literal is text between double quotation marks, and its type is **String**. To put a double quotation mark inside it, write two in a row; `Chr$(34)` gives the same character. There is no type-declaration character for a literal.

```tb check_run
Debug.Print "say ""hi"""            ' say "hi"
Debug.Print "say " & Chr$(34) & "hi" & Chr$(34) ' say "hi"
Debug.Print Len("a""b")             ' 3
```

## Conversions

[**CStr**](../Modules/Conversion/CStr) converts an expression to a **String**, and so does assigning one to a **String** variable: a number gives its digits, and `True` gives `True`. **Empty** gives an empty string. **Null** raises error 94, *Invalid use of Null*, for the assignment and for **CStr**.

A string assigned to a number is read as a number: spaces at both ends are ignored, and `&H` introduces a hexadecimal number. An empty string and a string that is not a number raise error 13, *Type mismatch*.

```tb check_run
Dim Text As String
Dim Number As Long
Text = 5
Debug.Print Text & "|" & TypeName(Text) ' 5|String
Debug.Print CStr(True)              ' True
Number = " 12 "
Debug.Print Number                  ' 12
Number = "&H10"
Debug.Print Number                  ' 16
On Error Resume Next
Number = "abc"
Debug.Print Err.Number              ' 13
Err.Clear
Text = Null
Debug.Print Err.Number              ' 94
```

## Joining and comparing

`&` joins two values into a **String**, whatever their types; a **Null** operand counts as an empty string. `+` joins two **String** operands too, but a **String** beside a number is converted to a number and added: `"34" + 6` is the **Double** 40, where `"34" & 6` is `346`. A comparison of two strings is case-sensitive by default: `"a" = "A"` is **False**. See [Result types and promotion](../../Reference/Operators#result-types-and-promotion) for `+`, `-` and `*` on strings.

A function that has a `$` form, such as [**Left**](../Modules/Strings/Left) and `Left$`, returns a **String** in the `$` form, and a **Variant** in the other: `Left(Null, 1)` is **Null**.

```tb check_run
Debug.Print "34" + "6"              ' 346
Debug.Print "34" + 6                ' 40
Debug.Print TypeName("34" + 6)      ' Double
Debug.Print "34" & 6                ' 346
Debug.Print TypeName("a" & Null)    ' String
Debug.Print "a" = "A"               ' False
Debug.Print TypeName(Left$("abc", 1)) ' String
Debug.Print TypeName(Left(Null, 1)) ' Null
```

## Example

This example reads a fixed-width record of a 10-character surname followed by a 4-digit quantity.

```tb check_run
Dim Record As String = "Smith     0042"
Dim Surname As String * 10
Dim Quantity As String * 4
Surname = Record
Quantity = Mid$(Record, 11)
Debug.Print "[" & RTrim$(Surname) & "]" ' [Smith]
Debug.Print CLng(Quantity) + 1          ' 43
```

## See Also

- [Data Types](../../Reference/Data-Types#string) -- the summary of all fourteen intrinsic types
- [String](../Modules/Strings/String) function -- builds a string of one repeated character
- [Byte](Byte) type -- byte arrays hold the bytes of a string
- [CStr](../Modules/Conversion/CStr) function
- [Len](../Modules/Strings/Len), [StrPtr](../Modules/Information/StrPtr) -- the length and the address of a string
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
