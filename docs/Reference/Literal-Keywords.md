---
title: Literal Keywords
parent: Reference Section
nav_order: 10.5
has_toc: false
permalink: /Reference/Literal-Keywords
symbols: ["Nothing", "Null", "Empty", "True", "False"]
vba_attribution: true
---

# Literal Keywords

**Nothing**, **Null**, **Empty**, **True** and **False** are keywords that stand for fixed values. They are part of the language, available in every module without a reference, and cannot be assigned to or declared again.

| Keyword | Value | Type it belongs to | Test for it with |
|---------|-------|--------------------|------------------|
| [**Nothing**](#nothing) | a reference to no object | an object type | [**Is**](../tB/Core/Is) or [**IsNot**](../tB/Core/IsNot) |
| [**Null**](#null) | no valid data | **Variant** | [**IsNull**](../tB/Modules/Information/IsNull) |
| [**Empty**](#empty) | nothing assigned yet | **Variant** | [**IsEmpty**](../tB/Modules/Information/IsEmpty) |
| [**True**](#true) | -1 | **Boolean** | the value itself, or [**CBool**](../tB/Modules/Conversion/CBool) |
| [**False**](#false) | 0 | **Boolean** | the value itself, or [**CBool**](../tB/Modules/Conversion/CBool) |

---

## Nothing

**Nothing** is the object reference that refers to no object. A variable declared **As Object**, or as a class or an interface, holds **Nothing** until an object is assigned to it. [**VarType**](../tB/Modules/Information/VarType) of **Nothing** is **vbObject** (9), [**TypeName**](../tB/Modules/Information/TypeName) is `Nothing`, and [**ObjPtr**](../tB/Modules/Information/ObjPtr) is 0.

**Nothing** is assigned with [**Set**](../tB/Core/Set): `Set Items = Nothing`. This releases the variable's reference. Several variables can refer to one object, and the object is destroyed when the last of them is set to **Nothing** or goes out of scope. A property or method called through a variable that holds **Nothing** raises error [91](tb:Errors#91), *Object variable or With block variable not set*.

Test for it with [**Is**](../tB/Core/Is), `Items Is Nothing`, or with twinBASIC's [**IsNot**](../tB/Core/IsNot), `Items IsNot Nothing`. Two more forms are twinBASIC's own: an initializer in a declaration, `Dim Items As Collection = Nothing`, needs no **Set**, and [**ByVal Nothing**](../Features/Language/Pointers#byval-nothing) passes a null pointer for a **ByRef** interface parameter.

> [!NOTE] BETA 1010
> **Nothing** assigned without **Set** to a variable that is not an object or a **Variant**, such as `Count = Nothing` for a **Long**, and **Nothing** compared with `=` or `<>`, such as `If Obj = Nothing`, compile and raise error [91](tb:Errors#91) when they run. VB6 and 64-bit VBA refuse them when they compile, with *Invalid use of object*.

> [!WARNING] BETA 1010
> A **Variant** assigned **Nothing** without **Set**, `v = Nothing`, holds **Nothing**, as after `Set v = Nothing`, and no error is raised. VB6 and 64-bit VBA raise error [91](tb:Errors#91) and leave the **Variant** **Empty**.

[**Object**](../tB/Core/Object#assigning) describes assigning and comparing object references.

```tb check_run
Dim Items As Collection
Debug.Print Items Is Nothing        ' True
Debug.Print TypeName(Items)         ' Nothing
Set Items = New Collection
Debug.Print Items Is Nothing        ' False
Set Items = Nothing
Debug.Print ObjPtr(Items)           ' 0
```

---

## Null

**Null** is a **Variant** value that means the variable holds no valid data, such as a field of a database record that has no value. [**VarType**](../tB/Modules/Information/VarType) of **Null** is **vbNull** (1), and [**TypeName**](../tB/Modules/Information/TypeName) is `Null`. Only a **Variant** can hold it: assigning **Null** to a variable of another type raises error [94](tb:Errors#94), *Invalid use of Null*, and `Set` of a **Variant** that holds it to an object variable raises error [424](tb:Errors#424), *Object required*.

**Null** passes through most expressions. An arithmetic expression or a comparison with a **Null** operand is **Null**, so `v = Null` is never **True**: test for it with [**IsNull**](../tB/Modules/Information/IsNull). The `&` operator treats **Null** as an empty string. `Null And False` is **False** and `Null Or True` is **True**, because the other operand decides the result; any other logical operation with **Null** is **Null**. An `If` condition that is **Null** counts as **False**. Many functions return **Null** when an argument is **Null**, and their `$` forms raise error 94; a function's page lists what it raises.

```tb check_run
Dim v As Variant
v = Null
Debug.Print IsNull(v * 2)           ' True
Debug.Print IsNull(v = Null)        ' True
Debug.Print "[" & v & "]"           ' []
Debug.Print v And False             ' False
Debug.Print v Or True               ' True
If v Then
    Debug.Print "then"
Else
    Debug.Print "else"              ' else
End If
```

---

## Empty

**Empty** is the value of a **Variant** that has not been assigned. [**VarType**](../tB/Modules/Information/VarType) of **Empty** is **vbEmpty** (0), and [**TypeName**](../tB/Modules/Information/TypeName) is `Empty`. Assigning **Empty** to a **Variant** returns it to that state.

**Empty** counts as 0 in a numeric expression and as an empty string in a string expression, so `Empty = 0` and `Empty = ""` are both **True**, and `Empty + 1` is the **Integer** 1. Assigned to a variable of another type, it gives that type's default value: 0, an empty string, or **False**. Test for it with [**IsEmpty**](../tB/Modules/Information/IsEmpty).

[**Variant**](../tB/Core/Variant#empty-null-and-error-values) describes **Empty** and **Null** together with the error values a **Variant** can hold.

```tb check_run
Dim v As Variant
Debug.Print IsEmpty(v)              ' True
Debug.Print v = ""                  ' True
Debug.Print TypeName(v + 1)         ' Integer
v = 5
v = Empty
Debug.Print IsEmpty(v)              ' True
```

---

## True

**True** is the **Boolean** value -1, with every bit set. A comparison that holds gives **True**, and `If`, `While` and `Do` run their **True** branch for any number but 0. A number is not equal to **True** unless it is -1 itself: `5 = True` is **False**, although `CBool(5)` is **True**. In arithmetic **True** counts as the **Integer** -1, and [**CStr**](../tB/Modules/Conversion/CStr) gives `True`.

---

## False

**False** is the **Boolean** value 0. It is the default value of a **Boolean** variable, and the result of a comparison that does not hold. In arithmetic it counts as the **Integer** 0, and [**CStr**](../tB/Modules/Conversion/CStr) gives `False`.

[**Boolean**](../tB/Core/Boolean#conversions) describes how numbers and strings convert to **True** and **False**.

```tb check_run
Debug.Print CInt(True)              ' -1
Debug.Print True + True             ' -2
Debug.Print 5 = True                ' False
Debug.Print CBool(5)                ' True
Debug.Print CStr(False)             ' False
```

---

## See Also

- [Data Types](Data-Types) -- the types these values belong to
- [Variant](../tB/Core/Variant), [Object](../tB/Core/Object), [Boolean](../tB/Core/Boolean) data types
- [IsNull](../tB/Modules/Information/IsNull), [IsEmpty](../tB/Modules/Information/IsEmpty), [IsObject](../tB/Modules/Information/IsObject) functions
- [Set](../tB/Core/Set) statement
- [Is](../tB/Core/Is), [IsNot](../tB/Core/IsNot) operators
