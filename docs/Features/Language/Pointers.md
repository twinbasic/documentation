---
title: Enhanced Pointer Functionality
parent: Language Syntax
nav_order: 10
---

# Enhanced Pointer Functionality

twinBASIC provides several enhancements for working with pointers.

## CType(Of )

The `CType(Of <type>)` operator specifies an explicit intent to cast one type to another. This can be used for casting `LongPtr` (or `Long` on 32bit/`LongLong` on 64bit) to a custom user-defined type, with or without making a copy of it, depending on the usage. This allows not just for casting directly without a `CopyMemory` call, but also, setting the members of a UDT represented only by a pointer, without copying memory back and forth.

### Example

Consider the following UDTs:

```vb
Private Type foo
    a As Long
    b As Long
    pfizz As LongPtr 'A pointer to a variable of type fizz
End Type
Private Type bar
    pfoo As LongPtr 'A pointer to a variable of type foo
End Type
Private Type fizz
    c As Long
End Type
```

The following code examples work to manipulate the pointers:

```vb
Sub call1()
    Dim f As foo
    test1 VarPtr(f)
    Debug.Print f.a, f.b
End Sub

Sub test1(ByVal ptr As LongPtr)
    With CType(Of foo)(ptr)
        .a = 1
        .b = 2
    End With
End Sub
```

This will print `1  2`.

```vb
Sub call2()
    Dim f As foo, b As bar
    b.pfoo = VarPtr(f)
    test2 b
    Debug.Print f.a, f.b
End Sub

Sub test2(b As bar)
    With CType(Of foo)(b.pfoo)
        .a = 3
        .b = 4
    End With
End Sub
```

This will print `3  4`.

```vb
Sub call3()
    Dim f As foo, b As bar, z As fizz
    f.pfizz = VarPtr(z)
    b.pfoo = VarPtr(f)
    test3 b
    Debug.Print z.c
End Sub

Sub test3(b As bar)
    CType(Of fizz)(CType(Of foo)(b.pfoo).pfizz).c = 4
End Sub
```

This will print `4`. Free standing use and nesting is also allowed; the above will print `4`. While the examples here are local code only, this is particularly useful for APIs, where you're forced to work with pointers extensively.

## Substitute Pointers for UDTs

In both APIs and local methods, any argument taking a user-defined type can instead be passed a `ByVal LongPtr`, with the new special constant `vbNullPtr` used for a null pointer:

```vb
Public Declare PtrSafe Function CreateFileW Lib "kernel32" (ByVal lpFileName As LongPtr, ByVal dwDesiredAccess As Long, ByVal dwShareMode As Long, lpSecurityAttributes As SECURITY_ATTRIBUTES, ByVal dwCreationDisposition As Long, ByVal dwFlagsAndAttributes As Long, ByVal hTemplateFile As LongPtr) As LongPtr

hFile = CreateFileW(StrPtr("name"), 0, 0, ByVal vbNullPtr, '...)
'---or---
Dim pSec As SECURITY_ATTRIBUTES
Dim lPtr As LongPtr = VarPtr(pSec)
hFile = CreateFileW(StrPtr("name"), 0, 0, ByVal lPtr, '...)
```

## Len/LenB(Of <type>) Support

The classic `Len` and `LenB` functions can now be used to directly get the length/size of a type, both intrinsic and user-defined, without needing have declared a variable of that type. For instance, to know the pointer size, you can use `LenB(Of LongPtr)`.

## Improvements to AddressOf

`AddressOf` can be now be used on class/form/usercontrol members, including from outside the class by specifying the instance. Also, no need for `FARPROC`-type functions, you can use it like `Ptr = AddressOf Func`. So if you have class `CFoo` with member function `bar`, the following is valid:

```vb
Dim foo1 As New CFoo
Dim lpfn As LongPtr = AddressOf foo1.bar
```
