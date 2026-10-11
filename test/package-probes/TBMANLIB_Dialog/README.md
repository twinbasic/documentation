# TBMANLIB_Dialog probe

What the contributed package TBMANLIB_Dialog's **cDialog** does at run time: the Open, Save As
and Browse For Folder dialogs, opened in a built exe on a private desktop and operated from
inside the exe. The pages under `docs/Reference/Contributed/TBMANLIB_Dialog/` state what this
probe printed, on package 1.0.0.1 and BETA 1005, in 32-bit and 64-bit builds. Run it again when
the section's `indexed_from` moves to a new version of the package.

It is outside every gate and CI: it needs Windows, a twinBASIC install (the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop, as `tbrun` finds it) and the package in the indexer's
store (`node indexer/twin-index.mjs sync`).

## Running it

```sh
node test/package-probes/TBMANLIB_Dialog/probe.mjs 13,1,2,3 4,5 6 6d,7 8,9,9e 11,12,12b,12c
node test/package-probes/TBMANLIB_Dialog/probe.mjs --arch win64 --port 9722 13,1,2 3 4 5 6,6d 7,8 9 9e 11,12,12b,12c
```

In a 64-bit build, scenarios 3, 4, 9 and 9e each end their run when they reach
**ShowBrowseForFolder**, so each has a run of its own (3 and 4 print their Open and Save As
parts first).

Each argument is one run of the exe; the scenario ids are listed at the top of
[`src/Probe.twin`](src/Probe.twin), each the number of a question it answers. A build takes
about ten seconds and a run under 25 s; both commands take a minute or two. Exit 1 means a run
crashed or timed out, which is the expected answer for those four in a 64-bit build.

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

## Rules

- Never call **OpenFile** or **SelectAndOpenFile** on a path that exists, or on `""`: it starts
  a program. `OpenFile("")` opens a File Explorer window, and the COM-started `explorer.exe`
  behind it outlives the exe, with its window on the private desktop where nobody can close
  it; it has to be ended by its pid.
- Never run the exe on the user's desktop, or a dialog in the IDE: the probe's `[RunAfterBuild]`
  Sub only prints.
