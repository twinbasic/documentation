---
title: Object
parent: Data Types
grand_parent: Reference Section
nav_order: 14
permalink: /tB/Core/Object
vba_attribution: true
---

# Object
{: .no_toc }

A reference to any object, whose members are looked up when the program runs.

Syntax:

- [**Dim**](Dim) *varname* **As Object**
- [**Set**](Set) *varname* **=** *objectexpression*
- [**DefObj**](Deftype) *letterrange*

An **Object** variable is declared **As Object**. [**DefObj**](Deftype) makes **Object** the default type of the variables, parameters and functions whose names start with the letters in *letterrange*. **Object** has no type-declaration character. An **Object** variable that is not given a value holds **Nothing**.

An **Object** variable can refer to an object of any class, from a twinBASIC class, a control or a COM component such as `Scripting.Dictionary`. Declaring a variable with a specific class or interface type instead, `Dim Items As Collection`, lets the compiler check the member names when it compiles the program. [**VarType**](../Modules/Information/VarType) of an object variable is **vbObject** (9), and [**TypeName**](../Modules/Information/TypeName) gives the name of the object's class, or `Nothing`.

## Storage and range

An **Object** variable holds a reference to an object, not the object. It takes 4 bytes in a 32-bit build and 8 bytes in a 64-bit build. Two variables can refer to the same object; [**ObjPtr**](../Modules/Information/ObjPtr) gives the address of the object a variable refers to, 0 for **Nothing**.

```tb check_run
Dim Item As Object
Debug.Print TypeName(Item)          ' Nothing
Debug.Print VarType(Item) = vbObject ' True
Debug.Print Item Is Nothing         ' True
Debug.Print ObjPtr(Item)            ' 0
Set Item = New Collection
Debug.Print TypeName(Item)          ' Collection
Debug.Print Item Is Nothing         ' False
Debug.Print IsObject(Item)          ' True
```

## Literals

**Nothing** is the only **Object** literal: it is a reference to no object. An object is made with [**New**](New), or by a function such as `CreateObject`.

## Assigning

An object reference is assigned with [**Set**](Set): `Set Item = New Collection`. Without `Set` the assignment goes to the object's default member instead, and fails with error 91, *Object variable or With block variable not set*, when the variable is **Nothing**. `Set Item = Nothing` releases the reference.

[**Is**](Is) compares two references and tells whether they refer to the same object: `A Is B`, and `A Is Nothing` for a variable with no object.

A reference can be assigned to a variable of a more specific type, `Set Items = Item`, which checks that the object supports that type.

> [!NOTE] BETA 1010
> Assigning an object to a variable of a class or interface it does not support raises the error -2147467262, the **HRESULT** `E_NOINTERFACE`, *No such interface supported*. VB6 raises error 13, *Type mismatch*. Test the object first with `If TypeOf Item Is Collection Then`, or have the handler accept both numbers.

## Late binding
{: index_also="late binding" }

The members of an **Object** variable are not known when the program is compiled. Each call is looked up by name through **IDispatch** when the statement runs, which is *late binding* ([**IDispatch**](../../Reference/COM-Interfaces/IDispatch#late-binding-in-twinbasic) describes it). A member that the object does not have raises error 438, *Object doesn't support this property or method*, at that moment, and a member called on **Nothing** raises error 91. A variable declared with a specific class is bound when the program is compiled, and a member the class does not have is a compile error.

```tb check_run
Dim Table As Object
Dim Count As Long
Set Table = CreateObject("Scripting.Dictionary")
Table.Add "first", 1
Debug.Print Table.Count             ' 1
Debug.Print Table("first")          ' 1
On Error Resume Next
Table.NoSuchMember
Debug.Print Err.Number              ' 438
Err.Clear
Set Table = Nothing
Count = Table.Count
Debug.Print Err.Number              ' 91
```

## Example

This example keeps a dictionary in an **Object** variable and tells whether two variables refer to the same dictionary.

```tb check_run
Dim A As Object
Dim B As Object
Set A = CreateObject("Scripting.Dictionary")
Set B = A
B.Add "key", "value"
Debug.Print A.Count                 ' 1
Debug.Print A Is B                  ' True
Set B = CreateObject("Scripting.Dictionary")
Debug.Print A Is B                  ' False
Debug.Print B.Count                 ' 0
```

## See Also

- [Data Types](../../Reference/Data-Types#object) -- the summary of all fourteen intrinsic types
- [Variant](Variant) type -- a **Variant** can hold an object reference too
- [Set](Set), [New](New), [Is](Is) -- statements and operators for object references
- [IDispatch](../../Reference/COM-Interfaces/IDispatch) -- how late-bound calls reach an object
- [Deftype](Deftype) statement
