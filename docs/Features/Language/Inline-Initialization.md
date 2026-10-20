---
title: Inline Variable Initialization
parent: Language Syntax
nav_order: 14
permalink: /Features/Language/Inline-Initialization
index:
  - inline field initialization
  - field initialization
---

# Inline Variable Initialization

You can now set initial values for variables inline, without needing a line-continuation character.

## Examples

```tb inert=skeleton
Dim i As Long = 1
Dim foo As Boolean = bar()
Dim arr As Variant = Array(1, 2, 3)
Dim strArr(2) As String = Array("a", "b", "c")
Dim cMC As cMyClass = New cMyClass(customConstructorArgs)
```

## What an Initializer Can Use

What the expression after `=` may contain depends on where the variable is declared.

**`Dim` inside a procedure.** Any expression, including a call to a procedure of the project. The initializer runs when execution reaches the declaration, like an assignment on the next line.

**A `Static` variable, a module-level variable, or a field of a class.** No call to a procedure of the project: neither one in the same module or class, nor one in another module, called bare or qualified. The call fails with TB5079, *Unrecognized symbol*, or, qualified, with TB5027, *does not contain ... or it is inaccessible in this context*. Built-in functions, constants and [`New`](../../tB/Core/New), with or without constructor arguments, are allowed:

```tb check_build slot=file
Class Order
    Private _created As Date = Now()
    Private _lines As Collection = New Collection
    Private _limit As Long = 10 * 1024
End Class
```

```tb expect-error=TB5079 slot=file
Class Invoice
    Private _id As String = NewId()       ' TB5079: Unrecognized symbol 'NewId'

    Private Function NewId() As String
        NewId = CStr(Int(Rnd * 1000000))
    End Function
End Class
```

Set a value that needs a procedure of the project in code instead: a class field in [`Class_Initialize` or `Sub New`](../Advanced/Classes-and-Modules#class_initialize-or-sub-new), a module-level variable in the procedure that first needs it.

An initializer at module or class level can also read a variable, but not every variable:

- **A class field can read a module-level variable.** The modules are set up before any object is created.
- **A class field cannot read another field of the same class.** `Public X As Long = A + 1`, where `A` is a field, compiles, but the build fails with *[LINKER] compilation (codegen) error detected in 'MyClass.{fields_init}'*. A run in the IDE goes ahead, and the field holds an arbitrary number. Set the field in a constructor.
- **A module-level variable can read a variable declared above it in the same module.**
- **A module-level variable should not read another module's variable.** Modules are set up one at a time, so the other module's variable may still be 0 or empty. The order is neither the order of the files nor the alphabetical order of the modules' names.

<!-- BETA 1010, probed with tbbuild --build, tbrun and tbrun --exe. The class-field bullet is the bug class-field-init-reads-field in BUGS-TO-REPORT.md: when a fix is released, it says a field can read another. In the IDE, one module-level initializer that reads another module's variable leaves every module-level variable at 0 (bug module-init-reads-other-module-ide); the last bullet's advice covers it. -->

## Inline Variable Declaration for For

A counter variable needs no separate `Dim` statement:

```tb check_build
For i As Long = 0 To 10
    '...
Next
```

is now valid syntax. You can use any type, not just `Long`.
