---
title: New
parent: Statements
permalink: /tB/Core/New
vba_attribution: true
---
# New
{: .no_toc }

Creates a new instance of a class.

The **New** keyword is used in three contexts:

- In a declaration ([**Dim**](Dim), [**Private**](Private), [**Public**](Public), or [**Static**](Static)) written **As New**, to enable *implicit* object creation: a new instance is created on the first reference to the variable.
- In a [**Set**](Set) statement, to create a new instance of a class and assign the reference to a variable or property.
- (twinBASIC) In a declaration's initializer, **= New**, to create a new instance as the variable is declared. See [Inline Initialization](../../Features/Language/Inline-Initialization).

Syntax:

- > [ **Dim** \| **Private** \| **Public** \| **Static** ] *varname* **As** **New** *type*
- > **Set** *objectvar* **=** **New** *type* [ **(** *arglist* **)** ]
- > [ **Dim** \| **Private** \| **Public** \| **Static** ] *varname* **As** *type* **=** **New** *type* [ **(** *arglist* **)** ]

*varname*, *objectvar*
: Name of the variable or property receiving the new object reference.

*type*
: A class name or other creatable object type. **New** can't be used to create new instances of any intrinsic data type (such as **Long** or **String**), and can't be used to create dependent objects.

*arglist*
: *optional* (twinBASIC) The arguments passed to the class's **Sub New** constructor, separated by commas --- `New Dog("Rex")`. The class must declare a **Sub New** whose parameters match; see [Parameterized Class Constructors](../../Features/Advanced/Classes-and-Modules#parameterized-class-constructors). The **As New** form takes no arguments: `Dim d As New Dog("Rex")` is a syntax error. **Static** does not accept them in an initializer either: `Static d As Dog = New Dog("Rex")` fails with TB5074. Declare the **Static** variable, then assign it with **Set**.

When **New** is used in a declaration, no instance is created at the point of declaration. Instead, an instance is created automatically the first time the variable is referenced after declaration. Each time the variable is set to **Nothing** and then referenced again, a new instance is created.

When **New** is used with **Set**, an instance is created immediately, and the reference is assigned to *objectvar*. If *objectvar* previously held a reference to another object, that reference is released when the new one is assigned.

When **New** is used in an initializer inside a procedure, the instance is created when execution reaches the declaration, not when the procedure starts.

> [!NOTE]
> **New** cannot be used together with **WithEvents** in a declaration. To connect an event-aware object reference, declare the variable with **WithEvents** and assign it later with **Set**.

### Example

Implicit creation via **New** in a declaration. The instance of [**Collection**](../Modules/Collection/) is created on first use, not at the **Dim** line.

```tb check_build
Dim X As New Collection
' No instance exists yet.
X.Add "first" ' First reference - instance is created here.
```

Explicit creation via **Set ... = New**. The instance is created at the **Set** line. This is the more common form, since the moment of construction is visible at the call site.

```tb hidden
' Context for the sample below: the form it creates four of. In a real project
' the designer declares this class; here it is written out so the sample has the
' type it names.
Class Form1
    Inherits Form
End Class
```

```tb check_build
Dim Forms(1 To 4) As Form1
Dim i As Long
For i = 1 To 4
    Set Forms(i) = New Form1
Next i
```

(twinBASIC) Creation with constructor arguments. The class declares a **Sub New** that takes a name, and each **New** passes one. The class is **Private** because a public class whose only constructor takes arguments does not compile (TB5135).

```tb check_build projname=core-new-arguments
Private Class Dog
    Private m_Name As String

    Public Sub New(ByVal Name As String)
        m_Name = Name
    End Sub

    Public Property Get Name() As String
        Name = m_Name
    End Property
End Class
```

```tb check_build projname=core-new-arguments
Dim d As Dog = New Dog("Rex")   ' declared and created in one statement
Dim e As Dog
Set e = New Dog("Fido")         ' created by a Set statement
```

### See Also

- [**Set** statement](Set)
- [**Dim** statement](Dim)
- [**Class** statement](Class)
- [Parameterized Class Constructors](../../Features/Advanced/Classes-and-Modules#parameterized-class-constructors)
