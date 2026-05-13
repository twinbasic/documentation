---
title: Procedures and Functions
parent: Reference Section
nav_order: 3
permalink: /Reference/Procedures-and-Functions
---

# Procedures and Functions

> [!WARNING]
> Work in Progress

## A

- [Abs](../tB/Modules/Math/Abs) -- returns the absolute value of a number
- [AllocMem](../tB/Modules/HiddenModule/AllocMem) -- allocates a block of native memory and returns its address
- [AppActivate](../tB/Modules/Interaction/AppActivate) -- activates an application window
- [Array](../tB/Modules/Information/Array) -- creates a **Variant** array from a comma-separated list of values, or destructures one when used on the left of an assignment
- [Asc, AscB, AscW](../tB/Modules/Strings/Asc) -- returns the character code of the first letter in a string
- [Atn](../tB/Modules/Math/Atn) -- returns the arctangent of a number

## B

- [Beep](../tB/Modules/Interaction/Beep) -- sounds a tone through the computer’s speaker

## C

- [Calendar](../tB/Modules/DateTime/Calendar) -- returns or sets the calendar type (Gregorian or Hijri)
- [CallByDispId](../tB/Modules/Interaction/CallByDispId) -- invokes a method or property on an object dynamically by IDispatch dispatch ID
- [CallByName](../tB/Modules/Interaction/CallByName) -- invokes a method or property on an object dynamically by name
- [CBool](../tB/Modules/Conversion/CBool) -- coerces an expression to a **Boolean**
- [CByte](../tB/Modules/Conversion/CByte) -- coerces an expression to a **Byte**
- [CCur](../tB/Modules/Conversion/CCur) -- coerces an expression to a **Currency**
- [CDate](../tB/Modules/Conversion/CDate) -- coerces an expression to a **Date**
- [CDbl](../tB/Modules/Conversion/CDbl) -- coerces an expression to a **Double**
- [CDec](../tB/Modules/Conversion/CDec) -- coerces an expression to a **Decimal**
- [ChDir](../tB/Core/ChDir) -- changes the current directory or folder
- [ChDrive](../tB/Core/ChDrive) -- changes the current drive
- [CurDir](../tB/Core/CurDir) -- returns the current path
- [Choose](../tB/Modules/Interaction/Choose) -- returns one value from a list, selected by 1-based index
- [Chr$, Chr, ChrB$, ChrB, ChrW$, ChrW](../tB/Modules/Strings/Chr) -- returns the character associated with a given character code
- [CInt](../tB/Modules/Conversion/CInt) -- coerces an expression to an **Integer**
- [CLng](../tB/Modules/Conversion/CLng) -- coerces an expression to a **Long**
- [CLngLng](../tB/Modules/Conversion/CLngLng) -- coerces an expression to a **LongLong**
- [CLngPtr](../tB/Modules/Conversion/CLngPtr) -- coerces an expression to a **LongPtr**
- [Command$, Command](../tB/Modules/Interaction/Command) -- returns the command-line arguments passed to the program
- [CompilerVersion](../tB/Modules/Compilation/CompilerVersion) -- returns the twinBASIC compiler version number
- [ConvertIconToBitmap](../tB/Modules/HiddenModule/ConvertIconToBitmap) -- converts an icon picture to a bitmap picture
- [Cos](../tB/Modules/Math/Cos) -- returns the cosine of an angle
- [CreateGUID](../tB/Modules/HiddenModule/CreateGUID) -- generates a fresh GUID and returns it as a registry-formatted string
- [CreateObject](../tB/Modules/Interaction/CreateObject) -- creates a new instance of a COM/Automation object
- [CreateStdPictureFromHandle](../tB/Modules/HiddenModule/CreateStdPictureFromHandle) -- wraps a GDI bitmap or icon handle in an **stdole.StdPicture**
- [CSng](../tB/Modules/Conversion/CSng) -- coerces an expression to a **Single**
- [CStr](../tB/Modules/Conversion/CStr) -- coerces an expression to a **String**
- [CType](../tB/Modules/Conversion/CType) -- generic type conversion supporting the **CType(Of *type*)** cast operator
- [CurrentComponentCLSID](../tB/Modules/Compilation/CurrentComponentCLSID) -- returns the Class ID (CLSID) of the current class
- [CurrentComponentName](../tB/Modules/Compilation/CurrentComponentName) -- returns the name of the current component (module or class)
- [CurrentProcedureName](../tB/Modules/Compilation/CurrentProcedureName) -- returns the name of the procedure in which the function is called
- [CurrentProjectName](../tB/Modules/Compilation/CurrentProjectName) -- returns the name of the current project
- [CurrentSourceFile](../tB/Modules/Compilation/CurrentSourceFile) -- returns the full path of the current source file
- [CVar](../tB/Modules/Conversion/CVar) -- coerces an expression to a **Variant**
- [CVDate](../tB/Modules/Conversion/CVDate) -- coerces an expression to a **Variant** of subtype **Date**
- [CVErr](../tB/Modules/Conversion/CVErr) -- coerces a numeric expression to a **Variant** of subtype **Error**

## D

- [Date](../tB/Core/Date) -- sets or returns the current system date
- [DateAdd](../tB/Modules/DateTime/DateAdd) -- adds a time interval to a date
- [DateDiff](../tB/Modules/DateTime/DateDiff) -- returns the number of time intervals between two dates
- [DatePart](../tB/Modules/DateTime/DatePart) -- returns a specified part of a given date
- [DateSerial](../tB/Modules/DateTime/DateSerial) -- returns a date for a specified year, month, and day
- [DateValue](../tB/Modules/DateTime/DateValue) -- converts a string to a date
- [Day](../tB/Modules/DateTime/Day) -- returns the day of the month from a date value
- [DDB](../tB/Modules/Financial/DDB) -- returns the depreciation of an asset via the double-declining balance method
- [DeleteSetting](../tB/Modules/Interaction/DeleteSetting) -- deletes a section or key setting from an application’s entry in the Windows registry
- [Dir](../tB/Core/Dir) -- returns the name of a file, directory, folder, or volume label that matches a pattern
- [DoEvents](../tB/Modules/Interaction/DoEvents) -- yields control to the message loop so pending events can be processed

## E

- [Emit](../tB/Modules/HiddenModule/Emit) -- injects custom **Byte** values into the codegen stream of the enclosing procedure
- [EmitAny](../tB/Modules/HiddenModule/EmitAny) -- injects custom typed values into the codegen stream of the enclosing procedure
- [Environ$, Environ](../tB/Modules/Interaction/Environ) -- returns the value of a process environment variable
- [EOF](../tB/Modules/FileSystem/EOF) -- returns whether the end of a file has been reached
- [Erl](../tB/Modules/Information/Erl) -- returns the line number where the most recent run-time error occurred
- [Err](../tB/Modules/Information/Err) -- returns the **ErrObject** describing the current run-time error state
- [Error$, Error](../tB/Modules/Conversion/Error) -- returns the error message that corresponds to a given error number
- [Eval](../tB/Modules/HiddenModule/Eval) -- compiles and evaluates a twinBASIC expression supplied as a string
- [Exp](../tB/Modules/Math/Exp) -- returns *e* (the base of natural logarithms) raised to a power

## F

- [FileAttr](../tB/Modules/FileSystem/FileAttr) -- returns the file mode for files opened with the **Open** statement
- [FileCopy](../tB/Core/FileCopy) -- copies a file
- [FileDateTime](../tB/Modules/FileSystem/FileDateTime) -- returns the date and time when a file was created or last modified
- [FileLen](../tB/Modules/FileSystem/FileLen) -- returns the length of a file in bytes
- [Filter](../tB/Modules/Strings/Filter) -- filters a string array into a subset according to criteria
- [Fix](../tB/Modules/Conversion/Fix) -- returns the integer portion of a number, truncating toward zero
- [Format$, Format](../tB/Modules/Strings/Format) -- formats an expression according to instructions contained in a format expression
- [FormatCurrency](../tB/Modules/Strings/FormatCurrency) -- formats an expression as a currency value
- [FormatDateTime](../tB/Modules/Strings/FormatDateTime) -- formats an expression as a date or time
- [FormatNumber](../tB/Modules/Strings/FormatNumber) -- formats an expression as a number
- [FormatPercent](../tB/Modules/Strings/FormatPercent) -- formats an expression as a percentage
- [FreeFile](../tB/Modules/FileSystem/FreeFile) -- returns the next file number available for use by the **Open** statement
- [FreeMem](../tB/Modules/HiddenModule/FreeMem) -- frees memory allocated with **AllocMem**
- [FV](../tB/Modules/Financial/FV) -- returns the future value of an annuity based on periodic fixed payments and a fixed interest rate

## G

- [GetAllSettings](../tB/Modules/Interaction/GetAllSettings) -- returns every key/value pair in a section of an application's registry entry
- [GetAttr](../tB/Modules/FileSystem/GetAttr) -- returns the attributes of a file or directory
- [GetMem1](../tB/Modules/HiddenModule/GetMem1) -- reads one byte from a memory address into a **Byte** variable
- [GetMem2](../tB/Modules/HiddenModule/GetMem2) -- reads two bytes from a memory address into an **Integer** variable
- [GetMem4](../tB/Modules/HiddenModule/GetMem4) -- reads four bytes from a memory address into a **Long** variable
- [GetMem8](../tB/Modules/HiddenModule/GetMem8) -- reads eight bytes from a memory address into a **Currency** variable
- [GetMemPtr](../tB/Modules/HiddenModule/GetMemPtr) -- reads a pointer-sized value from a memory address into a **LongPtr** variable
- [GetObject](../tB/Modules/Interaction/GetObject) -- returns a reference to an Automation object loaded from a file or already running
- [GetSetting](../tB/Modules/Interaction/GetSetting) -- returns a string key setting value from an application’s entry in the Windows registry

## H

- [Hex$, Hex](../tB/Modules/Conversion/Hex) -- returns a string representing the hexadecimal value of a number
- [Hour](../tB/Modules/DateTime/Hour) -- returns the hour of the day from a time value

## I

- [If](../tB/Modules/Interaction/If) -- evaluates an expression and returns one of two values, with short-circuit evaluation
- [IIf](../tB/Modules/Interaction/IIf) -- evaluates an expression and returns one of two values; both branches are always evaluated
- [IMEStatus](../tB/Modules/Information/IMEStatus) -- returns the status of the Input Method Editor
- [Input, Input$](../tB/Modules/FileSystem/Input) -- reads a fixed number of characters from an open sequential file
- [InputB, InputB$](../tB/Modules/FileSystem/InputB) -- reads a fixed number of bytes from an open sequential file
- [InputBox](../tB/Modules/Interaction/InputBox) -- prompts the user for a line of text and returns what was entered
- [InStr$, InStrB, InStr](../tB/Modules/Strings/InStr) -- returns the position of one string within another
- [InStrRev](../tB/Modules/Strings/InStrRev) -- returns the position of one string within another, searching from the end
- [Int](../tB/Modules/Conversion/Int) -- returns the integer portion of a number, rounding toward negative infinity
- [IPmt](../tB/Modules/Financial/IPmt) -- returns the interest payment for a given period of an annuity
- [IRR](../tB/Modules/Financial/IRR) -- returns the internal rate of return for a series of periodic cash flows
- [IsArray](../tB/Modules/Information/IsArray) -- returns whether a variable is an array
- [IsArrayInitialized](../tB/Modules/Information/IsArrayInitialized) -- returns whether an array has been dimensioned
- [IsDate](../tB/Modules/Information/IsDate) -- returns whether an expression can be evaluated as a date
- [IsEmpty](../tB/Modules/Information/IsEmpty) -- returns whether a **Variant** is uninitialised
- [IsError](../tB/Modules/Information/IsError) -- returns whether an expression is an error subtype
- [IsMissing](../tB/Modules/Information/IsMissing) -- returns whether an optional argument was supplied
- [IsNull](../tB/Modules/Information/IsNull) -- returns whether a variable contains a **Null** value
- [IsNumeric](../tB/Modules/Information/IsNumeric) -- returns whether an expression can be evaluated as a number
- [IsObject](../tB/Modules/Information/IsObject) -- returns whether a variable refers to an object

## J

- [Join](../tB/Modules/Strings/Join) -- concatenates a string array using a given delimiter

## K

- [Kill](../tB/Core/Kill) -- deletes files from a disk

## L

- [LBound](../tB/Modules/Information/LBound) -- returns the smallest valid subscript for a dimension of an array
- [LCase$, LCase](../tB/Modules/Strings/LCase) -- returns a string converted to lowercase
- [Left$, Left, LeftB$, LeftB](../tB/Modules/Strings/Left) -- returns the leftmost characters from a string
- [Len, LenB](../tB/Modules/Strings/Len) -- returns the length of a string, or the storage size of a variable
- [Load](../tB/Core/Load) -- loads an object (typically a form) into memory without showing it
- [Loc](../tB/Modules/FileSystem/Loc) -- returns the current read/write position within an open file
- [LOF](../tB/Modules/FileSystem/LOF) -- returns the size, in bytes, of an open file
- [Log](../tB/Modules/Math/Log) -- returns the natural (base *e*) logarithm of a number
- [LTrim$, LTrim](../tB/Modules/Strings/LTrim) -- removes leading spaces from a string

## M

- [MacID](../tB/Modules/Conversion/MacID) -- on the Macintosh, converts a 4-character constant to a value usable by **Dir**, **Kill**, **Shell**, or **AppActivate**
- [Mid$, Mid, MidB$, MidB](../tB/Modules/Strings/Mid) -- returns a substring of a string
- [Minute](../tB/Modules/DateTime/Minute) -- returns the minute of the hour from a time value
- [MIRR](../tB/Modules/Financial/MIRR) -- returns the modified internal rate of return for a series of periodic cash flows
- [MkDir](../tB/Core/MkDir) -- creates a new directory or folder
- [Month](../tB/Modules/DateTime/Month) -- returns the month of the year from a date value
- [MonthName](../tB/Modules/Strings/MonthName) -- returns the name of the specified month
- [MsgBox](../tB/Modules/Interaction/MsgBox) -- displays a modal message dialog and returns the button the user clicked

## N

- [Name](../tB/Core/Name) -- renames a disk file, directory, or folder
- [NPer](../tB/Modules/Financial/NPer) -- returns the number of periods for an annuity based on periodic fixed payments and a fixed interest rate
- [NPV](../tB/Modules/Financial/NPV) -- returns the net present value of an investment based on a series of periodic cash flows and a discount rate
- [Now](../tB/Core/Now) -- returns the current system date and time
- [Nz](../tB/Modules/Conversion/Nz) -- replaces a **Null** value with a specified replacement value

## O

- [ObjPtr](../tB/Modules/Information/ObjPtr) -- returns the COM-identity address of an object
- [Oct$, Oct](../tB/Modules/Conversion/Oct) -- returns a string representing the octal value of a number

## P

- [Partition](../tB/Modules/Interaction/Partition) -- returns a string identifying the range a number falls into
- [PictureToByteArray](../tB/Modules/HiddenModule/PictureToByteArray) -- serialises an **IPicture** into a **Byte** array
- [Pmt](../tB/Modules/Financial/Pmt) -- returns the payment for an annuity based on periodic fixed payments and a fixed interest rate
- [PPmt](../tB/Modules/Financial/PPmt) -- returns the principal payment for a given period of an annuity
- [ProcessorArchitecture](../tB/Modules/Compilation/ProcessorArchitecture) -- returns the processor architecture of the running application
- [PutMem1](../tB/Modules/HiddenModule/PutMem1) -- writes one byte to a memory address
- [PutMem2](../tB/Modules/HiddenModule/PutMem2) -- writes two bytes to a memory address
- [PutMem4](../tB/Modules/HiddenModule/PutMem4) -- writes four bytes to a memory address
- [PutMem8](../tB/Modules/HiddenModule/PutMem8) -- writes eight bytes to a memory address
- [PutMemPtr](../tB/Modules/HiddenModule/PutMemPtr) -- writes a pointer-sized value to a memory address
- [PV](../tB/Modules/Financial/PV) -- returns the present value of an annuity based on periodic fixed payments and a fixed interest rate

## Q

- [QBColor](../tB/Modules/Information/QBColor) -- returns the RGB colour value for a QuickBASIC colour index

## R

- [RaiseEventByName](../tB/Modules/Interaction/RaiseEventByName) -- raises an event by name on an object, taking arguments as a **Variant** array
- [RaiseEventByName2](../tB/Modules/Interaction/RaiseEventByName2) -- raises an event by name on an object, taking a variable-length argument list
- [Randomize](../tB/Modules/Math/Randomize) -- initializes the random-number generator
- [Rate](../tB/Modules/Financial/Rate) -- returns the interest rate per period for an annuity
- [Replace](../tB/Modules/Strings/Replace) -- replaces a substring within a string with another substring
- [Reset](../tB/Modules/FileSystem/Reset) -- closes all disk files opened by using the **Open** statement
- [RGB](../tB/Modules/Information/RGB) -- builds an RGB colour value from red, green, and blue components
- [RGBA](../tB/Modules/Information/RGBA) -- builds an RGBA colour value from red, green, blue, and alpha components
- [RGBA_A](../tB/Modules/Information/RGBA_A) -- returns the alpha component of an RGBA colour value
- [RGB_B](../tB/Modules/Information/RGB_B) -- returns the blue component of an RGB colour value
- [RGB_G](../tB/Modules/Information/RGB_G) -- returns the green component of an RGB colour value
- [RGB_R](../tB/Modules/Information/RGB_R) -- returns the red component of an RGB colour value
- [Right$, Right, RightB$, RightB](../tB/Modules/Strings/Right) -- returns the rightmost characters from a string
- [RmDir](../tB/Core/RmDir) -- removes an existing directory or folder
- [Rnd](../tB/Modules/Math/Rnd) -- returns a pseudo-random number in the range [0.0, 1.0)
- [Round](../tB/Modules/Math/Round) -- rounds a number to a specified number of decimal places
- [RTrim$, RTrim](../tB/Modules/Strings/RTrim) -- removes trailing spaces from a string

## S

- [SavePicture](../tB/Core/SavePicture) -- saves a graphic from a **Picture** or **Image** to a file
- [SaveSetting](../tB/Modules/Interaction/SaveSetting) -- saves or creates an application entry in the application’s entry in the Windows registry
- [Second](../tB/Modules/DateTime/Second) -- returns the second of the minute from a time value
- [Seek](../tB/Modules/FileSystem/Seek) -- returns or sets the read/write position within an open file
- [SendKeys](../tB/Modules/Interaction/SendKeys) -- sends keystrokes to the active window
- [SetAttr](../tB/Modules/FileSystem/SetAttr) -- sets attribute information for a file
- [Sgn](../tB/Modules/Math/Sgn) -- returns a value indicating the sign of a number
- [Shell](../tB/Modules/Interaction/Shell) -- runs another program asynchronously and returns its task ID
- [Sin](../tB/Modules/Math/Sin) -- returns the sine of an angle
- [SLN](../tB/Modules/Financial/SLN) -- returns the straight-line depreciation of an asset for a single period
- [Space$, Space](../tB/Modules/Strings/Space) -- returns a string of spaces
- [Split](../tB/Modules/Strings/Split) -- splits a string into a string array
- [Sqr](../tB/Modules/Math/Sqr) -- returns the square root of a number
- [Str$, Str](../tB/Modules/Conversion/Str) -- returns the string representation of a number
- [StrComp](../tB/Modules/Strings/StrComp) -- compares two strings
- [StrConv](../tB/Modules/Strings/StrConv) -- converts a string to a specified format
- [String$, String](../tB/Modules/Strings/String) -- returns a string of repeating characters
- [StrPtr](../tB/Modules/Information/StrPtr) -- returns the address of the underlying buffer of a **String**
- [StrReverse](../tB/Modules/Strings/StrReverse) -- reverses the order of characters in a string
- [Switch](../tB/Modules/Interaction/Switch) -- returns the value paired with the first **True** condition in a list of (condition, value) pairs
- [SYD](../tB/Modules/Financial/SYD) -- returns the sum-of-years' digits depreciation of an asset for a specified period

## T

- [Tan](../tB/Modules/Math/Tan) -- returns the tangent of an angle
- [Time](../tB/Core/Time) -- sets or returns the current system time
- [Timer](../tB/Modules/DateTime/Timer) -- returns the number of seconds elapsed since midnight
- [TimeSerial](../tB/Modules/DateTime/TimeSerial) -- returns a time for a specific hour, minute, and second
- [TimeValue](../tB/Modules/DateTime/TimeValue) -- converts a string to a time
- [TranslateColor](../tB/Modules/Information/TranslateColor) -- translates an OLE colour value to a plain RGB colour value
- [Trim$, Trim](../tB/Modules/Strings/Trim) -- removes leading and trailing spaces from a string
- [TypeName](../tB/Modules/Information/TypeName) -- returns the name of a variable's data type as a **String**

## U

- [UBound](../tB/Modules/Information/UBound) -- returns the largest valid subscript for a dimension of an array
- [UCase$, UCase](../tB/Modules/Strings/UCase) -- returns a string converted to uppercase
- [Unload](../tB/Core/Unload) -- removes an object (typically a form) from memory

## V

- [Val](../tB/Modules/Conversion/Val) -- parses a string into a **Double**
- [ValDec](../tB/Modules/Conversion/ValDec) -- parses a string into a **Decimal**
- [VarPtr](../tB/Modules/Information/VarPtr) -- returns the address of a variable
- [VarType](../tB/Modules/Information/VarType) -- returns the **VbVarType** enumeration value identifying a variable's subtype
- [vbaCastObj](../tB/Modules/HiddenModule/vbaCastObj) -- returns an object reinterpreted as another COM interface
- [vbaCopyBytes](../tB/Modules/HiddenModule/vbaCopyBytes) -- copies a block of bytes from one address to another
- [vbaCopyBytesZero](../tB/Modules/HiddenModule/vbaCopyBytesZero) -- copies a block of bytes from one address to another, then zeros the source
- [vbaObjAddref](../tB/Modules/HiddenModule/vbaObjAddref) -- increments the COM reference count of an object at a given address
- [vbaObjSet](../tB/Modules/HiddenModule/vbaObjSet) -- assigns an object pointer to an object variable, releasing any prior reference
- [vbaObjSetAddref](../tB/Modules/HiddenModule/vbaObjSetAddref) -- assigns an object pointer to an object variable, adding a reference and releasing any prior reference

## W

- [Weekday](../tB/Modules/DateTime/Weekday) -- returns the day of the week from a date value
- [WeekdayName](../tB/Modules/Strings/WeekdayName) -- returns the name of the specified day of the week
- [Width](../tB/Modules/FileSystem/Width) -- sets the line width for a sequential output file

## X

## Y

- [Year](../tB/Modules/DateTime/Year) -- returns the year from a date value

## Z