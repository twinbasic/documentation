---
title: New
parent: Statements
permalink: /tB/Core/New
---
# New
{: .no_toc }

Creates a new instance of a class.

The **New** keyword is used in two contexts:

- In a declaration ([**Dim**](Dim), [**Private**](Private), [**Public**](Public), or [**Static**](Static)) to enable *implicit* object creation: a new instance is created on the first reference to the variable.
- In a [**Set**](Set) statement, to create a new instance of a class and assign the reference to a variable or property.

Syntax:

- > [ **Dim** \| **Private** \| **Public** \| **Static** ] *varname* **As** **New** *type*
- > **Set** *objectvar* **=** **New** *type*

*varname*, *objectvar*
: Name of the variable or property receiving the new object reference.

*type*
: A class name or other creatable object type. **New** can't be used to create new instances of any intrinsic data type (such as **Long** or **String**), and can't be used to create dependent objects.

When **New** is used in a declaration, no instance is created at the point of declaration. Instead, an instance is created automatically the first time the variable is referenced after declaration. Each time the variable is set to **Nothing** and then referenced again, a new instance is created.

When **New** is used with **Set**, an instance is created immediately, and the reference is assigned to *objectvar*. If *objectvar* previously held a reference to another object, that reference is released when the new one is assigned.

> [!NOTE]
> **New** cannot be used together with **WithEvents** in a declaration. To wire up an event-aware object reference, declare the variable with **WithEvents** and assign it later with **Set**.

### Example

Implicit creation via **New** in a declaration. The instance of `Worksheet` is created on first use, not at the **Dim** line.

```tb
Dim X As New Worksheet
' No instance exists yet.
X.Activate ' First reference - instance is created here.
```

Explicit creation via **Set ... = New**. The instance is created at the **Set** line. This is the more common form, since the moment of construction is visible at the call site.

```tb
Dim Forms(1 To 4) As Form1
Dim i As Long
For i = 1 To 4
    Set Forms(i) = New Form1
Next i
```

### See Also

- [**Set** statement](Set)
- [**Dim** statement](Dim)
- [**Class** statement](Class)

{% include VBA-Attribution.md %}
