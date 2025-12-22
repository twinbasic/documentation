---
title: Categories
parent: Reference Section
nav_order: 1
permalink: /Reference/Categories/
---

This chapter describes the global statements, procedures, functions and properties that form the core of the twinBASIC language.

{: .warning }

> Work in Progress

# Categorical List

## Compiler Control

* [Option](#option) - configure a compiler option
* [#If ... Then ... Else](##if-...-then-...-else) - enable or disable compilation of enclosed code

## Declarations and Definitions

* [Class](#class), [Module](#module) - define a class or module
* [Sub](#sub) - define a procedure
* [Function](#function) - define a function
* [Property](#property) - define a property
* [Enum](#enum) - define an enumeration type with associated constants
* [Type](#type) - declare a user-defined data type (UDT)/a structure
* [Declare](#declare) - declare an external/library procedure or function
* [Event](#event) - declare an event
* [Implements](#implements) - specifies that a class implements a given interface
* [End](#end) - terminate execution, finish a [Function](#function), [Procedure](#procedure), [Property](#property), or [Enum](#enum) definition, fiish a [Type](#type) declaration; finish a [Class](#class) or [Module](#module), finish an [If](#if), [Select](#select), or [With](#with) block

## Flow Control

Statements:

* [Call](#call) - invokes a procedure or function
* [Do ... Loop](#do-...-loop), [For ... Next](#for-...-next), [While ... Wend](#while-...-wend) - loops
* [If ... Then ... Else](#if-...-then-...-else) - execute code conditionally
* [Continue](#continue) - skip to the next iteration of the loop
* [Exit](#exit) - exit a loop, procedure, function or property
* [Select Case](#select-case) - execute a code block selected by an expression
* [With](#with) - bring a variable or expression into scope
* [Goto](#goto), [GoSub ... Return](#gosub-...-return) - transfer execution to another location
* [Resume](#resume) - resumes execution after an error has been caught
* [On Error](#on-error) - specifies what to do when an error occurs
* [On ... GoTo, On ... GoSub](#on-...-goto,-on-...-gosub) - transfer execution to a location selected by an expression
* [Stop](#stop) - interrupt execution

See also: 

* [End](#end) - terminate execution.

## Variable Declaration

Statements:

* [Dim](#dim) - declare a typed scalar or array variable
* [Const](#const) - declare a constant
* [Public](#public) - declare a public variable in a class or module
* [Private](#private) - declare a private variable in a class or module
* [Static](#static) - declare a a variable of static duration

See also:

* [Erase](#erase) - clear/fill an array
* [ReDim](#redim) - change the size of an array

## Variable Assignment and Modification

Statements:

- [Let](#let) - sets the value of a variable
- [Set](#set) - changes the object referred by the variable
- [Erase](#erase) - fills a fixed-size array with default values, or invalidates a dynamic array
- [LSet](#lset) - assigns a user-defined type, or left-aligns a string
- [RSet](#rset) - right-aligns a string
- [ReDim](#redim) - change the size of a dynamically-sized array,

## File I/O

Statements:

- [Open](#open), [Close](#close) - open/close a file for I/O operations
- [Get](#get), [Put](#put) - read/write data from an open random access file
- [Line Input](#line-input), [Print](#print) - read a line from an open text file, write text to a file
- [Input](#input), [Write](#write) - read/write data from an open sequential access file
- [Seek](#seek) - change the current access position in an open file
- [Lock](#lock), [Unlock](#unlock) - lock/unlock a range of records in an open file

Procedures:

* [Reset](#reset) - close all open disk files
* [Width](#width) - set the limit for line lengths when printing
* [ChDir](#chdir), [ChDrive](#chdrive) - change the current working directory and disk drive
* [MkDir](#mkdir), [RmDir](#rmdir ) - create/remove a directory on disk
* [Name](#name) - rename a file or directory on disk
* [SetAttr](#setattr) - set attributes of a file on disk
* [FileCopy](#filecopy) - copy a file on disk
* [Kill](#kill) - delete a file from disk
* [SavePicture](#savepicture) - write a `Picture` or `Image` to a disk file

## State Management

Procedures:

* [Load](#load), [Unload](#unload) - load/unload a form or control into memory
* [SaveSetting](#savesetting) - store a string value to the system registry
* [DeleteSetting](#deletesetting) - remove value from the system registry

Functions:

* [GetSetting](#getsetting) - retrieve a string value from the system registry

## Events and Interaction

Statements:

* [RaiseEvent](#raiseevent) - raise an event that may be handled by event handlers

See also

* [Event](#event) - declare an event

Procedures:

* [AppActivate](#appactivate) - change the focus to, or activate, a named window

* [Beep](#beep) - sound a system beep
* [SendKeys](#sendkeys) - send keystrokes to the active window

## Mathematics

Functions:

* [Atn](#atn), [Cos](#cos), [Sin](#sin), [Tan](#tan) - trigonometric functions
* [Sqr](#sqr) - take a square root
* [Exp](#exp) - calculate an exponential with base $e$
* [Log](#log) - calculate the natural (base $e$) logarithm of a number
* [Sgn](#sgn) - return the sign of a number
* [Abs](#abs) - returns the absolute value of a number
* [Round](#round) - round the number to a given number of decimal places
* [Rnd](#rnd) - generate a random number in the range [0.0, 1.0)

Procedures:

* [Randomize](#randomize) - seed the random number generator

## String Handling

Statements that modify strings:

* [Mid =](#mid-=), [MidB =](#midb-=) - assign to or replace characters or wide/narrow string sections

Functions that check properties of strings:

* [Len\$, Len, LenB\$, LenB](#len$,-len,-lenb$,-lenb) - returns the length of a string
* [Asc, AscB, AscW](#asc,-ascb,-ascw) - returns the character code of the first letter in a string
* [StrComp](#strcomp) - compares two strings
* [InStr$, InStrB, InStr](#instr\$,-instrb,-instr) - finds the position of a given substring in a string

Functions that return new strings:

* [Chr\$, Chr, ChrB\$, Chr, ChrW\$, ChrW](#chr$,-chr,-chrb$,-chrb,-chrw$,-chrw) - returns the character having a given code
* [Space$, Space](#space$,-space) - return a string of spaces
* [String\$, String](#string$,-string) - return a string of specified characters

Functions that return modified strings:

* [Left\$, Left, LeftB$, LeftB](#left$,-left,-leftb$,-leftb) - extract a left substring of a string
* [Mid$, Mid, MidB\$, MidB](#mid$,-mid,-midb$,-midb)- extract a substring of a string
* [Right\$, Right, RightB\$, RightB](#right$,-right,-rightb$,-rightb) - extract a right substring of a string
* [LTrim\$, LTrim, RTrim\$, RTrim](#ltrim$,-ltrim,-rtrim$,-rtrim) - removes leading/trailing spaces from a string
* [Trim$, Trim](#trim$,-trim) - removes leading and trailing spaces from a string
* [StrReverse](#strreverse) - reverses the order of characters of a string
* [LCase\$, LCase, RCase\$, RCase](#lcase$,-lcase,-rcase$,-rcase) - capitalizes or lowercases a string
* [StrConv](#strconv) - converts the string to a specified format
* [Join](#join) - concatenates a string array using a given delimiter
* [Split](#split) - splits a string into a string array
* [Replace](#replace) - replaces substrings in a string
* [Filter](#filter) - filters a string array into a subset according to criteria
* [InStrRev](#instrrev) - filters a string array into a subset according to criteria
* [Format\$, Format](#format$,-format) - format a numeric expression in a specific way
* [FormatNumber](#formatnumber) - formats an expression as a numeric string
* [FormatPercent](#formatpercent) - formats an expression as a percent string

See also:

* [FormatCurrency](#formatcurrency) - format an expression as a currency string
* [FormatDateTime](#formatdatetime) - formats an expression as a date/time string

## Date and Time

Properties:

* [Date](#date), [Time](#time) - set the current date and time

Functions:

* [FormatDateTime](#formatdatetime) - formats an expression as a date/time string
* [MonthName](#monthname) - returns the name of the specified month
* [WeekdayName](#weekdayname) - returns the name of the specified day of the week

## Financial

Functions:

* [DDB](#ddb) - depreciation of an asset via the Double-Declining Balance method
* [FV](#fv) - future value of an investment with constant deposits and interest
* [Pmt](#pmt) - payment for a loan with constant payments and interest
* [IPmt](#ipmt) - interest payment for a loan with constant payments and interest
* [PPmt](#ppmt) - principal payment for a loan with constant payments and interest 
* [SYD](#syd) - sum-of-years' digits depreciation of an asset
* [SLN](#sln) - straight-line depreciation of an asset in one period
* [PV](#pv) - present value of investment
* [IRR]($irr) - internal rate of return for a series of cash flows
* [MIRR](#mirr) - modified internal rate of return for a series of cash flow
* [Rate](#rate) - interest rate per period of an annuity
* [NPV](#npv) - net present value of an investment
* [NPer](#nper) - number of periods for an investment with constant deposits and interest
* [FormatCurrency](#formatcurrency) - format an expression as a currency string

## Deprecated

Statements:

* [DefBool, DefByte, DefInt, DefLng, DefCur, DefSng, DefDbl, DefDec, DefDate, DefStr, DefObj, DefVar](#defbool-through-defvar) - used to give implicit types to single-letter variables
* [Error](#error) - raise an error

# List By Module

## Financial

* [DDB](#ddb) - depreciation of an asset via the Double-Declining Balance method
* [FV](#fv) - future value of an investment with constant deposits and interest
* [Pmt](#pmt) - payment for a loan with constant payments and interest
* [IPmt](#ipmt) - interest payment for a loan with constant payments and interest
* [PPmt](#ppmt) - principal payment for a loan with constant payments and interest 
* [SYD](#syd) - sum-of-years' digits depreciation of an asset
* [SLN](#sln) - straight-line depreciation of an asset in one period
* [PV](#pv) - present value of investment
* [IRR]($irr) - internal rate of return for a series of cash flows
* [MIRR](#mirr) - modified internal rate of return for a series of cash flow
* [Rate](#rate) - interest rate per period of an annuity
* [NPV](#npv) - net present value of an investment
* [NPer](#nper) - number of periods for an investment with constant deposits and interest

## Math

Functions:

* [Atn](#atn), [Cos](#cos), [Sin](#sin), [Tan](#tan) - trigonometric functions
* [Sqr](#sqr) - take a square root
* [Exp](#exp) - calculate an exponential with base $e$
* [Log](#log) - calculate the natural (base $e$) logarithm of a number
* [Sgn](#sgn) - return the sign of a number
* [Abs](#abs) - returns the absolute value of a number
* [Round](#round) - round the number to a given number of decimal places
* [Rnd](#rnd) - generate a random number in the range [0.0, 1.0)

Procedures:

* [Randomize](#randomize) - seed the random number generator

## Strings

Functions that check properties of strings:

* [Len\$, Len, LenB\$, LenB](#len$,-len,-lenb$,-lenb) - returns the length of a string
* [Asc, AscB, AscW](#asc,-ascb,-ascw) - returns the character code of the first letter in a string
* [StrComp](#strcomp) - compares two strings
* [InStr$, InStrB, InStr](#instr\$,-instrb,-instr) - finds the position of a given substring in a string

Functions that return new strings:

* [Chr\$, Chr, ChrB\$, Chr, ChrW\$, ChrW](#chr$,-chr,-chrb$,-chrb,-chrw$,-chrw) - returns the character having a given code
* [Space$, Space](#space$,-space) - return a string of spaces
* [String\$, String](#string$,-string) - return a string of specified characters

Functions that return modified strings:

* [Left\$, Left, LeftB$, LeftB](#left$,-left,-leftb$,-leftb) - extract a left substring of a string
* [Mid$, Mid, MidB\$, MidB](#mid$,-mid,-midb$,-midb)- extract a substring of a string
* [Right\$, Right, RightB\$, RightB](#right$,-right,-rightb$,-rightb) - extract a right substring of a string
* [LTrim\$, LTrim, RTrim\$, RTrim](#ltrim$,-ltrim,-rtrim$,-rtrim) - removes leading/trailing spaces from a string
* [Trim$, Trim](#trim$,-trim) - removes leading and trailing spaces from a string
* [StrReverse](#strreverse) - reverses the order of characters of a string
* [LCase\$, LCase, RCase\$, RCase](#lcase$,-lcase,-rcase$,-rcase) - capitalizes or lowercases a string
* [StrConv](#strconv) - converts the string to a specified format
* [Join](#join) - concatenates a string array using a given delimiter
* [Split](#split) - splits a string into a string array
* [Replace](#replace) - replaces substrings in a string
* [Filter](#filter) - filters a string array into a subset according to criteria
* [InStrRev](#instrrev) - filters a string array into a subset according to criteria
* [Format\$, Format](#format$,-format) - format a numeric expression in a specific way
* [FormatCurrency](#formatcurrency) - format an expression as a currency string
* [FormatDateTime](#formatdatetime) - formats an expression as a date/time string
* [FormatNumber](#formatnumber) - formats an expression as a numeric string
* [FormatPercent](#formatpercent) - formats an expression as a percent string
* [MonthName](#monthname) - returns the name of the specified month
* [WeekdayName](#weekdayname) - returns the name of the specified day of the week

