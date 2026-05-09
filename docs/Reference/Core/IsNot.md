---
title: IsNot
parent: Statements
permalink: /tB/Core/IsNot
---
# IsNot
{: .no_toc }

Used to compare two object references for non-identity. The logical inverse of the [**Is**](Is) operator.

Syntax:
> *result* **=** *object1* **IsNot** *object2*

*result*
: Any **Boolean** or numeric variable.

*object1*, *object2*
: Any object references.

If *object1* and *object2* refer to *different* objects (or one of them is **Nothing** while the other is not), *result* is **True**; if they refer to the same object, *result* is **False**. Like **Is**, the comparison is on the references themselves, not on the values inside the objects.

> [!NOTE]
> **IsNot** is a twinBASIC extension. Classic VBA has no **IsNot** operator; the equivalent is `Not (a Is b)`.

The most common use is testing that an object reference has been assigned:

```tb
If MyObject IsNot Nothing Then
    ' Use MyObject.
End If
```

This reads more naturally than the equivalent `If Not (MyObject Is Nothing) Then` or the older `If (MyObject Is Nothing) = False Then`.

### Example

```tb
Dim A As Object, B As Object, C As Object
Set A = New Collection
Set B = A          ' B refers to the same object as A.
Set C = New Collection

Debug.Print A IsNot B    ' False - same object.
Debug.Print A IsNot C    ' True  - different objects.
Debug.Print A IsNot Nothing    ' True  - A is assigned.

Set A = Nothing
Debug.Print A IsNot Nothing    ' False - A is now unassigned.
```

### See Also

- [**Is** operator](Is)
- [**Set** statement](Set)
