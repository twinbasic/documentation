Filed as [twinbasic/twinbasic#2502](https://github.com/twinbasic/twinbasic/issues/2502).

## Clear All Breakpoints is undone by restarting the compiler, unless the project was saved in between

**Describe the bug**
Breakpoints removed with **Debug > Clear All Breakpoints** come back when the compiler restarts. After **Restart the compiler** on the toolbar the margin shows them again, as they were just before they were cleared, and the next run stops at them. A breakpoint removed with F9 stays removed, and saving the project between the two keeps the effect of **Clear All Breakpoints**.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `clear-all-breakpoints-restart.twinproj` (attached as `clear-all-breakpoints-restart.zip`) and open `Startup.twin`. `Main` prints three lines:
   ```
   Public Sub Main()
       Debug.Print "main start"
       Debug.Print "the breakpoint's line" ' BREAK
       Debug.Print "main end"
   End Sub
   ```
2. Put the cursor on the line marked `BREAK` and press F9. A breakpoint appears in the margin.
3. Choose **Debug > Clear All Breakpoints** (Ctrl+Shift+F9). The breakpoint goes.
4. Click **Restart the compiler** on the toolbar, and wait for the compile to end. The breakpoint is back in the margin.
5. Press F5. The run stops at the breakpoint, having printed only `main start`.

**Expected behavior**
Breakpoints cleared with **Clear All Breakpoints** stay cleared, as a breakpoint removed with F9 does: after the restart the margin shows none, and F5 prints all three lines.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Also on BETA 987, identically.

What does not reproduce it: removing the breakpoint with F9 instead, which stays removed across the restart; and saving the project (Ctrl+S) after **Clear All Breakpoints** and before the restart, which keeps them cleared. A breakpoint saved with the project survives a restart, as it should. Not tried: whether the IDE's other ways of starting a new compiler, such as switching between win32 and win64, do the same.

Where it seems to come from, in BETA 995's `ide/main.js`: F9 records each change in `g_SessionFilesystemTransactions`, which the IDE replays into a new compiler and which a save empties; **Clear All Breakpoints** (`tbDebug_BreakpointsClear`) clears the breakpoints in the compiler and records nothing there, so the replay sets them again.

Severity: breakpoints a person has removed stop the program again after a restart, with nothing to connect the two.

<!-- Asserted by `ide-test.bat --only breakpoints` (test/ide/breakpoints.test.mjs: the fault, then F9, saving after Clear All, and a saved breakpoint across a restart); passes on BETA 995 and 987. The reproducer's Startup.twin is test/ide/probes/breakpoints/Sources/Startup.twin with a different header comment. When fixed: update that test and this entry. -->
