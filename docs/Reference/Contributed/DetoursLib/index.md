---
title: DetoursLib Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - DetoursTest
indexed_from: 1.0.0.0
permalink: /tB/Packages/Contributed/DetoursLib/
---

# DetoursLib Package
{: .no_toc }

**Author:** WaynePhillipsEA. **Version:** 1.0.0.0. **On GitHub:** [KNSoft/KNSoft.SlimDetours](https://github.com/KNSoft/KNSoft.SlimDetours), the C library that the package wraps.

The **DetoursLib** contributed package detours a function of the program's own process: it replaces the first instructions of the function's code with a jump to a twinBASIC procedure, the *detour*, so that every call of the function goes to the detour instead. The detour can call the original function through an address the package returns, and can change the arguments, the result, or both. A detour of a Windows API function receives the calls the program makes through its own **Declare** statements, and the calls that other code in the process makes, a DLL's included. It does not affect any other process.

The package wraps **SlimDetours**, a C library based on Microsoft Detours, which is linked into the program with [**Import Library**](../../../../Features/Advanced/Static-Linking), so the program needs no DLL beside it. It works in 32-bit and 64-bit programs. Its source stops the compile with an error on a twinBASIC build older than BETA 1006. This section documents version 1.0.0.0, published under the MIT licence.

The package has two public modules:

- [**Detours**](Detours/) places and removes a detour: [**CreateDetourAtDLLEntry**](Detours/CreateDetourAtDLLEntry) detours a function of a loaded DLL, named by the DLL and the function, [**CreateDetourAtFuncAddress**](Detours/CreateDetourAtFuncAddress) detours the function at an address, and [**RemoveDetour**](Detours/RemoveDetour) puts the function back.
- [**DetoursMod**](DetoursMod/) declares [**SlimDetoursInlineHook**](DetoursMod/SlimDetoursInlineHook), the SlimDetours function that the three procedures call.

A third public module, **DetoursTest**, is the package's own demonstration. Its one public procedure, **TestDetours**, detours the **SetFocus** API of `user32`, calls it, removes the detour and calls it again, and shows each result in a message box. It is not part of the package's interface and is not documented further.

<!-- test: DllEntryTests.CreateDetourAtDLLEntry_CallsGoToTheDetour, DllEntryTests.CreateDetourAtDLLEntry_DetourCanPassCallsToTheOriginal, RemoveTests.RemoveDetour_RestoresTheFunction -->
This module detours **MulDiv** of `kernel32` so that a zero divisor gives 0 instead of -1, and passes every other call to the original function:

```tb check_build
Private Declare PtrSafe Function MulDiv Lib "kernel32" (ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long

' A delegate type with the signature of the function that is detoured.
Private Delegate Function MulDivFn (ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long

' The address that calls the original MulDiv, while the detour is in place.
Private RealMulDiv As MulDivFn

' The detour: the same parameters and result as MulDiv.
Private Function MyMulDiv(ByVal nNumber As Long, ByVal nNumerator As Long, ByVal nDenominator As Long) As Long
    If nDenominator = 0 Then Return 0
    Return RealMulDiv(nNumber, nNumerator, nDenominator)
End Function

Public Sub Demo()
    RealMulDiv = CType(Of MulDivFn)(CreateDetourAtDLLEntry("kernel32", "MulDiv", AddressOf MyMulDiv))
    Debug.Print MulDiv(10, 3, 0)     ' 0, from MyMulDiv
    Debug.Print MulDiv(10, 3, 2)     ' 15, from the original, called by MyMulDiv
    RemoveDetour RealMulDiv, AddressOf MyMulDiv
    Debug.Print MulDiv(10, 3, 0)     ' -1, from the original
End Sub
```
<!-- /test -->

## Writing a detour

A detour is a procedure in a module, passed with [**AddressOf**](../../../Core/AddressOf). It must take the same parameters, in the same order and of the same sizes, and return the same type as the function it replaces, because it receives the calls that were made to that function.

To call the original function, declare a [**Delegate**](../../../Core/Delegate) type with the same signature, and convert the address that **CreateDetourAtDLLEntry** or **CreateDetourAtFuncAddress** returns to it with [**CType**](../../../Modules/Conversion/CType). Calling the original from the detour is optional: a detour that does not call it replaces the function completely.

<!-- test: DelegateTests.Delegate_StringArgument_IsPassedAsUtf16 -->
A delegate passes a **String** argument as a pointer to UTF-16 text, as a **DeclareWide** statement does. That is right for the `W` functions of the Windows API, but an ANSI function, one whose name ends in `A`, reads the text as single bytes. To call the original of an ANSI function, declare its string parameters **As LongPtr** in the delegate, and pass the address of ANSI text.
<!-- /test -->

A detour that calls the original and then does more work can change the thread's last error, which the caller of the function may read with **GetLastError**. Such a detour reads the last error with **GetLastError** after the original returns, and sets it again with **SetLastError** before it returns itself.

## Errors

<!-- test: DllEntryTests.CreateDetourAtDLLEntry_DllNotLoaded_RaisesError5, DllEntryTests.CreateDetourAtDLLEntry_NoSuchFunction_RaisesError5, DllEntryTests.CreateDetourAtDLLEntry_NoDetour_RaisesError5, FuncAddressTests.CreateDetourAtFuncAddress_ZeroAddress_RaisesError5, RemoveTests.RemoveDetour_ZeroPatchedAddress_RaisesError5, RemoveTests.RemoveDetour_ZeroNewAddress_RaisesError5, RemoveTests.RemoveDetour_AnotherDetour_RaisesAndLeavesTheDetourInPlace -->
The three procedures of [**Detours**](Detours/) raise run-time error 5, *Invalid procedure call or argument*, for an argument that is 0 or names nothing, with a description that names the procedure and the argument. The one argument they do not check is the detour's address passed to **CreateDetourAtFuncAddress**. When SlimDetours itself refuses to place or remove a detour, they raise its result as the error number, an **HRESULT** with its top bit set, and the description is the procedure's name, `SlimDetoursInlineHook failed: ` and the number in hexadecimal. Either way the function is left as it was. [**Detours**](Detours/#errors) lists the errors.
<!-- /test -->

## Ending the program

Remove every detour with **RemoveDetour** before the program ends, or before the code of the detour is unloaded. A detour still in place jumps to the detour's code for as long as the process runs. A program run in the IDE runs in the IDE's own process, so while a detour is in place it also receives the calls that the IDE makes to that function.

## Modules

- [Detours](Detours/) -- places a detour on a function and removes it
  - [CreateDetourAtDLLEntry](Detours/CreateDetourAtDLLEntry) -- detours a function of a loaded DLL, found by its name
  - [CreateDetourAtFuncAddress](Detours/CreateDetourAtFuncAddress) -- detours the function at an address
  - [RemoveDetour](Detours/RemoveDetour) -- removes a detour and puts the function back
- [DetoursMod](DetoursMod/) -- the declaration of the SlimDetours function that the package calls
  - [SlimDetoursInlineHook](DetoursMod/SlimDetoursInlineHook) -- places or removes one detour, and returns an **HRESULT**

## See Also

- [Delegate Types](../../../../Features/Language/Delegates) -- calling a function through its address
- [Static Linking](../../../../Features/Advanced/Static-Linking) -- how the package links SlimDetours into the program
- [Declare](../../../Core/Declare) statement

## Test cases

The notes and warnings of this section are checked by the test cases in [DetoursLib-tests.twinproj](DetoursLib-tests.twinproj), a twinBASIC project. It uses DetoursLib as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
