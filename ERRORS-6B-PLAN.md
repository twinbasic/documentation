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

- [ ] 1a. No box and no key can come of these, whatever the answer: `AppActivate "x"` (a
  title that is no window), `Shell("nonexistent.exe")`, and, with every candidate refused, `SendKeys ""`.
- [ ] 1b. (D1) `MsgBox "x"`, `InputBox("x")` and `MsgBox("x", vbYesNo)`, with every box
  candidate refused. If a runtime's case shows no call at all, its MsgBox goes some other way
  and **no further MsgBox case runs in that runtime** until the way is found: a box may then
  have opened on the private desktop, closed by the launcher (twinBASIC, VB6) or ending
  Access (VBA), which the run reports. Also note the class of each window the runtime creates
  for InputBox (a `WH_CBT` hook in the trace harness, recording `HCBT_CREATEWND`).
- [ ] 1c. (D2) `SendKeys "a"` with every key candidate refused; the same check: a runtime
  with no call recorded is not given another key-sending case.
- [ ] 1d. `AppActivate` of a window the trace harness creates: does the real activation fail
  on the private desktop (run with the focus candidates *not* patched, then patched)?

Record in this file, per runtime: which export each procedure calls, and the InputBox
window's class. That fixes which exports the guard and the `keys` fakes must cover.

## 2. The harnesses

Each in `errors/harnesses/`, one source for all four runtimes, with a comment at its head
saying what it does and why, as `clock.bas` and `registry.bas` have.

- [ ] `dialog.bas`: the `WH_CBT` hook (answers only boxes it saw created, of the classes step
  1 found; hides, then posts `WM_COMMAND` for Cancel, else the first button that is not
  Help), the guard over the exports step 1 found (style bits &H260000 refused, error 1002 at
  `dialog_End`; any other style passed to the real function), `dialog_Expect Count` (1001).
  The hook's callback in a `#If VBA7` pair (`LongPtr` and `Long` signatures).
- [ ] `keys.bas`: fakes for the key exports step 1 found, the recorded events as a list of
  `<virtual key in hex><d|u>` items (`"10d 41d 41u 10u"` for `"+a"`), `keys_Expect "<list>"`
  (1001); the journal-playback driver only if step 1 shows VB6 uses one.
- [ ] `window.bas`: the window (`window_Title`, `window_Pid`), destroyed at `window_End`; the
  activation fake only if step 1d shows the real call fails on the private desktop.
- [ ] A quiet self-test case for each, all four runtimes: `MsgBox "x"` then
  `dialog_Expect 1`; `SendKeys "a"` then `keys_Expect "41d 41u"`; `AppActivate window_Title`.
  And one case that shows the guard: `MsgBox("x", &H200000)` raising 1002 (a case of
  `Explore.yml` only; it is not data).

## 3. The tooling

- [ ] `scripts/lib/vb6.mjs`: `runRepro` takes `unattended: false`; its opening comment's
  section 9 gains the reason (a MsgBox under Unattended Execution goes to the event log).
- [ ] `scripts/errors.mjs`: `runVb6` passes it when a case of the probe uses `dialog`.
- [ ] `scripts/lib/vba.mjs`: `runModule` ends Access at a box only when it is seen at two polls
  in a row; the opening comment's point 5 says why.
- [ ] `scripts/check_errors.mjs`: a probe that the VB6 project of a `dialog` page has no
  `Unattended=-1` and that of any other page has it.
- [ ] `docs/Documentation/Tools-Defects.md`, the errors.mjs entry, if it lists the harnesses
  or the VB6 build's options.
- [ ] WIP.Errors.md: *Harnesses* gains the three; *What the probes must respect* says MsgBox
  and InputBox only under `dialog`, SendKeys only under `keys`.
- [ ] `node --test`, `check_errors.mjs` and `check_lint.mjs` pass.

## 4. Explore

`errors/Explore.yml`, every case `quiet:`, the page's harness set on the page. Probe each
boundary from both sides. Candidates (more as the answers suggest):

- [ ] **MsgBox** (`dialog`): **Null** as each argument; *helpfile* without *context* and the
  reverse; *buttons* 0 to 6 (each group), 7 to 15, each icon and two icons together (&H50),
  `vbDefaultButton1` to 4 and &H400, each modality and two together (&H3000), each option
  flag, 32768, 2147483648# (the conversion, not listed); a *prompt* of 1,024, 100,000 and
  1,000,000 characters, with `Chr(0)`; an empty *title*. Never &H20000, &H40000, &H200000,
  -1 or 2147483647 before step 1b's guard check has passed for that runtime.
- [ ] **InputBox** (`dialog`): **Null** as each argument; *xpos* without *ypos* and the
  reverse; *xpos*, *ypos* negative, 0, 2147483647, 1E+10, 1E+30 (a twips-to-pixels overflow is
  the procedure's own work, so a 6 inside the parameter's range is listed); *helpfile*
  without *context*; *default* of 300 characters.
- [ ] **SendKeys** (`keys`): **Null**; `""`; `"{"`, `"}"`, `"{}"`, `"{{}"`, `"{BAD}"`,
  `"{LEFT x}"`, `"{LEFT -1}"`, `"{LEFT 0}"`, `"{LEFT 2147483648}"`, `"{F16}"`, `"{F17}"`,
  `"{PRTSC}"`, `"+("`, `"("`, `")"`, `"+"`, `"~"`, `"{h 10}"`; *wait* **Null**, **True** and
  **False**; then (D2) a valid key before a bad token, `"a{BAD}"`, with `keys_Expect` to show
  whether `a` is sent first. Every modifier and every code of the page's two tables once,
  with its `keys_Expect`.
- [ ] **AppActivate** (`window`): **Null**; `""`; a title that is no window; `window_Title`,
  a prefix of it, the same in another case; `window_Pid`, 0, -1, 4 (the System process, which has no
  window), 1E+20; a numeric string; a hidden window's title; *wait*
  **Null** and **False**. *wait* **True** waits for the probe to have the focus, which on a
  private desktop it never has: one such case alone, with a short `--exe-run-timeout`, and
  left out if it hangs (a fact about the private desktop, so nothing goes on the page).
- [ ] **Shell** (no harness): **Null**; `""`; `"nonexistent.exe"`; a missing folder in the
  path; the Windows folder itself; `Environ$("windir") & "\win.ini"`; a path of 300 and
  33,000 characters; an unbalanced quote; `"cmd.exe /c exit"` with each *windowstyle* 0 to 4
  and 6, and 5, 7, 8, 10, 11, -1, 32767, 32768, **Null**. A case that starts `cmd.exe` uses
  `vbHide` unless it tries *windowstyle*.
- [ ] **DoEvents**: `DoEvents()` and `DoEvents` as a statement, quiet.
- [x] **Beep**: left for now (D3).

Delete `Explore.yml` before committing.

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
