---
title: Glossary
parent: Reference Section
permalink: /tB/Gloss
---

> [!WARNING]
> Work in Progress

## class

The formal definition of an object. The class acts as the template from which an instance of an object is created at run time. The class defines the properties of the object and the methods used to control the object's behavior.

## class level

Describes code in the Declarations section of a class. Any code outside a procedure is referred to as class-level code. Declarations must be listed first, followed by procedures.

## class module

A [module](#module) that contains the definition of one or more [classes](#class), including their property and method definitions.

## compile time

The period during which source code is translated to executable code.

## constant

A named item that retains a constant value throughout the execution of a program. A constant can be a string or numeric literal, another constant, or any combination that includes arithmetic or logical operators except [**Is**](Core/Is) and exponentiation. Each host application can define its own set of constants. Additional constants can be defined by the user with the [**Const**](Core/Const) statement. Use constants anywhere in your code in place of actual values.

## declaration

Nonexecutable code that names a constant, [variable](#variable), or [procedure](#procedure), and specifies its characteristics, such as data type. For DLL procedures, declarations specify names, libraries, and arguments.

## locale

The set of information that corresponds to a given language and country/region. The code locale setting affects the language of terms such as keywords and defines locale-specific settings such as the decimal and list separators, date formats, and character sorting order.

The system locale setting affects the way locale-aware functionality behaves, for example, when you display numbers or convert strings to dates. You set the system locale using the **Control Panel** utilities provided by the operating system.

Although the code locale and system locale are generally set to the same setting, they may differ in some situations. For example, in Visual Basic, Standard Edition and Visual Basic, Professional Edition, the code is not translated from English-U.S. The system locale can be set to the user's language and country/region, but the code locale is always set to English-U.S. and can't be changed. In this case, the English-U.S. separators, format placeholders, and sorting order are used.

## module

A set of declarations followed by procedures.

## module level

Describes code in the Declarations section of a module. Any code outside a procedure is referred to as module-level code. Declarations must be listed first, followed by procedures. This term also includes the [class module](#class-module).

## object

A combination of code and data that can be treated as a unit, for example, a control, form, or application component. Each object is defined by a class.

## package

> [!WARNING]
>
> TODO

## procedure

A named sequence of statements executed as a unit. For example, [**Function**](Core/Function), [**Property**](Core/Property), and [**Sub**](Core/Sub) are types of procedures. A procedure name is always defined at module level. All executable code must be contained in a procedure. Procedures can't be nested within other procedures.

## project

A set of modules.

## scope

Defines the visibility of a variable, procedure, or object. For example, a variable declared as [**Public**](Core/Public) is visible to all procedures in all modules in a directly referencing project unless [**Option Private Module**](Core/Option#Private) is in effect. When **Option Private Module** is in effect, the module itself is private and therefore not visible to referencing projects. Variables declared in a procedure are visible only within the procedure and lose their value between calls unless they are declared [**Static**](Core/Static).

## sort order

A sequencing principle used to order data, for example, alphabetic, numeric, ascending, descending, and so on.

## string comparison

A comparison of two sequences of characters. Use [**Option Compare**](Core/Option#Compare) to specify binary or text comparison. In English-U.S., binary comparisons are case sensitive; text comparisons are not.

## user-defined type

Any data type defined using the **Type** statement. User-defined data types can contain one or more elements of any data type. Arrays of user-defined and other data types are created using the **Dim** statement. Arrays of any type can be included within user-defined types. See [data type summary](https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/data-type-summary).

## variable

A named storage location that can contain data that can be modified during program execution. Each variable has a name that uniquely identifies it within its scope. A data type can be specified or not.

Variable names must begin with an alphabetic character, must be unique within the same scope, can't be longer than 255 characters, and can't contain an embedded period or type-declaration character.

{% include VBA-Attribution.md %}