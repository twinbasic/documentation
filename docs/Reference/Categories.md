---
title: Categories
parent: Reference Section
nav_order: 1
permalink: /Reference/Categories
---

This chapter lists the global statements and procedures that form the core of the twinBASIC language.

# Categorical List

## Compiler Control

* [Option](../tB/Core/Option) - configure a compiler option
* [#If ... Then ... Else](../tB/Core/Topic-Preprocessor) - enable or disable compilation of enclosed code
* [#Const](../tB/Core/Topic-Preprocessor) - define a module-private conditional compiler constant

## Declarations and Definitions

* [Class](../tB/Core/Class), [Module](../tB/Core/Module) - define a class or module
* [Interface](../tB/Core/Interface), [CoClass](../tB/Core/CoClass) - (twinBASIC) define a COM interface or coclass using twinBASIC syntax
* [Sub](../tB/Core/Sub) - define a procedure
* [Function](../tB/Core/Function) - define a function
* [Property](../tB/Core/Property) - define a property
* [ParamArray](../tB/Core/ParamArray) - declare a procedure's final parameter as a variadic argument list
* [Enum](../tB/Core/Enum) - define an enumeration type with associated constants
* [Type](../tB/Core/Type) - declare a user-defined data type (UDT)/a structure
* [Declare](../tB/Core/Declare) - declare an external/library procedure or function
* [Event](../tB/Core/Event) - declare an event
* [Implements](../tB/Core/Implements) - specifies that a class implements a given interface
* [End](../tB/Core/End) - terminate execution, finish a Function, Sub, Property, or Enum definition, finish a Type declaration; finish a Class or Module, finish an If, Select, or With block

## Flow Control

Statements:

* [Call](../tB/Core/Call) - invokes a procedure or function
* [Do ... Loop](../tB/Core/Do-Loop), [For ... Next](../tB/Core/For-Next), [For Each ... Next](../tB/Core/For-Each-Next), [While ... Wend](../tB/Core/While-Wend) - loops
* [If ... Then ... Else](../tB/Core/If-Then-Else) - execute code conditionally
* [Continue](../tB/Core/Continue) - skip to the next iteration of the loop
* [Exit](../tB/Core/Exit) - exit a loop, procedure, function or property
* [Return](../tB/Core/Return) - return from a **GoSub** subroutine, or (twinBASIC) return a value and exit from a **Function** or **Property Get**
* [Select Case](../tB/Core/Select-Case) - execute a code block selected by an expression
* [With](../tB/Core/With) - bring a variable or expression into scope
* [Goto](../tB/Core/GoTo), [GoSub ... Return](../tB/Core/GoSub-Return) - transfer execution to another location
* [On ... GoTo](../tB/Core/On-GoTo), [On ... GoSub](../tB/Core/On-GoSub) - transfer execution to a location selected by an expression
* [Stop](../tB/Core/Stop) - interrupt execution

Inline conditional functions --- expression-level alternatives to the **If...Then...Else** and **Select Case** statements above:

* [If](../tB/Modules/Interaction/If) - evaluate an expression and return one of two values; only the chosen branch is evaluated (twinBASIC addition)
* [IIf](../tB/Modules/Interaction/IIf) - evaluate an expression and return one of two values; both branches are always evaluated
* [Choose](../tB/Modules/Interaction/Choose) - return one value from a list, selected by 1-based index
* [Switch](../tB/Modules/Interaction/Switch) - return the value paired with the first **True** condition in a list of (condition, value) pairs

See also: 

* [End](../tB/Core/End) - terminate execution.
* [On Error](../tB/Core/On-Error), [Resume](../tB/Core/Resume) - flow control for run-time errors (see [Error Handling](#error-handling))

## Error Handling

Statements:

* [On Error](../tB/Core/On-Error) - specifies what to do when an error occurs
* [Resume](../tB/Core/Resume) - resumes execution after an error has been caught
* [Error](../tB/Core/Error) statement - simulates the occurrence of an error (legacy; prefer **Err.Raise**)

Procedures:

* [Err](../tB/Modules/Information/Err) - returns the **ErrObject** describing the current run-time error state
* [Erl](../tB/Modules/Information/Erl) - returns the line number where the most recent run-time error occurred
* [Error$, Error](../tB/Modules/Conversion/Error) function - returns the error message that corresponds to a given error number
* [CVErr](../tB/Modules/Conversion/CVErr) - wraps a numeric expression in a **Variant** of subtype **Error**
* [SetThreadGlobalErrorTrap](../tB/Modules/HiddenModule/SetThreadGlobalErrorTrap) - register a callback that fires when an unhandled run-time error escapes the active error handler chain on the calling thread

## Variable Declaration

Statements:

* [Dim](../tB/Core/Dim) - declare a typed scalar or array variable
* [Const](../tB/Core/Const) - declare a constant
* [Public](../tB/Core/Public) - declare a public variable in a class or module
* [Private](../tB/Core/Private) - declare a private variable in a class or module
* [Protected](../tB/Core/Protected) - (twinBASIC) declare a class member accessible within the class and its derived classes
* [Static](../tB/Core/Static) - declare a a variable of static duration

## Variable Assignment and Modification

Statements:

- [Let](../tB/Core/Let) - sets the value of a variable
- [Set](../tB/Core/Set) - changes the object referred by the variable
- [New](../tB/Core/New) - create a new instance of a class
- [LSet](../tB/Core/LSet) - assigns a user-defined type, or left-aligns a string
- [RSet](../tB/Core/RSet) - right-aligns a string

Operators:

- [Is](../tB/Core/Is) - compares two object references for identity
- [IsNot](../tB/Core/IsNot) - (twinBASIC) the logical inverse of **Is**

## Arrays

Statements:

* [ReDim](../tB/Core/ReDim) - allocate or change the size of a dynamically-sized array
* [Erase](../tB/Core/Erase) - fill a fixed-size array with default values, or invalidate a dynamic array

Procedures:

* [LBound](../tB/Modules/Information/LBound) - smallest valid subscript for an array dimension
* [UBound](../tB/Modules/Information/UBound) - largest valid subscript for an array dimension
* [IsArray](../tB/Modules/Information/IsArray) - returns whether a variable is an array
* [IsArrayInitialized](../tB/Modules/Information/IsArrayInitialized) - returns whether an array has been dimensioned

See also:

* [Dim](../tB/Core/Dim) - allocate a scalar or array variable
* [Array](../tB/Modules/Information/Array), [Filter](../tB/Modules/Strings/Filter), [Join](../tB/Modules/Strings/Join), [Split](../tB/Modules/Strings/Split) - array helpers
* [vbaAryMove](../tB/Modules/HiddenModule/vbaAryMove), [vbaRefVarAry](../tB/Modules/HiddenModule/vbaRefVarAry) - low-level **Variant**-array helpers (see [Memory and Pointers](#memory-and-pointers))

## File I/O

Statements:

- [Open](../tB/Core/Open), [Close](../tB/Core/Close) - open/close a file for I/O operations
- [Get](../tB/Core/Get), [Put](../tB/Core/Put) - read/write data from an open random access file
- [Line Input](../tB/Core/Line-Input), [Print](../tB/Core/Print) - read/write a line from/to an open text file
- [Input](../tB/Core/Input), [Write](../tB/Core/Write) - read/write data from an open sequential access file
- [Seek](../tB/Core/Seek) - change the current access position in an open file
- [Lock](../tB/Core/Lock), [Unlock](../tB/Core/Unlock) - lock/unlock a range of records in an open file

Procedures:

* [Reset](../tB/Core/Reset) - close all open disk files
* [Width](../tB/Modules/FileSystem/Width) - set the limit for line lengths when printing
* [Input, Input$](../tB/Modules/FileSystem/Input) - read a fixed number of characters from a sequential file
* [InputB, InputB$](../tB/Modules/FileSystem/InputB) - read a fixed number of bytes from a sequential file
* [ChDir](../tB/Core/ChDir), [ChDrive](../tB/Core/ChDrive) - change the current working directory and disk drive
* [MkDir](../tB/Core/MkDir), [RmDir](../tB/Core/RmDir) - create/remove a directory on disk
* [Name](../tB/Core/Name) - rename a file or directory on disk
* [SetAttr](../tB/Core/SetAttr) - set attributes of a file on disk
* [FileCopy](../tB/Core/FileCopy) - copy a file on disk
* [Kill](../tB/Core/Kill) - delete a file from disk
* [SavePicture](../tB/Core/SavePicture) - write a `Picture` or `Image` to a disk file
* [MacID](../tB/Modules/Conversion/MacID) - convert a 4-character Mac file-type code (legacy)

## State Management

Procedures:

* [Load](../tB/Core/Load), [Unload](../tB/Core/Unload) - load/unload a form or control into memory
* [GetSetting](../tB/Modules/Interaction/GetSetting), [SaveSetting](../tB/Modules/Interaction/SaveSetting) - retrieve/store a string value from/to the system registry
* [GetAllSettings](../tB/Modules/Interaction/GetAllSettings) - retrieve every key/value pair in a section of an application's registry entry
* [DeleteSetting](../tB/Modules/Interaction/DeleteSetting) - remove value from the system registry

## Events

Statements:

* [RaiseEvent](../tB/Core/RaiseEvent) - raise an event that may be handled by event handlers

Procedures:

* [RaiseEventByName](../tB/Modules/Interaction/RaiseEventByName) - raise an event by name on an object, taking arguments as a **Variant** array
* [RaiseEventByName2](../tB/Modules/Interaction/RaiseEventByName2) - raise an event by name on an object, taking a variable-length argument list
* [RuntimeCreateGetMessageHook](../tB/Modules/HiddenModule/RuntimeCreateGetMessageHook) - create an **IGetMessageHook** for filtering Windows messages destined for a window and (optionally) its descendants

See also

* [Event](../tB/Core/Event) - declare an event
* [IGetMessageHook interface](../tB/Modules/HiddenModule/#igetmessagehook-interface) - subscribe a callback to a Windows message type, then start/stop delivery

## User Dialogs

Procedures:

* [MsgBox](../tB/Modules/Interaction/MsgBox) - display a modal message dialog and return the button the user clicked
* [InputBox](../tB/Modules/Interaction/InputBox) - prompt the user for a line of text and return what was entered
* [Beep](../tB/Modules/Interaction/Beep) - sound a system beep

## Process Control

Procedures:

* [Shell](../tB/Modules/Interaction/Shell) - run another program asynchronously and return its task ID
* [AppActivate](../tB/Modules/Interaction/AppActivate) - change the focus to, or activate, a named window
* [SendKeys](../tB/Modules/Interaction/SendKeys) - send keystrokes to the active window
* [DoEvents](../tB/Modules/Interaction/DoEvents) - yield control to the message loop so pending events can be processed

## COM and Automation

Procedures:

* [CreateObject](../tB/Modules/Interaction/CreateObject) - create a new instance of a COM/Automation object
* [GetObject](../tB/Modules/Interaction/GetObject) - obtain a reference to an Automation object loaded from a file or already running
* [CallByName](../tB/Modules/Interaction/CallByName) - invoke a method or property on an object dynamically by name
* [CallByDispId](../tB/Modules/Interaction/CallByDispId) - invoke a method or property on an object dynamically by IDispatch dispatch ID (twinBASIC addition)
* [CreateGUID](../tB/Modules/HiddenModule/CreateGUID) - generate a fresh GUID and return it as a registry-formatted string
* [vbaCastObj](../tB/Modules/HiddenModule/vbaCastObj) - reinterpret an object as another COM interface (a typed `QueryInterface`)
* [vbaObjSet](../tB/Modules/HiddenModule/vbaObjSet), [vbaObjSetAddref](../tB/Modules/HiddenModule/vbaObjSetAddref) - assign a raw object pointer to an **Object** variable, with or without addref
* [vbaObjAddref](../tB/Modules/HiddenModule/vbaObjAddref) - increment the COM reference count of the object at a given address

See also:

* [ObjPtr](../tB/Modules/Information/ObjPtr) - return the COM-identity address of an object (see [Memory and Pointers](#memory-and-pointers))

## Command Line and Environment

Procedures:

* [Command$, Command](../tB/Modules/Interaction/Command) - return the command-line arguments passed to the program
* [Environ$, Environ](../tB/Modules/Interaction/Environ) - return the value of a process environment variable

## Colours

Procedures:

* [RGB](../tB/Modules/Information/RGB) - build an RGB colour value from red, green, and blue components
* [RGBA](../tB/Modules/Information/RGBA) - build an RGBA colour value from red, green, blue, and alpha components
* [RGB_R](../tB/Modules/Information/RGB_R), [RGB_G](../tB/Modules/Information/RGB_G), [RGB_B](../tB/Modules/Information/RGB_B), [RGBA_A](../tB/Modules/Information/RGBA_A) - extract individual colour components
* [QBColor](../tB/Modules/Information/QBColor) - return the RGB colour value for a QuickBASIC colour index
* [TranslateColor](../tB/Modules/Information/TranslateColor) - translate an OLE colour value to a plain RGB colour value

## Mathematics

Procedures:

* [Atn](../tB/Modules/Math/Atn), [Cos](../tB/Modules/Math/Cos), [Sin](../tB/Modules/Math/Sin), [Tan](../tB/Modules/Math/Tan) - trigonometric functions
* [Sqr](../tB/Modules/Math/Sqr) - take a square root
* [Exp](../tB/Modules/Math/Exp) - calculate an exponential with base $e$
* [Log](../tB/Modules/Math/Log) - calculate the natural (base $e$) logarithm of a number
* [Sgn](../tB/Modules/Math/Sgn) - return the sign of a number
* [Abs](../tB/Modules/Math/Abs) - returns the absolute value of a number
* [Round](../tB/Modules/Math/Round) - round the number to a given number of decimal places
* [Rnd](../tB/Modules/Math/Rnd) - generate a random number in the range [0.0, 1.0)
* [Randomize](../tB/Modules/Math/Randomize) - seed the random number generator
* [Partition](../tB/Modules/Interaction/Partition) - return a string label identifying which of a series of equal-width numeric ranges a value falls into (histogram-style bucketing)

See also:

* [Fix](../tB/Modules/Conversion/Fix), [Int](../tB/Modules/Conversion/Int) - extract the integer portion of a number
* [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr) - coerce to integer types (rounds half-to-even)

## Type Conversion

Procedures that coerce an expression to a specific type:

* [CBool](../tB/Modules/Conversion/CBool), [CByte](../tB/Modules/Conversion/CByte), [CCur](../tB/Modules/Conversion/CCur), [CDbl](../tB/Modules/Conversion/CDbl), [CDec](../tB/Modules/Conversion/CDec), [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr), [CSng](../tB/Modules/Conversion/CSng) - coerce to a specific numeric type
* [CStr](../tB/Modules/Conversion/CStr) - coerce to **String** (locale-aware; preferred over [Str](../tB/Modules/Conversion/Str))
* [CVar](../tB/Modules/Conversion/CVar) - coerce to **Variant**
* [CDate](../tB/Modules/Conversion/CDate) - coerce to **Date**; [CVDate](../tB/Modules/Conversion/CVDate) returns a **Variant** of subtype **Date** (legacy)
* [CType](../tB/Modules/Conversion/CType) - explicit cast operator with a caller-supplied target type (twinBASIC extension)

Procedures that convert between numbers and strings:

* [Hex$, Hex](../tB/Modules/Conversion/Hex) - hexadecimal string representation of a number
* [Oct$, Oct](../tB/Modules/Conversion/Oct) - octal string representation of a number
* [Str$, Str](../tB/Modules/Conversion/Str) - decimal string representation of a number
* [Val](../tB/Modules/Conversion/Val) - parse a string into a **Double**
* [ValDec](../tB/Modules/Conversion/ValDec) - parse a string into a **Decimal**

Procedures that extract the integer portion of a number:

* [Fix](../tB/Modules/Conversion/Fix) - truncates toward zero
* [Int](../tB/Modules/Conversion/Int) - rounds toward negative infinity

Other:

* [Nz](../tB/Modules/Conversion/Nz) - replace **Null** with a default value

See also:

* [Format$, Format](../tB/Modules/Strings/Format) - locale-aware number formatting
* [FormatNumber](../tB/Modules/Strings/FormatNumber), [FormatPercent](../tB/Modules/Strings/FormatPercent), [FormatCurrency](../tB/Modules/Strings/FormatCurrency), [FormatDateTime](../tB/Modules/Strings/FormatDateTime) - typed formatters
* [CVErr](../tB/Modules/Conversion/CVErr), [Error$, Error](../tB/Modules/Conversion/Error) function - error helpers (see [Error Handling](#error-handling))

## Type Inspection

Procedures that name or identify a variable's subtype:

* [VarType](../tB/Modules/Information/VarType) - returns the **VbVarType** code identifying a variable's subtype
* [TypeName](../tB/Modules/Information/TypeName) - returns the name of a variable's data type as a **String**

Procedures that test a value's state or subtype:

* [IsDate](../tB/Modules/Information/IsDate) - returns whether an expression can be evaluated as a date
* [IsEmpty](../tB/Modules/Information/IsEmpty) - returns whether a **Variant** is uninitialised
* [IsError](../tB/Modules/Information/IsError) - returns whether an expression is an error subtype
* [IsMissing](../tB/Modules/Information/IsMissing) - returns whether an optional argument was supplied
* [IsNull](../tB/Modules/Information/IsNull) - returns whether a variable contains a **Null** value
* [IsNumeric](../tB/Modules/Information/IsNumeric) - returns whether an expression can be evaluated as a number
* [IsObject](../tB/Modules/Information/IsObject) - returns whether a variable refers to an object

See also:

* [IsArray](../tB/Modules/Information/IsArray), [IsArrayInitialized](../tB/Modules/Information/IsArrayInitialized) - in [Arrays](#arrays)

## String Handling

Statements that modify strings:

* [Mid =](../tB/Core/Mid-equals), [MidB =](../tB/Core/MidB-equals) - assign to or replace characters or wide/narrow string sections

Procedures that check properties of strings:

* [Len](../tB/Modules/Strings/Len), [LenB](../tB/Modules/Strings/Len) - the length of a string
* [Asc](../tB/Modules/Strings/Asc), [AscB](../tB/Modules/Strings/Asc), [AscW](../tB/Modules/Strings/Asc) - returns the character code of the first letter in a string
* [StrComp](../tB/Modules/Strings/StrComp) - compares two strings
* [InStr$](../tB/Modules/Strings/InStr), [InStrB](../tB/Modules/Strings/InStr), [InStr](../tB/Modules/Strings/InStr) - finds the position of a given substring in a string

Procedures that create strings:

* [Chr\$](../tB/Modules/Strings/Chr), [Chr](../tB/Modules/Strings/Chr), [ChrB\$](../tB/Modules/Strings/Chr), [ChrB](../tB/Modules/Strings/Chr), [ChrW\$](../tB/Modules/Strings/Chr), [ChrW](../tB/Modules/Strings/Chr) - returns the character having a given code
* [Space$](../tB/Modules/Strings/Space), [Space](../tB/Modules/Strings/Space) - return a string of spaces
* [String\$](../tB/Modules/Strings/String), [String](../tB/Modules/Strings/String) - return a string of specified characters

Procedures that return modified strings:

* [Left\$](../tB/Modules/Strings/Left), [Left](../tB/Modules/Strings/Left), [LeftB$](../tB/Modules/Strings/Left), [LeftB](../tB/Modules/Strings/Left) - extract a left substring of a string
* [Mid$](../tB/Modules/Strings/Mid), [Mid](../tB/Modules/Strings/Mid), [MidB\$](../tB/Modules/Strings/Mid), [MidB](../tB/Modules/Strings/Mid) - extract a substring of a string
* [Right\$](../tB/Modules/Strings/Right), [Right](../tB/Modules/Strings/Right), [RightB\$](../tB/Modules/Strings/Right), [RightB](../tB/Modules/Strings/Right) - extract a right substring of a string
* [LTrim\$](../tB/Modules/Strings/LTrim), [LTrim](../tB/Modules/Strings/LTrim), [RTrim\$](../tB/Modules/Strings/RTrim), [RTrim](../tB/Modules/Strings/RTrim) - removes leading/trailing spaces from a string
* [Trim$](../tB/Modules/Strings/Trim), [Trim](../tB/Modules/Strings/Trim) - removes leading and trailing spaces from a string
* [StrReverse](../tB/Modules/Strings/StrReverse) - reverses the order of characters of a string
* [LCase\$](../tB/Modules/Strings/LCase), [LCase](../tB/Modules/Strings/LCase), [UCase\$](../tB/Modules/Strings/UCase), [UCase](../tB/Modules/Strings/UCase) - capitalizes or lowercases a string
* [StrConv](../tB/Modules/Strings/StrConv) - converts the string to a specified format
* [Join](../tB/Modules/Strings/Join) - concatenates a string array using a given delimiter
* [Split](../tB/Modules/Strings/Split) - splits a string into a string array
* [Replace](../tB/Modules/Strings/Replace) - replaces substrings in a string
* [Filter](../tB/Modules/Strings/Filter) - filters a string array into a subset according to criteria
* [InStrRev](../tB/Modules/Strings/InStrRev) - returns the position of a given substring in a string, searching from the end
* [Format\$](../tB/Modules/Strings/Format), [Format](../tB/Modules/Strings/Format) - format a numeric expression in a specific way
* [FormatNumber](../tB/Modules/Strings/FormatNumber) - formats an expression as a numeric string
* [FormatPercent](../tB/Modules/Strings/FormatPercent) - formats an expression as a percent string

Procedures that convert between numbers and strings:

* [CStr](../tB/Modules/Conversion/CStr) - coerce a value to **String** (locale-aware)
* [Hex$, Hex](../tB/Modules/Conversion/Hex) - hexadecimal string representation of a number
* [Oct$, Oct](../tB/Modules/Conversion/Oct) - octal string representation of a number
* [Str$, Str](../tB/Modules/Conversion/Str) - decimal string representation of a number
* [Val](../tB/Modules/Conversion/Val) - parse a string into a **Double**
* [ValDec](../tB/Modules/Conversion/ValDec) - parse a string into a **Decimal**

See also:

* [FormatCurrency](../tB/Modules/Strings/FormatCurrency) - format an expression as a currency string
* [FormatDateTime](../tB/Modules/Strings/FormatDateTime) - formats an expression as a date/time string

## Date and Time

Procedures:

* [Date](../tB/Core/Date), [Time](../tB/Core/Time) - set the current date and time
* [FormatDateTime](../tB/Modules/Strings/FormatDateTime) - formats an expression as a date/time string
* [MonthName](../tB/Modules/Strings/MonthName) - returns the name of the specified month
* [WeekdayName](../tB/Modules/Strings/WeekdayName) - returns the name of the specified day of the week

See also:

* [CDate](../tB/Modules/Conversion/CDate), [CVDate](../tB/Modules/Conversion/CVDate) - coerce an expression to **Date** or **Variant** (subtype **Date**)

## Introspection

Procedures:

* [CurrentProjectName](../tB/Modules/Compilation/CurrentProjectName) - returns the name of the current project
* [CurrentComponentName](../tB/Modules/Compilation/CurrentComponentName) - returns the name of the current component (module or class)
* [CurrentComponentCLSID](../tB/Modules/Compilation/CurrentComponentCLSID) - returns the Class ID (CLSID) of the current class
* [CurrentProcedureName](../tB/Modules/Compilation/CurrentProcedureName) - returns the name of the procedure in which the function is called
* [CurrentSourceFile](../tB/Modules/Compilation/CurrentSourceFile) - returns the full path of the current source file
* [ProcessorArchitecture](../tB/Modules/Compilation/ProcessorArchitecture) - returns the processor architecture of the running application
* [CompilerVersion](../tB/Modules/Compilation/CompilerVersion) - returns the twinBASIC compiler version number
* [GetDeclaredTypeProgId](../tB/Modules/HiddenModule/GetDeclaredTypeProgId), [GetDeclaredTypeClsid](../tB/Modules/HiddenModule/GetDeclaredTypeClsid), [GetDeclaredTypeIid](../tB/Modules/HiddenModule/GetDeclaredTypeIid), [GetDeclaredTypeEventIid](../tB/Modules/HiddenModule/GetDeclaredTypeEventIid) - return the COM ProgID/CLSID/IID/event IID of a declared type, resolved at compile time
* [GetDeclaredMinEnumValue](../tB/Modules/HiddenModule/GetDeclaredMinEnumValue), [GetDeclaredMaxEnumValue](../tB/Modules/HiddenModule/GetDeclaredMaxEnumValue) - return the smallest/largest value of a declared enumeration, resolved at compile time

See also:

* [IMEStatus](../tB/Modules/Information/IMEStatus) - the current Input Method Editor mode (East Asian Windows only)

## Memory and Pointers

Procedures:

* [ObjPtr](../tB/Modules/Information/ObjPtr) - return the COM-identity address of an object
* [StrPtr](../tB/Modules/Information/StrPtr) - return the address of the underlying buffer of a **String**
* [VarPtr](../tB/Modules/Information/VarPtr) - return the address of a variable
* [AllocMem](../tB/Modules/HiddenModule/AllocMem), [FreeMem](../tB/Modules/HiddenModule/FreeMem) - allocate/release native memory blocks
* [GetMem1](../tB/Modules/HiddenModule/GetMem1), [GetMem2](../tB/Modules/HiddenModule/GetMem2), [GetMem4](../tB/Modules/HiddenModule/GetMem4), [GetMem8](../tB/Modules/HiddenModule/GetMem8), [GetMemPtr](../tB/Modules/HiddenModule/GetMemPtr) - read N bytes from a memory address into a typed variable
* [PutMem1](../tB/Modules/HiddenModule/PutMem1), [PutMem2](../tB/Modules/HiddenModule/PutMem2), [PutMem4](../tB/Modules/HiddenModule/PutMem4), [PutMem8](../tB/Modules/HiddenModule/PutMem8), [PutMemPtr](../tB/Modules/HiddenModule/PutMemPtr) - write a typed value of N bytes to a memory address
* [vbaCopyBytes](../tB/Modules/HiddenModule/vbaCopyBytes), [vbaCopyBytesZero](../tB/Modules/HiddenModule/vbaCopyBytesZero) - copy a block of bytes; the *Zero* form clears the source after the copy

See also:

* [vbaAryMove](../tB/Modules/HiddenModule/vbaAryMove), [vbaRefVarAry](../tB/Modules/HiddenModule/vbaRefVarAry) - low-level **Variant**-array helpers (see [Arrays](#arrays))
* [vbaObjSet](../tB/Modules/HiddenModule/vbaObjSet), [vbaObjSetAddref](../tB/Modules/HiddenModule/vbaObjSetAddref), [vbaObjAddref](../tB/Modules/HiddenModule/vbaObjAddref) - object-pointer assignment and refcounting (see [COM and Automation](#com-and-automation))

## Threading and Atomics

Procedures:

* [InterlockedExchangePointer](../tB/Modules/HiddenModule/InterlockedExchangePointer) - atomically exchange a pointer-sized value
* [InterlockedCompareExchangePointer](../tB/Modules/HiddenModule/InterlockedCompareExchangePointer) - atomically compare-and-swap a pointer-sized value
* [InterlockedCompareExchange32](../tB/Modules/HiddenModule/InterlockedCompareExchange32), [InterlockedCompareExchange64](../tB/Modules/HiddenModule/InterlockedCompareExchange64) - atomic 32-bit / 64-bit compare-and-swap
* [InterlockedIncrement32](../tB/Modules/HiddenModule/InterlockedIncrement32), [InterlockedDecrement32](../tB/Modules/HiddenModule/InterlockedDecrement32) - atomic 32-bit increment / decrement

See also:

* [SetThreadGlobalErrorTrap](../tB/Modules/HiddenModule/SetThreadGlobalErrorTrap) - per-thread error trap (see [Error Handling](#error-handling))

## Inline Assembly and Codegen

Procedures:

* [Emit](../tB/Modules/HiddenModule/Emit) - inject custom **Byte** values into the codegen of the enclosing procedure
* [EmitAny](../tB/Modules/HiddenModule/EmitAny) - inject custom typed values into the codegen of the enclosing procedure (size inferred from each value's data type)
* [StackOffset](../tB/Modules/HiddenModule/StackOffset) - return the stack-frame offset of a variable, resolved at compile time
* [StackArgsSize](../tB/Modules/HiddenModule/StackArgsSize) - return the total size of stack-passed arguments to the enclosing procedure
* [UnprotectedAccess](../tB/Modules/HiddenModule/UnprotectedAccess) - return an object reference that bypasses access checks on private members

See also:

* [Direct Assembly Insertion](../Features/Advanced/Assembly) - the `Naked` modifier and worked examples

## Expression Evaluation

Procedures:

* [Eval](../tB/Modules/HiddenModule/Eval) - compile and evaluate a twinBASIC expression supplied as a string

See also:

* [ExpressionService module](../tB/Modules/ExpressionService/) - the underlying engine, when more control over binders or compiled-expression reuse is needed

## Financial

Procedures:

* [DDB](../tB/Modules/Financial/DDB) - depreciation of an asset via the Double-Declining Balance method
* [FV](../tB/Modules/Financial/FV) - future value of an investment with constant deposits and interest
* [Pmt](../tB/Modules/Financial/Pmt) - payment for a loan with constant payments and interest
* [IPmt](../tB/Modules/Financial/IPmt) - interest payment for a loan with constant payments and interest
* [PPmt](../tB/Modules/Financial/PPmt) - principal payment for a loan with constant payments and interest 
* [SYD](../tB/Modules/Financial/SYD) - sum-of-years' digits depreciation of an asset
* [SLN](../tB/Modules/Financial/SLN) - straight-line depreciation of an asset in one period
* [PV](../tB/Modules/Financial/PV) - present value of investment
* [IRR](../tB/Modules/Financial/IRR) - internal rate of return for a series of cash flows
* [MIRR](../tB/Modules/Financial/MIRR) - modified internal rate of return for a series of cash flow
* [Rate](../tB/Modules/Financial/Rate) - interest rate per period of an annuity
* [NPV](../tB/Modules/Financial/NPV) - net present value of an investment
* [NPer](../tB/Modules/Financial/NPer) - number of periods for an investment with constant deposits and interest
* [FormatCurrency](../tB/Modules/Strings/FormatCurrency) - format an expression as a currency string

## Unit Testing

Modules of the [Assert](../tB/Packages/Assert/) package:

* [Exact](../tB/Packages/Assert/Exact) - strictest comparison semantics; datatypes must match and no implicit conversions happen
* [Strict](../tB/Packages/Assert/Strict) - case-sensitive strings, otherwise standard twinBASIC equality
* [Permissive](../tB/Packages/Assert/Permissive) - case-insensitive strings, otherwise standard twinBASIC equality

Each module exposes the same fifteen assertions: **Succeed**, **Fail**, **Inconclusive**, **AreEqual** / **AreNotEqual**, **AreSame** / **AreNotSame**, **IsTrue** / **IsFalse**, **IsNothing** / **IsNotNothing**, **IsNull** / **IsNotNull**, **SequenceEquals** / **NotSequenceEquals**. All are tagged `[DebugOnly(True)]` and compile out of release builds.

## Deprecated

Statements:

* [DefBool, DefByte, DefInt, DefLng, DefCur, DefSng, DefDbl, DefDec, DefDate, DefStr, DefObj, DefVar](../tB/Core/Deftype) - used to give implicit types to single-letter variables

