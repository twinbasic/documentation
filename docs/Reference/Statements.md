---
title: Statements
parent: Reference Section
nav_order: 2
has_toc: false
permalink: /Reference/Statements
---

# Statements

These statements are built into the language itself. They are understood by the compiler, and are not explicitly declared nor defined in the visible runtime library.

> [!WARNING]
> Work in Progress

## Alphabetical List

* [Call](../tB/Core/Call) -- transfer control to a procedure

* [Class](../tB/Core/Class) -- define a class

* [Close](../tB/Core/Close) -- concludes input/output (I/O) to a file opened using the **Open** statement

* [Const](../tB/Core/Const) -- declares constants for use in place of literal values

* [Continue](../tB/Core/Continue) -- immediately begins the next iteration of the enclosing loop

* [Declare](../tB/Core/Declare) -- declares references to external procedures in a dynamic-link library (DLL)

* [Dim](../tB/Core/Dim) -- declares variables and allocates storage space

* [Do ... Loop](../tB/Core/Do-Loop) -- repeats a block of statements while a condition is **True** or until a condition becomes **True**

* [End](../tB/Core/End) -- ends a procedure or block

* [Enum](../tB/Core/Enum) -- declares a type for an enumeration

* [Erase](../tB/Core/Erase) -- reinitializes the elements of fixed-size arrays, or releases dynamic-array storage space

* [Error](../tB/Core/Error) -- simulates the occurrence of an error

* [Event](../tB/Core/Event) -- declares a user-defined event

* [Exit](../tB/Core/Exit) -- exits a block of **Do…Loop**, **For…Next**, **Function**, **Sub**, or **Property** code

* [For ... Next](../tB/Core/For-Next) -- repeats a group of statements while the loop counter approaches its final value

* [For Each...Next](../tB/Core/For-Each-Next) -- repeats a group of statements for each element in an array or collection

* [Function](../tB/Core/Function) -- declares the name, arguments, and code that form the body of a **Function** procedure

* [Get](../tB/Core/Get)

* [GoSub ... Return](../tB/Core/GoSub-Return)

* [GoTo](../tB/Core/GoTo)

* [If ... Then ... Else](../tB/Core/If-Then-Else) -- conditionally executes a group of statements, depending on the value of an expression

* [Input](../tB/Core/Input)

* [Implements](../tB/Core/Implements)

* [Is](../tB/Core/Is) -- compares two object references for identity

* [IsNot](../tB/Core/IsNot) -- the logical inverse of **Is**; compares two object references for non-identity

* [Kill](../tB/Core/Kill) -- deletes files from a disk

* [Let](../tB/Core/Let) -- assigns the value of an expression to a variable or property

* [Line Input](../tB/Core/Line-Input)

* [Lock](../tB/Core/Lock)

* [LSet](../tB/Core/LSet)

* [Mid =](../tB/Core/Mid-equals)

* [MidB =](../tB/Core/MidB-equals)

* [Module](../tB/Core/Module)

* [New](../tB/Core/New) -- creates a new instance of a class

* [On Error](../tB/Core/On-Error)

* [On ... GoTo](../tB/Core/On-GoTo), [On .. GoSub](../tB/Core/On-GoSub)

* [Open](../tB/Core/Open)

* [Option](../tB/Core/Option) -- configure a compiler option

* [ParamArray](../tB/Core/ParamArray) -- declares the final parameter of a procedure as an arbitrary-arity list of arguments

* [Print](../tB/Core/Print)

* [Private](../tB/Core/Private) -- declares module-level variables accessible only within the declaring module

* [Property](../tB/Core/Property) -- declares the **Get**, **Let**, or **Set** procedures that form the body of a property

* [Public](../tB/Core/Public) -- declares module-level variables accessible to all procedures in all modules

* [Put](../tB/Core/Put)

* [RaiseEvent](../tB/Core/RaiseEvent)

* [Randomize](../tB/Modules/Math/Randomize) -- initializes the random-number generator

* [ReDim](../tB/Core/ReDim) -- reallocates storage space for a dynamic array

* [Resume](../tB/Core/Resume)

* [Return](../tB/Core/Return)

* [RSet](../tB/Core/RSet)

* [Seek](../tB/Core/Seek)

* [Select Case](../tB/Core/Select-Case) -- executes one of several groups of statements, depending on the value of an expression

* [Set](../tB/Core/Set) -- assigns an object reference to a variable or property

* [Static](../tB/Core/Static) -- declares procedure-local variables whose values are preserved between calls

* [Stop](../tB/Core/Stop) -- suspends execution

* [Sub](../tB/Core/Sub) -- declares the name, arguments, and code that form the body of a **Sub** procedure

* [Type](../tB/Core/Type) -- defines a user-defined data type containing one or more elements

* [Unlock](../tB/Core/Unlock)

* [While ... Wend](../tB/Core/While-Wend) -- executes a series of statements as long as a given condition is **True**

* [With](../tB/Core/With) -- executes a series of statements on a single object or a user-defined type

* [Write](../tB/Core/Write)

* [#If ... Then ... Else](../tB/Core/Topic-Preprocessor)

---

## Deprecated

* [DefBool through DefVar](../tB/Core/Deftype)

* [Error](../tB/Core/Error)