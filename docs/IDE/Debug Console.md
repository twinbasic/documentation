---
title: Debug Console
parent: IDE
# nav_order: 2
permalink: /tB/IDE/Project/DebugConsole
---

# Debug Console

![The Debug Console pane with its three header buttons outlined at the top right and annotation arrows naming them Auto Scroll, Clear Debug Console and Options. The Options menu is open, offering Invert Output Direction and a ticked Show Timestamps, and a fourth arrow points at the input row outlined along the bottom edge.](Images/DebugConsole.png)

The Debug Console captures output from [**Debug.Print**](../../Modules/Debug#print) statements and other debug-layer messages written at runtime, displaying them in a scrollable log. [**Debug.TracePrint**](../../Modules/Debug#traceprint) writes here too when *Compilation: Trace Output* is set to the debug console rather than a file.

## ![](Images/DebugConsole_AutoScroll.png) Auto Scroll

## ![](Images/DebugConsole_Clear.png) Clear Debug Console

Empties the console. [**Debug.Cls**](../../Modules/Debug#cls) does the same thing from code.

## ![](Images/DebugConsole_Options.png) Options

- Invert Output Direction
- Show Timestamps

## ![](Images/DebugConsole_Input.png) Input

The row along the bottom of the console runs one line of code when <kbd>ENTER</kbd> is pressed. <kbd>CTRL</kbd> + <kbd>G</kbd> moves the keyboard focus to it, and the up arrow key (<kbd>ARROWUP</kbd>) brings back earlier lines, the most recent first.

- **`?` and an expression** prints the value, the same way [**Debug.Print**](../../Modules/Debug#print) does, and `Debug.Print` itself works too. Several expressions separated by commas or semicolons are spaced as **Debug.Print** spaces them.
- **A statement** runs: `idx = 5` gives a variable a new value, and a procedure's name, such as `Module1.Main` or just `Main`, calls it.
- **An expression on its own** is refused: `i` gives `(compile error: Expression is neither used nor assigned)`.

The console repeats each line, then shows its output and how long it took, as `(time taken: …)`. A line that is refused shows the compile error instead.

While the program is stopped --- at a breakpoint, after a step, or at a run-time error --- the line runs inside the procedure selected in the [Call Stack](CallStack) pane. It can read and change that procedure's local variables, and the [Variables](Variables) pane shows the change. With the calling procedure selected instead, the failing procedure's variables are unknown: `? i` gives `(compile error: Unrecognized symbol 'i')`. With nothing running, the row still evaluates expressions and calls procedures.

At a run-time error, running a line in the console removes the error panel. [When a run-time error stops the program](Menu/Debug#when-a-run-time-error-stops-the-program) describes what to do then.
