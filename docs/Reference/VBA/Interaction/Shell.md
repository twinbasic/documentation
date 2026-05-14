---
title: Shell
parent: Interaction Module
permalink: /tB/Modules/Interaction/Shell
redirect_from:
-  /tB/Core/Shell
vba_attribution: true
---
# Shell
{: .no_toc }

Runs an executable program asynchronously and returns a **Double** containing the new process's task ID, or zero if the program could not be started.

Syntax: **Shell(** *pathname* [ **,** *windowstyle* ] **)**

*pathname*
: *required* **Variant** (**String**). Name of the program to execute, optionally including a directory or drive, plus any required arguments or command-line switches.

*windowstyle*
: *optional* A [**VbAppWinStyle**](../Constants/VbAppWinStyle) value specifying the style of window in which the program is run. If omitted, the program is started minimized with focus (`vbMinimizedFocus`).

If **Shell** successfully launches the named program, it returns the new process's task ID — a unique number identifying the running program. If **Shell** can't start the named program, a run-time error is raised.

> [!NOTE]
> By default, **Shell** runs other programs *asynchronously*: a program started with **Shell** may not have finished — or even fully started — by the time the statements following **Shell** are executed. To wait for the program to finish, retain the returned task ID and poll the process via the Win32 `OpenProcess`/`WaitForSingleObject` APIs (or use a higher-level helper).

### Example

This example uses **Shell** to run Notepad with a normal-sized focused window.

```tb
Dim TaskId As Double
TaskId = Shell("C:\Windows\Notepad.exe", vbNormalFocus)
```

### See Also

- [AppActivate](AppActivate) statement
- [SendKeys](SendKeys) statement
- [VbAppWinStyle](../Constants/VbAppWinStyle) enumeration
