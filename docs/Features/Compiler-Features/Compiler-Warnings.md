---
title: Compiler Warnings
parent: Compiler and IDE Features
nav_order: 1
---

# Compiler Warnings

twinBASIC provides compiler warnings during design time for common bad practices or likely oversights.

## Available Warnings

### Warnings for Likely Incorrect Hex Literals

Non-explicit values are coerced into the lowest possible type first. So if you declare a constant as `&H8000`, the compiler sees it as an -32,768 `Integer`, and when you're putting that into a `Long` you almost certainly do not want -32,768, you want **positive** 32,768, which requires you to instead use `&H8000&`.

This warning is supplied for `&H8000`-`&HFFFF` and `&H80000000`-`&HFFFFFFFF`.

### Warnings for Implicit Variable Creation with ReDim

When you use `ReDim myArray(1)`, the `myArray` variable is created for you, when it's good practice to declare all variables first.

### Warnings for Use of DefType

This feature is discouraged for it making code difficult to read and prone to difficult to debug errors.

The full list can be found in your project's Settings page:

![image](../Images/017bd6f8-4b35-43a9-b6be-84cba69daf64.png)

## Adjusting Warnings

Each warning has the ability to set them to ignore or turn them into an error both project-wide via the Settings page, and per-module/class, and per-procedure with `[IgnoreWarnings(TB___)]`, `[EnforceWarnings(TB____)]`, and `[EnforceErrors(TB____)]` attributes, where the underscores are replaced with the **full** number, e.g. `[IgnoreWarnings(TB0001)]`; the leading zeroes must be included.

## Strict Mode

twinBASIC has added the following warning messages to support something similar to .NET's Strict Mode, where certain implicit conversions are not allowed and must be made explicit. By default, these are all set to be ignored, and must be enabled in the "Compiler Warnings" section of Project Settings or per-module/procedure with `[EnforceWarnings()]`. All of these can be configured individually and ignored for procedure/module scope with `[IgnoreWarnings()]`

### TB0018: Implicit Narrowing Conversion

Such as converting a Long to Integer; if you have `Dim i As Integer, l As Long` then `i = l` will trigger the warning, and `i = CInt(l)` would be required to avoid it.

### TB0019: Implicit Enumeration Conversion

When assigning a member of one Enum to a variable typed as another, such as `Dim day As VbDayOfWeek: day = vbBlack`. The `CType(Of <type>)` operator whose use in pointers was described in the previous section is also used to specify an explicit type conversion in this case; the warning would not be triggered by `day = CType(Of VbDayOfWeek)(vbBlack)`.

### TB0020: Suspicious Interface Conversion

If a declared coclass doesn't explicitly name an interface as supported, converting to it will trigger this warning, e.g.:

```vb
Dim myPic As StdPicture
Dim myFont As StdFont
Set myFont = myPic
```

You'd use `Set myFont = CType(OfStdFont)(myPic)` to avoid this warning.

### TB0021: Implicit Enumeration Conversion to/from Numeric

Triggered by assigning a numeric literal to a variable typed as an Enum, such as `Dim day As VbDayOfWeek: day = 1`. To avoid it you'd use `day = CType(Of VbDayOfWeek)(1)`.
