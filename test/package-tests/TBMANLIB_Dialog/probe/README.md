# TBMANLIB_Dialog probe

What the contributed package TBMANLIB_Dialog's classes do at run time: **cDialog** and **cDialogEx**
(the Open, Save As and folder dialogs), the five common dialogs of Windows, and the dialogs of the
package's own making (the countdown message box, the date and time, input box and password
dialogs, and a progress dialog with no window), opened in a built exe on a private desktop and operated from
inside the exe. The pages under `docs/Reference/Contributed/TBMANLIB_Dialog/` state what this
probe printed, on package 1.1.0.0 and BETA 1005, in 32-bit and 64-bit builds. Run it again when
the section's `indexed_from` moves to a new version of the package.

It is outside every gate and CI: it needs Windows, a twinBASIC install (the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop, as `tbrun` finds it) and the package in the indexer's
store (`node indexer/twin-index.mjs sync`).

## Running it

```sh
node test/package-tests/TBMANLIB_Dialog/probe/probe.mjs 13,1,2,3 4,5 6 6d,7 8,9,9e 11,12,12b,12c 14,15 16,17 18
node test/package-tests/TBMANLIB_Dialog/probe/probe.mjs --timeout 35 x0,y1 x1,x2 x3,x4 x5 x6 x7 x8 x9 x10 x11,x12 x13,x14 x15,x16 y2,y3
node test/package-tests/TBMANLIB_Dialog/probe/probe.mjs --timeout 35 y4
node test/package-tests/TBMANLIB_Dialog/probe/probe.mjs --arch win64 --port 9722 13,1,2 3 4 5 6,6d 7,8 9 9e 11,12,12b,12c 14 15 16,17 18
node test/package-tests/TBMANLIB_Dialog/probe/probe.mjs c1,c11,c21,c31,c41 c2 c3 c4
node test/package-tests/TBMANLIB_Dialog/probe/probe.mjs d0,d1 d2 d3,d4 d5 d10 d11 d12 d20 d21 d22,d23 d30 d31 d32 d33 d34 d40
```

The first run of 1.1.0.0 ran every scenario in both builds without a crash, apart from `y4`.
In 1.0.0.1 a 64-bit build ended its run at **ShowBrowseForFolder** (scenarios 3, 4, 9 and 9e
each needed a run of their own); in 1.1.0.0 it does not, and those scenarios can share a run.
**`y4` ends its own run**: it calls `SetDefaultFolder` with the true `IShellItem` identifier,
which crashes inside `windows.storage.dll` (exit code 0xC0000005, in 32-bit and 64-bit builds),
and that crash is its answer; run it alone.

Each argument is one run of the exe; the scenario ids are listed at the top of
[`src/Probe.twin`](src/Probe.twin), each the number of a question it answers, and the `x` and
`y` scenarios (**cDialogEx** and **mDialog**) are in [`src/ProbeEx.twin`](src/ProbeEx.twin). A
build takes about ten seconds and a run under 25 s (`--timeout` changes that; the `x` scenarios
open several slower dialogs and are run with 35); both commands take a minute or two. Exit 1
means a run crashed or timed out.

`--overlay <dir>` copies the files of `<dir>` over the package's own sources in the work tree (the
path under `Sources/` is the path under `<dir>`), to try a change to the package's code; keep
`<dir>` outside the repository. It ran the control experiment of **cDialogFindReplace**: the
package's file with its two `FINDREPLACE` structures moved from local variables to class level,
which makes the owner window receive the messages (c43, c44).

- [`probe.mjs`](probe.mjs) writes the project (the `contributed-TBMANLIB_Dialog` sample template's
  Settings, the package from the store, `src/`), builds it with `tbrun` and runs the exe once for
  each list of ids.
- [`run-exe.mjs`](run-exe.mjs) runs a built exe on a private desktop. `tbrun --exe` would do that
  too, but it presses OK on every dialog the exe opens within 250 ms, which races the probe's
  own automation and answers its Yes/No boxes. With `PROBE_SHOTS=1 SHOTS=<dir>` it photographs
  each dialog and menu; that is how the text of the task-dialog message boxes, which expose no
  readable text, was read.
- [`src/Auto.twin`](src/Auto.twin) operates a dialog from inside the exe: a thread timer, whose
  messages the dialog's modal loop dispatches, finds the dialog, reads its title, controls and
  file-type list, types into it and presses its buttons. It cancels a dialog after 3.6 s and ends
  the process after 5.4 s, so nothing waits on a dialog it cannot operate.

## The common dialogs (scenarios c1 to c48)

[`src/ProbeB1.twin`](src/ProbeB1.twin) holds the scenarios for the five dialogs of Windows that the
package wraps: **cDialogColor** (c1 to c4), **cDialogFont** (c11 to c17), **cDialogPrint** (c21 to
c27), **cDialogPageSetup** (c31 to c35) and **cDialogFindReplace** (c41 to c48); the list at the top
of `src/Probe.twin` says what each asks. [`src/DrvB1.twin`](src/DrvB1.twin) is a scripted dialog
driver for them: a scenario names a sequence of steps (record the controls, read a list, set the text
of a control, click a button, select a combo box item, wait, press OK or Cancel) and the driver runs
each step on a timer tick while the dialog window exists. A modeless dialog (Find, Replace) is left
by posting `WM_QUIT` two ticks after its window is gone. Every global of the driver begins with
`D`: an unprefixed public name in a probe module collides with `Auto.twin` (TB5073).

## The dialogs of the package's own making (scenarios d0 to d40)

`d1..d5` **cDialogCountdownMsgBox** (the message box of `MessageBoxTimeoutW`, its countdown text,
every `Show*` method, the buttons, closing, overflow, the owner), `d10..d12d` **cDialogDateTime**
(the InputBox, OK, Cancel, the entries it refuses, AM and PM), `d20..d23` **cDialogInputBox** (the
hint and length text, validation and three attempts, the quick methods), `d30..d34b`
**cDialogPassword** (the mask, attempts, the confirmation box, the change dialog, `PasswordChar`)
and `d40` **cDialogProgress** (a class with no window: its logic and events, run in both builds);
`d0` and `d0b` show how the run-time's InputBox, MsgBox and message-box windows are built. Files:
[`src/AutoD.twin`](src/AutoD.twin) (the timer driver, with scripts such as `t=text|id=1;id=2` for
each window in turn), `ProbeD.twin` (dispatcher and `d0..d5`), `ProbeDT.twin`, `ProbeIB.twin`,
`ProbePW.twin`, `ProbePG.twin` and `ProgSink.twin` (an event sink for `d40`). The scenarios gave
the same results in 32-bit and 64-bit builds. A window after the second appears about two seconds
late.

## Rules

- A run is ended at `--timeout` seconds (25 by default): keep to about five dialog episodes a run
  (about eight windows for the `d` scenarios), and one id, or a few cheap ones, per argument.
- **Never print.** Nothing sends anything to a printer. Print and Page Setup are answered with OK only
  where the class reads the structure and frees what the dialog allocated; no scenario calls
  `StartDoc` or changes the default printer or a printer's settings. c26 asks for a printer device
  context only when the default printer is a Microsoft virtual one, and deletes the context at once.
  The Print and Page Setup dialogs list the computer's printers, their drivers and ports: `DMask`
  (on for c21 to c35) hides the names in what a scenario prints; copy none of that into a page or a
  report.
- `Probe.twin` declares the result of **OpenFile** in scenario 11 as a **Variant**: the method
  returns a **LongPtr** in 1.1.0.0, which a **Long** does not take in a 64-bit build.

- Never call **OpenFile** or **SelectAndOpenFile** on a path that exists, or on `""`: it starts
  a program. `OpenFile("")` opens a File Explorer window, and the COM-started `explorer.exe`
  behind it outlives the exe, with its window on the private desktop where nobody can close
  it; it has to be ended by its pid.
- Never run the exe on the user's desktop, or a dialog in the IDE: the probe's `[RunAfterBuild]`
  Sub only prints.
