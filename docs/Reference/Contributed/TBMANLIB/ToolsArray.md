---
title: ToolsArray
parent: TBMANLIB Package
permalink: /tB/Packages/Contributed/TBMANLIB/ToolsArray
has_toc: false
---

# ToolsArray module
{: .no_toc }

Functions for arrays: the search for a value, tests for an empty array, copying a part of a **Byte** or **Long** array, and splitting a **Byte** array at a keyword. The functions that copy use the Windows function **RtlMoveMemory**. The module needs no other component.

```tb check_build check_run
Dim Data() As Byte
Dim Parts As Variant
Dim P() As Byte

Data = ToolsStr.ToBytes("a,b,c")
Parts = ToolsArray.SplitByteArrayByKeyword(Data, ",")
Debug.Print UBound(Parts) + 1
P = Parts(1)
Debug.Print ToolsStr.ToString(P)
' Output:
' 3
' b
```

The functions that copy or split a **Byte** or **Long** array work on arrays whose lower bound is 0: they use the position they are given as an index, without adding the lower bound. Positions are counted from 0, and an end position is included in the slice.

The module also holds four procedures that the author wrote to try the functions: **Test**, **TestSliceArray**, **TestSliceArray2** and **TestSplitArrayByKeyword**. They take no arguments and write to the Debug Console. A program has no use for them.

* TOC
{:toc}

## Functions

### DeArray
{: .no_toc }

Copies the elements of an array into separate variables.

Syntax: **ToolsArray.DeArray** ( *Arr* **,** *OutVars* )

*Arr*
: *required* A **Variant** that holds an array, such as the result of **Split**. It is not changed.

*OutVars*
: *required* Any number of variables, in a **ParamArray**. The first element of *Arr* is assigned to the first variable, the second element to the second variable, and so on. An argument that is left out, as in `a, , c`, is skipped, and its variable is not changed.

The copying stops at the last element of *Arr* or at the last variable, whichever comes first. The source says that an array whose lower bound is not 0 is not handled.

```tb check_build check_run
Dim a As String
Dim c As String
ToolsArray.DeArray Split("x/y/z", "/"), a, , c
Debug.Print a & c
' Output:
' xz
```

### Extend
{: .no_toc }

Unfinished. The source marks it with a note that means *to be continued*.

Syntax: **ToolsArray.Extend** ( *Vars* ) **=** *Value*

A property that is meant to assign the elements of the array *Value* to the elements of the array *Vars*. It assigns into the array *Vars* itself, so variables from which *Vars* was built, as in `Extend(Array(a, c)) = ...`, are not changed.

### FindByteArray
{: .no_toc }

Finds the position of one byte array inside another.

Syntax: **ToolsArray.FindByteArray** ( *Arr* **,** *Keyword* ) **As Long**

*Arr*
: *required* A **Byte** array, the bytes to search.

*Keyword*
: *required* A **Byte** array, the bytes to find.

Returns the position of the first place in *Arr* where all the bytes of *Keyword* follow one another, counted from the lower bound of *Arr*. Returns -1 if there is no such place. The comparison is exact, byte by byte.

```tb check_build check_run
Dim Hay() As Byte
Dim Needle() As Byte
Hay = ToolsStr.ToBytes("Hello-World")

Needle = ToolsStr.ToBytes("World")
Debug.Print ToolsArray.FindByteArray(Hay, Needle)
Needle = ToolsStr.ToBytes("xyz")
Debug.Print ToolsArray.FindByteArray(Hay, Needle)
' Output:
' 6
' -1
```

### GetArrayLength
{: .no_toc }

Returns the number of elements of an array.

Syntax: **ToolsArray.GetArrayLength** ( *Arr* ) **As Long**

*Arr*
: *required* An array of **Variant**, such as the result of **Array**. An array of another type, such as the **String** array that **Split** returns, is not accepted by the parameter.

Returns the upper bound less the lower bound, plus 1. An array that has not been dimensioned raises error 9.

```tb check_build check_run
Debug.Print ToolsArray.GetArrayLength(Array(10, 20, 30))
' Output:
' 3
```

### GetIndexByValue
{: .no_toc }

Finds the index of a value in an array.

Syntax: **ToolsArray.GetIndexByValue** ( *Arr* **,** *Value* ) **As Long**

*Arr*
: *required* A **Variant** that holds an array.

*Value*
: *required* A **String**, the value to find. Each element is compared with it by the `=` operator.

Returns the index of the first element that equals *Value*, in the numbering of the array, or -1 if there is none.

```tb check_build check_run
Debug.Print ToolsArray.GetIndexByValue(Array("a", "b", "c"), "b")
Debug.Print ToolsArray.GetIndexByValue(Array("a", "b", "c"), "z")
' Output:
' 1
' -1
```

### IsArrayEmpty
{: .no_toc }

Tests whether an array has no elements.

Syntax: **ToolsArray.IsArrayEmpty** ( *Arr* ) **As Boolean**

*Arr*
: *required* A **Variant** that holds an array.

Returns **True** when the lower bound of *Arr* is greater than its upper bound, as in `Array()`, and also when the bounds cannot be read, as for an array that has not been dimensioned.

```tb check_build check_run
Dim Empty1() As Long
Debug.Print ToolsArray.IsArrayEmpty(Empty1)
Debug.Print ToolsArray.IsArrayEmpty(Array())
Debug.Print ToolsArray.IsArrayEmpty(Array(1, 2))
' Output:
' True
' True
' False
```

### SliceByteArray
{: .no_toc }

Copies a part of a **Byte** array into a new array.

Syntax: **ToolsArray.SliceByteArray** ( *Arr* **,** *StartPos* [ **,** *EndPos* ] ) **As Byte()**

*Arr*
: *required* A **Byte** array whose lower bound is 0.

*StartPos*
: *required* A **Long**, the position of the first byte to copy.

*EndPos*
: *optional* A **Long**, the position of the last byte to copy, which is included. The default of -1 means the end of the array.

Returns a new **Byte** array, from 0, with the bytes from *StartPos* to *EndPos*. The positions are not checked against the array. The function copies with **RtlMoveMemory**, so a position outside the array makes it read memory that does not belong to the array.

> [!WARNING]
> When *EndPos* is equal to *StartPos*, the function does not return the one byte. It returns an array with one element, holding 0, as it does when *EndPos* is less than *StartPos*; the test in the source is a strict "less than". [**SliceLongArray**](#slicelongarray) does not have this error.

```tb check_build check_run
Dim Bytes() As Byte
Dim Part() As Byte
Bytes = ToolsStr.ToBytes("Hello-World")
Part = ToolsArray.SliceByteArray(Bytes, 2, 2)
Debug.Print UBound(Part) & " " & Part(0)
' Output:
' 0 0
```

```tb check_build check_run
Dim Bytes() As Byte
Dim Part() As Byte
Bytes = ToolsStr.ToBytes("Hello-World")

Part = ToolsArray.SliceByteArray(Bytes, 0, 4)
Debug.Print ToolsStr.ToString(Part)
Part = ToolsArray.SliceByteArray(Bytes, 6)
Debug.Print ToolsStr.ToString(Part)
' Output:
' Hello
' World
```

### SliceLongArray
{: .no_toc }

Copies a part of a **Long** array into a new array.

Syntax: **ToolsArray.SliceLongArray** ( *Arr* **,** *StartPos* [ **,** *EndPos* ] ) **As Long()**

*Arr*
: *required* A **Long** array whose lower bound is 0.

*StartPos*
: *required* A **Long**, the position of the first element to copy.

*EndPos*
: *optional* A **Long**, the position of the last element to copy, which is included. The default of -1 means the end of the array.

Returns a new **Long** array, from 0, with the elements from *StartPos* to *EndPos*. When *EndPos* is less than *StartPos*, the result is an array with one element holding 0. As for [**SliceByteArray**](#slicebytearray), the positions are not checked against the array.

```tb check_build check_run
Dim Longs() As Long
Dim Part() As Long
Dim i As Long

ReDim Longs(0 To 6)
For i = 0 To 6
    Longs(i) = (i + 1) * 10
Next

Part = ToolsArray.SliceLongArray(Longs, 2, 5)
Debug.Print UBound(Part) & " " & Part(0) & " " & Part(3)
' Output:
' 3 30 60
```

### SplitByteArray
{: .no_toc }

Splits a **Byte** array into two arrays at a position.

Syntax: **ToolsArray.SplitByteArray** ( *Arr* **,** *position* [ **,** *Offset* ] ) **As Variant**

*Arr*
: *required* A **Byte** array whose lower bound is 0.

*position*
: *required* A **Long**, the number of bytes in the first part.

*Offset*
: *optional* A **Long**, 0 by default, the number of bytes to leave out between the two parts: the second part starts at *position* + *Offset*.

Returns a **Variant** array of two elements. Element 0 is a **Byte** array of the first *position* bytes, and element 1 is a **Byte** array of the bytes from *position* + *Offset* to the end. If *position* is at or past the end of *Arr*, the first part is *Arr* and the second part is an array with one element holding 0. The second part is also that array when *position* + *Offset* is at or past the end.

```tb check_build check_run
Dim Bytes() As Byte
Dim Parts As Variant
Dim P() As Byte
Bytes = ToolsStr.ToBytes("one,two")

Parts = ToolsArray.SplitByteArray(Bytes, 3, 1)
P = Parts(0)
Debug.Print ToolsStr.ToString(P)
P = Parts(1)
Debug.Print ToolsStr.ToString(P)

Parts = ToolsArray.SplitByteArray(Bytes, 7)
P = Parts(1)
Debug.Print UBound(P) & " " & P(0)
' Output:
' one
' two
' 0 0
```

A *position* of 0 raises the error *Unspecified error* (-2147467259), because the first part would be dimensioned with an upper bound of -1.

### SplitByteArrayByKeyword
{: .no_toc }

Splits a **Byte** array at each place where a keyword occurs.

Syntax: **ToolsArray.SplitByteArrayByKeyword** ( *ByteArray* **,** *Keyword* [ **,** *SplitCount* ] ) **As Variant**

*ByteArray*
: *required* A **Byte** array whose lower bound is 0.

*Keyword*
: *required* A **Variant** that holds a **String**. It is converted to bytes with [**StringToByteArray**](#stringtobytearray), in the ANSI code page, and the bytes are searched for exactly.

*SplitCount*
: *optional* A **Long**, 0 by default. When it is greater than 0, the array is split at no more than that many occurrences, and the rest of the array is the last part.

Returns a **Variant** array, from 0, of **Byte** arrays: the parts between the occurrences of the keyword, in order. The keyword itself is in none of them. If the keyword does not occur, there is one part, a copy of the array. A keyword at the very end leaves a last part that is an array with one element holding 0, and not an empty array. A keyword at the very start raises the error of a *position* of 0 in [**SplitByteArray**](#splitbytearray), *Unspecified error* (-2147467259).

```tb check_build check_run
Dim Bytes() As Byte
Dim Parts As Variant
Dim P() As Byte

Bytes = ToolsStr.ToBytes("a,")
Parts = ToolsArray.SplitByteArrayByKeyword(Bytes, ",")
P = Parts(1)
Debug.Print (UBound(Parts) + 1) & " " & UBound(P) & " " & P(0)

Bytes = ToolsStr.ToBytes(",a")
On Error Resume Next
Parts = ToolsArray.SplitByteArrayByKeyword(Bytes, ",")
Debug.Print Err.Number
' Output:
' 2 0 0
' -2147467259
```

```tb check_build check_run
Dim Data() As Byte
Dim Parts As Variant
Dim P() As Byte

Data = ToolsStr.ToBytes("a,b,c")
Parts = ToolsArray.SplitByteArrayByKeyword(Data, ",", 1)
P = Parts(1)
Debug.Print ToolsStr.ToString(P)
' Output:
' b,c
```

### StringToByteArray
{: .no_toc }

Converts a string to a byte array in the ANSI code page.

Syntax: **ToolsArray.StringToByteArray** ( *St* ) **As Byte()**

*St*
: *required* A **String**.

Returns the bytes of *St* in the ANSI code page of the system, one byte for each character of a single-byte code page, with **StrConv** and **vbFromUnicode**. A character that the code page does not have is not kept as written. To get UTF-8 bytes, use [**ToolsUtf8.Encode**](ToolsUtf8#encode).

```tb check_build check_run
Debug.Print UBound(ToolsArray.StringToByteArray("abc"))
' Output:
' 2
```

## See Also

- [cToolsStr](cToolsStr) class -- **ToBytes**, **ToString** and **ToHex**, which convert between strings and byte arrays
- [ToolsUtf8](ToolsUtf8) module -- UTF-8 conversion
- [Split](../../../Modules/Strings/Split) function -- splits a string
- [TBMANLIB](.) package -- overview
