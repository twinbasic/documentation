---
title: Categories
parent: Reference Section
nav_order: 1
permalink: /Reference/Categories
---

This chapter lists the global statements and procedures that form the core of the twinBASIC language.

> [!WARNING]
> Work in Progress Below

# Categorical List

## Compiler Control

* [Option](../tB/Core/Option) - configure a compiler option
* [#If ... Then ... Else](../tB/Core/Topic-Preprocessor) - enable or disable compilation of enclosed code

## Declarations and Definitions

* [Class](../tB/Core/Class), [Module](../tB/Core/Module) - define a class or module
* [Sub](../tB/Core/Sub) - define a procedure
* [Function](../tB/Core/Function) - define a function
* [Property](../tB/Core/Property) - define a property
* [Enum](../tB/Core/Enum) - define an enumeration type with associated constants
* [Type](../tB/Core/Type) - declare a user-defined data type (UDT)/a structure
* [Declare](../tB/Core/Declare) - declare an external/library procedure or function
* [Event](../tB/Core/Event) - declare an event
* [Implements](../tB/Core/Implements) - specifies that a class implements a given interface
* [End](../tB/Core/End) - terminate execution, finish a Function, Sub, Property, or Enum definition, finish a Type declaration; finish a Class or Module, finish an If, Select, or With block

## Flow Control

Statements:

* [Call](../tB/Core/Call) - invokes a procedure or function
* [Do ... Loop](../tB/Core/Do-Loop), [For ... Next](../tB/Core/For-Next), [While ... Wend](../tB/Core/While-Wend) - loops
* [If ... Then ... Else](../tB/Core/If-Then-Else) - execute code conditionally
* [Continue](../tB/Core/Continue) - skip to the next iteration of the loop
* [Exit](../tB/Core/Exit) - exit a loop, procedure, function or property
* [Select Case](../tB/Core/Select-Case) - execute a code block selected by an expression
* [With](../tB/Core/With) - bring a variable or expression into scope
* [Goto](../tB/Core/GoTo), [GoSub ... Return](../tB/Core/GoSub-Return) - transfer execution to another location
* [Resume](../tB/Core/Resume) - resumes execution after an error has been caught
* [On Error](../tB/Core/On-Error) - specifies what to do when an error occurs
* [On ... GoTo](../tB/Core/On-GoTo), [On ... GoSub](../tB/Core/On-GoSub) - transfer execution to a location selected by an expression
* [Stop](../tB/Core/Stop) - interrupt execution

See also: 

* [End](../tB/Core/End) - terminate execution.

## Variable Declaration

Statements:

* [Dim](../tB/Core/Dim) - declare a typed scalar or array variable
* [Const](../tB/Core/Const) - declare a constant
* [Public](../tB/Core/Public) - declare a public variable in a class or module
* [Private](../tB/Core/Private) - declare a private variable in a class or module
* [Static](../tB/Core/Static) - declare a a variable of static duration

See also:

* [Erase](../tB/Core/Erase) - clear/fill an array
* [ReDim](../tB/Core/ReDim) - change the size of an array

## Variable Assignment and Modification

Statements:

- [Let](../tB/Core/Let) - sets the value of a variable
- [Set](../tB/Core/Set) - changes the object referred by the variable
- [Erase](../tB/Core/Erase) - fills a fixed-size array with default values, or invalidates a dynamic array
- [LSet](../tB/Core/LSet) - assigns a user-defined type, or left-aligns a string
- [RSet](../tB/Core/RSet) - right-aligns a string
- [ReDim](../tB/Core/ReDim) - change the size of a dynamically-sized array,

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
* [Width](../tB/Core/Width) - set the limit for line lengths when printing
* [ChDir](../tB/Core/ChDir), [ChDrive](../tB/Core/ChDrive) - change the current working directory and disk drive
* [MkDir](../tB/Core/MkDir), [RmDir](../tB/Core/RmDir) - create/remove a directory on disk
* [Name](../tB/Core/Name) - rename a file or directory on disk
* [SetAttr](../tB/Core/SetAttr) - set attributes of a file on disk
* [FileCopy](../tB/Core/FileCopy) - copy a file on disk
* [Kill](../tB/Core/Kill) - delete a file from disk
* [SavePicture](../tB/Core/SavePicture) - write a `Picture` or `Image` to a disk file

## State Management

Procedures:

* [Load](../tB/Core/Load), [Unload](../tB/Core/Unload) - load/unload a form or control into memory
* [GetSetting](../tB/Core/GetSetting), [SaveSetting](../tB/Core/SaveSetting) - retrieve/store a string value from/to the system registry
* [DeleteSetting](../tB/Core/DeleteSetting) - remove value from the system registry

## Events and Interaction

Statements:

* [RaiseEvent](../tB/Core/RaiseEvent) - raise an event that may be handled by event handlers

See also

* [Event](../tB/Core/Event) - declare an event

Procedures:

* [AppActivate](../tB/Core/AppActivate) - change the focus to, or activate, a named window
* [Beep](../tB/Core/Beep) - sound a system beep
* [SendKeys](../tB/Core/SendKeys) - send keystrokes to the active window

## Mathematics

Procedures:

* [Atn](../tB/Modules/Math#atn), [Cos](../tB/Modules/Math#cos), [Sin](../tB/Modules/Math#sin), [Tan](../tB/Modules/Math#tan) - trigonometric functions
* [Sqr](../tB/Modules/Math#sqr) - take a square root
* [Exp](../tB/Modules/Math#exp) - calculate an exponential with base $e$
* [Log](../tB/Modules/Math#log) - calculate the natural (base $e$) logarithm of a number
* [Sgn](../tB/Modules/Math#sgn) - return the sign of a number
* [Abs](../tB/Modules/Math#abs) - returns the absolute value of a number
* [Round](../tB/Modules/Math#round) - round the number to a given number of decimal places
* [Rnd](../tB/Modules/Math#rnd) - generate a random number in the range [0.0, 1.0)
* [Randomize](../tB/Modules/Math#randomize) - seed the random number generator

## String Handling

Statements that modify strings:

* [Mid =](../tB/Core/Mid-equals), [MidB =](../tB/Core/MidB-equals) - assign to or replace characters or wide/narrow string sections

Procedures that check properties of strings:

* [Len\$, Len, LenB\$, LenB](../tB/Modules/Strings#len-len-lenb-lenb) - the length of a string
* [Asc, AscB, AscW](../tB/Modules/Strings#asc-ascb-ascw) - returns the character code of the first letter in a string
* [StrComp](../tB/Modules/Strings#strcomp) - compares two strings
* [InStr$, InStrB, InStr](../tB/Modules/Strings#instr-instrb-instr) - finds the position of a given substring in a string

Procedures that create strings:

* [Chr\$, Chr, ChrB\$, ChrB, ChrW\$, ChrW](../tB/Modules/Strings#chr-chr-chrb-chrb-chrw-chrw) - returns the character having a given code
* [Space$, Space](../tB/Modules/Strings#space-space) - return a string of spaces
* [String\$, String](../tB/Modules/Strings#string-string) - return a string of specified characters

Procedures that return modified strings:

* [Left\$, Left, LeftB$, LeftB](../tB/Modules/Strings#left-left-leftb-leftb) - extract a left substring of a string
* [Mid$, Mid, MidB\$, MidB](../tB/Modules/Strings#mid-mid-midb-midb)- extract a substring of a string
* [Right\$, Right, RightB\$, RightB](../tB/Modules/Strings#right-right-rightb-rightb) - extract a right substring of a string
* [LTrim\$, LTrim, RTrim\$, RTrim](../tB/Modules/Strings#ltrim-ltrim-rtrim-rtrim) - removes leading/trailing spaces from a string
* [Trim$, Trim](../tB/Modules/Strings#trim-trim) - removes leading and trailing spaces from a string
* [StrReverse](../tB/Modules/Strings#strreverse) - reverses the order of characters of a string
* [LCase\$, LCase, RCase\$, RCase](../tB/Modules/Strings#lcase-lcase-rcase-rcase) - capitalizes or lowercases a string
* [StrConv](../tB/Modules/Strings#strconv) - converts the string to a specified format
* [Join](../tB/Modules/Strings#join) - concatenates a string array using a given delimiter
* [Split](../tB/Modules/Strings#split) - splits a string into a string array
* [Replace](../tB/Modules/Strings#replace) - replaces substrings in a string
* [Filter](../tB/Modules/Strings#filter) - filters a string array into a subset according to criteria
* [InStrRev](../tB/Modules/Strings#instrrev) - filters a string array into a subset according to criteria
* [Format\$, Format](../tB/Modules/Strings#format-format) - format a numeric expression in a specific way
* [FormatNumber](../tB/Modules/Strings#formatnumber) - formats an expression as a numeric string
* [FormatPercent](../tB/Modules/Strings#formatpercent) - formats an expression as a percent string

See also:

* [FormatCurrency](../tB/Modules/Strings#formatcurrency) - format an expression as a currency string
* [FormatDateTime](../tB/Modules/Strings#formatdatetime) - formats an expression as a date/time string

## Date and Time

Procedures:

* [Date](../tB/Core/Date), [Time](../tB/Core/Time) - set the current date and time
* [FormatDateTime](../tB/Modules/Strings#formatdatetime) - formats an expression as a date/time string
* [MonthName](../tB/Modules/Strings#monthname) - returns the name of the specified month
* [WeekdayName](../tB/Modules/Strings#weekdayname) - returns the name of the specified day of the week

## Financial

Procedures:

* [DDB](../tB/Modules/Financial#ddb) - depreciation of an asset via the Double-Declining Balance method
* [FV](../tB/Modules/Financial#fv) - future value of an investment with constant deposits and interest
* [Pmt](../tB/Modules/Financial#pmt) - payment for a loan with constant payments and interest
* [IPmt](../tB/Modules/Financial#ipmt) - interest payment for a loan with constant payments and interest
* [PPmt](../tB/Modules/Financial#ppmt) - principal payment for a loan with constant payments and interest 
* [SYD](../tB/Modules/Financial#syd) - sum-of-years' digits depreciation of an asset
* [SLN](../tB/Modules/Financial#sln) - straight-line depreciation of an asset in one period
* [PV](../tB/Modules/Financial#pv) - present value of investment
* [IRR](../tB/Modules/Financial#irr) - internal rate of return for a series of cash flows
* [MIRR](../tB/Modules/Financial#mirr) - modified internal rate of return for a series of cash flow
* [Rate](../tB/Modules/Financial#rate) - interest rate per period of an annuity
* [NPV](../tB/Modules/Financial#npv) - net present value of an investment
* [NPer](../tB/Modules/Financial#nper) - number of periods for an investment with constant deposits and interest
* [FormatCurrency](../tB/Modules/Strings#formatcurrency) - format an expression as a currency string

## Deprecated

Statements:

* [DefBool, DefByte, DefInt, DefLng, DefCur, DefSng, DefDbl, DefDec, DefDate, DefStr, DefObj, DefVar](../tB/Core/Deftype) - used to give implicit types to single-letter variables
* [Error](../tB/Core/Error) - raise an error

