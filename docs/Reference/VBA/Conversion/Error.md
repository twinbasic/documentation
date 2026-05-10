---
title: Error function
parent: Conversion Module
permalink: /tB/Modules/Conversion/Error
---
# Error, Error$
{: .no_toc }

Returns the error message that corresponds to a given error number.

Syntax:

- **Error$** [ **(** *errornumber* **)** ]
- **Error** [ **(** *errornumber* **)** ]

*errornumber*
: *optional* Any valid error number. If *errornumber* is a valid error number but is not defined, **Error** returns the string `"Application-defined or object-defined error"`. If *errornumber* is not valid, an error occurs. If *errornumber* is omitted, the message corresponding to the most recent run-time error is returned. If no run-time error has occurred, or *errornumber* is `0`, **Error** returns a zero-length string (`""`).

The `$`-suffixed form returns a **String**; the unsuffixed form returns a **Variant** (**String**).

> [!NOTE]
> The **Error** *function* (described here) and the [**Error**](../../Core/Error) *statement* share a name but are different language elements. The function returns the message text for an error number; the statement raises a run-time error.

Examine the property settings of the **Err** object to identify the most recent run-time error. The return value of the **Error** function corresponds to the **Description** property of the **Err** object.

### Example

This example uses the **Error** function to print error messages that correspond to the specified error numbers.

```tb
Private Sub PrintError()
    Dim ErrorNumber As Long, count As Long
    count = 1: ErrorNumber = 1
    On Error GoTo EOSb
    Do While count < 100
        Do While Error(ErrorNumber) = "Application-defined or object-defined error"
            ErrorNumber = ErrorNumber + 1
        Loop
        Debug.Print count & "-Error(" & ErrorNumber & "): " & Error(ErrorNumber)
        ErrorNumber = ErrorNumber + 1
        count = count + 1
    Loop
EOSb: Debug.Print ErrorNumber
End Sub
```

### See Also

- [Error](../../Core/Error) statement
- [CVErr](CVErr) function

{% include VBA-Attribution.md %}
