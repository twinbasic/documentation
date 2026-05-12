---
title: Is
parent: Operators
grand_parent: Reference Section
permalink: /tB/Core/Is
vba_attribution: true
---
# Is
{: .no_toc }

Used to compare two object references for identity.

Syntax:
> *result* **=** *object1* **Is** *object2*

*result*
: Any **Boolean** or numeric variable.

*object1*, *object2*
: Any object references.

If *object1* and *object2* both refer to the same object, *result* is **True**; if they don't, *result* is **False**. **Is** does not compare values inside the objects — it compares whether the two references point to the same instance.

Two variables can be made to refer to the same object in several ways. In the following example, A has been set to refer to the same object as B:

```tb
Set A = B
```

The following example makes A and B refer to the same object as C:

```tb
Set A = C
Set B = C
```

A reference compared against **Nothing** with **Is** tells whether the reference is unassigned:

```tb
If MyObject Is Nothing Then
    Debug.Print "MyObject has not been assigned."
End If
```

For the negation of an identity test, twinBASIC also provides the [**IsNot**](IsNot) operator: `If MyObject IsNot Nothing Then` reads more naturally than `If Not (MyObject Is Nothing) Then`.

> [!NOTE]
> The **Is** keyword has two unrelated uses elsewhere in the language:
>
> - In an **[If...Then...Else](If-Then-Else)** condition of the form **TypeOf** *objectname* **Is** *objecttype*, **Is** introduces a runtime type test.
> - In a **[Select Case](Select-Case)** clause of the form **Is** *comparisonoperator* *expression*, **Is** introduces a comparison against the **Select Case** test expression.
>
> In both of those constructs the surrounding statement provides the meaning; **Is** there is not the object-identity operator described on this page.

### Example

This example uses the **Is** operator to compare two object references.

```tb
Dim MyObject, YourObject, ThisObject, OtherObject, ThatObject, MyCheck
Set YourObject = MyObject    ' Assign object references.
Set ThisObject = MyObject
Set ThatObject = OtherObject
MyCheck = YourObject Is ThisObject    ' Returns True.
MyCheck = ThatObject Is ThisObject    ' Returns False.
' Assume MyObject <> OtherObject.
MyCheck = MyObject Is ThatObject    ' Returns False.
```

### See Also

- [**IsNot** operator](IsNot)
- [**Set** statement](Set)
- [**If...Then...Else** statement](If-Then-Else)
- [**Select Case** statement](Select-Case)
