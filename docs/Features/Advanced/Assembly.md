---
title: Direct Assembly Insertion
parent: Advanced Features
nav_order: 2
---

# Emit() and Naked Functions

Raw bytecode can be inserted into a binary with tB's `Emit()` function. To support this, functions can be marked as `Naked` to remove hidden tB code.

## Example

For example, the following is an implementation of the InterlockedIncrement compiler intrinsic that replaces the API in Microsoft C/C++ (adds one to `Addend` and returns the result, as an atomic operation which isn't guaranteed with regular code):

```vb
Public Function InlineInterlockedIncrement CDecl Naked(Addend As Long) As Long
    #If Win64 Then
        Emit(&Hb8, &H01, &H00, &H00, &H00) ' mov    eax,0x1
        Emit(&Hf0, &H0f, &Hc1, &H41, &H00) ' lock xadd DWORD PTR [rcx+0x4],eax
        Emit(&Hff, &Hc0)                   ' inc    eax
        Emit(&Hc3)                         ' ret
    #Else
        Emit(&H8b, &H4c, &H24, &H04)       ' mov     ecx, DWORD PTR _Addend$[esp-4]
        Emit(&Hb8, &H01, &H00, &H00, &H00) ' mov     eax, 1
        Emit(&Hf0, &H0f, &Hc1, &H01)       ' lock xadd DWORD PTR [ecx], eax
        Emit(&H40)                         ' inc     eax
        Emit(&Hc3)                         ' ret     0
    #End If
End Function
```

(Note: The `CDecl` calling convention is optional; you can write x86 assembly using `_stdcall` and simply omit the notation.)
