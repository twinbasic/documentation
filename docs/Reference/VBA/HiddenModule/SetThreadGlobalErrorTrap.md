---
title: SetThreadGlobalErrorTrap
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/SetThreadGlobalErrorTrap
---
# SetThreadGlobalErrorTrap
{: .no_toc }

Registers a global callback that fires when an unhandled run-time error is raised on the calling thread.

Syntax: **SetThreadGlobalErrorTrap** *CallbackAddress*

*CallbackAddress*
: *required* **LongPtr**. The address of a callback procedure, typically obtained with **AddressOf**. Pass `0` to clear the trap.

The trap supplements ordinary `On Error` handling: it sees errors that escape the active error handler chain on the thread that registered it, and is called before the runtime decides what to do next (display the unhandled-error dialog, end the program, etc.). Useful for wiring up application-wide logging or crash reporting.

Only one trap is active per thread; setting a new one replaces the previous.

### See Also

- [On Error](../../Core/On-Error) statement
- [Err object](../ErrObject/)
