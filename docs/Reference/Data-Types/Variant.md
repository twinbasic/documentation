---
title: Variant
parent: Data Types
grand_parent: Reference Section
nav_order: 13
permalink: /tB/Core/Variant
vba_attribution: true
---

# Variant
{: .no_toc }

A value of any type, which carries its own type with it.

Syntax:

- [**Dim**](Dim) *varname* [ **As Variant** ] [ **=** *expression* ]
- [**DefVar**](Deftype) *letterrange*

A variable declared with no type is a **Variant**, and so is one declared **As Variant**. [**DefVar**](Deftype) makes **Variant** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*; with no **Def** statement it already is. **Variant** has no type-declaration character. A **Variant** that is not given a value holds **Empty**.

A **Variant** can hold a number of any numeric type, a **Date**, a **String**, a **Boolean**, an object reference or an array, and the special values **Empty**, **Null** and an error value. A fixed-length **String** assigned to a **Variant** is held as a variable-length one. [**VarType**](../Modules/Information/VarType) and [**TypeName**](../Modules/Information/TypeName) report which type a **Variant** holds at the moment; a **Variant** can hold a different type after each assignment. The **Variant** subtype for a **Variant** itself, **vbVariant** (12), appears only in the type of an array of **Variant**.

> [!NOTE]
> In `Dim a, b As Long` only `b` is a **Long**. `a` has no `As` clause of its own, so it is a **Variant**. Write `Dim a As Long, b As Long`.

## Storage and range

A **Variant** takes 16 bytes in a 32-bit build and 24 bytes in a 64-bit build. [**LenB**](../Modules/Strings/Len) of a **Variant** variable is not its size: it gives the length in bytes of the value it holds, as a **String**, so `LenB(CVar(5))` is 2.

A **Variant** operates on its contents the way the contents' own type does, with a few differences set out under [Arithmetic](#arithmetic). A **Variant** takes more space and more time for each operation than a variable of a specific type, since the type is checked at run time: use a typed variable where the type is known.

The type tags, as [**VarType**](../Modules/Information/VarType) returns them:

| Constant | Value | The **Variant** holds |
|:--|--:|:--|
| **vbEmpty** | 0 | nothing assigned (**Empty**) |
| **vbNull** | 1 | **Null**, no valid data |
| **vbInteger** | 2 | an **Integer** |
| **vbLong** | 3 | a **Long** |
| **vbSingle** | 4 | a **Single** |
| **vbDouble** | 5 | a **Double** |
| **vbCurrency** | 6 | a **Currency** |
| **vbDate** | 7 | a **Date** |
| **vbString** | 8 | a **String** |
| **vbObject** | 9 | an object reference, or **Nothing** |
| **vbError** | 10 | an error value |
| **vbBoolean** | 11 | a **Boolean** |
| **vbVariant** | 12 | only in an array of **Variant** |
| **vbDataObject** | 13 | a data-access object |
| **vbDecimal** | 14 | a **Decimal** |
| **vbByte** | 17 | a **Byte** |
| **vbLongLong** | 20 | a **LongLong** |
| **vbArray** | 8192 | added to another value: an array of that type |

A **LongPtr** is held as a **Long** or a **LongLong** according to the build. [**VbVarType**](../Modules/Constants/VbVarType) lists the constants.

```tb check_run
Dim Item As Variant
For Each Item In Array(1, 40000, 3000000000#, 1.5!, 1.5, 1.5@, #1/1/2000#, "s", True, CByte(1), CDec(1), 3000000000^)
    Debug.Print TypeName(Item) & " " & VarType(Item)
Next
' Output:
' Integer 2
' Long 3
' Double 5
' Single 4
' Double 5
' Currency 6
' Date 7
' String 8
' Boolean 11
' Byte 17
' Decimal 14
' LongLong 20
```

## Literals

A **Variant** has no literal of its own. A literal assigned to a **Variant** keeps its type, so `v = 1` holds an **Integer** and `v = 40000` a **Long**. The keywords **Empty** and **Null** are the **Variant** values for no value and for no valid data. [**CVar**](../Modules/Conversion/CVar) converts an expression to a **Variant**; the conversion functions such as [**CLng**](Long#conversions) and [**CDec**](Decimal#conversions) set the subtype.

## Empty, Null and error values

**Empty** is what a **Variant** holds before it is assigned. It counts as 0 in a numeric expression and as an empty string in a string expression, and `Empty = 0` and `Empty = ""` are both **True**. Test for it with [**IsEmpty**](../Modules/Information/IsEmpty).

**Null** means that the **Variant** holds no valid data. A numeric expression with a **Null** operand is **Null**, a comparison with one is **Null**, and `&` treats it as an empty string. Test for it with [**IsNull**](../Modules/Information/IsNull); `v = Null` is never **True**. Assigning **Null** to a variable of another type raises error 94, *Invalid use of Null*.

An error value is made with [**CVErr**](../Modules/Conversion/CVErr) and tested with [**IsError**](../Modules/Information/IsError). It does not raise an error when it is assigned or passed on, which lets a function return the failure as its result. Arithmetic with one raises error 13, *Type mismatch*.

```tb check_run
Dim v As Variant
Debug.Print IsEmpty(v)              ' True
Debug.Print v + 1                   ' 1
Debug.Print "[" & v & "]"           ' []
Debug.Print v = 0                   ' True
v = Null
Debug.Print IsNull(v)               ' True
Debug.Print IsNull(v + 1)           ' True
Debug.Print "x" & v                 ' x
Debug.Print TypeName(v = v)         ' Null
v = CVErr(5)
Debug.Print IsError(v)              ' True
Debug.Print TypeName(v)             ' Error
Debug.Print CLng(v)                 ' 5
```

## Arithmetic

A **Variant** holding a number is used as a number: `+`, `-` and `*` give the result type that the types it holds would. When the operand is a string that can be read as a number the result is a number, so a **Variant** holding 5 plus a **Variant** holding the text `"3"` is the **Double** 8, whereas `&` always joins. Two **Variant** values that hold text are joined by `+`.

A result that does not fit the type is widened rather than raising an error, up to a **Double**: a **Variant** holding the **Byte** 255 times itself is the **Long** 65,025. A **Double**, a **Currency** or a **Decimal** result that does not fit raises error 6. [Result types and promotion](../../Reference/Operators#variant-operands) has the rules for each operator.

```tb check_run
Dim a As Variant = 5
Dim b As Variant = "3"
Debug.Print a + b                   ' 8
Debug.Print TypeName(a + b)         ' Double
Debug.Print a & b                   ' 53
Debug.Print CVar("5") + CVar("3")   ' 53
Dim n As Variant = CByte(255)
Debug.Print TypeName(n * n)         ' Long
Debug.Print n * n                   ' 65025
```

## Arrays and objects

An array held in a **Variant** reports `vbArray` added to the type of its elements: `Array(1, 2)` holds an array of **Variant** (8,204), and an array of **Integer** assigned to a **Variant** is 8,194. `UBound` and `IsArray` work on the **Variant** directly. An object is stored with `Set`: `Set v = obj` makes `VarType` 9 and `TypeName` the name of the object's class, and `Set v = Nothing` leaves a **Variant** that still reports `vbObject`. Without `Set`, `v = obj` reads the object's default member instead.

```tb check_run
Dim v As Variant
Dim Numbers(1 To 2) As Integer
Dim Items As New Collection
v = Array(1, 2)
Debug.Print VarType(v)              ' 8204
Debug.Print TypeName(v)             ' Variant()
Debug.Print UBound(v)               ' 1
v = Numbers
Debug.Print VarType(v)              ' 8194
Set v = Items
Debug.Print TypeName(v)             ' Collection
Debug.Print IsObject(v)             ' True
```

## Example

This example adds up a list of values from a worksheet-like source, which can hold numbers, text that holds numbers, empty cells and missing data. A **Variant** takes each of them, and a test for **Null** keeps it from spoiling the total.

```tb check_run
Dim Total As Double
Dim Item As Variant
For Each Item In Array(10, "20", Null, Empty, 2.5)
    If IsNull(Item) Then
        Debug.Print "skipped a Null"
    Else
        Total = Total + Item
    End If
Next
Debug.Print Total
' Output:
' skipped a Null
' 32.5
```

## See Also

- [Data Types](../../Reference/Data-Types#variant) -- the summary of all fourteen intrinsic types
- [VarType](../Modules/Information/VarType), [TypeName](../Modules/Information/TypeName) -- the type a **Variant** holds
- [VbVarType](../Modules/Constants/VbVarType) -- the subtype constants
- [IsEmpty](../Modules/Information/IsEmpty), [IsNull](../Modules/Information/IsNull), [IsError](../Modules/Information/IsError), [IsArray](../Modules/Information/IsArray), [IsObject](../Modules/Information/IsObject) -- tests for what a **Variant** holds
- [CVar](../Modules/Conversion/CVar), [CVErr](../Modules/Conversion/CVErr) functions
- [Object](Object) type
- [Deftype](Deftype) statement
- [Variant operands](../../Reference/Operators#variant-operands) -- how operators treat a **Variant**
