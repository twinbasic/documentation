# xCalendar probe

What the contributed package xCalendar's **xCalendar** control does at run time: a form in a built
exe on a private desktop holds one control, the exe operates it from inside and writes every event
and every value it reads to a file. The page `docs/Reference/Contributed/xCalendar/index.md` states
what this probe printed, on package 1.0.7.0 and BETA 1005, in 32-bit and 64-bit builds (the two give
the same output, pixel positions included). Run it again when the section's `indexed_from` moves to a
new version of the package.

It is outside every gate and CI: it needs Windows, a twinBASIC install (the newest
`twinBASIC_IDE_BETA_<n>` on the Desktop, as `tbrun` finds it) and the package, which `stage.mjs`
takes from the cache `check_examples` keeps (`%TEMP%\tb-twinserv`) or downloads from TWINSERV into it.
The store's copy under `indexer/.packages/` has only the `.twin` file; the control's windows are
declared in the package's `xCalendar.tbcontrol`.

## Running it

```sh
node test/package-probes/xCalendar/probe.mjs 1 2,3 4,5 6,7,8 9 10 11,12 13 14
node test/package-probes/xCalendar/probe.mjs --arch win64 --port 9911 1 2,3 4,5 6,7,8 9 10 11,12 13 14
node test/package-probes/xCalendar/probe.mjs --shots <dir> 15 15b
node test/package-probes/xCalendar/probe.mjs p2,p3 p5,p7 p9 p10 p11 p12 p13 p14 p18 p19 p20,p21 p24,p25 p29 p33 p22x
node test/package-probes/xCalendar/probe.mjs 12x 12y 12z      # each ends at the timeout: see below
```

Each argument is one run of the exe; the scenario ids are listed at the top of
[`src/Probe.twin`](src/Probe.twin), the numbers of the questions they answer. A build takes about ten
seconds and a run 3 to 20 s (the picture runs, 2 s a picture, the longest); every run is ended after 33
s. Exit 1 means a run crashed, opened a box or reached the timeout, which is the answer for `12x`,
`12y` and `12z`: choosing a month or a year from a list that makes an impossible date (31 January to
February, 29 February 2024 to 2025) leaves the exe in a loop at full processor load, which
`run-exe.mjs` shows by sampling its processor time at the timeout.

Ports 9910 to 9940 are this probe's; `--port` keys the IDE's DevTools port, the work folders
(`%TEMP%\xcal-probe\tree-<port>`) and the private desktop's name, so two runs with different ports can
run at once.

- [`stage.mjs`](stage.mjs) writes the project: the `contributed-xCalendar` sample template's Settings,
  the package embedded under `Packages/xCalendar`, and `src/`.
- [`probe.mjs`](probe.mjs) stages it, builds it with `tbrun` (its `[RunAfterBuild]` Sub only prints; no
  form opens in the IDE) and runs the exe once for each list of ids. `--form FILE` builds with another
  `Form1.tbform`; `--set K=JSON` adds a key to the control's entry in it.
- [`run-exe.mjs`](run-exe.mjs) runs a built exe on a private desktop. `launchOnDesktop` closes the boxes
  the exe opens, and the runner lists them. On a `SHOT <name> hwnd=<n>` line of the exe's output it
  photographs that window with `captureWindow` (PrintWindow) into `--shots <dir>/<name>.png` and writes
  the file the exe waits for; it fails the picture if the Windows user name is in the window's texts.
- [`designer.mjs`](designer.mjs) opens the project in an IDE, selects the control in Form1's designer,
  types values into the Properties panel's cells, saves, and prints the control's entry in the
  `Form1.tbform` the IDE wrote. What it wrote: every property as a plain key (enumerations by name), and
  `_IPersistStreamData`, the property bag the control's `ReadProperties` reads. Plain keys written by
  hand (`probe.mjs --set`) are ignored at run time; the bag is what counts.
- [`patch-stream.mjs`](patch-stream.mjs) writes that file again with a bag whose Year, Month and Day are
  other ones, with no Value (the control writes no Value equal to the current date): a control saved on
  another day.
- [`src/Form1.tbform`](src/Form1.tbform) is the form: two command buttons, and the control between them
  (`Form1.xCalendar1`), so that the keyboard focus can be moved to and from it. `src/Win.twin` is the
  Win32 declarations and the key and modifier helpers; `src/Form1.twin` writes every event the control
  raises with its arguments.

## How the input is made

- A mouse click is `WM_MOUSEMOVE`, `WM_LBUTTONDOWN` and `WM_LBUTTONUP` for a point in the control's
  window, sent (`SendMessage`; scenarios 9, p7) or posted to the queue and dispatched by `DoEvents`, the
  runtime's own loop (`p13`). The two give the same events.
- A key is `WM_KEYDOWN` and `WM_KEYUP` (`WM_SYSKEYDOWN` with Alt) posted to the window that has the
  focus, the key-up dispatched after the key-down, through `DoEvents` (`p9`). The runtime's loop makes the
  `KeyPress` and `KeyUp` events and the `Shift` argument (a modifier is held with `SetKeyboardState`,
  which `GetKeyState` reads). **A key sent with `SendMessage` straight to the picture box raises
  `KeyDown` only** (scenario 10): the loop is part of what a key press does. **`DoEvents` does not
  return while the date selectors are visible**, because the control asks for a repaint after every
  paint (scenario 16); the probe's own `Pump` stops after three `WM_PAINT`, and the scenarios that need
  `DoEvents` hide the selectors first.
- Pixels are read with `GetPixel` from the control's window DC, after it has painted.
- A real mouse or keyboard cannot be used: the exe runs on a private desktop, not the input desktop.
  Windows sends no input to a disabled window, so what a click on a disabled control does is only the
  control's own code, which scenario 11 shows.
- The sizes are device pixels at the private desktop's DPI, 144 (150%) on the machine the probe was
  written on: the control's date selectors are positioned in unscaled pixels (a list 50 wide), so at
  that DPI the year list shows "20" of "2026".

## Rules

- Never run the exe on the user's desktop, or a form in the IDE: the probe's `[RunAfterBuild]` Sub only
  prints.
- Never call `ShellExecute` or start another program from the exe; the probe starts none.
