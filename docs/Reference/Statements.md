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

* [CoClass](../tB/Core/CoClass) -- (twinBASIC) defines a creatable COM class as the contract for one or more **Interface** blocks

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

* [Get](../tB/Core/Get) -- reads data from an open disk file into a variable

* [GoSub ... Return](../tB/Core/GoSub-Return) -- branches to and returns from a subroutine within a procedure

* [GoTo](../tB/Core/GoTo) -- branches unconditionally to a specified line within a procedure

* [If ... Then ... Else](../tB/Core/If-Then-Else) -- conditionally executes a group of statements, depending on the value of an expression

* [Input #](../tB/Core/Input) -- reads data from an open sequential file and assigns it to variables

* [Implements](../tB/Core/Implements) -- specifies an interface or class that will be implemented in the class in which it appears

* [Interface](../tB/Core/Interface) -- (twinBASIC) defines a COM interface using twinBASIC syntax

* [Is](../tB/Core/Is) -- compares two object references for identity

* [IsNot](../tB/Core/IsNot) -- the logical inverse of **Is**; compares two object references for non-identity

* [Kill](../tB/Core/Kill) -- deletes files from a disk

* [Let](../tB/Core/Let) -- assigns the value of an expression to a variable or property

* [Line Input #](../tB/Core/Line-Input) -- reads a single line from an open sequential file into a string variable

* [Lock](../tB/Core/Lock), [Unlock](../tB/Core/Unlock) -- control access by other processes to all or part of an open file

* [LSet](../tB/Core/LSet) -- left-aligns a string within a string variable, or copies one user-defined-type variable into another

* [Mid =](../tB/Core/Mid-equals) -- replaces a specified number of characters within a string variable

* [MidB =](../tB/Core/MidB-equals) -- byte-positioned form of **Mid =**

* [Module](../tB/Core/Module) -- defines a module: a non-instantiable container for procedures, constants, types, and module-level variables

* [Name](../tB/Core/Name) -- renames a disk file, directory, or folder

* [New](../tB/Core/New) -- creates a new instance of a class

* [On Error](../tB/Core/On-Error) -- enables an error-handling routine and specifies its location, or disables error handling

* [On ... GoTo](../tB/Core/On-GoTo), [On ... GoSub](../tB/Core/On-GoSub) -- branch to one of several lines based on the value of an expression

* [Open](../tB/Core/Open) -- enables input/output (I/O) to a file

* [Option](../tB/Core/Option) -- configure a compiler option

* [ParamArray](../tB/Core/ParamArray) -- declares the final parameter of a procedure as an arbitrary-arity list of arguments

* [Print #](../tB/Core/Print) -- writes display-formatted data to a sequential file

* [Private](../tB/Core/Private) -- declares module-level variables accessible only within the declaring module

* [Property](../tB/Core/Property) -- declares the **Get**, **Let**, or **Set** procedures that form the body of a property

* [Protected](../tB/Core/Protected) -- (twinBASIC) declares a class member accessible within the class and its derived classes

* [Public](../tB/Core/Public) -- declares module-level variables accessible to all procedures in all modules

* [Put](../tB/Core/Put) -- writes data from a variable to a disk file

* [RaiseEvent](../tB/Core/RaiseEvent) -- fires an event declared at the module level within a class, form, or document

* [Randomize](../tB/Modules/Math/Randomize) -- initializes the random-number generator

* [ReDim](../tB/Core/ReDim) -- reallocates storage space for a dynamic array

* [Resume](../tB/Core/Resume) -- resumes execution after an error-handling routine is finished

* [Return](../tB/Core/Return) -- returns from a **GoSub** subroutine, or (twinBASIC) exits a procedure with an optional value

* [RSet](../tB/Core/RSet) -- right-aligns a string within a string variable

* [Seek](../tB/Core/Seek)

* [Select Case](../tB/Core/Select-Case) -- executes one of several groups of statements, depending on the value of an expression

* [Set](../tB/Core/Set) -- assigns an object reference to a variable or property

* [Static](../tB/Core/Static) -- declares procedure-local variables whose values are preserved between calls

* [Stop](../tB/Core/Stop) -- suspends execution

* [Sub](../tB/Core/Sub) -- declares the name, arguments, and code that form the body of a **Sub** procedure

* [Type](../tB/Core/Type) -- defines a user-defined data type containing one or more elements

* [While ... Wend](../tB/Core/While-Wend) -- executes a series of statements as long as a given condition is **True**

* [With](../tB/Core/With) -- executes a series of statements on a single object or a user-defined type

* [Write #](../tB/Core/Write) -- writes raw, delimited data to a sequential file (paired with [**Input #**](../tB/Core/Input))

* [#If ... Then ... Else](../tB/Core/Topic-Preprocessor)

---

## Deprecated

* [DefBool through DefVar](../tB/Core/Deftype)

* [Error](../tB/Core/Error)