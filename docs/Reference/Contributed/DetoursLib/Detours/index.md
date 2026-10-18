---
title: Detours
parent: DetoursLib Package
permalink: /tB/Packages/Contributed/DetoursLib/Detours/
has_toc: false
---

# Detours module
{: .no_toc }

Places a detour on a function of the program's process, and removes it.

The module has three procedures and no state of its own. A detour is placed with [**CreateDetourAtDLLEntry**](CreateDetourAtDLLEntry), which finds the function by the names of its DLL and of the function, or with [**CreateDetourAtFuncAddress**](CreateDetourAtFuncAddress), which takes the function's address. Both return the address that calls the original function, its *trampoline*. [**RemoveDetour**](RemoveDetour) takes that address and the detour's, and puts the function back.

<!-- test: FuncAddressTests.CreateDetourAtFuncAddress_CallsGoToTheDetour, FuncAddressTests.CreateDetourAtFuncAddress_ReturnsAnAddressThatCallsTheOriginal, RemoveTests.RemoveDetour_RestoresTheFunction, RemoveTests.RemoveDetour_ThenCreateAgain_DetoursAgain -->
The trampoline holds a copy of the instructions that the detour replaced, followed by a jump to the rest of the function, so a call through it runs the original function. The program keeps it for as long as the detour is in place: the detour calls the original through it, and **RemoveDetour** needs it. After **RemoveDetour** the trampoline is freed, and the address must not be called again. A function whose detour was removed can be detoured again, with the same detour or another.

```tb check_build
Private Declare PtrSafe Function LoadLibrary Lib "kernel32" Alias "LoadLibraryW" (ByVal lpLibFileName As LongPtr) As LongPtr
Private Declare PtrSafe Function GetProcAddress Lib "kernel32" (ByVal hModule As LongPtr, ByVal lpProcName As String) As LongPtr

Private Delegate Function GetFileVersionInfoSizeFn (ByVal lptstrFilename As LongPtr, ByRef lpdwHandle As Long) As Long

Private RealSize As LongPtr
Private Calls As Long

Private Function MySize(ByVal lptstrFilename As LongPtr, ByRef lpdwHandle As Long) As Long
    Calls = Calls + 1
    Dim original As GetFileVersionInfoSizeFn = CType(Of GetFileVersionInfoSizeFn)(RealSize)
    Return original(lptstrFilename, lpdwHandle)
End Function

Public Sub CountVersionQueries()
    ' Find the function by its address, in a DLL loaded here.
    Dim hVersion As LongPtr = LoadLibrary(StrPtr("version.dll"))
    Dim target As LongPtr = GetProcAddress(hVersion, "GetFileVersionInfoSizeW")
    RealSize = CreateDetourAtFuncAddress(target, AddressOf MySize)

    ' ... code that reads version information ...

    RemoveDetour RealSize, AddressOf MySize
    RealSize = 0
    Debug.Print "GetFileVersionInfoSizeW was called"; Calls; "times"
End Sub
```
<!-- /test -->

## Errors

<!-- test: DllEntryTests.CreateDetourAtDLLEntry_DllNotLoaded_RaisesError5, DllEntryTests.CreateDetourAtDLLEntry_NoSuchFunction_RaisesError5, DllEntryTests.CreateDetourAtDLLEntry_NoDetour_RaisesError5, FuncAddressTests.CreateDetourAtFuncAddress_ZeroAddress_RaisesError5, RemoveTests.RemoveDetour_ZeroPatchedAddress_RaisesError5, RemoveTests.RemoveDetour_ZeroNewAddress_RaisesError5, RemoveTests.RemoveDetour_AnotherDetour_RaisesAndLeavesTheDetourInPlace -->
Each procedure checks its arguments first, and raises error 5 with one of these descriptions:

| Procedure | Description | When |
|---|---|---|
| **CreateDetourAtDLLEntry** | `CreateDetourAtDLLEntry newAddress: bad function address` | *newAddress* is 0 |
| **CreateDetourAtDLLEntry** | `CreateDetourAtDLLEntry libName: DLL library not found` | no DLL of that name is loaded in the process |
| **CreateDetourAtDLLEntry** | `CreateDetourAtDLLEntry funcName: function name not found in DLL library` | the DLL exports no function of that name |
| **CreateDetourAtFuncAddress** | `CreateDetourAtFuncAddress origAddress: bad function address` | *procAddress* is 0 |
| **RemoveDetour** | `RemoveDetour patchedAddress: bad pointer` | *patchedAddress* is 0 |
| **RemoveDetour** | `RemoveDetour newAddress: bad pointer` | *newAddress* is 0 |

When SlimDetours refuses the change, the procedure raises the **HRESULT** that [**SlimDetoursInlineHook**](../DetoursMod/SlimDetoursInlineHook) returned, a negative number, as the error number. The description is the procedure's name, `SlimDetoursInlineHook failed: ` and the number in hexadecimal: **RemoveDetour** given a detour other than the one in place raises &HD0000173 with the description `RemoveDetour SlimDetoursInlineHook failed: D0000173`. A refused call leaves the function as it was.
<!-- /test -->

## Procedures

- [CreateDetourAtDLLEntry](CreateDetourAtDLLEntry) -- detours a function of a loaded DLL, found by its name
- [CreateDetourAtFuncAddress](CreateDetourAtFuncAddress) -- detours the function at an address
- [RemoveDetour](RemoveDetour) -- removes a detour and puts the function back

## See Also

- [DetoursMod](../DetoursMod/) module -- the SlimDetours function these procedures call
- [DetoursLib Package](../) -- writing a detour, and the package's example
