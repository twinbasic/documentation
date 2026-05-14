---
title: Emit
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/Emit
---
# Emit
{: .no_toc }

Splices raw bytes into the codegen output of the enclosing procedure.

Syntax: **Emit** *Values* ...

*Values*
: *required* A **ParamArray** of **Byte** values that are emitted, in order, at the location of the call.

The bytes are written into the procedure's machine code at the spot where **Emit** appears --- there is no run-time call. Used together with the **Naked** procedure modifier to write inline assembly.

### Example

A naked **InterlockedIncrement** that adds one to *Addend* atomically.

```tb
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

### See Also

- [EmitAny](EmitAny) procedure
- [Direct Assembly Insertion](../../../Features/Advanced/Assembly)
- [StackOffset](StackOffset) function
