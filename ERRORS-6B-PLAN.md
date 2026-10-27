# Errors batch 6b --- plan

The steps of batch 6b of [WIP.Errors.md](WIP.Errors.md): the run-time errors of AppActivate,
Beep, DoEvents, InputBox, MsgBox, SendKeys and Shell. *Batch 6b design* in WIP.Errors.md says
why each part is built as it is; this file says what to do, in order, and is ticked as it
goes. It is deleted when the batch is done, its findings moved to a *Batch 6b findings*
section of WIP.Errors.md.

Read first, as for every batch: *How a batch runs* and *Harnesses* in WIP.Errors.md, the
opening comments of `scripts/lib/vb6.mjs` and `scripts/lib/vba.mjs`, and
`errors/harnesses/clock.bas`, whose patching the new harnesses reuse.

## 0. The owner's answers

- [x] D1: MsgBox and InputBox under the `dialog` harness --- yes (2026-10-22)
- [x] D2: SendKeys strings that send keys, under the `keys` harness --- yes (2026-10-22)
- [x] D3: Beep --- left for now: no case, no harness, no section (2026-10-22)
- [x] D4: an error Windows itself makes VB6 or VBA raise on the user's desktop --- nothing:
  no row, no NOTE, not checked on the user's desktop (2026-10-22)

## 1. Find what each runtime calls

A temporary harness, `errors/harnesses/trace.bas` (deleted before the commit, as
`Explore.yml` is), patches each candidate export with a fake that **refuses** (returns 0 or
fails as the real one can) and records the call and its main argument; `trace_End` raises
1003 with the list of calls as its description, so the case's line in `run`'s output shows
it in every runtime. The candidates:

- boxes: `MessageBoxA/W`, `MessageBoxExA/W`, `MessageBoxIndirectA/W`, `MessageBoxTimeoutA/W`,
  `TaskDialog`, `TaskDialogIndirect` (comctl32), `DialogBoxParamA/W`,
  `DialogBoxIndirectParamA/W`, `CreateDialogParamA/W`, `CreateDialogIndirectParamA/W`;
- keys: `SendInput`, `keybd_event`, `SetWindowsHookExA/W` (the `idHook` recorded);
- focus: `SetForegroundWindow`, `SetActiveWindow`, `BringWindowToTop`, `SetFocus`,
  `AllowSetForegroundWindow`, `SwitchToThisWindow`.

Runs, each through `node scripts/errors.mjs run Explore.yml`:

- [x] 1a. No box and no key can come of these, whatever the answer: `AppActivate "x"` (a
  title that is no window), `Shell("nonexistent.exe")`, and, with every candidate refused, `SendKeys ""`.
- [x] 1b. (D1) `MsgBox "x"`, `InputBox("x")` and `MsgBox("x", vbYesNo)`, with every box
  candidate refused. If a runtime's case shows no call at all, its MsgBox goes some other way
  and **no further MsgBox case runs in that runtime** until the way is found: a box may then
  have opened on the private desktop, closed by the launcher (twinBASIC, VB6) or ending
  Access (VBA), which the run reports. Also note the class of each window the runtime creates
  for InputBox (a `WH_CBT` hook in the trace harness, recording `HCBT_CREATEWND`).
- [x] 1c. (D2) `SendKeys "a"` with every key candidate refused; the same check: a runtime
  with no call recorded is not given another key-sending case.
- [x] 1d. `AppActivate` of a window the trace harness creates: does the real activation fail
  on the private desktop (run with the focus candidates *not* patched, then patched)?

Record in this file, per runtime: which export each procedure calls, and the InputBox
window's class. That fixes which exports the guard and the `keys` fakes must cover.

**Step 1 done (2026-10-22, BETA 1010, all four runtimes).** 1a: none of the three calls any
candidate (AppActivate of a missing title raises -2147467259 in twinBASIC, 5 in VB6 and VBA;
Shell of a missing program -2147467259, VB 53).

| | twinBASIC (32 and 64) | VB6 | 64-bit VBA |
|---|---|---|---|
| MsgBox | `MessageBoxIndirectW` | `MessageBoxIndirectA` (refused, called twice) | as VB6 |
| InputBox | `DialogBoxIndirectParamW` | `DialogBoxParamA`, template &HFBF; refused, it shows a `MessageBoxIndirectA` | as VB6 |
| SendKeys | `keybd_event`, one call per key down and up | `SetWindowsHookExW` 1 (journal playback); refused, `SendInput` of one event at a time; that refused, error 17 | as VB6 |
| AppActivate | `SetForegroundWindow`, `SetFocus` | the same | the same |

1d: on the private desktop AppActivate of a window the probe made raises nothing, real calls
or refused ones, though the window never becomes the foreground one: no activation fake is
needed. A refused `DialogBoxIndirectParamW` returning -1 crashes twinBASIC 64-bit later in
OLEAUT32 (the fake's `Long` return is not a 64-bit -1): an artefact of the trace, not a finding.
So the guard covers `MessageBoxIndirectA/W` (and refuses the six other MessageBox entry points
outright, which no runtime calls); `keys` fakes `keybd_event` and `SendInput`, and refuses a
journal-playback hook with `ERROR_ACCESS_DENIED`, as Windows does for a process without
UIAccess, so VB6 and VBA take their `SendInput` path, which is the one they take on Windows 10.

## 2. The harnesses

Each in `errors/harnesses/`, one source for all four runtimes, with a comment at its head
saying what it does and why, as `clock.bas` and `registry.bas` have.

- [x] `dialog.bas`: the `WH_CBT` hook (answers only boxes it saw created, of the classes step
  1 found; hides, then posts `WM_COMMAND` for Cancel, else the first button that is not
  Help), the guard over the exports step 1 found (style bits &H260000 refused, error 1002 at
  `dialog_End`; any other style passed to the real function), `dialog_Expect Count` (1001).
  The hook's callback in a `#If VBA7` pair (`LongPtr` and `Long` signatures).
- [x] `keys.bas`: fakes for the key exports step 1 found, the recorded events as a list of
  `<virtual key in hex><d|u>` items (`"10d 41d 41u 10u"` for `"+a"`), `keys_Expect "<list>"`
  (1001); the journal-playback driver only if step 1 shows VB6 uses one.
- [x] `window.bas`: the window (`window_Title`, `window_Pid`), destroyed at `window_End`; the
  activation fake only if step 1d shows the real call fails on the private desktop.
- [x] A quiet self-test case for each, all four runtimes: `MsgBox "x"` then
  `dialog_Expect 1`; `SendKeys "a"` then `keys_Expect "41d 41u"`; `AppActivate window_Title`.
  And one case that shows the guard: `MsgBox("x", &H200000)` raising 1002 (a case of
  `Explore.yml` only; it is not data).

## 3. The tooling

- [x] `scripts/lib/vb6.mjs`: `runRepro` takes `unattended: false`; its opening comment's
  section 9 gains the reason (a MsgBox under Unattended Execution goes to the event log).
- [x] `scripts/errors.mjs`: `runVb6` passes it when a case of the probe uses `dialog`.
- [x] `scripts/lib/vba.mjs`: `runModule` ends Access at a box only when it is seen at two polls
  in a row; the opening comment's point 5 says why.
- [x] `scripts/check_errors.mjs`: a probe that the VB6 project of a `dialog` page has no
  `Unattended=-1` and that of any other page has it.
- [x] `docs/Documentation/Tools-Defects.md`, the errors.mjs entry, if it lists the harnesses
  or the VB6 build's options.
- [ ] WIP.Errors.md: *Harnesses* gains the three; *What the probes must respect* says MsgBox
  and InputBox only under `dialog`, SendKeys only under `keys`.
- [ ] `node --test`, `check_errors.mjs` and `check_lint.mjs` pass.

## 4. Explore

`errors/Explore.yml`, every case `quiet:`, the page's harness set on the page. Probe each
boundary from both sides. Candidates (more as the answers suggest):

- [x] **MsgBox** (`dialog`): **Null** as each argument; *helpfile* without *context* and the
  reverse; *buttons* 0 to 6 (each group), 7 to 15, each icon and two icons together (&H50),
  `vbDefaultButton1` to 4 and &H400, each modality and two together (&H3000), each option
  flag, 32768, 2147483648# (the conversion, not listed); a *prompt* of 1,024, 100,000 and
  1,000,000 characters, with `Chr(0)`; an empty *title*. Never &H20000, &H40000, &H200000,
  -1 or 2147483647 before step 1b's guard check has passed for that runtime.
- [x] **InputBox** (`dialog`): **Null** as each argument; *xpos* without *ypos* and the
  reverse; *xpos*, *ypos* negative, 0, 2147483647, 1E+10, 1E+30 (a twips-to-pixels overflow is
  the procedure's own work, so a 6 inside the parameter's range is listed); *helpfile*
  without *context*; *default* of 300 characters.
- [x] **SendKeys** (`keys`): **Null**; `""`; `"{"`, `"}"`, `"{}"`, `"{{}"`, `"{BAD}"`,
  `"{LEFT x}"`, `"{LEFT -1}"`, `"{LEFT 0}"`, `"{LEFT 2147483648}"`, `"{F16}"`, `"{F17}"`,
  `"{PRTSC}"`, `"+("`, `"("`, `")"`, `"+"`, `"~"`, `"{h 10}"`; *wait* **Null**, **True** and
  **False**; then (D2) a valid key before a bad token, `"a{BAD}"`, with `keys_Expect` to show
  whether `a` is sent first. Every modifier and every code of the page's two tables once,
  with its `keys_Expect`.
- [x] **AppActivate** (`window`): **Null**; `""`; a title that is no window; `window_Title`,
  a prefix of it, the same in another case; `window_Pid`, 0, -1, 4 (the System process, which has no
  window), 1E+20; a numeric string; a hidden window's title; *wait*
  **Null** and **False**. *wait* **True** waits for the probe to have the focus, which on a
  private desktop it never has: one such case alone, with a short `--exe-run-timeout`, and
  left out if it hangs (a fact about the private desktop, so nothing goes on the page).
- [x] **Shell** (no harness): **Null**; `""`; `"nonexistent.exe"`; a missing folder in the
  path; the Windows folder itself; `Environ$("windir") & "\win.ini"`; a path of 300 and
  33,000 characters; an unbalanced quote; `"cmd.exe /c exit"` with each *windowstyle* 0 to 4
  and 6, and 5, 7, 8, 10, 11, -1, 32767, 32768, **Null**. A case that starts `cmd.exe` uses
  `vbHide` unless it tries *windowstyle*.
- [x] **DoEvents**: `DoEvents()` and `DoEvents` as a statement, quiet.
- [x] **Beep**: left for now (D3).

Delete `Explore.yml` before committing.

**Step 4 done (2026-10-22, BETA 1010, all four runtimes; twinBASIC 64-bit as 32-bit throughout).**

- **Agree in all four**: **Null** as any argument raises 94 (MsgBox, InputBox, SendKeys'
  *string*, AppActivate's *title*, Shell's both), except as below; a number beyond a **Long**
  raises 6 (the conversion); InputBox's *xpos*/*ypos* of 1E+10 or more raise 6 (the twips
  conversion, inside the **Double** range: listed); `"x"` as a number raises 13; Shell
  *windowstyle* 0 to 9 runs; DoEvents raises nothing.
- **twinBASIC -2147467259 where VB raises 5 or 53** (the `argument-errors-unspecified-error`
  family): AppActivate of a title or task id that matches no window (0, -1, 4, 2147483647,
  **True**, **Empty**; VB 5); Shell of `""`, `" "`, a folder, `win.ini`, 33,000 characters (VB
  5), of a missing program or folder, 300 characters, an unbalanced quote (VB 53), and a
  *windowstyle* of 11, -1, 32767, 32768, 2147483647 (VB 5); MsgBox and InputBox with a
  *helpfile* and no *context* (VB 5).
- **SendKeys: twinBASIC -2147352567 (*Exception occurred.*) where VB raises 5**: an unknown or
  unclosed brace (`"{"`, `"}"`, `"{}"`, `"{BAD}"`, `"{INS}"`, `"{F17}"`), a bad count (`"{LEFT x}"`,
  `-1`, `32767`, `2147483648`, `"{LEFT2}"`), unbalanced parentheses (`"("`, `")"`, `"+("`, `"+(a"`,
  `"a)"`), `"++"`; and for *wait*: **Null** (VB 94), `"x"` (VB 13). `"{INS}"` is in the page's
  table and refused by all four (VB too): the page is wrong.
- **twinBASIC raises nothing where VB raises**: AppActivate of a hidden window (VB 5), with
  *wait* **Null** (94) or `"x"` (13); AppActivate `""` (VB6 5; 64-bit VBA 0, as twinBASIC);
  Shell *windowstyle* 10 (VB 5); SendKeys *wait* `"True"` (VB 13); MsgBox and InputBox with a
  *context* and no *helpfile* (VB 5); InputBox *xpos*/*ypos* 2147483647 (VB 6); MsgBox and
  InputBox *helpfile* **Null** raise 94 (VB 5).
- **MsgBox's *buttons*, no error either side**: VB6 and 64-bit VBA pass a style they do not
  know as 0 (an OK box): 6, 7, 8, 15, two icons (&H50, &H70), &H80, &H400, -1, &H7FFFFFFF.
  twinBASIC passes every style to Windows as given: 6, &H50, &H70, &H80, &H400 show a box of
  Windows' making; **7, 8 and 15 show no box and return 0**; **-1 and &H7FFFFFFF carry
  MB_SERVICE_NOTIFICATION** (the guard refused them; unguarded, the box goes to the user's
  input desktop, from any desktop and any session's service).
- **SendKeys' keys, no error either side**: the same events in all four for every code of
  the page's tables, `{n}` counts, modifiers and `~`; differences: a character outside the
  ANSI keyboard: `"é"` sends virtual key &HE9 (VB: the character, as KEYEVENTF_UNICODE),
  `ChrW(&H263A)` sends `?` (VB: the character), `"Ā"` sends Shift+A (VB: `?`); `"((a))"`
  sends `a` (VB: Shift, then `a` three times); `"+"` and `"+a+"` send Shift once where VB
  presses it twice. And VB6 and VBA keep the keys before a refused token and send them with
  the next SendKeys (`"a{BAD}"`, then `"{LEFT 0}"` sends `a`); twinBASIC sends nothing.
- **AppActivate's 2 s**: in a twinBASIC exe on the private desktop, activating a new
  top-level window takes 2 s from the third one on, by `CreateWindowEx` with `WS_VISIBLE` as
  by AppActivate; `DoEvents` before or after changes nothing; VB6 and VBA take none.
  `errors.mjs` now gives a twinBASIC probe 120 s.

**Before the commit**: delete `errors/harnesses/trace.bas` and `errors/Explore.yml`, and take
`"trace"` out of `ATTENDED_HARNESSES` in `scripts/lib/errors-data.mjs`.

**Questions for the owner (asked 2026-10-22), which decide the data:**

- Q1. SendKeys' -2147352567 where VB raises 5, 13 or 94: into `argument-errors-unspecified-error`
  (queued, not filed), or an entry of its own?
- Q2. Extensions or bugs, where twinBASIC raises nothing and VB raises: AppActivate `""`
  (VB6 5, 64-bit VBA none) and of a hidden window (VB 5); AppActivate's *wait* not checked
  (**Null**, `"x"`); Shell *windowstyle* 10 (`SW_SHOWDEFAULT`); SendKeys *wait* `"True"`;
  MsgBox/InputBox *context* without *helpfile*; InputBox *xpos* 2147483647; *helpfile*
  **Null** raising 94 where VB raises 5.
- Q3. MsgBox styles: twinBASIC passes every style to Windows, VB maps an unknown one to an OK
  box. Bugs to queue: 7, 8 and 15 showing no box and returning 0 (silent); -1 and &H7FFFFFFF
  sending the box to the user's input desktop. An extension: 6 (Cancel, Try Again,
  Continue), &H50, &H70, &H80, &H400 passed to Windows?
- Q4. SendKeys of a character outside the keyboard (`"é"`, `ChrW(&H263A)`, `"Ā"`) sends the
  wrong key, silently: a bug and a WARNING on the page? And `"((a))"`, the doubled Shift, VB's
  keeping keys after a refused token: document nothing (VB's own oddities)?
- Q5. The 2 s window activation: try it once on your desktop, or leave it (it raises nothing)?

**Owner's answers (2026-10-27):** Q1 join `argument-errors-unspecified-error`. Q2: InputBox's
*xpos*/*ypos* 2147483647 and MsgBox/InputBox *context* without *helpfile* must raise (bugs);
Shell *windowstyle* 10 must raise if it is not valid: it is not (`STARTUPINFO.wShowWindow`
takes any `ShowWindow` value but `SW_SHOWDEFAULT`, 10; `CreateProcessW` does not check it).
All four runtimes call `CreateProcessW` with `STARTF_USESHOWWINDOW` and the style as given;
VB6 and VBA check 0 to 9 after rounding first (9.4 passes, 9.6 raises 5), twinBASIC 0 to 10,
and nothing done first (a Shell, DoEvents, an Integer, Byte or String 10) makes VB take 10.
Q3, Q4: explained, waiting. Q5: the desktop test is built (`desktest/` in the scratchpad:
the same 8 windows by twinBASIC and VB6; on the private desktop twinBASIC takes 2 s to make
each from the third, VB6 none) and waits for the owner's go. The rest of Q2 is still open.

**Owner's answers (2026-10-27, second round):** AppActivate `""` is an extension. AppActivate of
a hidden window: twinBASIC leaves it hidden (VB 5), so not useful: a bug. AppActivate's *wait*
must be checked (bug). *helpfile* **Null** raising 94: a bug. MsgBox *buttons*: twinBASIC should
take every style Windows takes and raise when Windows refuses one: 7, 8, 15 (silently no box) are
a bug. SendKeys of non-ASCII text: a bug. The broker race: both fixes made (client retry in
`tb-broker.mjs`, `ListenNow` in `BrokerServer.twin`, installed, `test/broker.test.mjs` 14/14; the
tblaunch session told). Still open: SendKeys *wait* `"True"`; the minor SendKeys differences;
whether to test -1/&H7FFFFFFF unguarded; the desktop test's go.

**Third round (2026-10-27):** SendKeys *wait* `"True"`: an extension. `"((a))"`, the doubled
Shift and VB's keeping keys after a refused token: VB's, nothing documented (VB's keeping is
arguably a VB bug; twinBASIC's dropping the string is right). Unguarded MsgBox -1 and
&H7FFFFFFF: Windows refuses them before any box (returns 0, nothing shown anywhere), so they are
the 7/8/15 bug; twinBASIC should raise 5 for every style Windows refuses. The private-desktop 2 s
is a twinBASIC bug to queue (owner); on the user's desktop there is none. AppActivate on the
user's desktop: VB6 made windows 2 to 8 the foreground one, twinBASIC none (the first run started
the programs hidden; a rerun with a throwaway first window waits for the owner's go).

**Paused 2026-10-27 (owner rearranging commits).** Done since: steps 5 and 6 (data, all 355
cases of `VBA.Interaction.yml` agree in all four runtimes; sections and page edits, committed).
`argument-errors-unspecified-error` extended (8 cases, entry text, packed, verifies).
`scripts/lib/vb6.mjs`: `reproAnswersBoxes` lets a reproducer's VB6 project that carries the
dialog harness call MsgBox and InputBox, built without Unattended Execution (needs a probe in
`test/example-batches.test.mjs` and a line in Tools-Defects' bug_repro entry). In progress:
`bugs/interaction-missing-argument-checks/` (written by a scratch generator; tB side 3 PASS and
12 FAIL, VB6 side right): set `repro.json`'s expected lines, write its entry in BUGS-TO-REPORT.md,
pack, replace `bug: pending` in the data with its slug. Left: `sendkeys-non-ascii` (reproducer
with a copy of keys.bas, entry; the WARNING on SendKeys names it), the private-desktop 2 s entry
(reproducer from the scratchpad's desktest programs), step 8 (gates, findings into
WIP.Errors.md, this file deleted). `errors/harnesses/trace.bas` is scratch, uncommitted.

## 5. The data

- [ ] The rows and quiet cases in `errors/VBA.Interaction.yml`, after 6a's pages, each page's
  `harness:` set; `node scripts/errors.mjs run VBA.Interaction.yml --only
  "(AppActivate|DoEvents|InputBox|MsgBox|SendKeys|Shell)\.md$"` until all agree in all four
  runtimes.
- [ ] Afterwards, `run` of the whole file, so that 6a's pages still agree beside the new ones.
- [ ] Check that no `tbdocsErrorsProbe*` window, process or registry key is left, and that
  the Application event log has no new entries from a VB6 probe (Unattended Execution off).

## 6. The pages

- [ ] `node scripts/errors.mjs write`.
- [ ] Shell: its opening says it returns zero when the program cannot be started, and its text
  that an error is raised; the table settles which, and the other goes (or becomes a
  `<!-- VBA: -->` comment if both VB runtimes contradict it).
- [ ] MsgBox and InputBox: the sentences "If *helpfile* is supplied, *context* must also be
  supplied" (and the reverse) go into the table if an error is raised, and stay as prose if
  none is.
- [ ] SendKeys: the NOTE on `{PRTSC}` checked against the cases.
- [ ] The module's `index.md` for the same claims.

## 7. Differences

- [ ] Each difference from VB6 or 64-bit VBA: `bug: pending`, then a `tests` reproducer
  with a `vb6/` side (`node scripts/bug_repro.mjs new <slug> --template tests`; one that needs
  a harness carries a copy of its code), the entry in BUGS-TO-REPORT.md, the slug in the
  data. A reproducer for MsgBox or InputBox needs the same hook, since it must not open a box
  either.
- [ ] Where twinBASIC accepts what VB6 refuses: ask the owner before queuing.
- [ ] Group as 6a did where the cause is one (an argument error raised as -2147467259 joins
  `argument-errors-unspecified-error`).

## 8. Gates and the end

- [ ] `build.bat` (0 broken), `node scripts/check_errors.mjs`, `test.bat`, `check.bat`.
- [ ] Commit on `staging` by path, one-line message.
- [ ] WIP.Errors.md: *Where things stand*, *Batch 6b findings*, the batch row; this file
  deleted; the questions for the owner listed.
