---
title: GetDeclaredTypeIid
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetDeclaredTypeIid
---
# GetDeclaredTypeIid
{: .no_toc }

Returns the COM interface IID associated with a declared type, resolved at compile time.

Syntax: **GetDeclaredTypeIid(Of** *T* **)()** **As String**

*T*
: *required* The type to query for. Typically an interface declared with the **InterfaceId** attribute or imported from a type library.

The IID is returned in registry format (`{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}`). The lookup happens at compile time and the result is stored in the generated code as a string literal --- there is no run-time call.

Useful with any API that takes an interface ID as a string. [**vbaCastObj**](vbaCastObj) does not: it takes the address of a **GUID** structure.

### Example

```tb check_build
Debug.Print GetDeclaredTypeIid(Of stdole.IPicture)()    ' {7BF80980-BF32-101A-8BBB-00AA00300CAB}
```

### See Also

- [GetDeclaredTypeProgId](GetDeclaredTypeProgId) function
- [GetDeclaredTypeClsid](GetDeclaredTypeClsid) function
- [GetDeclaredTypeEventIid](GetDeclaredTypeEventIid) function
- [vbaCastObj](vbaCastObj) function
