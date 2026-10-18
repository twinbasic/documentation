---
title: LongPtr
parent: Data Types
grand_parent: Reference Section
nav_order: 6
permalink: /tB/Core/LongPtr
vba_attribution: true
---

# LongPtr
{: .no_toc }

A signed integer as wide as a pointer: a **Long** in a 32-bit build and a **LongLong** in a 64-bit build.

Syntax:

- [**Dim**](Dim) *varname* **As LongPtr** [ **=** *expression* ]
- [**DefLngPtr**](Deftype) *letterrange*

A **LongPtr** variable is declared **As LongPtr**. [**DefLngPtr**](Deftype) makes **LongPtr** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. **LongPtr** has no type-declaration character. A **LongPtr** that is not given a value holds 0.

Use **LongPtr** for pointers and handles: window handles, memory addresses, and the parameters and results of API functions that take them. The same source then builds for 32-bit and 64-bit targets.

## Storage and range

A **LongPtr** is 4 bytes in a 32-bit build, with the range of a **Long**, and 8 bytes in a 64-bit build, with the range of a **LongLong**. It is not a type of its own at run time: [**TypeName**](../Modules/Information/TypeName) gives `Long` in a 32-bit build and `LongLong` in a 64-bit one, and [**VarType**](../Modules/Information/VarType) gives **vbLong** (3) or **vbLongLong** (20). There is no **vbLongPtr** constant. A **Variant** that holds a **LongPtr** holds a **Long** or a **LongLong**.

The constant `vbPtrSize` is the size of a pointer in the build, 4 or 8, and [**VarPtr**](../Modules/Information/VarPtr), [**StrPtr**](../Modules/Information/StrPtr) and [**ObjPtr**](../Modules/Information/ObjPtr) return a **LongPtr**.

```tb check_run
Dim Ptr As LongPtr
Dim Value As Long = 42
Debug.Print Ptr                     ' 0
Debug.Print LenB(Ptr) = vbPtrSize   ' True
Debug.Print TypeName(Ptr) = IIf(vbPtrSize = 8, "LongLong", "Long") ' True
Ptr = VarPtr(Value)
Debug.Print Ptr <> 0                ' True
```

## Literals

There is no **LongPtr** literal and no type-declaration character. Assign a number or the result of a pointer function, or convert with [**CLngPtr**](../Modules/Conversion/CLngPtr): `Dim Ptr As LongPtr = 5`.

## Conversions

[**CLngPtr**](../Modules/Conversion/CLngPtr) converts an expression to a **LongPtr**, and so does assigning one to a **LongPtr** variable. A value outside the range raises error 6, *Overflow*, and the range depends on the build: `CLngPtr(2147483648#)` raises it in a 32-bit build and returns 2,147,483,648 in a 64-bit one.

A **LongPtr** variable assigned to a **Long** variable, as `Size = Ptr`, compiles in a 32-bit build and is refused in a 64-bit build with *TB5001*, because a **LongLong** does not narrow implicitly to a **Long**. Write `CLng(Ptr)` where a 32-bit value is wanted, which raises error 6 in a 64-bit build when the address does not fit.

## Arithmetic

Arithmetic on a **LongPtr** follows the type it stands for in the build: **Long** in a 32-bit build and **LongLong** in a 64-bit one. Adding a **Long** to a **LongPtr** gives a **LongPtr**, so `Ptr + 4` can step a pointer by 4 bytes, and a result that does not fit raises error 6. See [Result types and promotion](../../Reference/Operators#result-types-and-promotion).

## LongPtr in Declare statements

A [**Declare**](Declare) statement that is to work in both builds is written with the `PtrSafe` keyword, and declares every pointer and handle **As LongPtr**, as the example below does.

> [!NOTE]
> VB6 has no **LongPtr**: a VB6 **Declare** passes handles and pointers as **Long**.

## Example

This example declares a Win32 function that returns the handle of a window, and the one that copies memory. The same code builds for 32-bit and 64-bit: the handle and the address are **LongPtr**, and the length is the pointer-sized `SIZE_T`.

```tb check_build slot=module
Private Declare PtrSafe Function GetForegroundWindow Lib "user32" () As LongPtr
Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" _
    (ByVal Destination As LongPtr, ByVal Source As LongPtr, ByVal Length As LongPtr)

Public Function CopyLong(ByVal Source As Long) As Long
    CopyMemory VarPtr(CopyLong), VarPtr(Source), LenB(Source)
End Function

Public Function IsAnyWindowActive() As Boolean
    IsAnyWindowActive = GetForegroundWindow() <> 0
End Function
```

## See Also

- [Data Types](../../Reference/Data-Types#longptr) -- the summary of all fourteen intrinsic types
- [Long](Long), [LongLong](LongLong) -- the types a **LongPtr** stands for
- [CLngPtr](../Modules/Conversion/CLngPtr) function
- [Declare](Declare) statement
- [Deftype](Deftype) statement
- [New Data Types](../../Features/Language/Data-Types) -- the new types in twinBASIC
