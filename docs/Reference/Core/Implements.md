---
title: Implements
parent: Statements
permalink: /tB/Core/Implements
vba_attribution: true
---
# Implements
{: .no_toc }

Specifies an interface or class that will be implemented in the [class](Class) in which it appears.

Syntax:
> **Implements** { *InterfaceName* \| *ClassName* } [ **,** { *InterfaceName* \| *ClassName* } ]…

*InterfaceName*
: The name of an interface --- either an [**Interface**](Interface) block defined in twinBASIC, or an interface in a referenced type library --- whose members will be implemented by the corresponding members in the class.

*ClassName*
: The name of a class whose default interface will be implemented.

A single **Implements** statement can list several interfaces or classes separated by commas; this is equivalent to writing one **Implements** statement per name. Classic VBA requires a separate statement for each.

An *interface* is a collection of prototypes representing the members (methods and properties) that the interface encapsulates; that is, it contains only the declarations for the member procedures. A *class* provides an implementation of all the methods and properties of one or more interfaces. Classes provide the code used when each function is called by a controller of the class. All classes implement at least one interface, which is considered the default interface of the class. Any member that isn't explicitly a member of an implemented interface is implicitly a member of the default interface.

When a class implements an interface, the class provides its own versions of all the **Public** procedures specified in the interface. In addition to providing a mapping between the interface prototypes and the implementing procedures, the **Implements** statement causes the class to accept COM `QueryInterface` calls for the specified interface ID.

When implementing an interface or class, all the **Public** procedures involved must be included. A missing member in an implementation of an interface or class causes an error. When code is not placed in one of the implemented procedures, raise the appropriate error (`Const E_NOTIMPL = &H80004001`) so a user of the implementation understands that a member is not implemented.

The **Implements** statement can't appear in a standard module --- it is valid only in a [**Class**](Class) block.

### twinBASIC enhancements

twinBASIC extends classic VBA's **Implements** in several ways. See [Inheritance](../../Features/Language/Inheritance) for the full discussion; the headline differences:

- **Comma-separated list** --- one **Implements** statement can name multiple interfaces or classes, e.g. `Implements IFoo, IBar, IBaz`. Classic VBA requires a separate **Implements** statement for each.
- **Inherited interfaces** --- `Implements` works directly on a derived interface (e.g. `Implements IFoo2` where `Interface IFoo2 Extends IFoo`). The class need not name `IFoo` separately; `QueryInterface` for the base is satisfied automatically. Classic VBA does not support implementing derived interfaces.
- **Multiple-implementation form** --- a single member can implement methods on several interfaces at once via `Implements <iface1>.<member>, <iface2>.<member>, …` after the procedure header. This is useful when several interfaces declare the same member and one body should satisfy all of them.
- **`As Any` parameters** --- interfaces declared with `As Any` parameters can be implemented (substituting `As LongPtr` for `As Any` in the implementing class). Classic VBA rejects this.

> [!NOTE]
> Use `Private` (or `Friend`) on the implementing procedures so that the interface methods don't also become part of the implementing class's *default* interface. The conventional naming pattern is `<InterfaceName>_<MemberName>`.

### Example

The following example shows how to use the **Implements** statement to make a set of declarations available to multiple classes. By sharing the declarations through the **Implements** statement, neither class has to make any declarations itself. The example also shows how use of an interface supports abstraction: a strongly-typed variable can be declared by using the interface type. It can then be assigned objects of different class types that implement the interface.

The interface declarations are in a class called `PersonalData`:

```tb
Public Name As String
Public Address As String
```

The code supporting the customer data is in a class module called `Customer`. Note that the `PersonalData` interface is implemented with members that are named with the interface name `PersonalData_` as a prefix.

```tb
Implements PersonalData

' For PersonalData implementation
Private m_name As String
Private m_address As String

' Customer-specific
Public CustomerAgentId As Long

' PersonalData implementation
Private Property Let PersonalData_Name(ByVal RHS As String)
    m_name = RHS
End Property

Private Property Get PersonalData_Name() As String
    PersonalData_Name = m_name
End Property

Private Property Let PersonalData_Address(ByVal RHS As String)
    m_address = RHS
End Property

Private Property Get PersonalData_Address() As String
    PersonalData_Address = m_address
End Property

Private Sub Class_Initialize()
    m_name = "[customer name]"
    m_address = "[customer address]"
    CustomerAgentId = 0
End Sub
```

A second class `Supplier` implements the same interface independently, with its own state and `Class_Initialize`. Code that needs name/address access can declare a variable as the interface type and accept either:

```tb
Private m_pd As PersonalData

Public Property Set PD(Data As PersonalData)
    Set m_pd = Data
End Property
```

`m_pd` can only access the members of `PersonalData`. Customer-specific or Supplier-specific members are not visible through it --- assigning an object to a variable declared by interface type provides polymorphic behavior.

### See Also

- [**Interface** statement](Interface)
- [**CoClass** statement](CoClass)
- [**Class** statement](Class)
- [Inheritance](../../Features/Language/Inheritance)
- [Interfaces and CoClasses](../../Features/Language/Interfaces-CoClasses)
