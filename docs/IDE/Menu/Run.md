---
title: Run
parent: Menu
grand_parent: IDE Reference
nav_order: 7
permalink: /tB/IDE/Reference/Menu/Run
redirect_from:
  - /tB/IDE/Project/Menu/Run
---

# Run Menu

The Run menu holds the three commands that start, pause and end a run. [Running](../../Debugging/Running) explains them.

![The Run menu open while a program runs: Start, with F5 beside a play triangle, is greyed out; Break, with CTRL+BREAK beside a pause icon, and End, beside a stop icon, are available.](Images/Menu_Run.png){:width="169" height="103"}

**Start** (<kbd>F5</kbd>)
: Starts the program when nothing runs, and continues it when it is paused. The toolbar button is titled **Start / Continue**. It works when a project is open and the program is idle or paused. See [Start, Break and End](../../Debugging/Running#start-break-and-end).

**Break** (<kbd>Ctrl</kbd>+<kbd>Break</kbd>)
: Pauses a running program. It works only while the program runs and is not paused. See [Break](../../Debugging/Running#break).

**End**
: Stops the program, whether it is running or paused. It has no key. At a run-time error it ends only the procedure that failed; see [Traps](../../Debugging/Breakpoints-and-Stepping#traps).

The menu has no other items. <kbd>F6</kbd> (**Run Or Preview**) has no menu item; [Run Or Preview](../../Debugging/Running#run-or-preview) describes it. The programs that your program starts with `Shell` are listed in the [status bar](../../Debugging/Running#programs-that-your-program-starts), not in this menu.
