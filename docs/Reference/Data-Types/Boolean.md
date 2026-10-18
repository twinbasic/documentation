---
title: Boolean
parent: Data Types
grand_parent: Reference Section
nav_order: 1
permalink: /tB/Core/Boolean
vba_attribution: true
---

# Boolean
{: .no_toc }

A value that is either **True** or **False**.

Syntax:

- [**Dim**](Dim) *varname* **As Boolean** [ **=** *expression* ]
- [**DefBool**](Deftype) *letterrange*

A **Boolean** variable is declared **As Boolean**. [**DefBool**](Deftype) makes **Boolean** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. **Boolean** has no type-declaration character. A **Boolean** that is not given a value holds **False**.

A comparison such as `5 > 3` gives a **Boolean**, and a **Boolean** is what `If`, `While` and `Do` test. The **Variant** subtype for a **Boolean** is **vbBoolean** (11), and [**TypeName**](../Modules/Information/TypeName) gives `Boolean`. A **Boolean** prints as `True` or `False`, and [**Write #**](Write) writes it as `#TRUE#` or `#FALSE#`.

## Storage and range

A **Boolean** is stored in 2 bytes, as a signed 16-bit number: **False** is 0 and **True** is -1, with every bit set. It has the same size in a 32-bit and a 64-bit build.

```tb check_run
Dim Flag As Boolean
Debug.Print Flag                    ' False
Debug.Print LenB(Flag)              ' 2
Debug.Print TypeName(Flag)          ' Boolean
Debug.Print VarType(Flag) = vbBoolean ' True
Debug.Print CInt(True)              ' -1
```

## Literals

The keywords **True** and **False** are the only **Boolean** literals. Their type is **Boolean**.

## Conversions

[**CBool**](../Modules/Conversion/CBool) converts an expression to a **Boolean**, and so does assigning one to a **Boolean** variable. A number that is 0 becomes **False**, and every other number, a fraction such as 0.1 included, becomes **True**; it is stored as -1. **Empty** becomes **False**. A string is read first as the word `True` or `False` in any combination of upper and lower case, then as a number, so `CBool("TRUE")` and `CBool("1")` are **True** and `CBool("0")` is **False**. Any other string raises error 13, *Type mismatch*, and so does a string with spaces around the word. **Null** raises error 94, *Invalid use of Null*.

A **Boolean** converted to a number gives 0 for **False** and -1 for **True**. A **Byte** receives 255 from **True**, since -1 does not fit and the conversion keeps the bit pattern.

Because **True** is -1, a number is not equal to **True** unless it is -1 itself: `5 = True` is **False**, although `CBool(5) = True` is **True**. Compare with [**CBool**](../Modules/Conversion/CBool) or with 0, not with **True**.

```tb check_run
Dim Flag As Boolean
Flag = 5
Debug.Print Flag                    ' True
Debug.Print CInt(Flag)              ' -1
Debug.Print CBool("false")          ' False
Debug.Print CBool(0.1)              ' True
Debug.Print 5 = True                ' False
Debug.Print CBool(5) = True         ' True
Debug.Print CByte(True)             ' 255
```

## Arithmetic and logic

In arithmetic a **Boolean** counts as an **Integer**, so `True + 0` is the **Integer** -1 and `-True` is the **Integer** 1. [Result types and promotion](../../Reference/Operators#result-types-and-promotion) has the rules for a **Boolean** beside other types.

`And`, `Or`, `Xor`, `Eqv`, `Imp` and `Not` work on the bits of their operands. With two **Boolean** operands the result is a **Boolean**. With a number as an operand they work bit by bit on numbers: `Not 1` is -2, which is not 0 and therefore counts as **True** in an `If`, whereas `Not True` is **False**. A number used as a condition is **True** when it is not 0, so convert it with [**CBool**](../Modules/Conversion/CBool) before applying `Not` or `And`. See [Operators](../../Reference/Operators#bitwise).

```tb check_run
Debug.Print TypeName(True And True) ' Boolean
Debug.Print TypeName(True + 0)      ' Integer
Debug.Print True + 0                ' -1
Debug.Print Not True                ' False
Debug.Print Not 1                   ' -2
Debug.Print Not CBool(1)            ' False
Debug.Print True And 5              ' 5
```

## Example

This example reads a list of settings, accepting a word or a number for each, and reports the ones that are not valid.

```tb check_run
Dim Entry As Variant
Dim Flag As Boolean
On Error Resume Next
For Each Entry In Array("12", "0", "true", "yes")
    Err.Clear
    Flag = CBool(Entry)
    If Err.Number = 0 Then
        Debug.Print Entry & " -> " & Flag
    Else
        Debug.Print Entry & " -> error " & Err.Number
    End If
Next
' Output:
' 12 -> True
' 0 -> False
' true -> True
' yes -> error 13
```

## See Also

- [Data Types](../../Reference/Data-Types#boolean) -- the summary of all fourteen intrinsic types
- [Integer](Integer) type -- what a **Boolean** counts as in arithmetic
- [CBool](../Modules/Conversion/CBool) function
- [Deftype](Deftype) statement
- [Operators](../../Reference/Operators#bitwise) -- `And`, `Or`, `Not` and the other bitwise operators
- [Result types and promotion](../../Reference/Operators#result-types-and-promotion) -- the type of an arithmetic result
