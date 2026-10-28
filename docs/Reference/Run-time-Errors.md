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

<!-- bug: err-raise-hresult-mapping -->
> [!NOTE] BETA 1010
> `Err.Raise` of an HRESULT that has a VB error of the same meaning, such as `&H80070057` (`E_INVALIDARG`), raises the HRESULT in twinBASIC. VB6 and 64-bit VBA raise the VB error instead, 5 for that one. [**Raise**](../tB/Modules/ErrObject/Raise) lists them.

## Error numbers

The messages are those of twinBASIC 32-bit and VB6, which agree for every number from 1 to 65535. *Listed by* links to the number's line under [Pages that list each error](#pages-that-list-each-error), which names the pages whose Common Errors section lists it, in alphabetical order.

<!-- errors-index: generated from errors/*.yml by scripts/errors.mjs write; edit the data, not this index -->

| Error | Message | Listed by |
|---|---|---|
| **3**{: #3 } (`&H3`) | *Return without GoSub* | --- |
| **5**{: #5 } (`&H5`) | *Invalid procedure call or argument* | [45 pages](#listed-5) |
| **6**{: #6 } (`&H6`) | *Overflow* | [27 pages](#listed-6) |
| **7**{: #7 } (`&H7`) | *Out of memory* | --- |
| **9**{: #9 } (`&H9`) | *Subscript out of range* | [7 pages](#listed-9) |
| **10**{: #10 } (`&HA`) | *This array is fixed or temporarily locked* | --- |
| **11**{: #11 } (`&HB`) | *Division by zero* | [4 pages](#listed-11) |
| **13**{: #13 } (`&HD`) | *Type mismatch* | [49 pages](#listed-13) |
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
| **53**{: #53 } (`&H35`) | *File not found* | [1 page](#listed-53) |
| **54**{: #54 } (`&H36`) | *Bad file mode* | --- |
| **55**{: #55 } (`&H37`) | *File already open* | [1 page](#listed-55) |
| **57**{: #57 } (`&H39`) | *Device I/O error* | --- |
| **58**{: #58 } (`&H3A`) | *File already exists* | --- |
| **59**{: #59 } (`&H3B`) | *Bad record length* | --- |
| **61**{: #61 } (`&H3D`) | *Disk full* | --- |
| **62**{: #62 } (`&H3E`) | *Input past end of file* | --- |
| **63**{: #63 } (`&H3F`) | *Bad record number* | --- |
| **67**{: #67 } (`&H43`) | *Too many files* | --- |
| **68**{: #68 } (`&H44`) | *Device unavailable* | --- |
| **70**{: #70 } (`&H46`) | *Permission denied* | [1 page](#listed-70) |
| **71**{: #71 } (`&H47`) | *Disk not ready* | --- |
| **74**{: #74 } (`&H4A`) | *Can't rename with different drive* | --- |
| **75**{: #75 } (`&H4B`) | *Path/File access error* | --- |
| **76**{: #76 } (`&H4C`) | *Path not found* | [1 page](#listed-76) |
| **91**{: #91 } (`&H5B`) | *Object variable or With block variable not set* | [2 pages](#listed-91) |
| **92**{: #92 } (`&H5C`) | *For loop not initialized* | --- |
| **93**{: #93 } (`&H5D`) | *Invalid pattern string* | --- |
| **94**{: #94 } (`&H5E`) | *Invalid use of Null* | [141 pages](#listed-94) |
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
| **438**{: #438 } (`&H1B6`) | *Object doesn't support this property or method* | [2 pages](#listed-438) |
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
| **457**{: #457 } (`&H1C9`) | *This key is already associated with an element of this collection* | [1 page](#listed-457) |
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
| **-2147467262**{: #-2147467262 } (`&H80004002`) | *No such interface supported*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147467262) |
| **-2147467259**{: #-2147467259 } (`&H80004005`) | *Unspecified error*; **Error** gives *Application-defined or object-defined error* | [51 pages](#listed--2147467259) |
| **-2147418113**{: #-2147418113 } (`&H8000FFFF`) | *Catastrophic failure*; **Error** gives *Application-defined or object-defined error* | [3 pages](#listed--2147418113) |
| **-2147352567**{: #-2147352567 } (`&H80020009`) | *Exception occurred.*; **Error** gives *Application-defined or object-defined error* | [2 pages](#listed--2147352567) |
| **-2147352562**{: #-2147352562 } (`&H8002000E`) | *Invalid number of parameters.*; **Error** gives *Application-defined or object-defined error* | [2 pages](#listed--2147352562) |
| **-2147352559**{: #-2147352559 } (`&H80020011`) | *Does not support a collection.*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147352559) |
| **-2147348207**{: #-2147348207 } (`&H80021111`) | *Automation error*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147348207) |
| **-2147221164**{: #-2147221164 } (`&H80040154`) | *Class not registered*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147221164) |
| **-2147221021**{: #-2147221021 } (`&H800401E3`) | *Operation unavailable*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147221021) |
| **-2147221020**{: #-2147221020 } (`&H800401E4`) | *Invalid syntax*; **Error** gives *Application-defined or object-defined error* | [2 pages](#listed--2147221020) |
| **-2147221014**{: #-2147221014 } (`&H800401EA`) | *Moniker cannot open file*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147221014) |
| **-2147221005**{: #-2147221005 } (`&H800401F3`) | *Invalid class string*; **Error** gives *Application-defined or object-defined error* | [2 pages](#listed--2147221005) |
| **-2147023174**{: #-2147023174 } (`&H800706BA`) | *The RPC server is unavailable.*; **Error** gives *Application-defined or object-defined error* | [1 page](#listed--2147023174) |

## Pages that list each error

**5**{: #listed-5 } (`&H5`): [Add](../tB/Modules/Collection/Add), [Array](../tB/Modules/Information/Array), [Asc](../tB/Modules/Strings/Asc), [Chr](../tB/Modules/Strings/Chr), [CreateObject](../tB/Modules/Interaction/CreateObject), [CVErr](../tB/Modules/Conversion/CVErr), [DateAdd](../tB/Modules/DateTime/DateAdd), [DateDiff](../tB/Modules/DateTime/DateDiff), [DatePart](../tB/Modules/DateTime/DatePart), [DateSerial](../tB/Modules/DateTime/DateSerial), [Filter](../tB/Modules/Strings/Filter), [Format](../tB/Modules/Strings/Format), [FormatCurrency](../tB/Modules/Strings/FormatCurrency), [FormatDateTime](../tB/Modules/Strings/FormatDateTime), [FormatNumber](../tB/Modules/Strings/FormatNumber), [FormatPercent](../tB/Modules/Strings/FormatPercent), [FV](../tB/Modules/Financial/FV), [GetObject](../tB/Modules/Interaction/GetObject), [InStr](../tB/Modules/Strings/InStr), [InStrRev](../tB/Modules/Strings/InStrRev), [Item](../tB/Modules/Collection/Item), [Join](../tB/Modules/Strings/Join), [KeyCompareMode](../tB/Modules/Collection/KeyCompareMode), [Left](../tB/Modules/Strings/Left), [Log](../tB/Modules/Math/Log), [Mid](../tB/Modules/Strings/Mid), [MonthName](../tB/Modules/Strings/MonthName), [QBColor](../tB/Modules/Information/QBColor), [Raise](../tB/Modules/ErrObject/Raise), [Rate](../tB/Modules/Financial/Rate), [Remove](../tB/Modules/Collection/Remove), [Replace](../tB/Modules/Strings/Replace), [RGB](../tB/Modules/Information/RGB), [RGBA](../tB/Modules/Information/RGBA), [Right](../tB/Modules/Strings/Right), [Round](../tB/Modules/Math/Round), [Space](../tB/Modules/Strings/Space), [Split](../tB/Modules/Strings/Split), [Sqr](../tB/Modules/Math/Sqr), [StrComp](../tB/Modules/Strings/StrComp), [StrConv](../tB/Modules/Strings/StrConv), [String](../tB/Modules/Strings/String), [TranslateColor](../tB/Modules/Information/TranslateColor), [Weekday](../tB/Modules/DateTime/Weekday), [WeekdayName](../tB/Modules/Strings/WeekdayName)

**6**{: #listed-6 } (`&H6`): [Abs](../tB/Modules/Math/Abs), [Bin](../tB/Modules/Conversion/Bin), [CBool](../tB/Modules/Conversion/CBool), [CByte](../tB/Modules/Conversion/CByte), [CCur](../tB/Modules/Conversion/CCur), [CDate](../tB/Modules/Conversion/CDate), [CDbl](../tB/Modules/Conversion/CDbl), [CDec](../tB/Modules/Conversion/CDec), [Choose](../tB/Modules/Interaction/Choose), [Chr](../tB/Modules/Strings/Chr), [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr), [CSng](../tB/Modules/Conversion/CSng), [CType](../tB/Modules/Conversion/CType), [DateAdd](../tB/Modules/DateTime/DateAdd), [DateDiff](../tB/Modules/DateTime/DateDiff), [Exp](../tB/Modules/Math/Exp), [FV](../tB/Modules/Financial/FV), [Hex](../tB/Modules/Conversion/Hex), [InputBox](../tB/Modules/Interaction/InputBox), [NPer](../tB/Modules/Financial/NPer), [Oct](../tB/Modules/Conversion/Oct), [Pmt](../tB/Modules/Financial/Pmt), [Val](../tB/Modules/Conversion/Val), [ValDec](../tB/Modules/Conversion/ValDec)

**9**{: #listed-9 } (`&H9`): [Add](../tB/Modules/Collection/Add), [Array](../tB/Modules/Information/Array), [Item](../tB/Modules/Collection/Item), [LBound](../tB/Modules/Information/LBound), [ReDim](../tB/Core/ReDim), [Remove](../tB/Modules/Collection/Remove), [UBound](../tB/Modules/Information/UBound)

**11**{: #listed-11 } (`&HB`): [NPer](../tB/Modules/Financial/NPer), [Pmt](../tB/Modules/Financial/Pmt), [PPmt](../tB/Modules/Financial/PPmt), [PV](../tB/Modules/Financial/PV)

**13**{: #listed-13 } (`&HD`): [Add](../tB/Modules/Collection/Add), [Bin](../tB/Modules/Conversion/Bin), [CBool](../tB/Modules/Conversion/CBool), [CByte](../tB/Modules/Conversion/CByte), [CCur](../tB/Modules/Conversion/CCur), [CDate](../tB/Modules/Conversion/CDate), [CDbl](../tB/Modules/Conversion/CDbl), [CDec](../tB/Modules/Conversion/CDec), [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr), [CSng](../tB/Modules/Conversion/CSng), [CType](../tB/Modules/Conversion/CType), [CVDate](../tB/Modules/Conversion/CVDate), [Date](../tB/Modules/DateTime/Date), [DateAdd](../tB/Modules/DateTime/DateAdd), [DateDiff](../tB/Modules/DateTime/DateDiff), [DatePart](../tB/Modules/DateTime/DatePart), [DateValue](../tB/Modules/DateTime/DateValue), [Day](../tB/Modules/DateTime/Day), [DDB](../tB/Modules/Financial/DDB), [Filter](../tB/Modules/Strings/Filter), [FV](../tB/Modules/Financial/FV), [Hex](../tB/Modules/Conversion/Hex), [Hour](../tB/Modules/DateTime/Hour), [If](../tB/Modules/Interaction/If), [IIf](../tB/Modules/Interaction/IIf), [IPmt](../tB/Modules/Financial/IPmt), [IRR](../tB/Modules/Financial/IRR), [Join](../tB/Modules/Strings/Join), [LBound](../tB/Modules/Information/LBound), [Minute](../tB/Modules/DateTime/Minute), [Month](../tB/Modules/DateTime/Month), [NPer](../tB/Modules/Financial/NPer), [Oct](../tB/Modules/Conversion/Oct), [Pmt](../tB/Modules/Financial/Pmt), [PPmt](../tB/Modules/Financial/PPmt), [PV](../tB/Modules/Financial/PV), [Rate](../tB/Modules/Financial/Rate), [ReDim](../tB/Core/ReDim), [Second](../tB/Modules/DateTime/Second), [Switch](../tB/Modules/Interaction/Switch), [Time](../tB/Modules/DateTime/Time), [TimeValue](../tB/Modules/DateTime/TimeValue), [UBound](../tB/Modules/Information/UBound), [Val](../tB/Modules/Conversion/Val), [Weekday](../tB/Modules/DateTime/Weekday), [Year](../tB/Modules/DateTime/Year)

**53**{: #listed-53 } (`&H35`): [FileCopy](../tB/Modules/FileSystem/FileCopy)

**55**{: #listed-55 } (`&H37`): [FileCopy](../tB/Modules/FileSystem/FileCopy)

**70**{: #listed-70 } (`&H46`): [FileCopy](../tB/Modules/FileSystem/FileCopy)

**76**{: #listed-76 } (`&H4C`): [FileCopy](../tB/Modules/FileSystem/FileCopy)

**91**{: #listed-91 } (`&H5B`): [RaiseEventByName](../tB/Modules/Interaction/RaiseEventByName), [RaiseEventByName2](../tB/Modules/Interaction/RaiseEventByName2)

**94**{: #listed-94 } (`&H5E`): [AppActivate](../tB/Modules/Interaction/AppActivate), [Asc](../tB/Modules/Strings/Asc), [Atn](../tB/Modules/Math/Atn), [Bin](../tB/Modules/Conversion/Bin), [Calendar](../tB/Modules/DateTime/Calendar), [CallByDispId](../tB/Modules/Interaction/CallByDispId), [CallByName](../tB/Modules/Interaction/CallByName), [CBool](../tB/Modules/Conversion/CBool), [CByte](../tB/Modules/Conversion/CByte), [CCur](../tB/Modules/Conversion/CCur), [CDate](../tB/Modules/Conversion/CDate), [CDbl](../tB/Modules/Conversion/CDbl), [CDec](../tB/Modules/Conversion/CDec), [ChDir](../tB/Modules/FileSystem/ChDir), [ChDrive](../tB/Modules/FileSystem/ChDrive), [Choose](../tB/Modules/Interaction/Choose), [Chr](../tB/Modules/Strings/Chr), [CInt](../tB/Modules/Conversion/CInt), [CLng](../tB/Modules/Conversion/CLng), [CLngLng](../tB/Modules/Conversion/CLngLng), [CLngPtr](../tB/Modules/Conversion/CLngPtr), [Cos](../tB/Modules/Math/Cos), [CreateObject](../tB/Modules/Interaction/CreateObject), [CSng](../tB/Modules/Conversion/CSng), [CStr](../tB/Modules/Conversion/CStr), [CType](../tB/Modules/Conversion/CType), [CurDir](../tB/Modules/FileSystem/CurDir), [CVErr](../tB/Modules/Conversion/CVErr), [Date](../tB/Modules/DateTime/Date), [DateAdd](../tB/Modules/DateTime/DateAdd), [DateDiff](../tB/Modules/DateTime/DateDiff), [DatePart](../tB/Modules/DateTime/DatePart), [DateSerial](../tB/Modules/DateTime/DateSerial), [DateValue](../tB/Modules/DateTime/DateValue), [DDB](../tB/Modules/Financial/DDB), [DeleteSetting](../tB/Modules/Interaction/DeleteSetting), [Description](../tB/Modules/ErrObject/Description), [Dir](../tB/Modules/FileSystem/Dir), [Environ](../tB/Modules/Interaction/Environ), [EOF](../tB/Modules/FileSystem/EOF), [Error function](../tB/Modules/Conversion/Error), [Exists](../tB/Modules/Collection/Exists), [Exp](../tB/Modules/Math/Exp), [FileAttr](../tB/Modules/FileSystem/FileAttr), [FileCopy](../tB/Modules/FileSystem/FileCopy), [FileDateTime](../tB/Modules/FileSystem/FileDateTime), [FileLen](../tB/Modules/FileSystem/FileLen), [Filter](../tB/Modules/Strings/Filter), [Format](../tB/Modules/Strings/Format), [FormatCurrency](../tB/Modules/Strings/FormatCurrency), [FormatDateTime](../tB/Modules/Strings/FormatDateTime), [FormatNumber](../tB/Modules/Strings/FormatNumber), [FormatPercent](../tB/Modules/Strings/FormatPercent), [FreeFile](../tB/Modules/FileSystem/FreeFile), [FV](../tB/Modules/Financial/FV), [GetAllSettings](../tB/Modules/Interaction/GetAllSettings), [GetAttr](../tB/Modules/FileSystem/GetAttr), [GetObject](../tB/Modules/Interaction/GetObject), [GetSetting](../tB/Modules/Interaction/GetSetting), [Hex](../tB/Modules/Conversion/Hex), [Input, Input$](../tB/Modules/FileSystem/Input), [InputB, InputB$](../tB/Modules/FileSystem/InputB), [InputBox](../tB/Modules/Interaction/InputBox), [InStr](../tB/Modules/Strings/InStr), [InStrRev](../tB/Modules/Strings/InStrRev), [IPmt](../tB/Modules/Financial/IPmt), [IRR](../tB/Modules/Financial/IRR), [Join](../tB/Modules/Strings/Join), [KeyCompareMode](../tB/Modules/Collection/KeyCompareMode), [KeyCountHint](../tB/Modules/Collection/KeyCountHint), [Kill](../tB/Modules/FileSystem/Kill), [LBound](../tB/Modules/Information/LBound), [LCase](../tB/Modules/Strings/LCase), [Left](../tB/Modules/Strings/Left), [Loc](../tB/Modules/FileSystem/Loc), [LOF](../tB/Modules/FileSystem/LOF), [Log](../tB/Modules/Math/Log), [LTrim](../tB/Modules/Strings/LTrim), [MacID](../tB/Modules/Conversion/MacID), [Mid](../tB/Modules/Strings/Mid), [MIRR](../tB/Modules/Financial/MIRR), [MkDir](../tB/Modules/FileSystem/MkDir), [MonthName](../tB/Modules/Strings/MonthName), [MsgBox](../tB/Modules/Interaction/MsgBox), [NPer](../tB/Modules/Financial/NPer), [NPV](../tB/Modules/Financial/NPV), [Number](../tB/Modules/ErrObject/Number), [Oct](../tB/Modules/Conversion/Oct), [Pmt](../tB/Modules/Financial/Pmt), [PPmt](../tB/Modules/Financial/PPmt), [PV](../tB/Modules/Financial/PV), [QBColor](../tB/Modules/Information/QBColor), [Raise](../tB/Modules/ErrObject/Raise), [Randomize](../tB/Modules/Math/Randomize), [Rate](../tB/Modules/Financial/Rate), [Replace](../tB/Modules/Strings/Replace), [RGB](../tB/Modules/Information/RGB), [RGB_B](../tB/Modules/Information/RGB_B), [RGB_G](../tB/Modules/Information/RGB_G), [RGB_R](../tB/Modules/Information/RGB_R), [RGBA](../tB/Modules/Information/RGBA), [RGBA_A](../tB/Modules/Information/RGBA_A), [Right](../tB/Modules/Strings/Right), [RmDir](../tB/Modules/FileSystem/RmDir), [Rnd](../tB/Modules/Math/Rnd), [Round](../tB/Modules/Math/Round), [RTrim](../tB/Modules/Strings/RTrim), [SaveSetting](../tB/Modules/Interaction/SaveSetting), [Seek](../tB/Modules/FileSystem/Seek), [SendKeys](../tB/Modules/Interaction/SendKeys), [SetAttr](../tB/Modules/FileSystem/SetAttr), [Sgn](../tB/Modules/Math/Sgn), [Shell](../tB/Modules/Interaction/Shell), [ShiftRotateLeft](../tB/Modules/Math/ShiftRotateLeft), [ShiftRotateRight](../tB/Modules/Math/ShiftRotateRight), [ShiftUnsignedRight](../tB/Modules/Math/ShiftUnsignedRight), [Sin](../tB/Modules/Math/Sin), [SLN](../tB/Modules/Financial/SLN), [Source](../tB/Modules/ErrObject/Source), [Space](../tB/Modules/Strings/Space), [Split](../tB/Modules/Strings/Split), [Sqr](../tB/Modules/Math/Sqr), [Str](../tB/Modules/Conversion/Str), [StrComp](../tB/Modules/Strings/StrComp), [StrConv](../tB/Modules/Strings/StrConv), [String](../tB/Modules/Strings/String), [StrReverse](../tB/Modules/Strings/StrReverse), [SYD](../tB/Modules/Financial/SYD), [Tan](../tB/Modules/Math/Tan), [Time](../tB/Modules/DateTime/Time), [TimeSerial](../tB/Modules/DateTime/TimeSerial), [TimeValue](../tB/Modules/DateTime/TimeValue), [TranslateColor](../tB/Modules/Information/TranslateColor), [Trim](../tB/Modules/Strings/Trim), [UBound](../tB/Modules/Information/UBound), [UCase](../tB/Modules/Strings/UCase), [Val](../tB/Modules/Conversion/Val), [ValDec](../tB/Modules/Conversion/ValDec), [Weekday](../tB/Modules/DateTime/Weekday), [WeekdayName](../tB/Modules/Strings/WeekdayName), [Width](../tB/Modules/FileSystem/Width)

**438**{: #listed-438 } (`&H1B6`): [CallByDispId](../tB/Modules/Interaction/CallByDispId), [CallByName](../tB/Modules/Interaction/CallByName)

**457**{: #listed-457 } (`&H1C9`): [Add](../tB/Modules/Collection/Add)

**-2147467262**{: #listed--2147467262 } (`&H80004002`): [GetObject](../tB/Modules/Interaction/GetObject)

**-2147467259**{: #listed--2147467259 } (`&H80004005`): [AppActivate](../tB/Modules/Interaction/AppActivate), [Calendar](../tB/Modules/DateTime/Calendar), [CallByDispId](../tB/Modules/Interaction/CallByDispId), [CallByName](../tB/Modules/Interaction/CallByName), [ChDir](../tB/Modules/FileSystem/ChDir), [ChDrive](../tB/Modules/FileSystem/ChDrive), [CurDir](../tB/Modules/FileSystem/CurDir), [Date](../tB/Modules/DateTime/Date), [DDB](../tB/Modules/Financial/DDB), [DeleteSetting](../tB/Modules/Interaction/DeleteSetting), [Dir](../tB/Modules/FileSystem/Dir), [Environ](../tB/Modules/Interaction/Environ), [EOF](../tB/Modules/FileSystem/EOF), [FileAttr](../tB/Modules/FileSystem/FileAttr), [FileCopy](../tB/Modules/FileSystem/FileCopy), [FileDateTime](../tB/Modules/FileSystem/FileDateTime), [FileLen](../tB/Modules/FileSystem/FileLen), [FreeFile](../tB/Modules/FileSystem/FreeFile), [GetAllSettings](../tB/Modules/Interaction/GetAllSettings), [GetAttr](../tB/Modules/FileSystem/GetAttr), [GetObject](../tB/Modules/Interaction/GetObject), [GetSetting](../tB/Modules/Interaction/GetSetting), [Input, Input$](../tB/Modules/FileSystem/Input), [InputB, InputB$](../tB/Modules/FileSystem/InputB), [InputBox](../tB/Modules/Interaction/InputBox), [IPmt](../tB/Modules/Financial/IPmt), [IRR](../tB/Modules/Financial/IRR), [Kill](../tB/Modules/FileSystem/Kill), [LBound](../tB/Modules/Information/LBound), [Loc](../tB/Modules/FileSystem/Loc), [LOF](../tB/Modules/FileSystem/LOF), [MkDir](../tB/Modules/FileSystem/MkDir), [MsgBox](../tB/Modules/Interaction/MsgBox), [NPer](../tB/Modules/Financial/NPer), [Partition](../tB/Modules/Interaction/Partition), [Pmt](../tB/Modules/Financial/Pmt), [PPmt](../tB/Modules/Financial/PPmt), [PV](../tB/Modules/Financial/PV), [Rate](../tB/Modules/Financial/Rate), [ReDim](../tB/Core/ReDim), [RmDir](../tB/Modules/FileSystem/RmDir), [SaveSetting](../tB/Modules/Interaction/SaveSetting), [Seek](../tB/Modules/FileSystem/Seek), [SetAttr](../tB/Modules/FileSystem/SetAttr), [Shell](../tB/Modules/Interaction/Shell), [SLN](../tB/Modules/Financial/SLN), [Switch](../tB/Modules/Interaction/Switch), [SYD](../tB/Modules/Financial/SYD), [Time](../tB/Modules/DateTime/Time), [UBound](../tB/Modules/Information/UBound), [Width](../tB/Modules/FileSystem/Width)

**-2147418113**{: #listed--2147418113 } (`&H8000FFFF`): [IRR](../tB/Modules/Financial/IRR), [MIRR](../tB/Modules/Financial/MIRR), [NPV](../tB/Modules/Financial/NPV)

**-2147352567**{: #listed--2147352567 } (`&H80020009`): [CallByName](../tB/Modules/Interaction/CallByName), [SendKeys](../tB/Modules/Interaction/SendKeys)

**-2147352562**{: #listed--2147352562 } (`&H8002000E`): [CallByDispId](../tB/Modules/Interaction/CallByDispId), [CallByName](../tB/Modules/Interaction/CallByName)

**-2147352559**{: #listed--2147352559 } (`&H80020011`): [CallByName](../tB/Modules/Interaction/CallByName)

**-2147348207**{: #listed--2147348207 } (`&H80021111`): [Tan](../tB/Modules/Math/Tan)

**-2147221164**{: #listed--2147221164 } (`&H80040154`): [CreateObject](../tB/Modules/Interaction/CreateObject)

**-2147221021**{: #listed--2147221021 } (`&H800401E3`): [GetObject](../tB/Modules/Interaction/GetObject)

**-2147221020**{: #listed--2147221020 } (`&H800401E4`): [CreateObject](../tB/Modules/Interaction/CreateObject), [GetObject](../tB/Modules/Interaction/GetObject)

**-2147221014**{: #listed--2147221014 } (`&H800401EA`): [GetObject](../tB/Modules/Interaction/GetObject)

**-2147221005**{: #listed--2147221005 } (`&H800401F3`): [CreateObject](../tB/Modules/Interaction/CreateObject), [GetObject](../tB/Modules/Interaction/GetObject)

**-2147023174**{: #listed--2147023174 } (`&H800706BA`): [CreateObject](../tB/Modules/Interaction/CreateObject)

<!-- /errors-index -->

## See Also

- [**On Error**](../tB/Core/On-Error) statement
- [**Err** object](../tB/Modules/ErrObject/)
- [**Error**](../tB/Modules/Conversion/Error) function
