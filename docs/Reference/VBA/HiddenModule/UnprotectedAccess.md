---
title: UnprotectedAccess
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/UnprotectedAccess
---
# UnprotectedAccess
{: .no_toc }

Returns a reference to a value that bypasses the usual access checks on private members.

Syntax: **UnprotectedAccess(** *Variable* **)** **As Object**

*Variable*
: *required* The value to wrap. The value passed is taken **As Any** so the call works for any type.

The returned object exposes *Variable*'s members — including **Private** and **Friend** ones — without triggering the access enforcement that the compiler ordinarily applies. Useful for testing, serialization, and other reflection-style scenarios that legitimately need to reach inside an encapsulation boundary.

> [!WARNING]
> Use this function sparingly. Bypassing access protection makes the surrounding code coupled to the target type's private layout, which is by definition not a stable API.

### See Also

- [GetDeclaredTypeIid](GetDeclaredTypeIid) function
