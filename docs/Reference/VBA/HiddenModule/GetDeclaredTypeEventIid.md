---
title: GetDeclaredTypeEventIid
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetDeclaredTypeEventIid
---
# GetDeclaredTypeEventIid
{: .no_toc }

Returns the IID of the COM event interface associated with a declared type, resolved at compile time.

Syntax: **GetDeclaredTypeEventIid(Of** *T* **)()** **As String**

*T*
: *required* The type to query for. Typically a coclass that exposes events via the **EventInterfaceId** attribute or imported from a type library.

The IID is returned in registry format (`{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}`). The lookup happens at compile time and the result is stored in the generated code as a string literal --- there is no run-time call.

Returns an empty string if the type has no associated event interface.

### See Also

- [GetDeclaredTypeIid](GetDeclaredTypeIid) function
- [GetDeclaredTypeProgId](GetDeclaredTypeProgId) function
- [GetDeclaredTypeClsid](GetDeclaredTypeClsid) function
