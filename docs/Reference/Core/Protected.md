---
title: Protected
parent: Statements
permalink: /tB/Core/Protected
---
# Protected
{: .no_toc }

Declares a class member (variable, procedure, or property) that is accessible from inside the declaring class and from classes that derive from it via [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop), but not from outside callers.

> [!NOTE]
> The **Protected** access modifier is a twinBASIC extension over classic VBA, which has only **Public**, **Private**, and **Friend**. **Protected** is meaningful only inside an [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop) hierarchy; in a class without inheritance, it behaves like [**Private**](Private).

Syntax:

- > **Protected** *varname* [ **(** [ *subscripts* ] **)** ] [ **As** [ **New** ] *type* ] [ **,** *varname* ... ]
- > **Protected** [ **Overridable** ] **Sub** \| **Function** \| **Property Get** \| **Property Let** \| **Property Set** *name* ...

In a variable declaration, **Protected** has the same form as [**Private**](Private)/[**Public**](Public): a comma-separated list of names with optional `WithEvents`/`New` and `As`-clause. **Protected** is valid only at class scope; it cannot be used inside a procedure (use [**Dim**](Dim) or [**Static**](Static)), and it cannot be used in a [**Module**](Module) (modules have no notion of derived types).

In a procedure declaration, **Protected** replaces the **Public**/**Private**/**Friend** modifier. Combined with the **Overridable** keyword, it declares an inheritance hook --- a method or property that derived classes are allowed to override.

### Visibility summary

| Modifier | Same class | Derived class (via **Inherits**) | Other code |
|:---|:---:|:---:|:---:|
| **Public**    | yes | yes | yes |
| **Friend**    | yes | yes | within the project only |
| **Protected** | yes | yes | no |
| **Private**   | yes | no  | no |

### Example

The following pattern uses **Protected** state plus an **Overridable** **Protected** method as an inheritance hook. The base `Animal` class exposes a public `Speak` that delegates to `GetSound`, which derived classes override:

```tb
Private Class Animal
    Protected _name As String
    Protected _dob As Date  ' date of birth

    Public Sub New(name As String, dob As Date)
        _name = name
        _dob = dob
    End Sub

    Public Property Get Name() As String
        Name = _name
    End Property

    Public Sub Speak()
        Debug.Print _name & " says: " & GetSound()
    End Sub

    ' Overridable hook for derived classes.
    Protected Overridable Function GetSound() As String
        GetSound = ""
    End Function
End Class

Private Class Dog
    Inherits Animal

    Public Sub New(name As String, dob As Date)
        Animal.New(name, dob)               ' explicit base constructor call
    End Sub

    Protected Function GetSound() As String Overrides Animal.GetSound
        GetSound = "woof"
    End Function
End Class
```

`_name` and `_dob` are visible inside `Dog` (because `Dog` inherits from `Animal`), but not visible to any code that holds an `Animal` or `Dog` reference from outside the hierarchy.

### See Also

- [**Public** statement](Public)
- [**Private** statement](Private)
- [**Class** statement](Class)
- [Inheritance](../../Features/Language/Inheritance)
