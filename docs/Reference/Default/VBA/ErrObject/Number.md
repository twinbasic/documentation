---
title: Number
parent: ErrObject
permalink: /tB/Modules/ErrObject/Number
vba_attribution: true
---
# Number
{: .no_toc }

Returns or sets a **Long** value specifying an error. **Number** is the default member of the **Err** object, so a bare reference to **Err** is equivalent to **Err.Number**. Read/write.

Syntax:
- **Err**.**Number**
- **Err**.**Number** **=** *errorNumber*

*errorNumber*
: A **Long** error code to assign to the **Err** object. When read, **Number** returns the current error code, or **0** if no error is active.

When returning a user-defined error from an object, set **Err.Number** by adding the chosen error code to the [**vbObjectError**](../Constants/#vbObjectError) constant. For example, the following code returns 1051 as an error code:

```tb check_build
Err.Raise Number:=vbObjectError + 1051, Source:="SomeClass"
```

## Error 9, Subscript out of range: numbers that differ from VBA
{: #error-numbers-that-differ-from-vba }

> [!NOTE]
> As of BETA 983, twinBASIC does not raise error 9, *Subscript out of range*, for an array index that is out of range or for a **Collection** member that does not exist. VBA's documentation gives error 9 for each case below; twinBASIC raises a different number.

| Access | VBA | twinBASIC |
|---|---|---|
| An array index outside the array's bounds, in any dimension --- in a fixed or dynamic array, an array held in a **Variant**, or the array that [**Split**](../Strings/Split) returns | 9 | -2147352565 (`&H8002000B`) *Invalid index.* |
| Any element of a dynamic array that has no dimensions, because it was never dimensioned or was emptied with [**Erase**](../../Core/Erase) | 9 | -2147467259 (`&H80004005`) *Unspecified error* |
| A [**Collection**](../Collection/) member that does not exist, by position or by key | 9 | -2147467259 (`&H80004005`) *Unspecified error* |

Code ported from VBA that relies on `Err.Number = 9` to detect a bad index misses these errors. Check the index before using it instead: compare it with [**LBound**](../Information/LBound) and [**UBound**](../Information/UBound) for an array, compare it with [**Count**](../Collection/Count) for a **Collection**, or test a key with [**Exists**](../Collection/Exists). Where the error itself has to be handled, test for the twinBASIC number as well as `9`. The hexadecimal literals `&H8002000B` and `&H80004005` are equal to the two numbers.

Error 9 is still raised elsewhere. **LBound** and **UBound** raise it for an array that has no dimensions, and the VB package's [**Printers**](../../Packages/VB/Printers/) collection raises it for an index past its end. The VB package's [**Forms**](../../Packages/VB/Global/#forms-collection) collection raises -2147467259 instead.

## Example

The first example illustrates a typical use of the **Number** property in an error-handling routine.

```tb check_build
Sub Demo()
    On Error GoTo Handler

    Dim x As Double, y As Double
    x = 1 / y                ' Create division-by-zero error.
    Exit Sub
Handler:
    MsgBox Err.Number
    MsgBox Err.Description
    ' Check for division-by-zero error.
    If Err.Number = 11 Then
        y = y + 1
    End If
    Resume
End Sub
```

The second example examines the **Number** property of the **Err** object to determine whether an error returned by an Automation object was defined by the object, or whether it was mapped to a built-in error.

The constant **vbObjectError** is a very large negative number that an object adds to its own error code to indicate that the error is server-defined; subtracting it from **Err.Number** strips it back out. If the error is object-defined, the base number is left in `myError`, which is displayed in a message box along with the original source of the error. If **Err.Number** represents a built-in error, the built-in error number is displayed instead.

```tb check_build
Dim myError As Long, msg As String
' Strip off the constant added by the object to indicate one of its own errors.
myError = Err.Number - vbObjectError
' If you subtract vbObjectError and the number is still in the range 0-65535,
' it is an object-defined error code.
If myError > 0 And myError < 65535 Then
    msg = "The object you accessed assigned this number to the error: " _
        & myError & ". The originator of the error was: " _
        & Err.Source & ". Press F1 to see the originator's Help topic."
Else
    msg = "This error (# " & Err.Number & ") is a built-in error number." _
        & " Press the Help button or F1 for the Help topic for this error."
End If
MsgBox msg, , "Object Error", Err.HelpFile, Err.HelpContext
```

## See Also

- [Description](Description) property
- [Source](Source) property
- [Raise](Raise) method
- [Clear](Clear) method
