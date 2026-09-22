---
title: Debug
parent: VBA Package
permalink: /tB/Modules/Debug
---
# Debug
{: .no_toc }

The intrinsic debugging object. Writes to the IDE's [Debug Console](../IDE/Project/DebugConsole), clears it, asserts a condition, and writes to the trace log.

**Debug** is a built-in class with a predeclared instance, so there is nothing to declare or construct --- the name **Debug** is the object. It has four methods and no properties.

| method | writes to |
|---|---|
| [**Print**](#print) | the Debug Console |
| [**TracePrint**](#traceprint) | the active trace output |
| [**Cls**](#cls) | --- clears the Debug Console |
| [**Assert**](#assert) | --- halts if a condition is **False** |

## Debug.Print
{: #print }

Writes text to the [Debug Console](../IDE/Project/DebugConsole).

Syntax: **Debug.Print** [ *outputlist* ]

*outputlist*
: *optional* Expressions to write. Separate them with a comma to start each at the next **print zone**, or with a semicolon to place them immediately after one another. **Tab(***n***)** moves to column *n* and **Tab** with no argument to the next zone; **Spc(***n***)** inserts *n* spaces. A trailing semicolon holds the cursor on the same line, so the next **Print** continues it; without one, the line ends. With no *outputlist* at all, **Print** writes a blank line. The full grammar is on the [**Print** statement](../Core/Print#the-output-list) page, which **Debug.Print** shares with **Print #** and with the drawing-surface classes.

The console is monospaced, so a zone here is 14 characters wide and zones begin at columns 0, 14, 28 and so on. An expression that reaches the end of its zone pushes the next one into the zone after.

```tb
Debug.Print                       ' a blank line
Debug.Print "value: "; 42         ' value: 42
Debug.Print "left", "right"       ' right starts at column 14
Debug.Print "no newline yet";
Debug.Print " --- continued"
```

Numbers are written with a leading space where the sign would go, and a trailing space after the value, so `Debug.Print 1, 2, 3` puts `1`, `2` and `3` at columns 1, 15 and 29 rather than 0, 14 and 28.

## Debug.TracePrint
{: #traceprint }

Writes a message to the currently active trace output, **not** to the Debug Console.

Syntax: **Debug.TracePrint** [ *outputlist* ]

*outputlist*
: *optional* Expressions to write, with the same comma and semicolon rules as [**Print**](#print).

Where the message goes is a project setting rather than a property of the call: *Compilation: Trace Output* selects the debug console or a file, and *Compilation: Trace Flags* selects what is traced. **Tracing works in a compiled executable as well as under the IDE**, which is the reason to prefer it over **Print** for anything you want to diagnose on a machine that has no IDE on it. See [Debugging Features](../../Features/Compiler-IDE/Debugging).

```tb
Public Sub ProcessOrder(ByVal orderId As Long)
    Debug.TracePrint "ProcessOrder called, orderId=" & CStr(orderId)
End Sub
```

## Debug.Cls
{: #cls }

Clears the [Debug Console](../IDE/Project/DebugConsole).

Syntax: **Debug.Cls**

This is the programmatic form of the console's own *Clear Debug Console* button. Call it at the start of a run to separate that run's output from the previous one.

```tb
Debug.Cls
Debug.Print "--- run starting ---"
```

> [!NOTE]
> This is unrelated to the **Cls** *method* on a drawing surface such as [**Form**](../Packages/VB/Form/#cls) or [**PictureBox**](../Packages/VB/PictureBox/#cls), which clears graphics and text from that control rather than from the console.

## Debug.Assert
{: #assert }

Halts execution when a condition is **False**.

Syntax: **Debug.Assert** *booleanexpression*

*booleanexpression*
: An expression evaluating to **True** or **False**. Execution continues when it is **True** and breaks when it is **False**.

Use it to state something the surrounding code relies on, so a violated assumption stops at the line that states it rather than further away.

```tb
Public Function Average(values() As Double) As Double
    Debug.Assert IsArrayInitialized(values)
    Dim i As Long, total As Double
    For i = LBound(values) To UBound(values)
        total = total + values(i)
    Next
    Average = total / (UBound(values) - LBound(values) + 1)
End Function
```

[**IsArrayInitialized**](Information/IsArrayInitialized) is the right thing to assert here and `UBound(values) >= LBound(values)` is not: on an array the caller never sized, **LBound** and **UBound** raise error 9 themselves, so the assertion would be the line that fails rather than the line that catches it.

> [!NOTE]
> An assertion states what should never happen; it is not error handling and not input validation. For a condition a user can cause --- a missing file, a bad entry in a text box --- raise an error and handle it, because **Assert** is a development-time check rather than a way to report a problem to somebody running the program. For unit tests, the [Assert package](../Packages/Assert/) provides comparison assertions with reported results.

## See Also

- [Debug Console](../IDE/Project/DebugConsole) -- the IDE pane **Print** writes to, and its buttons
- [Debugging Features](../../Features/Compiler-IDE/Debugging) -- the trace logger **TracePrint** feeds, and its project settings
- [Assert Package](../Packages/Assert/) -- assertions for unit tests, with reported results
- [ErrObject](ErrObject/) -- the other intrinsic object in this package
- [Stop](../Core/Stop) statement -- suspends execution unconditionally
