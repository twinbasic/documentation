---
title: Run-time Errors
parent: Reference Section
nav_order: 12
permalink: /Reference/Run-time-Errors
shortcut: Errors
index_also: trappable errors, error numbers, error messages
---

# Run-time Errors
{: .no_toc }

Every run-time error number that has a message of its own, with that message, and the reference pages that list each number among the errors their procedure raises.

A run-time error can be trapped: [**On Error**](../tB/Core/On-Error) sends it to a handler, which reads its number from [**Err.Number**](../tB/Modules/ErrObject/Number) and its message from [**Err.Description**](../tB/Modules/ErrObject/Description). A reference page that documents a procedure, a statement or an operator has a **Common Errors** section when it raises errors of its own: a table of each number it raises, and when. Each number there links to its row below.

## What the Common Errors sections list

A section lists the errors that a procedure raises from its own arguments and its own state, as twinBASIC raises them. Where VB6 raises another error, or none, a note under the table says so. Every row is measured in twinBASIC and in VB6, and not copied from another reference.

A section does not list:

- errors that any code can raise: 7, *Out of memory*, and 28, *Out of stack space*;
- errors in converting an argument to the type its page gives for the parameter: 13, *Type mismatch*, for an argument of the wrong kind, such as `Mid("abc", "x")`, and 6, *Overflow*, for a number outside the range of that type, such as a *start* of 2147483648 for **Mid**, whose *start* is a **Long**. A **Null** argument is listed, whether the procedure raises the error itself or in converting the argument: `Mid("abc", Null)` raises 94, *Invalid use of Null*;
- compile-time errors: the twinBASIC compiler reports these with diagnostic codes such as `TB5001`, before the program runs, and **On Error** cannot trap them.

A procedure that raises no error of its own has no Common Errors section.

## How a number is written

Each number is given in decimal and in hexadecimal, as a 32-bit **Long**: 5 (`&H5`), -2147467259 (`&H80004005`). Numbers from 1 to 65535 are VB's own. A negative number is an HRESULT, a COM error code. Errors that a program raises for itself with [**Err.Raise**](../tB/Modules/ErrObject/Raise) usually add their own code to **vbObjectError**, -2147221504 (`&H80040000`).

The message is the one that **Err.Description** gives for the error once it is raised. For the numbers from 1 to 65535, [**Error**](../tB/Modules/Conversion/Error)`(number)` gives the same text. For an HRESULT, **Error** gives *Application-defined or object-defined error*, as it does for any number without a message of its own, and the table shows both.

> [!NOTE] BETA 1010
> For a number from 1 to 65535 that has no message of its own, **Error** gives *Application-defined or object-defined error* in twinBASIC and VB6. After `Err.Raise` of such a number, **Err.Description** in VB6 is that same text; in twinBASIC it is empty for a number below 747, and for 747 and above it is the Windows system message of that number, such as *Page fault was a transition fault.* for 747.

## Error numbers

The messages are those of twinBASIC 32-bit and VB6, which agree for every number from 1 to 65535. *Listed by* links to the number's line under [Pages that list each error](#pages-that-list-each-error), which names the pages whose Common Errors section lists it, in alphabetical order.

<!-- errors-index: generated from errors/*.yml by scripts/errors.mjs write; edit the data, not this index -->

| Error | Message | Listed by |
|---|---|---|
| **3**{: #3 } (`&H3`) | *Return without GoSub* | --- |
| **5**{: #5 } (`&H5`) | *Invalid procedure call or argument* | [26 pages](#listed-5) |
| **6**{: #6 } (`&H6`) | *Overflow* | [20 pages](#listed-6) |
| **7**{: #7 } (`&H7`) | *Out of memory* | --- |
| **9**{: #9 } (`&H9`) | *Subscript out of range* | [1 page](#listed-9) |
| **10**{: #10 } (`&HA`) | *This array is fixed or temporarily locked* | --- |
| **11**{: #11 } (`&HB`) | *Division by zero* | --- |
| **13**{: #13 } (`&HD`) | *Type mismatch* | [20 pages](#listed-13) |
| **14**{: #14 } (`&HE`) | *Out of string space* | --- |
| **16**{: #16 } (`&H10`) | *Expression too complex* | --- |
| **17**{: #17 } (`&H11`) | *Can't perform requested operation* | --- |
| **18**{: #18 } (`&H12`) | *User interrupt occurred* | --- |
| **20**{: #20 } (`&H14`) | *Resume without error* | --- |
| **28**{: #28 } (`&H1C`) | *Out of stack space* | --- |
| **35**{: #35 } (`&H23`) | *Sub or Function not defined* | --- |
| **47**{: #47 } (`&H2F`) | *Too many DLL application clients* | --- |
| **48**{: #48 } (`&H30`) | *Error in loading DLL* | --- |
| **49**{: #49 } (`&H31`) | *Bad DLL calling convention* | --- |
| **51**{: #51 } (`&H33`) | *Internal error* | --- |
| **52**{: #52 } (`&H34`) | *Bad file name or number* | --- |
| **53**{: #53 } (`&H35`) | *File not found* | --- |
| **54**{: #54 } (`&H36`) | *Bad file mode* | --- |
| **55**{: #55 } (`&H37`) | *File already open* | --- |
| **57**{: #57 } (`&H39`) | *Device I/O error* | --- |
| **58**{: #58 } (`&H3A`) | *File already exists* | --- |
| **59**{: #59 } (`&H3B`) | *Bad record length* | --- |
| **61**{: #61 } (`&H3D`) | *Disk full* | --- |
| **62**{: #62 } (`&H3E`) | *Input past end of file* | --- |
| **63**{: #63 } (`&H3F`) | *Bad record number* | --- |
| **67**{: #67 } (`&H43`) | *Too many files* | --- |
| **68**{: #68 } (`&H44`) | *Device unavailable* | --- |
| **70**{: #70 } (`&H46`) | *Permission denied* | --- |
| **71**{: #71 } (`&H47`) | *Disk not ready* | --- |
| **74**{: #74 } (`&H4A`) | *Can't rename with different drive* | --- |
| **75**{: #75 } (`&H4B`) | *Path/File access error* | --- |
| **76**{: #76 } (`&H4C`) | *Path not found* | --- |
| **91**{: #91 } (`&H5B`) | *Object variable or With block variable not set* | --- |
| **92**{: #92 } (`&H5C`) | *For loop not initialized* | --- |
| **93**{: #93 } (`&H5D`) | *Invalid pattern string* | --- |
| **94**{: #94 } (`&H5E`) | *Invalid use of Null* | [64 pages](#listed-94) |
| **96**{: #96 } (`&H60`) | *Unable to sink events of object because the object is already firing events to the maximum number of event receivers that it supports* | --- |
| **97**{: #97 } (`&H61`) | *Can not call friend function on object which is not an instance of defining class* | --- |
| **98**{: #98 } (`&H62`) | *A property or method call cannot include a reference to a private object, either as an argument or as a return value* | --- |
| **321**{: #321 } (`&H141`) | *Invalid file format* | --- |
| **322**{: #322 } (`&H142`) | *Can't create necessary temporary file* | --- |
| **325**{: #325 } (`&H145`) | *Invalid format in resource file* | --- |
| **380**{: #380 } (`&H17C`) | *Invalid property value* | --- |
| **381**{: #381 } (`&H17D`) | *Invalid property array index* | --- |
| **382**{: #382 } (`&H17E`) | *Set not supported at runtime* | --- |
| **383**{: #383 } (`&H17F`) | *Set not supported (read-only property)* | --- |
| **385**{: #385 } (`&H181`) | *Need property array index* | --- |
| **387**{: #387 } (`&H183`) | *Set not permitted* | --- |
| **393**{: #393 } (`&H189`) | *Get not supported at runtime* | --- |
| **394**{: #394 } (`&H18A`) | *Get not supported (write-only property)* | --- |
| **422**{: #422 } (`&H1A6`) | *Property not found* | --- |
| **423**{: #423 } (`&H1A7`) | *Property or method not found* | --- |
| **424**{: #424 } (`&H1A8`) | *Object required* | --- |
| **429**{: #429 } (`&H1AD`) | *ActiveX component can't create object* | --- |
| **430**{: #430 } (`&H1AE`) | *Class does not support Automation or does not support expected interface* | --- |
| **432**{: #432 } (`&H1B0`) | *File name or class name not found during Automation operation* | --- |
| **438**{: #438 } (`&H1B6`) | *Object doesn't support this property or method* | --- |
| **440**{: #440 } (`&H1B8`) | *Automation error* | --- |
| **442**{: #442 } (`&H1BA`) | *Connection to type library or object library for remote process has been lost. Press OK for dialog to remove reference.* | --- |
| **443**{: #443 } (`&H1BB`) | *Automation object does not have a default value* | --- |
| **445**{: #445 } (`&H1BD`) | *Object doesn't support this action* | --- |
| **446**{: #446 } (`&H1BE`) | *Object doesn't support named arguments* | --- |
| **447**{: #447 } (`&H1BF`) | *Object doesn't support current locale setting* | --- |
| **448**{: #448 } (`&H1C0`) | *Named argument not found* | --- |
| **449**{: #449 } (`&H1C1`) | *Argument not optional* | --- |
| **450**{: #450 } (`&H1C2`) | *Wrong number of arguments or invalid property assignment* | --- |
| **451**{: #451 } (`&H1C3`) | *Property let procedure not defined and property get procedure did not return an object* | --- |
| **452**{: #452 } (`&H1C4`) | *Invalid ordinal* | --- |
| **453**{: #453 } (`&H1C5`) | *Specified DLL function not found* | --- |
| **454**{: #454 } (`&H1C6`) | *Code resource not found* | --- |
| **455**{: #455 } (`&H1C7`) | *Code resource lock error* | --- |
| **457**{: #457 } (`&H1C9`) | *This key is already associated with an element of this collection* | --- |
| **458**{: #458 } (`&H1CA`) | *Variable uses an Automation type not supported in Visual Basic* | --- |
| **459**{: #459 } (`&H1CB`) | *Object or class does not support the set of events* | --- |
| **460**{: #460 } (`&H1CC`) | *Invalid clipboard format* | --- |
| **461**{: #461 } (`&H1CD`) | *Method or data member not found* | --- |
| **462**{: #462 } (`&H1CE`) | *The remote server machine does not exist or is unavailable* | --- |
| **463**{: #463 } (`&H1CF`) | *Class not registered on local machine* | --- |
| **481**{: #481 } (`&H1E1`) | *Invalid picture* | --- |
| **482**{: #482 } (`&H1E2`) | *Printer error* | --- |
| **735**{: #735 } (`&H2DF`) | *Can't save file to TEMP* | --- |
| **744**{: #744 } (`&H2E8`) | *Search text not found* | --- |
| **746**{: #746 } (`&H2EA`) | *Replacements too long* | --- |
| **-2147467259**{: #-2147467259 } (`&H80004005`) | *Unspecified error*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147467259) |
| **-2147348207**{: #-2147348207 } (`&H80021111`) | *Automation error*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147348207) |

## Pages that list each error

**5**{: #listed-5 } (`&H5`): [Asc](../tB/Modules/Strings/Asc), [Chr](../tB/Modules/Strings/Chr), [CVErr](../tB/Modules/Conversion/CVErr), [Filter](../tB/Modules/Strings/Filter), [Format](../tB/Modules/Strings/Format), [FormatCurrency](../tB/Modules/Strings/FormatCurrency), [FormatDateTime](../tB/Modules/Strings/FormatDateTime), [FormatNumber](../tB/Modules/Strings/FormatNumber), [FormatPercent](../tB/Modules/Strings/FormatPercent), [InStr](../tB/Modules/Strings/InStr), [InStrRev](../tB/Modules/Strings/InStrRev), [Join](../tB/Modules/Strings/Join), [Left](../tB/Modules/Strings/Left), [Log](../tB/Modules/Math/Log), [Mid](../tB/Modules/Strings/Mid), [MonthName](../tB/Modules/Strings/MonthName), [Replace](../tB/Modules/Strings/Replace), [Right](../tB/Modules/Strings/Right), [Round](../tB/Modules/Math/Round), [Space](../tB/Modules/Strings/Space), [Split](../tB/Modules/Strings/Split), [Sqr](../tB/Modules/Math/Sqr), [StrComp](../tB/Modules/Strings/StrComp), [StrConv](../tB/Modules/Strings/StrConv), [String](../tB/Modules/Strings/String), [WeekdayName](../tB/Modules/Strings/WeekdayName)

**6**{: #listed-6 } (`&H6`): [Abs](../tB/Modules/Math/Abs), [Bin](../tB/Modules/Conversion/Bin), [CBool](../tB/Modules/Conversion/CBool), [CByte](../tB/Modules/Conversion/CByte), [CCur](../tB/Modules/Conversion/CCur), [CDate](../tB/Modules/Conversion/CDate), [CDbl](../tB/Modules/Conversion/CDbl), [CDec](../tB/Modules/Conversion/CDec), [Chr](../tB/Modules/Strings/Chr), [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr), [CSng](../tB/Modules/Conversion/CSng), [CType](../tB/Modules/Conversion/CType), [Exp](../tB/Modules/Math/Exp), [Hex](../tB/Modules/Conversion/Hex), [Oct](../tB/Modules/Conversion/Oct), [Val](../tB/Modules/Conversion/Val), [ValDec](../tB/Modules/Conversion/ValDec)

**9**{: #listed-9 } (`&H9`): [ReDim](../tB/Core/ReDim)

**13**{: #listed-13 } (`&HD`): [Bin](../tB/Modules/Conversion/Bin), [CBool](../tB/Modules/Conversion/CBool), [CByte](../tB/Modules/Conversion/CByte), [CCur](../tB/Modules/Conversion/CCur), [CDate](../tB/Modules/Conversion/CDate), [CDbl](../tB/Modules/Conversion/CDbl), [CDec](../tB/Modules/Conversion/CDec), [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr), [CSng](../tB/Modules/Conversion/CSng), [CType](../tB/Modules/Conversion/CType), [CVDate](../tB/Modules/Conversion/CVDate), [Filter](../tB/Modules/Strings/Filter), [Hex](../tB/Modules/Conversion/Hex), [Join](../tB/Modules/Strings/Join), [Oct](../tB/Modules/Conversion/Oct), [ReDim](../tB/Core/ReDim), [Val](../tB/Modules/Conversion/Val)

**94**{: #listed-94 } (`&H5E`): [Asc](../tB/Modules/Strings/Asc), [Atn](../tB/Modules/Math/Atn), [Bin](../tB/Modules/Conversion/Bin), [CBool](../tB/Modules/Conversion/CBool), [CByte](../tB/Modules/Conversion/CByte), [CCur](../tB/Modules/Conversion/CCur), [CDate](../tB/Modules/Conversion/CDate), [CDbl](../tB/Modules/Conversion/CDbl), [CDec](../tB/Modules/Conversion/CDec), [Chr](../tB/Modules/Strings/Chr), [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr), [Cos](../tB/Modules/Math/Cos), [CSng](../tB/Modules/Conversion/CSng), [CStr](../tB/Modules/Conversion/CStr), [CType](../tB/Modules/Conversion/CType), [CVErr](../tB/Modules/Conversion/CVErr), [Error function](../tB/Modules/Conversion/Error), [Exp](../tB/Modules/Math/Exp), [Filter](../tB/Modules/Strings/Filter), [Format](../tB/Modules/Strings/Format), [FormatCurrency](../tB/Modules/Strings/FormatCurrency), [FormatDateTime](../tB/Modules/Strings/FormatDateTime), [FormatNumber](../tB/Modules/Strings/FormatNumber), [FormatPercent](../tB/Modules/Strings/FormatPercent), [Hex](../tB/Modules/Conversion/Hex), [InStr](../tB/Modules/Strings/InStr), [InStrRev](../tB/Modules/Strings/InStrRev), [Join](../tB/Modules/Strings/Join), [LCase](../tB/Modules/Strings/LCase), [Left](../tB/Modules/Strings/Left), [Log](../tB/Modules/Math/Log), [LTrim](../tB/Modules/Strings/LTrim), [MacID](../tB/Modules/Conversion/MacID), [Mid](../tB/Modules/Strings/Mid), [MonthName](../tB/Modules/Strings/MonthName), [Oct](../tB/Modules/Conversion/Oct), [Randomize](../tB/Modules/Math/Randomize), [Replace](../tB/Modules/Strings/Replace), [Right](../tB/Modules/Strings/Right), [Rnd](../tB/Modules/Math/Rnd), [Round](../tB/Modules/Math/Round), [RTrim](../tB/Modules/Strings/RTrim), [Sgn](../tB/Modules/Math/Sgn), [ShiftRotateLeft](../tB/Modules/Math/ShiftRotateLeft), [ShiftRotateRight](../tB/Modules/Math/ShiftRotateRight), [ShiftUnsignedRight](../tB/Modules/Math/ShiftUnsignedRight), [Sin](../tB/Modules/Math/Sin), [Space](../tB/Modules/Strings/Space), [Split](../tB/Modules/Strings/Split), [Sqr](../tB/Modules/Math/Sqr), [Str](../tB/Modules/Conversion/Str), [StrComp](../tB/Modules/Strings/StrComp), [StrConv](../tB/Modules/Strings/StrConv), [String](../tB/Modules/Strings/String), [StrReverse](../tB/Modules/Strings/StrReverse), [Tan](../tB/Modules/Math/Tan), [Trim](../tB/Modules/Strings/Trim), [UCase](../tB/Modules/Strings/UCase), [Val](../tB/Modules/Conversion/Val), [ValDec](../tB/Modules/Conversion/ValDec), [WeekdayName](../tB/Modules/Strings/WeekdayName)

**-2147467259**{: #listed--2147467259 } (`&H80004005`): [ReDim](../tB/Core/ReDim)

**-2147348207**{: #listed--2147348207 } (`&H80021111`): [Tan](../tB/Modules/Math/Tan)

<!-- /errors-index -->

## See Also

- [**On Error**](../tB/Core/On-Error) statement
- [**Err** object](../tB/Modules/ErrObject/)
- [**Error**](../tB/Modules/Conversion/Error) function
