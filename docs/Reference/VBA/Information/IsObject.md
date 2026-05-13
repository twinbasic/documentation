---
title: IsObject
parent: Information Module
permalink: /tB/Modules/Information/IsObject
redirect_from:
-  /tB/Core/IsObject
vba_attribution: true
---
# IsObject
{: .no_toc }

Returns a **Boolean** indicating whether an identifier represents an object variable.

Syntax: **IsObject(** *identifier* **)**

*identifier*
: *required* A variable name.

**IsObject** is useful only for determining whether a **Variant** holds **VarType vbObject**. This is the case if the **Variant** actually references — or once referenced — an object, or if it contains **Nothing**.

**IsObject** returns **True** if *identifier* is a variable declared with **Object** type or any valid class type, or if *identifier* is a **Variant** of **VarType vbObject**, or a user-defined object; otherwise, it returns **False**.

**IsObject** returns **True** even if the variable has been set to **Nothing**. Use error trapping to be sure that an object reference is valid before dereferencing it.

> [!NOTE]
> twinBASIC also exposes a generic form, **IsObject(Of *T*)**, which is useful for compile-time verification of generic type specifiers. The non-generic call uses special internal bindings and so may not behave like a regular function.

### Example

This example uses **IsObject** to determine whether an identifier represents an object variable. *MyObject* and *YourObject* are object variables of the same type, used here for illustration.

```tb
Dim MyInt As Integer                  ' Declare variables.
Dim YourObject As Variant, MyCheck As Boolean
Dim MyObject As Object
Set YourObject = MyObject             ' Assign an object reference.
MyCheck = IsObject(YourObject)        ' Returns True.
MyCheck = IsObject(MyInt)             ' Returns False.
MyCheck = IsObject(Nothing)           ' Returns True.
MyCheck = IsObject(Empty)             ' Returns False.
MyCheck = IsObject(Null)              ' Returns False.
```

### See Also

- [VarType](VarType), [TypeName](TypeName) functions
- [IsArray](IsArray) function
