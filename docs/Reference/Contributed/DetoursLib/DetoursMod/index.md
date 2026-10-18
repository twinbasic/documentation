---
title: DetoursMod
parent: DetoursLib Package
permalink: /tB/Packages/Contributed/DetoursLib/DetoursMod/
has_toc: false
---

# DetoursMod module
{: .no_toc }

Declares the SlimDetours function that the package calls.

The module holds one **Declare** statement, [**SlimDetoursInlineHook**](SlimDetoursInlineHook), for the function of the SlimDetours library that places or removes one detour. The library is linked into the program with [**Import Library**](../../../../../Features/Advanced/Static-Linking): `KNSoft.SlimDetours_X64.lib` in a 64-bit build and `KNSoft.SlimDetours_X86.lib` in a 32-bit one, which are files of the package. The statement is **Public**, so a program can call the function directly.

The procedures of the [**Detours**](../Detours/) module call it, check its result and raise an error when it fails. A program that calls it directly checks the result itself.

## Functions

- [SlimDetoursInlineHook](SlimDetoursInlineHook) -- places or removes one detour, and returns an **HRESULT**

## See Also

- [Detours](../Detours/) module
- [SlimDetours on GitHub](https://github.com/KNSoft/KNSoft.SlimDetours) -- the library's source and documentation
