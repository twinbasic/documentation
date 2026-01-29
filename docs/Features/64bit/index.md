---
title: 64bit Compilation
parent: Features
nav_order: 8
---

# 64bit Compilation

twinBASIC can compile native 64bit executables in addition to 32bit. The syntax is compatible with VBA7 for this: the `LongPtr` data type and the standard to mark APIs `PtrSafe`.

## Example Syntax

```vb
Public Declare PtrSafe Sub foo Lib "bar" (ByVal hWnd As LongPtr)
```

## Important Considerations

> [!IMPORTANT]
> There is a lot more required to get most 32bit apps to work properly as 64bit. Only some `Long` variables are to be changed, and this is determined by their C/C++ data types, of which there are many. Examples that need to be `LongPtr` include handles like `HWND, HBITMAP, HICON,` and `HANDLE`; pointers like `void*, PVOID, ULONG_PTR, DWORD_PTR,` and `LPWSTR/PWSTR/LPCWSTR/WCHAR*` when passed as `Long`; and the `SIZE_T` type found in CopyMemory and memory allocation functions.

While the `PtrSafe` keyword is not mandatory, these changes still must be made. Additionally, any code working with memory pointers must account for the fact all the types mentioned (and the many more not), as well as v-table entries, are now either 4 or 8 bytes, when most programmers have traditionally hard coded 4 bytes. There are also UDT alignment issues more frequently. This is all very complex and you should seek resources and advice when moving to 64bit (though remember, 32bit is still supported so this isn't a requirement).

For common Windows APIs and COM interfaces, a community-developed package is available that provides 64bit compatible definitions: [Windows Development Library for twinBASIC (WinDevLib)](https://github.com/fafalone/WinDevLib).
