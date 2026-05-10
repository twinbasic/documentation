---
title: GetDeclaredTypeClsid
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/GetDeclaredTypeClsid
---
# GetDeclaredTypeClsid
{: .no_toc }

Returns the COM CLSID (class identifier) associated with a declared type, resolved at compile time.

Syntax: **GetDeclaredTypeClsid(Of** *T* **)()** **As String**

*T*
: *required* The type to query for. Typically a coclass declared with the **CoClassId** attribute or imported from a type library.

The CLSID is returned in registry format (`{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}`). The lookup happens at compile time and the result is baked into the generated code as a string literal — there is no run-time call.

Returns an empty string if the type has no associated CLSID.

### See Also

- [GetDeclaredTypeProgId](GetDeclaredTypeProgId) function
- [GetDeclaredTypeIid](GetDeclaredTypeIid) function
- [GetDeclaredTypeEventIid](GetDeclaredTypeEventIid) function
