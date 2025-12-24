---
title: Glossary
parent: Reference Section
permalink: /tB/Gloss/
---

{: .warning }
> Work in Progress

## class

The formal definition of an object. The class acts as the template from which an instance of an object is created at run time. The class defines the properties of the object and the methods used to control the object's behavior.

## class module

A [module](#module) that contains the definition of one or more [classes](#class), including their property and method definitions.

## compile time

The period during which source code is translated to executable code.

## constant

A named item that retains a constant value throughout the execution of a program. A constant can be a string or numeric literal, another constant, or any combination that includes arithmetic or logical operators except [**Is**](/tB/Core/Is) and exponentiation. Each host application can define its own set of constants. Additional constants can be defined by the user with the [**Const**](/tB/Core/Const) statement. Use constants anywhere in your code in place of actual values.

## declaration

Nonexecutable code that names a constant, [variable](#variable), or [procedure](#procedure), and specifies its characteristics, such as data type. For DLL procedures, declarations specify names, libraries, and arguments.

## module

A set of declarations followed by procedures.

## module level

Describes code in the Declarations section of a module. Any code outside a procedure is referred to as module-level code. Declarations must be listed first, followed by procedures. This term also includes the [class module](#class-module).

## procedure

A named sequence of statements executed as a unit. For example, [**Function**](/tB/Core/Function), [**Property**](/tb/Core/Property), and [**Sub**](/tB/Code/Sub) are types of procedures. A procedure name is always defined at module level. All executable code must be contained in a procedure. Procedures can't be nested within other procedures.

## scope

Defines the visibility of a variable, procedure, or object. For example, a variable declared as [**Public**](/tB/Core/Public) is visible to all procedures in all modules in a directly referencing project unless [**Option Private Module**](/tB/Core/Option#Private) is in effect. When **Option Private Module** is in effect, the module itself is private and therefore not visible to referencing projects. Variables declared in a procedure are visible only within the procedure and lose their value between calls unless they are declared [**Static**](/tB/Core/Static).

## string comparison

A comparison of two sequences of characters. Use [**Option Compare**](/tB/Core/Option#Compare) to specify binary or text comparison. In English-U.S., binary comparisons are case sensitive; text comparisons are not.

## variable

A named storage location that can contain data that can be modified during program execution. Each variable has a name that uniquely identifies it within its scope. A data type can be specified or not.

Variable names must begin with an alphabetic character, must be unique within the same scope, can't be longer than 255 characters, and can't contain an embedded period or type-declaration character.

{% include VBA-Attribution.md %}