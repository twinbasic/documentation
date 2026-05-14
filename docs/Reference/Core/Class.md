---
title: Class
parent: Statements
permalink: /tB/Core/Class
---

# Class

{: .no_toc }

Defines a class. Classes are templates from which objects are created — classes are object types, as opposed to value types. Objects are held by reference and are reference-counted. The memory an object occupies is freed when there are no more references to it — when no variables in the process refer to them.

Syntax:

> [ *attributes* ]  
> [ **Public** \| **Private** ] **Class** *name* [ **(** **Of** *typevars* **)** ]  
> &nbsp;&nbsp;&nbsp;&nbsp;[ **Inherits** *baseclass* ]  
> &nbsp;&nbsp;&nbsp;&nbsp;[ *classmember* ]  
> &nbsp;&nbsp;&nbsp;&nbsp;[ *classmember* ] ...  
> **End Class**

*attributes*
: *optional* One or more of:  
[ArrayBoundsChecks](Attributes#arrayboundschecks), [ClassId](Attributes#classid), [COMCreatable](Attributes#comcreatable), [CustomControl](Attributes#customcontrol), [Description](Attributes#description), [FloatingPointErrorChecks](Attributes#floatingpointerrorchecks), [FormDesignerId](Attributes#formdesignerid), [Hidden](Attributes#hidden), [IntegerOverflowChecks](Attributes#integeroverflowchecks), [PredeclaredID](Attributes#predeclaredid)

**Public**
: *optional* (twinBASIC) In an ActiveX project, marks the class as exported into the type library so that consumers in other projects can create and use it.

**Private**
: *optional* (twinBASIC) In an ActiveX project, withholds the class from the type library: it remains usable within the project but is not exported. The conventional pairing with [**CoClass**](CoClass) — a public **CoClass** as the consumer-visible contract paired with a `Private Class` as the hidden implementation — relies on this modifier.

*name*
: The identifier naming the class.

**Of** *typevars*
: *optional* (twinBASIC) One or more type variable names, separated by commas, that make the class a *generic class*. Each type variable can be referenced in member declarations as if it were a regular type. See [Generics](../../Features/Language/Generics).

**Inherits** *baseclass*
: *optional* (twinBASIC) Names a single base class whose **Public** and [**Protected**](Protected) members are inherited by *name*. The **Inherits** line, when present, must appear immediately after the **Class** header and before any other member. **Inherits** enables [**Overridable**](Sub) / **Overrides** members, explicit `*baseclass*.New(...)` chained constructor calls from inside `Sub New`, and **Protected** member visibility. See [Inheritance](../../Features/Language/Inheritance).

*classmember*
: *optional* Any of the following:

  - [constant](../Gloss#constant) defined using [**Const**](Const),
  - [variable](../Gloss#variable) defined using [**Public**](Public), [**Protected**](Protected), [**Private**](Private), or [**Dim**](Dim),
  - [procedure](../Gloss#procedure) defined using [**Sub**](Sub), [**Function**](Function), or [**Property**](Property) — including the special instance constructor `Sub New(`*args*`)`, which the runtime invokes when the class is created with [**New**](New),
  - [user-defined type (UDTs)](../Gloss#user-defined-type) defined using [**Type**](Type),
  - (twinBASIC) [**Implements**](Implements) clauses, listing interfaces or classes whose members this class provides bodies for.

In `.twin` files, a **Class** block may share a file with [**Interface**](Interface), [**CoClass**](CoClass), and [**Alias**](Alias) declarations (which appear *before* the **Class** block) and with a [**Module**](Module) block. In legacy `.cls` files the class is implicit and the **Class**/**End Class** keywords are not written.

### See Also

- [**Module** statement](Module)
- [**Interface** statement](Interface)
- [**CoClass** statement](CoClass)
- [**Implements** statement](Implements)
- [**Protected** statement](Protected)
- [**New** statement](New)
- [Inheritance](../../Features/Language/Inheritance)
- [Generics](../../Features/Language/Generics)

