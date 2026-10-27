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

Runs an executable program asynchronously and returns a **Double** containing the new process's task ID.

<!-- VBA: the opening sentence went on ", or zero if the program could not be started"; VB6, 64-bit VBA and twinBASIC raise an error instead (Common Errors). -->


Syntax: **Shell(** *pathname* [ **,** *windowstyle* ] **)**

*pathname*
: *required* **Variant** (**String**). Name of the program to execute, optionally including a directory or drive, plus any required arguments or command-line switches.

*windowstyle*
: *optional* A [**VbAppWinStyle**](../Constants/VbAppWinStyle) value specifying the style of window in which the program is run. If omitted, the program is started minimized with focus (`vbMinimizedFocus`).

If **Shell** successfully launches the named program, it returns the new process's task ID --- a unique number identifying the running program. If **Shell** can't start the named program, a run-time error is raised.

> [!NOTE]
> By default, **Shell** runs other programs *asynchronously*: a program started with **Shell** may not have finished --- or even fully started --- by the time the statements following **Shell** are executed. To wait for the program to finish, retain the returned task ID and poll the process via the Win32 `OpenProcess`/`WaitForSingleObject` APIs (or use a higher-level helper).

<!-- errors: generated from errors/VBA.Interaction.yml by scripts/errors.mjs write; edit the data, not this section -->
### Common Errors

| Error | When |
|---|---|
| [94 (`&H5E`)](tb:Errors#94), *Invalid use of Null* | *pathname* or *windowstyle* is **Null** |
| [-2147467259 (`&H80004005`)](tb:Errors#-2147467259), *Unspecified error* | *pathname* is a zero-length string or spaces, names a folder or a file that is not a program, or is longer than 32,767 characters<br>the program, or a folder in its path, does not exist, or *pathname* opens a quotation mark it does not close<br>*windowstyle* is less than 0 or greater than 10 after rounding |

> [!NOTE] BETA 1010
> When *pathname* is a zero-length string or spaces, names a folder or a file that is not a program, or is longer than 32,767 characters, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When the program, or a folder in its path, does not exist, or *pathname* opens a quotation mark it does not close, VB6 and 64-bit VBA raise error [53 (`&H35`)](tb:Errors#53), *File not found*, instead.

> [!NOTE] BETA 1010
> When *windowstyle* is less than 0 or greater than 10 after rounding, VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*, instead.

> [!NOTE] BETA 1010
> When *windowstyle* is 10 after rounding (`SW_SHOWDEFAULT`, which a new program's start-up information may not hold), VB6 and 64-bit VBA raise error [5 (`&H5`)](tb:Errors#5), *Invalid procedure call or argument*; twinBASIC raises none.

<!-- /errors -->

### Example

This example uses **Shell** to run Notepad with a normal-sized focused window.

```tb check_build
Dim TaskId As Double
TaskId = Shell("C:\Windows\Notepad.exe", vbNormalFocus)
```

### See Also

- [AppActivate](AppActivate) statement
- [SendKeys](SendKeys) statement
- [VbAppWinStyle](../Constants/VbAppWinStyle) enumeration
