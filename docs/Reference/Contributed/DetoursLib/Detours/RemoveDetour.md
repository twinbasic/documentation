---
title: RemoveDetour
parent: Detours
permalink: /tB/Packages/Contributed/DetoursLib/Detours/RemoveDetour
has_toc: false
---

# RemoveDetour
{: .no_toc }

Removes a detour and puts the original function back.

Syntax: **RemoveDetour** *patchedAddress*, *newAddress*

*patchedAddress*
: *required* A **LongPtr**, the address that [**CreateDetourAtDLLEntry**](CreateDetourAtDLLEntry) or [**CreateDetourAtFuncAddress**](CreateDetourAtFuncAddress) returned when the detour was placed: the trampoline, not the function's own address. A variable of a **Delegate** type that holds it can be passed as it is.

*newAddress*
: *required* A **LongPtr**, the address of the detour, the same one that was passed when the detour was placed.

<!-- test: RemoveTests.RemoveDetour_RestoresTheFunction, RemoveTests.RemoveDetour_ThenCreateAgain_DetoursAgain -->
After the call, a call to the function runs the original code again and no longer reaches the detour. The trampoline is freed, so *patchedAddress* must not be called again, and a variable that holds it should be cleared. The function can then be detoured again.
<!-- /test -->

<!-- test: RemoveTests.RemoveDetour_AnotherDetour_RaisesAndLeavesTheDetourInPlace, RemoveTests.RemoveDetour_ZeroPatchedAddress_RaisesError5, RemoveTests.RemoveDetour_ZeroNewAddress_RaisesError5 -->
A *newAddress* other than the detour in place raises error &HD0000173, `RemoveDetour SlimDetoursInlineHook failed: D0000173`, and leaves the detour in place. An argument that is 0 raises error 5. [Errors](.#errors) lists the descriptions.
<!-- /test -->

*patchedAddress* is passed **ByVal**, so the procedure cannot give back the function's own address, which SlimDetours stores in its argument when it removes the detour. A program that needs that address after the detour is removed keeps its own copy, or calls [**SlimDetoursInlineHook**](../DetoursMod/SlimDetoursInlineHook) directly.

## Example

```tb check_build
Private Declare PtrSafe Function MulDiv Lib "kernel32" (ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long
Private Delegate Function MulDivFn (ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long
Private RealMulDiv As LongPtr

Private Function MyMulDiv(ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long
    Dim original As MulDivFn = CType(Of MulDivFn)(RealMulDiv)
    Return original(nNumber, nNumerator, nDenominator) + 1
End Function

Public Sub Demo()
    RealMulDiv = CreateDetourAtDLLEntry("kernel32", "MulDiv", AddressOf MyMulDiv)
    Debug.Print MulDiv(6, 4, 3)     ' 9, from MyMulDiv
    RemoveDetour RealMulDiv, AddressOf MyMulDiv
    RealMulDiv = 0
    Debug.Print MulDiv(6, 4, 3)     ' 8, from the original
End Sub
```

## See Also

- [CreateDetourAtDLLEntry](CreateDetourAtDLLEntry) function
- [CreateDetourAtFuncAddress](CreateDetourAtFuncAddress) function
- [Ending the program](../#ending-the-program) -- why every detour is removed before the program ends
