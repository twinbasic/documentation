---
title: hInstance
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/hInstance
has_toc: false
---
# hInstance
{: .no_toc }

Returns the instance handle of the running executable or DLL. Read-only.

Syntax: **App**.**hInstance** **As LongPtr**

Returns a **LongPtr** holding the `HINSTANCE` of the current process module. This is the same value that the Win32 API `GetModuleHandle(NULL)` returns for an EXE, or the `HINSTANCE` passed to `DllMain` for a DLL. Pass it to Win32 API functions that require an instance handle, such as `LoadIcon`, `LoadCursor`, `CreateWindow`, or `RegisterClass`.

> [!NOTE]
>
> **hInstance** returns a **LongPtr**, which is 32 bits wide in a 32-bit build and 64 bits wide in a 64-bit build. Declare any Win32 API parameter that receives it as **LongPtr** to keep the project portable across both targets.

### Example

This example passes the application instance handle to the Win32 `LoadIcon` API.

```tb
Private Declare PtrSafe Function LoadIcon Lib "user32" Alias "LoadIconA" ( _
    ByVal hInstance As LongPtr, _
    ByVal lpIconName As String) As LongPtr

Private Sub Form_Load()
    Dim hIcon As LongPtr
    hIcon = LoadIcon(App.hInstance, "MY_ICON")
End Sub
```

### See Also

- [EXEName](EXEName) property
- [Path](Path) property
