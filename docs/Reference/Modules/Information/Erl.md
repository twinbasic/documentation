---
title: Erl
parent: Information Module
permalink: /tB/Modules/Information/Erl
redirect_from:
-  /tB/Core/Erl
---
# Erl
{: .no_toc }

Returns a **Long** containing the line number of the most recently executed statement at which a run-time error was raised.

Syntax: **Erl** [ **()** ]

A *line number* is a numeric label that prefixes a statement, such as the `110:` in `110: x = 1 / 0`. They are a relic of older Basic dialects, retained mainly so that error handlers can report where a fault occurred. **Erl** is set to that label when an error is raised inside the labelled statement, and reset to **0** when the active error handler exits via **Resume**, **Resume Next**, or any **Exit** statement.

If the statement that raised the error has no preceding line number, **Erl** returns **0**.

### Example

This example uses **Erl** to log the line number where a run-time error was raised.

```tb
Sub Demo()
    On Error GoTo Handler
100:    Dim x As Double
110:    x = 1 / 0                      ' Generates a division-by-zero error.
        Exit Sub
Handler:
        Debug.Print "Error at line "; Erl    ' Prints "Error at line  110".
End Sub
```

### See Also

- [Err](Err) property
- [On Error](../../Core/On-Error) statement
