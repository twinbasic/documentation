---
title: Class
parent: Statements
permalink: /tB/Core/Class
---

# Class

{: no_toc }

Used to define a class. Classes are templates from which objects are created -- classes are object types, as opposed to value types. Objects are held by reference and are reference-counted. The memory an object occupies is freed when there are no more references to it -- when no variables in the process refer to them.

Syntax:

> [ *attributes* ]  
> **Class** *name*  
> &nbsp;&nbsp;&nbsp;&nbsp;[ *classmember* ]  
> &nbsp;&nbsp;&nbsp;&nbsp;[ *classmember* ] ...  
> **End Class**

*attributes*
: *optional* One or more of:  
[ArrayBoundsChecks](Attributes#arrayboundschecks), [ClassId](Attributes#classid), [COMCreatable](Attributes#comcreatable), [CustomControl](Attributes#customcontrol), [Description](Attributes#description), [FloatingPointErrorChecks](Attributes#floatingpointerrorchecks), [FormDesignerId](Attributes#formdesignerid), [Hidden](Attributes#hidden), [IntegerOverflowChecks](Attributes#integeroverflowchecks), [PredeclaredID](Attributes#predeclaredid)

*name*
: The identifier naming the class.

*classmember*
: *optional* Any of the following:

  - [constant](../Gloss#constant) defined using [**Const**](Const),
  - [variable](../Gloss#variable) defined using [**Public**](Public), [**Protected**](Protected), [**Private**](Private), and [**Dim**](Dim),
  - [procedure](../Gloss#procedure) defined using [**Sub**](Sub), [**Function**](Function) and [**Property**](Property),
  - [user-defined type (UDTs)](../Gloss#user-defined-type) defined using [**Type**](Type).

