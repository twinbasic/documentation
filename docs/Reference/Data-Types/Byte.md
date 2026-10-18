---
title: Byte
parent: Data Types
grand_parent: Reference Section
nav_order: 2
permalink: /tB/Core/Byte
vba_attribution: true
---

# Byte
{: .no_toc }

An unsigned 8-bit integer, from 0 to 255.

Syntax:

- [**Dim**](Dim) *varname* **As Byte** [ **=** *expression* ]
- [**DefByte**](Deftype) *letterrange*

A **Byte** variable is declared **As Byte**. [**DefByte**](Deftype) makes **Byte** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. **Byte** has no type-declaration character. A **Byte** that is not given a value holds 0.

**Byte** is the only unsigned integer type, and the natural type for binary data: buffers, file contents and the bytes of a string are held in arrays of **Byte**. The **Variant** subtype for a **Byte** is **vbByte** (17), and [**TypeName**](../Modules/Information/TypeName) gives `Byte`.

## Storage and range

A **Byte** is stored in 1 byte and holds the whole numbers from 0 to 255. It has the same size in a 32-bit and a 64-bit build.

```tb check_run
Dim Value As Byte
Debug.Print Value                   ' 0
Debug.Print LenB(Value)             ' 1
Debug.Print TypeName(Value)         ' Byte
Debug.Print VarType(Value) = vbByte ' True
```

## Literals

There is no **Byte** literal. A whole number such as `255` is an **Integer** (see [**Integer**](Integer#literals)), and the same holds for `&HFF`. A literal is converted when it is assigned to a **Byte** variable: `Value = 255` is accepted, and `Value = 256` and `Value = -1` raise error 6, *Overflow*. Use [**CByte**](../Modules/Conversion/CByte) to produce a **Byte** value in an expression.

## Conversions

[**CByte**](../Modules/Conversion/CByte) converts an expression to a **Byte**, and so does assigning one to a **Byte** variable. A number with a fraction is rounded to the nearest whole number, and a number exactly halfway between two is rounded to the even one: 2.5 becomes 2, 3.5 becomes 4 and 254.5 becomes 254. A string is read as a number, so `CByte("&HFF")` is 255 and `CByte(" 7 ")` is 7. **False** becomes 0 and **True** becomes 255.

A value outside 0 to 255 after rounding raises error 6, *Overflow*: `CByte(255.5)` does, because it rounds to 256, and so does `CByte(-1)`. A string that is not a number raises error 13, *Type mismatch*.

```tb check_run
Dim Value As Byte
Value = 2.5
Debug.Print Value                   ' 2
Value = 3.5
Debug.Print Value                   ' 4
Debug.Print CByte("&HFF")           ' 255
Debug.Print CByte(True)             ' 255
On Error Resume Next
Value = CByte(255.5)
Debug.Print Err.Number              ' 6
```

## Arithmetic and overflow

An operation on two **Byte** values gives a **Byte**, so a result above 255 or below 0 raises error 6, *Overflow*, whatever the variable that receives it: with `Value` holding 100, `Total = Value * Value` raises the error even when `Total` is a **Long**. A **Byte** combined with an **Integer** gives an **Integer**, and the literal `1` is an **Integer**, so `Value + 1` is an **Integer**: it does not overflow, but assigning 256 to a **Byte** does. `\` and `Mod` on two **Byte** values give a **Byte**, and unary `-` gives an **Integer**. Division with `/` gives a **Double** unless the other operand is a **Single** or a **Decimal**. To compute with a wider type, convert one operand first: `CLng(Value) * Value`. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the full rules.

```tb check_run
Dim Value As Byte = 100
Dim Total As Long
Debug.Print TypeName(Value + Value) ' Byte
Debug.Print TypeName(Value + 1)     ' Integer
Debug.Print TypeName(-Value)        ' Integer
Total = CLng(Value) * Value
Debug.Print Total                   ' 10000
On Error Resume Next
Total = Value * Value
Debug.Print Err.Number              ' 6
```

[**IntegerOverflowChecks(False)**](Attributes#integeroverflowchecks) turns the overflow check off for a class, a module or a procedure, and a **Byte** result then wraps around: 255 plus 1 is 0.

A **Variant** holding a **Byte** does not overflow: a result that does not fit becomes an **Integer**, a **Long** or a **Double**, whichever is the first to hold it.

## Byte arrays

An array of **Byte** holds binary data. Assigning a **String** to a dynamic **Byte** array copies the string's characters as they are stored, two bytes for each, low byte first, so `"ab"` gives the four bytes 97, 0, 98, 0. Assigning the array to a **String** variable reverses it. [**StrConv**](../Modules/Strings/StrConv) with `vbFromUnicode` converts the characters to the system's ANSI code page, one byte for each character, and `vbUnicode` converts back. The **Variant** subtype of a **Byte** array is `vbArray + vbByte`.

```tb check_run
Dim Data() As Byte
Dim Text As String
Data = "ab"
Debug.Print UBound(Data) + 1        ' 4
Debug.Print Data(0) & " " & Data(1) & " " & Data(2) ' 97 0 98
Text = Data
Debug.Print Text                    ' ab
Data = StrConv("ab", vbFromUnicode)
Debug.Print UBound(Data) + 1        ' 2
Debug.Print StrConv(Data, vbUnicode) ' ab
```

## Example

This example converts a string to ANSI bytes, shows each byte in hexadecimal and adds them up. The sum, 500, does not fit in a **Byte**, so it is held in a **Long**; masking it with `&HFF` gives a one-byte checksum.

```tb check_run
Dim Data() As Byte
Dim Total As Long
Dim Digits As String
Dim i As Long
Data = StrConv("Hello", vbFromUnicode)
For i = LBound(Data) To UBound(Data)
    Total = Total + Data(i)
    Digits = Digits & Right$("0" & Hex$(Data(i)), 2) & " "
Next
Debug.Print Trim$(Digits)           ' 48 65 6C 6C 6F
Debug.Print Total                   ' 500
Debug.Print Total And &HFF          ' 244
```

## See Also

- [Data Types](../../Reference/Data-Types#byte) -- the summary of all fourteen intrinsic types
- [Integer](Integer), [Long](Long) -- the signed integer types
- [CByte](../Modules/Conversion/CByte) function
- [Deftype](Deftype) statement
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
