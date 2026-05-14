---
title: ObjPtr
parent: Information Module
permalink: /tB/Modules/Information/ObjPtr
redirect_from:
  - /tB/Modules/HiddenModule/ObjPtr
---
# ObjPtr
{: .no_toc }

Returns the COM-identity address of an object as a **LongPtr**.

Syntax: **ObjPtr(** *Object* **)**

*Object*
: *required* The object reference whose pointer is to be obtained. The argument is taken as **IUnknown**.

The returned value is the address of the object's **IUnknown** vtable — the same value the COM runtime uses to test object identity. Two **Object** variables refer to the same instance if and only if their **ObjPtr** values are equal.

The pointer is valid only as long as the underlying object stays alive; nothing about taking **ObjPtr** holds a reference. Pass the result to API functions that need a raw object address, or store it for an identity check, but do not assume it remains meaningful after the last reference is released.

### Example

```tb
Dim a As Collection
Dim b As Collection
Set a = New Collection
Set b = a
Debug.Print ObjPtr(a) = ObjPtr(b)   ' True — same instance.

Set b = New Collection
Debug.Print ObjPtr(a) = ObjPtr(b)   ' False — different instances.
```

### See Also

- [StrPtr](StrPtr) function
- [VarPtr](VarPtr) function
