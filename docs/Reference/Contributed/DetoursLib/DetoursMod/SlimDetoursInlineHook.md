---
title: SlimDetoursInlineHook
parent: DetoursMod
permalink: /tB/Packages/Contributed/DetoursLib/DetoursMod/SlimDetoursInlineHook
has_toc: false
---

# SlimDetoursInlineHook
{: .no_toc }

Places or removes one detour, and returns an **HRESULT**.

Syntax: **SlimDetoursInlineHook** ( *bEnable*, *ppPointer*, *pDetour* ) **As Long**

*bEnable*
: *required* A **Long**: 1 to place the detour, 0 to remove it.

*ppPointer*
: *required* A **LongPtr** variable, passed **ByRef**. To place a detour, it holds the address of the function's code; to remove one, the trampoline that placing it stored there. The function changes it when it succeeds.

*pDetour*
: *required* A **LongPtr**, the address of the detour.

<!-- test: InlineHookTests.SlimDetoursInlineHook_Enable_SucceedsAndStoresTheTrampoline, InlineHookTests.SlimDetoursInlineHook_Disable_StoresTheFunctionAgain, InlineHookTests.SlimDetoursInlineHook_FailureIsANegativeHResult -->
Returns an **HRESULT** that SlimDetours makes from a Windows **NTSTATUS** code. Success is not 0: it is &H10000000, an **HRESULT** with only its facility bit for **NTSTATUS** codes set. A failure is a negative number, such as &HD0000173 for a removal whose *pDetour* is not the detour in place. So test the result with `>= 0` for success and `< 0` for failure, as the [**Detours**](../Detours/) procedures do.

When it places a detour, the function stores the trampoline, the address that calls the original function, in *ppPointer*. When it removes one, it frees the trampoline and stores the address of the function's code in *ppPointer* again. When it fails, it leaves *ppPointer* and the function as they were.
<!-- /test -->

SlimDetours changes the code with the process's other threads suspended, and moves a thread that was in the middle of the replaced instructions, so the change is safe while other threads run.

## Example

```tb check_build
Private Declare PtrSafe Function MulDiv Lib "kernel32" (ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long
Private DeclareWide PtrSafe Function GetModuleHandle Lib "kernel32" Alias "GetModuleHandleW" (ByVal lpModuleName As String) As LongPtr
Private Declare PtrSafe Function GetProcAddress Lib "kernel32" (ByVal hModule As LongPtr, ByVal lpProcName As String) As LongPtr
Private Delegate Function MulDivFn (ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long

Private pMulDiv As LongPtr

Private Function MyMulDiv(ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long
    Dim original As MulDivFn = CType(Of MulDivFn)(pMulDiv)
    Return original(nNumber, nNumerator, nDenominator) + 1
End Function

Public Sub Demo()
    pMulDiv = GetProcAddress(GetModuleHandle("kernel32"), "MulDiv")
    Dim hr As Long = SlimDetoursInlineHook(1, pMulDiv, AddressOf MyMulDiv)
    If hr < 0 Then
        Debug.Print "Not placed: &H"; Hex(hr)
        Exit Sub
    End If
    Debug.Print MulDiv(6, 4, 3)     ' 9, from MyMulDiv
    hr = SlimDetoursInlineHook(0, pMulDiv, AddressOf MyMulDiv)
    Debug.Print MulDiv(6, 4, 3)     ' 8, from the original
End Sub
```

## See Also

- [CreateDetourAtFuncAddress](../Detours/CreateDetourAtFuncAddress) function -- the same, with its result turned into an error
- [RemoveDetour](../Detours/RemoveDetour) procedure
