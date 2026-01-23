---
title: Error
parent: Statements
permalink: /tB/Core/Error
---

# Error
{: .no_toc }

Simulates the occurrence of an error.

Syntax: **Error** *errornumber*

*errornumber*
: can be any valid error number.

The **Error** statement is supported for backward compatibility. In new code, especially when creating objects, use the **Err** object's **Raise** method to generate run-time errors.

If *errornumber* is defined, the **Error** statement calls the error handler after the properties of the **Err** object are assigned the following default values:

| Property         | Value                                                        |
| :--------------- | :----------------------------------------------------------- |
| **Number**       | Value specified as argument to **Error** statement. Can be any valid error number. |
| **Source**       | Name of the current Visual Basic project. |
| **Description**  | String expression corresponding to the return value of the **Error** function for the specified **Number**, if this string exists. If the string doesn't exist, **Description** contains a zero-length string (""). |
| **HelpFile**     | The fully qualified drive, path, and file name of the appropriate Visual Basic Help file. |
| **HelpContext**  | The appropriate Visual Basic Help file context ID for the error corresponding to the **Number** property. |
| **LastDLLError** | Zero.                                                        |

If no error handler exists or if none is enabled, an error message is created and displayed from the **Err** object properties.

### Example

This example uses the **Error** statement to simulate error number 11.

```vb
On Error Resume Next ' Defer error handling. 
Error 11 ' Simulate the "Division by zero" error. 
```

{% include VBA-Attribution.md %}