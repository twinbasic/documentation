# VBCCR18 --- working notes

The contributed VBCCR18 package, documented at `docs/Reference/Contributed/VBCCR18/`. This file
holds what its section decided and what is known about the package beyond its pages; the rules
for every contributed package are in [WIP.Contributed.md](WIP.Contributed.md).

**The section is being written** (twinbasic/documentation#27), on the branch `vbccr18`, which
stays unmerged until every control has its page (owner). The landing page names a control
without a page in bold, with no link; link it when its page exists.

## What the section decided (owner, 2026-11-18)

- **One page per control**, as WinNativeCommonCtls: `<Control>.md`, its properties, methods and
  events as `###` entries under `Properties`, `Methods` and `Events`, and the enumerations its
  file declares at the end, each a `##` section. A control with sub-objects is a folder,
  `<Control>/index.md`, with a page for each collection and item class. `ProgressBar.md` is the
  model page.
- **ListView and RichTextBox are folders of topic pages**, as VBFLXGRD18's VBFlexGrid is.
- **`Common.md` holds the members nearly every control has**, in groups, and the enumerations
  several controls use (the `CC...` ones and `OLEDropModeConstants`, declared in
  `ISubclass.cls`). A control's page says in one paragraph which groups it has, and documents a
  common member only where the control does something of its own with it.
  `kit/vbccr/common-members.mjs` (in `.claude/resume-agents/`) prints, for one control, the
  common members it has and lacks.
- **CommonDialog is one page**, saying how it relates to the VBComDlg package's class.
- **Every control has a picture** of a built program, from a `shoot_docs` setup of its own
  (not written yet).
- The modules (`ComCtlsBase`, `Common`, `RichTextBoxBase`, `VirtualComboBase`, `VisualStyles`,
  `VTableHandle`) and the class `ISubclass` are the controls' helper code: in
  `exclude_from_docs`, not documented.

## The package

- 1.8.136.0 compiles on BETA 1042 for win32 and win64, embedded with its own copy of OLEGuids.
- The controls are the classes marked `[COMControl]`. Each is a VB6 UserControl that makes a
  window of Windows' own control inside itself, so `hWnd` (that window) and `hWndUserControl`
  differ.
- **The source describes each member** in a VB6 `Attribute <Member>.VB_Description = "..."`
  line after its declaration. The indexer does not read those lines, so the snapshot has no
  descriptions. They are raw material for a page, to be checked against the code under them.
- A property's default is in `UserControl_InitProperties` (a control newly drawn on a form)
  and again in `UserControl_ReadProperties` (a property the form's file does not hold), and the
  two can differ: ProgressBar's `Step` is 10 in the first and 1 in the second. A control of the
  sample template, whose `.tbform` holds its name and place only, has the first.
- Mouse events give X and Y in twips, whatever the container's scale (`ScaleX(..., vbPixels,
  vbTwips)`; checked by a run on CheckBoxW with the form's ScaleMode in pixels); the OLE drag
  events give the container's units (`vbContainerPosition`).

## Samples and test cases

- The sample template `contributed-VBCCR18` has a real form for each control, `frm<Control>`,
  with that one control on it, named as the designer names the first one (`ProgressBar1`,
  `TextBoxW1`), and `tbxStageVBCCR18.twin`, a property per control that loads its form and
  returns the control. `frmOptionButtonW` has a second one, `OptionButtonW2`. All are written by
  `kit/vbccr/make-template.mjs <worktree>` from the snapshot. **One form with every control was
  tried first and is too slow**: it loads in about a quarter of a second, each run sample
  loads it again, and a batch of run samples met the harness's 10 s run limit now and then
  ("did not return" at a varying sample). Nothing crashes: that form survives 60 loads and
  unloads, and each control alone 40.
- **Option buttons are not exclusive on BETA 1042** (WIP.BugHunt.md, *UserControl*): the
  OptionButtonW page has a WARNING with a probe sample. What a VB6 form does with the same
  control is not checked (it needs a UserControl with an `OLE_OPTEXCLUSIVE` property built in
  VB6, which is also the reproducer the lead wants), so the page does not say.
- The test project's `HostForm` has the same controls (`kit/vbccr/make-test-host.mjs`). A case
  gets a form from `Rig.NewForm()`, and looks at events through a class of its own that holds
  the control `WithEvents` and writes to `Rig.Ev` (`ProgressBarSink`). No case edits
  `HostForm.twin`.
- **`package_tests` gives this package a new IDE every 120 cases** (`CASES_PER_IDE` in
  `lib/package-tests.mjs`). A process that has loaded about ten thousand of the package's
  controls does not return from the next load (WIP.BugHunt.md, *UserControl*), and each case
  loads a HostForm, which has one of every control: the limit is near the 275th case. Before
  the setting, a run of 276 cases had one of its last cases (WindowedLabelTests, the last
  fixture) "not return" on win32 in some runs, a different one each time. A case that loads
  HostForm many times itself counts against the same limit.
- **A case does not read `Err.Number` after an assignment that succeeds**: twinBASIC leaves 438
  there (WIP.BugHunt.md, *UserControl*). It checks the value the property then has. A case
  assigns directly, not through `CallByName`, which reports another error number.
