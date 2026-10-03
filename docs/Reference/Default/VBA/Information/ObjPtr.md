---
title: ObjPtr
parent: Information Module
permalink: /tB/Modules/Information/ObjPtr
redirect_from:
  - /tB/Modules/HiddenModule/ObjPtr
---
# ObjPtr
{: .no_toc }

Returns the interface pointer an object variable holds, as a **LongPtr**.

Syntax: **ObjPtr(** *Object* **)**

*Object*
: *required* The object reference whose pointer is to be obtained.

The returned value is the pointer of the interface the variable is declared as. Variables of the class's own type, **Object** variables and **stdole.IUnknown** variables that hold one object give the same value. A variable of an interface type that the class implements gives a different value, the pointer of that interface. None of them is the identity pointer that [**QueryInterface**](../../../Reference/COM-Interfaces/IUnknown#queryinterface) returns for **IUnknown**. **ObjPtr** of **Nothing** is 0.

To test whether two variables refer to one object, use the [**Is**](../../Core/Is) operator. A comparison of **ObjPtr** values is reliable only between variables declared with the same type.

The pointer is valid only as long as the underlying object stays alive; nothing about taking **ObjPtr** holds a reference. Pass the result to API functions that need a raw object address, but do not assume it remains meaningful after the last reference is released.

### Example

```tb check_build
Dim a As Collection
Dim b As Collection
Set a = New Collection
Set b = a
Debug.Print ObjPtr(a) = ObjPtr(b)   ' True: the same instance

Set b = New Collection
Debug.Print ObjPtr(a) = ObjPtr(b)   ' False: different instances
```

### See Also

- [IUnknown](../../../Reference/COM-Interfaces/IUnknown) interface -- object identity in COM
- [Is](../../Core/Is) operator
- [StrPtr](StrPtr) function
- [VarPtr](VarPtr) function
