---
title: CreateDetourAtFuncAddress
parent: Detours
permalink: /tB/Packages/Contributed/DetoursLib/Detours/CreateDetourAtFuncAddress
has_toc: false
---

# CreateDetourAtFuncAddress
{: .no_toc }

Detours the function at an address, and returns the address that calls the original function.

Syntax: **CreateDetourAtFuncAddress** ( *procAddress*, *newAddress* ) **As LongPtr**

*procAddress*
: *required* A **LongPtr**, the address of the function's code in the process, such as an address that the **GetProcAddress** API returns.

*newAddress*
: *required* A **LongPtr**, the address of the detour, usually **AddressOf** and the name of a procedure in a module. It must not be 0: unlike [**CreateDetourAtDLLEntry**](CreateDetourAtDLLEntry), this function does not check it, and passes it to SlimDetours as it is.

<!-- test: FuncAddressTests.CreateDetourAtFuncAddress_CallsGoToTheDetour, FuncAddressTests.CreateDetourAtFuncAddress_ReturnsAnAddressThatCallsTheOriginal -->
Returns the address of the trampoline, which calls the original function. It is not *procAddress*: after the call, a call to *procAddress* goes to the detour, and a call through the returned address runs the original. Keep the address for as long as the detour is in place, and pass it to [**RemoveDetour**](RemoveDetour) to remove the detour.
<!-- /test -->

The function places the detour with [**SlimDetoursInlineHook**](../DetoursMod/SlimDetoursInlineHook). It suits a function that **CreateDetourAtDLLEntry** cannot find by name: one that a DLL exports only by ordinal, a function of a DLL that the program loads with the **LoadLibrary** API and finds with **GetProcAddress** itself, or a method of a COM object, whose address is in the object's table of methods. [Errors](.#errors) lists the errors the function raises.

## Example

This module detours **Sleep** of `kernel32`, found by its address, so that every wait in the process is a tenth as long.

```tb check_build
Private DeclareWide PtrSafe Function GetModuleHandle Lib "kernel32" Alias "GetModuleHandleW" (ByVal lpModuleName As String) As LongPtr
Private Declare PtrSafe Function GetProcAddress Lib "kernel32" (ByVal hModule As LongPtr, ByVal lpProcName As String) As LongPtr

Private Delegate Sub SleepFn (ByVal dwMilliseconds As Long)
Private RealSleep As SleepFn

Private Sub MySleep(ByVal dwMilliseconds As Long)
    RealSleep(dwMilliseconds \ 10)
End Sub

Public Sub StartDetour()
    Dim target As LongPtr = GetProcAddress(GetModuleHandle("kernel32"), "Sleep")
    RealSleep = CType(Of SleepFn)(CreateDetourAtFuncAddress(target, AddressOf MySleep))
End Sub

Public Sub StopDetour()
    RemoveDetour RealSleep, AddressOf MySleep
End Sub
```

## See Also

- [CreateDetourAtDLLEntry](CreateDetourAtDLLEntry) function -- detours a function found by its name
- [RemoveDetour](RemoveDetour) procedure
- [Writing a detour](../#writing-a-detour)
