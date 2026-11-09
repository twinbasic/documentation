---
title: Friend
parent: Statements
permalink: /tB/Core/Friend
---
# Friend
{: .no_toc }

Makes a member of a class available to the whole project, and keeps it out of the class's public interface.

Syntax:

- > **Friend** [ **Static** ] [ **Overridable** ] **Sub** \| **Function** \| **Property Get** \| **Property Let** \| **Property Set** *name* ...
- > **Friend** [ **ReadOnly** \| **WithEvents** ] *varname* [ **As** [ **New** ] *type* ] [ **=** *value* ] [ **,** *varname* ... ]

In a procedure declaration, **Friend** takes the place of **Public**, **Private** or **Protected**. The rest of the declaration is described on the [**Sub**](Sub), [**Function**](Function) and [**Property**](Property) pages.

Every module and class of the project can use a **Friend** member, through a variable of the class's own type. The class does not publish it: the type library of an ActiveX DLL lists no **Friend** procedure or variable. Use **Friend** for what the classes of a project need from one another, and that a client of the class should not call.

<!-- test: bug friend-late-bound -->
> [!NOTE] BETA 1042
> A **Friend** member also answers late-bound calls, through an **Object** or **Variant** variable and through [**CallByName**](../Modules/Interaction/CallByName), because the compiler's [**IDispatch**](../../Reference/COM-Interfaces/IDispatch#classes-written-in-twinbasic) finds it. This holds for an object passed to another project too, so that project can call its **Friend** procedures and read and write its **Friend** variables. VB6 raises error [438](tb:Errors#438), as twinBASIC does for a **Private** member. Do not rely on **Friend** to keep a member away from code outside the project.

<!-- test: bug friend-late-bound -->
> [!NOTE] BETA 1042
> A project that references a package can use the **Friend** members of the package's classes, as if they were **Public**.

## Where it can be used

**Friend** applies to the members of a class, and a form is a class too.

| Member of a class | Result |
|:---|:---|
| **Sub**, **Function**, **Property Get**, **Property Let**, **Property Set**, **Sub New** | Allowed. |
| Variable | Allowed, under the rules for a **Public** variable. It can have an initial value, or be **ReadOnly** or **WithEvents**. A fixed-size array is refused, with TB5131. |
| [**Event**](Event), [**Enum**](Enum), [**Type**](Type) | Allowed, and the same as **Public**: the type library lists them. |
| [**Const**](Const) | Refused, with TB5250: *Constants in a class cannot be Public*. |
| [**Declare**](Declare), [**Delegate**](Delegate) | Refused, with TB5227: these must be **Private** in a class. |

Anywhere else **Friend** is a syntax error, TB5182: on a member of a [**Module**](Module), an [**Interface**](Interface) or a [**Type**](Type), and on a **Class**, **Module** or **Interface** itself. It is refused inside a procedure as well.

A declaration has one access modifier, so `Public Friend Sub` and `Protected Friend Sub` are syntax errors. **Static** and **Overridable** can stand on either side of **Friend**.

> [!NOTE]
> VB6 allows **Friend** only on a **Sub**, **Function** or **Property** procedure of a class. On anything else in a class it reports *Expected: Sub or Function or Property*, and in a standard module *Only valid in object module*. **Friend** on a variable, **Event**, **Enum** or **Type** is a twinBASIC extension.

## Private types in a signature

In VB6, a **Private** **Type** or **Enum** can be a parameter or the return type of a **Friend** procedure, but not of a **Public** one. That is a common reason to use **Friend** there. twinBASIC allows these types in both, in an ActiveX DLL too. The difference is in the type library: a **Public** member that uses a **Private** type adds that type to it, and a **Friend** member does not.

## Implements, Inherits and Via

A class that [**Implements**](Implements) another class does not have to provide its **Friend** procedures. Calling one through a variable of the implemented class, on an object of the implementing class, raises error [97](tb:Errors#97), *Can not call friend function on object which is not an instance of defining class*, as it does in VB6. A **Friend** variable is different: the implementing class must provide it, as a **Property Get** and a **Property Let**.

<!-- test: bug implements-friend-stub-stack -->
> [!WARNING] BETA 1042
> In a 32-bit build, that call damages the stack unless the procedure's arguments and return value take exactly one stack slot besides **Me**. It raises error 97 correctly from a **Sub** with one argument of 4 bytes or less, from a **Function** or **Property Get** with no arguments, and from a **Property Let** with one such value. Any other signature, such as `Function F(ByVal X As Long) As Long`, a **Sub** with two arguments or a **Sub** with a **ByVal Currency** argument, ends an exe with an access violation before a handler runs, and a run in the IDE does not return. A **Sub** with no arguments raises an error 97 that **On Error** does not keep: in an exe the handler runs, and then the program stops with an error box when the procedure returns. A 64-bit build is not affected. Do not call a **Friend** procedure on an object that may be of an implementing class.

A class that [**Inherits**](../../Features/Language/Inheritance#inherits-for-complete-oop) another class inherits its **Friend** members, and they stay available to the whole project. A **Friend Overridable** procedure is overridden in the usual way.

`Implements ... Via` forwards the **Friend** members of the delegate as well as the **Public** ones, so they can be called on the delegating class from anywhere in the project. The [**ImplementsViaPrivateFriendlies**](Attributes#implementsviaprivatefriendlies) attribute keeps them inside that class.

## Example

`Post` changes the balance. `Bank`, in the same project, can call it, and a client of the class sees only `Balance`.

```tb check_build projname=core-friend slot=file
Class Account
    Private mBalance As Long

    Public Property Get Balance() As Long
        Balance = mBalance
    End Property

    ' For the rest of the project, not for clients of the class.
    Friend Sub Post(ByVal Amount As Long)
        mBalance = mBalance + Amount
    End Sub
End Class

Class Bank
    Public Function OpenAccount(ByVal Deposit As Long) As Account
        Set OpenAccount = New Account
        OpenAccount.Post Deposit
    End Function
End Class
```

```tb check_run projname=core-friend
Dim b As New Bank
Dim a As Account
Set a = b.OpenAccount(100)
a.Post 25
Debug.Print a.Balance    ' 125
```

A class that implements `Account` provides `Balance`, and has no `Post` to call:

```tb check_build projname=core-friend slot=file
Class TestAccount
    Implements Account

    Private Property Get Account_Balance() As Long
        Account_Balance = 1
    End Property
End Class
```

```tb check_run projname=core-friend
Dim a As Account
Set a = New TestAccount
Debug.Print a.Balance    ' 1
On Error Resume Next
a.Post 5
Debug.Print Err.Number   ' 97
```

## See Also

- [**Public** statement](Public)
- [**Private** statement](Private)
- [**Protected** statement](Protected)
- [**Sub** statement](Sub)
- [**Function** statement](Function)
- [**Property** statement](Property)
- [**Implements** statement](Implements)
- [Inheritance](../../Features/Language/Inheritance)
