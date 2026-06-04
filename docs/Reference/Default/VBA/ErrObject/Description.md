---
title: Description
parent: ErrObject
permalink: /tB/Modules/ErrObject/Description
vba_attribution: true
---
# Description
{: .no_toc }

Returns or sets a **String** containing a descriptive message associated with the active error. Read/write.

Syntax:
- **Err**.**Description**
- **Err**.**Description** **=** *errorDescription*

*errorDescription*
: A **String** describing the error. When read, **Description** returns the descriptive text for the active error, or a zero-length string if no error is active.

The **Description** setting consists of a short description of the error. Use this property to alert the user to an error that the code cannot or does not handle.

When generating a user-defined error, assign a short description of the error to the **Description** property. If **Description** isn't filled in and the value of [**Number**](Number) corresponds to a built-in run-time error, the string returned by the [**Error**](../Conversion/Error) function is placed in **Description** when the error is generated.

### Example

This example assigns a user-defined message to the **Description** property of the **Err** object.

```tb
Err.Description = "It was not possible to access an object necessary " _
    & "for this operation."
```

### See Also

- [Number](Number) property
- [Source](Source) property
- [Raise](Raise) method
- [Clear](Clear) method
