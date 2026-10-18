---
title: CreateDetourAtDLLEntry
parent: Detours
permalink: /tB/Packages/Contributed/DetoursLib/Detours/CreateDetourAtDLLEntry
has_toc: false
---

# CreateDetourAtDLLEntry
{: .no_toc }

Detours a function of a loaded DLL, found by the names of the DLL and the function, and returns the address that calls the original function.

Syntax: **CreateDetourAtDLLEntry** ( *libName*, *funcName*, *newAddress* ) **As LongPtr**

*libName*
: *required* A **String**, the name of a DLL that the process has already loaded, such as `"user32"` or `"user32.dll"`. A name without an extension means a `.dll` file.

*funcName*
: *required* A **String**, the name under which the DLL exports the function, such as `"SetFocus"` or `"MessageBoxW"`. The name is case-sensitive.

*newAddress*
: *required* A **LongPtr**, the address of the detour, usually **AddressOf** and the name of a procedure in a module.

<!-- test: DllEntryTests.CreateDetourAtDLLEntry_CallsGoToTheDetour, DllEntryTests.CreateDetourAtDLLEntry_ReturnsAnAddressThatCallsTheOriginal, DllEntryTests.CreateDetourAtDLLEntry_DetourCanPassCallsToTheOriginal, DllEntryTests.CreateDetourAtDLLEntry_NameWithExtension_IsAccepted -->
Returns the address of the trampoline, which calls the original function. It is not the function's own address: a call to the function goes to the detour, and a call through the returned address runs the original. Keep the address for as long as the detour is in place, convert it to a [**Delegate**](../../../../Core/Delegate) type to call the original, and pass it to [**RemoveDetour**](RemoveDetour) to remove the detour.
<!-- /test -->

The function finds the DLL with the **GetModuleHandle** API and the function with **GetProcAddress**, then places the detour with [**SlimDetoursInlineHook**](../DetoursMod/SlimDetoursInlineHook), as [**CreateDetourAtFuncAddress**](CreateDetourAtFuncAddress) does. It does not load the DLL.

<!-- test: DllEntryTests.CreateDetourAtDLLEntry_DllNotLoaded_RaisesError5 -->
> [!NOTE] 1.0.0.0
> The DLL must already be loaded in the process, or the function raises error 5, `CreateDetourAtDLLEntry libName: DLL library not found`. To detour a function of a DLL that may not be loaded yet, load the DLL first with the **LoadLibrary** API.

[Errors](.#errors) lists the errors the function raises.

## Example

This module detours **SetFocus** of `user32` so that the program can see which window each call gives the focus to.

```tb check_build
Private Delegate Function SetFocusFn (ByVal hWnd As LongPtr) As LongPtr
Private RealSetFocus As SetFocusFn

Private Function MySetFocus(ByVal hWnd As LongPtr) As LongPtr
    Debug.Print "SetFocus &H"; Hex(hWnd)
    Return RealSetFocus(hWnd)
End Function

Public Sub WatchFocus()
    RealSetFocus = CType(Of SetFocusFn)(CreateDetourAtDLLEntry("user32", "SetFocus", AddressOf MySetFocus))
End Sub

Public Sub StopWatchingFocus()
    RemoveDetour RealSetFocus, AddressOf MySetFocus
End Sub
```

## See Also

- [CreateDetourAtFuncAddress](CreateDetourAtFuncAddress) function -- detours the function at an address
- [RemoveDetour](RemoveDetour) procedure
- [Writing a detour](../#writing-a-detour)
