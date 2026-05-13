---
title: UDT Enhancements
parent: Language Syntax
nav_order: 11
permalink: /Features/Language/UDTs
---

# Enhancements to User-Defined Types (UDTs)

## Procedures, Constructors, Destructors, and Operators

You can now place methods inside UDTs, as well as API declarations. With APIs, if the first parameter is named `Me` and is the same type as the UDT, it's treated as an implicit member call:

```tb
Type HWND
   Value As LongPtr ' the raw HWND
   Public DeclareWide PtrSafe Function BringWindowToTop Lib "user32" (ByVal Me As HWND) As Long
End Type
'...
myHwnd.BringWindowToTop()
```

There is also a constructor (**Type_Initialize**), and destructor (**Type_Terminate**), assignment operator (**Type_Assignment**), type conversion operator (**Type_Conversion**), and debugger string operator (**Type_DebugView**). These make it possible to create lightweight objects, like a C++ class:

```tb
Type myType
    a As Long

    Private Sub Type_Initialize()
        ' NOTE: currently you can only access the UDT members using the "Me." prefix
    End Sub

    Private Sub Type_Assignment(ByVal RHS As Variant)    ' TIP: You can change the RHS type, and you can define multiple assignment functions
        ' NOTE: currently you can only access the UDT members using the "Me." prefix
    End Sub

    Private Function Type_Conversion() As Variant ' TIP: you can change the return type here, and you can define multiple conversion functions
        ' NOTE: currently you can only access the UDT members using the "Me." prefix
    End Function

    Private Function Type_DebugView() As String
        ' NOTE: currently you can only access the UDT members using the "Me." prefix
    End Function

    Private Sub Type_Terminate()
        ' NOTE: currently you can only access the UDT members using the "Me." prefix
    End Sub

End Type
```

UDTs of these types are still stack allocated structs that can be used with standard Win32 APIs.

## Custom UDT Packing

If you've done extensive work with the Windows API, every so often you'll come across user-defined types that have an extraneous member added called pad, padding, reserved, etc, that doesn't appear in the documentation for that type. This is the result of the UDT applying packing rules different from the default.

By default, UDTs have hidden spacing bytes that make their largest sized member appear at a multiple of it's size, and making the entire UDT be a multiple of that size. Consider the following UDT:

```tb
Private Type MyUDT
    x As Integer
    y As Long
    z As Integer
End Type
Private t As MyUDT
```

If you ask for `Len(t)`, you get 8-- the sum of 2x2-byte Integers and 1 4-byte Long. But if you ask for `LenB(t)`, you get 12. This is because the largest size type is 4, so that's the packing alignment number. Each Long must appear at a multiple of 4 bytes, so 2 byte of hidden padding is inserted between x and y. You can see this for yourself by checking `VarPtr(t.y) - VarPtr(t)`. This gives you the starting offset of `y`-- which is 4, not 2 like you'd get if it immediately followed `x`. Finally, with the hidden 2 bytes, we're now up to 10 bytes. But the total UDT size must be a multiple of 4, so 2 more hidden bytes are added on the end.

Some API UDTs will look like `MyUDT` is correct, but you'll see it defined in VBx as 2 Longs-- which gets the required 8 bytes, with some special handling for the first member. If you refer back to the original C/C++ header, you'll find, for this situation, something like `#include <pshpack1.h>` or `#pragma pack(push,1)` somewhere before the UDT. This manually alters the packing rule to insert no hidden bytes anywhere.

### [PackingAlignment] Attribute

twinBASIC normally aligns objects naturally within UDTs, e.g. an 8-byte object is aligned at the 8-byte boundary relative to the beginning of the UDT. This can leave gaps between UDT fields. A tighter packing can be achieved with a smaller **PackingAlignment**:

```tb
[PackingAlignment(2)]
Private Type MyUDT
    x As Integer
    y As Long
    z As Integer
End Type
Private t As MyUDT
Debug.Assert Len(t) = 8 And LenB(t) = 8
```

You'll now find that both `Len(t)` and `LenB(t)` are 8.

> [!NOTE]
> 
> Alignment, not packing alignment, is not set this way. Specifying 16 would not get you a 16-byte structure for `t`. twinBASIC does not currently have an equivalent for `__declspec_align(n)`, but such a feature is planned. This is rare outside kernel mode programming.
