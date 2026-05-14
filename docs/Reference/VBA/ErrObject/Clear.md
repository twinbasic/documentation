---
title: Clear
parent: ErrObject
permalink: /tB/Modules/ErrObject/Clear
vba_attribution: true
---
# Clear
{: .no_toc }

Clears all property settings of the **Err** object — [**Number**](Number) is reset to **0**, the string properties to zero-length strings, and [**HelpContext**](HelpContext) to **0**.

Syntax: **Err**.**Clear**

Use **Clear** to explicitly reset the **Err** object after an error has been handled, for example when using deferred error handling with **On Error Resume Next**. **Clear** is also called automatically whenever any of the following statements is executed:

- Any form of **Resume**
- **Exit Sub**, **Exit Function**, **Exit Property**
- Any **On Error** statement

> [!NOTE]
>
> The **On Error Resume Next** construct may be preferable to **On Error GoTo** when handling errors generated during access to other objects. Checking **Err** after each interaction with an object removes ambiguity about which object the error came from — both the object that placed the code in [**Err.Number**](Number) and the object that originally generated the error (specified in [**Err.Source**](Source)) can be identified, and they may be distinct.

### Example

This example uses **Err.Clear** to reset the **Err** object's numeric properties to zero and its string properties to zero-length strings between iterations of a loop. If **Clear** were omitted, the error message dialog box would be displayed on every iteration after an error first occurred — whether or not the next calculation actually generated an error.

```tb
Dim result(10) As Integer    ' Declare an array whose elements 
                             ' will overflow.
Dim idx As Long
On Error Resume Next         ' Defer error trapping.
Do Until idx = 10
    ' Generate an occasional error, or store the result if no error.
    result(idx) = Rnd * idx * 20000
    If Err.Number <> 0 Then
        MsgBox Err, , "Error generated: ", Err.HelpFile, Err.HelpContext
        Err.Clear            ' Clear Err object properties.
    End If
    idx = idx + 1
Loop
```

### See Also

- [Number](Number) property
- [Description](Description) property
- [Source](Source) property
- [Raise](Raise) method
