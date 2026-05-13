---
title: IsArrayInitialized
parent: Information Module
permalink: /tB/Modules/Information/IsArrayInitialized
---
# IsArrayInitialized
{: .no_toc }

Returns a **Boolean** indicating whether a variable contains an array whose dimensions have been allocated.

Syntax: **IsArrayInitialized(** *varname* **)**

*varname*
: *required* The array variable to test.

A dynamic array declared with empty parentheses (`Dim a() As Long`) holds a special "uninitialized" state until **ReDim** allocates storage for it. **IsArrayInitialized** returns **False** in that state and **True** once the array has dimensions. Calling [**LBound**](LBound) or [**UBound**](UBound) on an uninitialized array, or accessing any of its elements, raises a run-time error — so **IsArrayInitialized** is the safe way to test before reading.

If *varname* is not an array, **IsArrayInitialized** returns **False**.

### Example

This example tests an array before and after **ReDim**, and again after **Erase** releases its storage.

```tb
Dim a() As Long
Debug.Print IsArrayInitialized(a)     ' False — declared but unsized.
ReDim a(0 To 9)
Debug.Print IsArrayInitialized(a)     ' True — dimensions allocated.
Erase a
Debug.Print IsArrayInitialized(a)     ' False — Erase released the storage.
```

### See Also

- [IsArray](IsArray) function
- [LBound](LBound), [UBound](UBound) functions
