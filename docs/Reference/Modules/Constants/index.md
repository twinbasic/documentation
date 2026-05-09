---
title: Constants Module
parent: VBA Modules
permalink: /tB/Modules/Constants/
has_toc: false
---

# Constants module

## Constants

**vbBack**{: #vbBack }
: The backspace character — **Chr(8)**.

**vbCr**{: #vbCr }
: The carriage return character — **Chr(13)**.

**vbCrLf**{: #vbCrLf }
: The carriage return + linefeed pair — **Chr(13) & Chr(10)**.

**vbFormFeed**{: #vbFormFeed }
: The form feed character — **Chr(12)**.

**vbLf**{: #vbLf }
: The linefeed character — **Chr(10)**.

**vbNewLine**{: #vbNewLine }
: The platform-appropriate newline character. In twinBASIC, identical to **vbCrLf**.

**vbNullChar**{: #vbNullChar }
: The null character — **Chr(0)**.

**vbNullPtr**{: #vbNullPtr }
: A null pointer of type **LongPtr** (zero), for use with API declarations that take a pointer or handle argument.

**vbNullString**{: #vbNullString }
: A null string pointer. Distinct from the zero-length string `""`; used when calling external procedures that differentiate between a null pointer and an empty string.

**vbObjectError**{: #vbObjectError }
: The base value for user-defined error numbers — **&H80040000** (-2147221504). User-defined error numbers should be greater than this; for example, `Err.Raise vbObjectError + 1000`.

**vbTab**{: #vbTab }
: The tab character — **Chr(9)**.

**vbVerticalTab**{: #vbVerticalTab }
: The vertical tab character — **Chr(11)**.

## Enumerations

- [VbAppWinStyle](VbAppWinStyle) -- window style values for the **Shell** function
- [VbArchitecture](VbArchitecture) -- processor architecture identifiers
- [VbCalendar](VbCalendar) -- calendar type values (Gregorian or Hijri)
- [VbCallType](VbCallType) -- procedure call type values for **CallByName**
- [VbCompareMethod](VbCompareMethod) -- text comparison modes for string functions
- [VbDateTimeFormat](VbDateTimeFormat) -- format codes for **FormatDateTime**
- [VbDayOfWeek](VbDayOfWeek) -- day-of-week constants for date functions
- [VbFileAttribute](VbFileAttribute) -- file attribute flags for **Dir**, **GetAttr**, and **SetAttr**
- [VbFirstWeekOfYear](VbFirstWeekOfYear) -- first-week-of-year selectors for date functions
- [VbIMEStatus](VbIMEStatus) -- Input Method Editor status values
- [VbMsgBoxResult](VbMsgBoxResult) -- the values returned by **MsgBox**
- [VbMsgBoxStyle](VbMsgBoxStyle) -- buttons, icons, and behaviour flags for **MsgBox**
- [VbStrConv](VbStrConv) -- conversion type flags for **StrConv**
- [VbTriState](VbTriState) -- three-state values used in place of **Boolean** arguments
- [VbVarType](VbVarType) -- variant subtype codes returned by **VarType**
