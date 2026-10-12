---
title: Running and debugging
parent: IDE
nav_order: 6
permalink: /tB/IDE/Debugging/
has_toc: false
---

# Running and debugging

The IDE runs your program inside the compiler, so you can stop it, look at its variables and step through its code without building an executable first.

- [**Running**](Running) --- Start, Break and End, what Start runs, Run Or Preview (<kbd>F6</kbd>), the **PROCESS** boxes in the status bar, and what ends a run.
- [**Breakpoints and stepping**](Breakpoints-and-Stepping) --- breakpoints, the current-line marker, the step commands, Set Next Statement, and the panel that opens when a run-time error stops the program.
- [**Inspecting a paused program**](Inspecting) --- the **VARIABLES**, **WATCHES** and **CALL STACK** panels, and the value that appears when you point at a variable.
- [**Debug Console**](Debug-Console) --- program output, the input row that runs a line of code, and the trace logger.
- [**Memory**](Memory) --- the raw bytes of the paused program.

The commands of these pages are listed by menu in the [Run menu](../Reference/Menu/Run) and [Debug menu](../Reference/Menu/Debug) reference pages, and as buttons in the [Toolbar](../Reference/Toolbar).

## The three states of a program

A program started from the IDE is in one of three states, and the state decides which commands work.

- **Idle.** Nothing is running. **Start** works, and so do the commands that need only a project.
- **Running.** The program is executing. **Break** and **End** work. The step commands do not.
- **Paused.** The program has stopped at a breakpoint, after a step, at a `Stop` statement, at a run-time error, or because you pressed **Break**. **Start** (now continuing), **End**, the step commands and **Set Next Statement** work. The editor shows where the program stopped.

The IDE does not make a paused or running program read-only. You can type in the editor in any state. [Running](Running#editing-while-the-program-runs) says what happens to the program when you do.

At every stop, the IDE shows its own window and asks for the keyboard focus.

## The panels that show a paused program

Five panels show the state of a paused program. All of them are in the **View** menu.

| Panel | Page | In the default layout |
|---|---|---|
| **CALL STACK** | [Call Stack](Inspecting#call-stack) | Yes. <kbd>Ctrl</kbd>+<kbd>L</kbd> shows it. |
| **VARIABLES** | [Variables](Inspecting#variables) | Yes. |
| **WATCHES** | [Watches](Inspecting#watches) | No. **Add Watch...** opens it. |
| **DEBUG CONSOLE** | [Debug Console](Debug-Console) | Yes. <kbd>Ctrl</kbd>+<kbd>G</kbd> shows it and moves the focus to its input row. |
| **MEMORY 1** | [Memory](Memory) | No. |

Nothing opens a panel when the program stops. If you closed a panel, or your [panel layout](../Customising/Panel-Layouts) never had it, open it from the **View** menu before you run. The panels are empty, or dimmed, while the program is idle or running.

## Keys

| Key | Command | Works when |
|---|---|---|
| <kbd>F5</kbd> | **Start** or continue | A project is open, and the program is idle or paused. |
| <kbd>Ctrl</kbd>+<kbd>Break</kbd> | **Break** | The program is running and not paused. |
| <kbd>F6</kbd> | **Run Or Preview** | A code editor or a form designer is active. |
| <kbd>F8</kbd>, <kbd>F11</kbd> | **Step Into** | The program is paused. |
| <kbd>Shift</kbd>+<kbd>F8</kbd>, <kbd>F10</kbd> | **Step Over** | The program is paused. |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F8</kbd>, <kbd>Shift</kbd>+<kbd>F11</kbd> | **Step Out** | The program is paused. |
| <kbd>Ctrl</kbd>+<kbd>F9</kbd> | **Set Next Statement** | The program is paused. |
| <kbd>F9</kbd> | **Toggle Breakpoint** | The focus is in a code editor. |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F9</kbd> | **Clear All Breakpoints** | A project is open. |
| <kbd>Shift</kbd>+<kbd>F9</kbd> | **Add Watch...** | A project is open. |
| <kbd>Ctrl</kbd>+<kbd>L</kbd> | Show **CALL STACK** | In any state of the program. |
| <kbd>Ctrl</kbd>+<kbd>G</kbd> | Show **DEBUG CONSOLE** | In any state of the program. |

**End**, **Clear Watches** and the two **Debugger Options** items have no key. A key held down repeats, so holding <kbd>F8</kbd> steps over and over. [Manage Keyboard Shortcuts](../Customising/Keyboard-Shortcuts) changes any of the keys. The Debug Console's input row has keys of its own, listed in [Debug Console](Debug-Console#the-input-row).

## See Also

- [Writing code](../Code/) -- the editor, where the breakpoints and the current line show
- [Project Settings](../Project-Settings) -- Startup Object, Break On All Errors, Debuggable and the trace settings
- [Testing with Assert](../../../Tutorials/Testing-with-Assert) -- run a procedure with <kbd>F6</kbd> and read its failures
