# Bug hunt: leads not yet investigated

Documenting is the main job. A suspected defect met along the way is written down here, in a
few lines, and left. Nothing in this file goes upstream, and nothing in it is evidence for a
page: a callout needs a reproducer, a lane or a case, never a lead.

[BUGS-TO-REPORT.md](BUGS-TO-REPORT.md) is the next stage, for a defect that has been narrowed
and confirmed. The owner decides what is filed from there, and when, so that twinBASIC's
developers get a few reports they can act on rather than everything a session saw.

## How a lead moves on

1. **Write it down and go back to the page.** Each lead has: the build it was seen on, where
   it was seen (the fixture, setup, probe or page), what was seen, and what is not known yet
   (VB6 not checked, may be a misuse). Mark it **page affected** when a page now says something
   the lead contradicts.
2. **A lead is investigated only when** a page it affects is being worked on and needs it
   settled, or the owner picks it. A lead does not get investigated just because it is there.
3. **Investigating** means narrowing it to a reproducer with nothing else in it, on the newest
   BETA installed, with VB6 checked where VB6 has the feature, and misuse ruled out. It ends in
   one of these, and the lead leaves this file:
   - **Misuse or a wrong expectation**: the lead is deleted, and a page that said the wrong
     thing is fixed.
   - **A defect of a contributed package**: a failing case in the package's test project,
     recorded in its `expect.json` ([test/package-tests/README.md](test/package-tests/README.md)),
     and a callout on the page if a reader would meet it. Not a BUGS-TO-REPORT entry, unless
     the cause turns out to be twinBASIC's.
   - **A defect of twinBASIC** (the compiler, the IDE, or a default or built-in package): an
     entry in BUGS-TO-REPORT.md with its reproducer under `bugs/<slug>/`, made with
     `node scripts/bug_repro.mjs new`, and a callout on the page if a reader would meet it.
4. **A lead nobody can reproduce on the newest BETA** is deleted, with a line in the commit
   message saying so.

## Reproducers

- `node scripts/bug_repro.mjs` --- the reproducer projects under `bugs/<slug>/` for the entries of [BUGS-TO-REPORT.md](BUGS-TO-REPORT.md): `new`, `pack` (impexp, then the zip, written in Node), `compile`, `build` and `run` through `tbbuild` and `tbrun`, `vb6` (builds the optional `vb6/` VB6 project beside the twinBASIC one in a temp copy, runs its exe on a private desktop, and prints its `out.txt`; a project with a form or a user control is built without Unattended Execution, which VB6 refuses for it; `pack` zips its sources into `<slug>-vb6.zip`; VB6 is started only by `scripts/lib/vb6.mjs`, never from a shell; a graphical defect's `images` key makes `run` and `vb6` keep what the `PngDump` modules of `test/repro-templates/png/` draw as `images/<name>-tb.png` and `-vb6.png`, with a `-compare.png` of both, tested by `test/png.test.mjs`), `file` (moves a filed entry and its reproducer to `bugs/filed/<slug>/`; `file --marked` does every marked entry), and `verify`, which reads each `bugs/*/repro.json` and `bugs/filed/*/repro.json` and says whether the bug still reproduces on the newest beta; a `lane` reproducer names the `ide-test` or `addin-test` lane and tests that assert its bug, which `verify` runs last through that runner, a `probe` one a script under `scripts/`, and a `test` one its own `[TestCase]` Subs and compile cases through `tbrun --tests`, judged by the `PASS` lines of what is fixed and the `FAIL` lines of the bug (`new --template tests` starts one). **No reproducer should need a person at the IDE** (owner): a bug the IDE has to be operated for gets a lane test, and `manual` is left for what cannot be automated at all. It has no wrapper. **`verify` is run by a person only**, never by a gate or CI: it needs a twinBASIC install, like `examples.bat`. Each `tbbuild` and `tbrun` it starts takes a slot of its own from `tbbroker`; `--jobs N` runs N at once. Its command-line cases are in `scripts/lib/cli-cases.mjs`, and need no IDE.

## Leads

### VB package

Seen on BETA 1042 by the `vb` setup of `shoot_docs` (fixture `test/shots/vb`). None checked in
VB6.

- **`Controls.Add` of a control class no form holds** raises -2147467259, and never makes a
  QRCode.
- **`TypeOf <MDIForm> Is Form`** is True.
- **`Form.BorderStyle` set at run time** gives the tool-window styles and the fixed dialog
  style no extended window style.
- **A menu's `ShortcutId` set at run time** shows no shortcut text. **Page affected**: the
  Menu page says it does.
- **`MousePointer` `vbIconPointer` and `vbSizePointer`** set a null cursor.
- **A Report's preview** never returns from its first `DoEvents` on a private desktop. May be
  misuse, or the private desktop.

Seen on BETA 1042 by a `tbrun` probe of the Data control (a form with `Data1` and `TextBox1`,
a three-row table the probe makes with DAO; not kept). None checked in VB6. On win32 with Jet
the control opens the database, moves through it, and the bound TextBox shows each record.

- **`TextBox.DataField` set before the Data control has a recordset** raises 545, *Unable to
  bind to field or DataMember*; set after `Data1.Refresh` it binds. **Page affected**: the
  first sample of the Data page binds in `Form_Load` with no `Refresh`. May be the order VB6
  needs too.
- **A bound TextBox's `Text` assigned in code**, then `Data1.Recordset.MoveNext`: the record
  keeps its old value. May be misuse (VB6 may save only on a move by the control's buttons).
- **win64, `DefaultType = vbUseACE`**: `Data1.Recordset.MoveLast` after a `Refresh` that
  opened an `.accdb` is a native exception, and the run ends. The same probe passes on win32
  with Jet. Not narrowed: late-bound call, ACE or 64-bit.

### UserControl (from the VBCCR18 work)

Seen on BETA 1042 with VBCCR18 1.8.136.0's controls on a form. None checked in VB6, and none
narrowed to a UserControl of our own.

- **`Err.Number` is 438 after a property assignment that succeeded.** Under `On Error Resume
  Next`, `ProgressBar1.MarqueeSpeed = 5` leaves `Err.Number` 438 (*Object doesn't support this
  property or method*), though the value is set and nothing is raised: the same statement with
  no handler runs on. Every setter that ends with `UserControl.PropertyChanged "<Name>"` does it
  (FontQuality, MousePointer, Max); `Value`, whose setter runs an `On Error Resume Next` block
  after that call, leaves 0. So the suspect is `PropertyChanged`, failing inside and leaving
  `Err` set.
- **A form does not make option buttons that are UserControls exclusive.** OptionButtonW's
  `Value` is `OLE_OPTEXCLUSIVE`, and the control calls `UserControl.PropertyChanged "Value"`
  when it becomes True, on which a VB6 form clears the other such controls of the container.
  Two OptionButtonW on one form stay True together, set by code or clicked (`BM_CLICK`), the
  form loaded or shown, win32 and win64. The OptionButtonW page has a WARNING and a probe
  sample (`optionbuttonw-group`). Probably one defect with the 438 above: `PropertyChanged`
  failing inside.
- **A process stops returning after about ten thousand loads of a VBCCR18 control.** A form with
  one control (ToolBar, LabelW), made with `New`, loaded, unloaded and set to Nothing in a loop
  inside one `[TestCase]`, runs at a steady speed (about 3 to 5 ms a load) and does not return
  from a load between the 9,000th and the 9,500th, win32; the test project's HostForm, with one
  of every control, stops between its 270th and 280th. The same loop over a form with a VB
  Label or CommandButton runs 30,000 times. In the LabelW loop, which stops between its 9,140th
  and 9,160th load, nothing counted runs out: GDI objects stay at 26 (peak 32), USER objects at
  116 (peak 119), kernel handles at 664, and the atoms of the table that window classes and
  window properties share at 1,015. Two things do grow: private memory, by about 30 KB a load
  (545 MB to 826 MB, in a 32-bit process), and the time of a load, linearly (500 loads take
  0.84 s at first and 2.2 s at the end), so each load leaves something on a list that a later
  load goes through. Not narrowed: a UserControl of our own (twinBASIC's or the
  package's), win64, a built exe, where the process waits. `package_tests` avoids it with
  `CASES_PER_IDE` (`lib/package-tests.mjs`).
- **Some VBCCR18 controls leave handles behind at each load and unload** of their form (win32,
  `GetGuiResources`, 300 loads): Animation, ImageList and SysInfo 4 GDI and 1 USER a load;
  FrameW and WindowedLabel 2 GDI; LinkLabel 1 GDI. The others leave none. They do not cause the
  stop above (2,100 such loads change nothing in the time of a HostForm load). Not checked in
  VB6.
- **`Visible` reads False** for a control on a form that is loaded and not shown
  (`Extender.Visible`).
- **`CallByName Control, "FontQuality", VbLet, 7`** gives -2147352567 where the property raises
  380, the direct assignment's error.
- **A control named through its form is not `Is` its own object.** The sub-objects' `Tag`
  setters refuse their own control with `If Value Is Shadow<Control> Then Err.Raise 35700`
  (`LvwListItem.cls` 111-118, `ImcComboItem.cls` 85, the same in TvwNode, ImlListImage and the
  other `Tag`s). `Set f.ListView1.ListItems(1).Tag = f.ListView1` raises nothing, nor
  `Set n.Tag = f.TreeView1`; the same control first put in a variable declared
  `As VBCCR18.ImageCombo` is refused. So the object the form gives out and the one the control
  keeps of itself are different objects to `Is`. Whose doing (twinBASIC's extender, its `Is`,
  or the package's `Shadow...` reference) is not known; VB6 not checked. The pages say nothing
  of 35700 until this is settled.
- **A UserControl's own property is not reached through `As Control`.** VBCCR18's
  `UpDown.BuddyProperty = "Text"` with a TextBoxW buddy raises 380: its Let checks the name
  through `Dim BuddyControl As Control` (UpDown.ctl.twin 786-829), and only the extender's
  members (Tag, ToolTipText, Width) pass. NOTE and failing case on UpDown.md
  (`UpDownTests.BuddyProperty_Text_ShowsTheValue`). Not narrowed to a UserControl of our own;
  VB6 not checked.
- **MCIWnd's string getters give Windows twice the buffer's length**: `LenB(Buffer)` (512) for a
  256-character buffer, where the MCIWnd messages take a count of characters
  (MCIWnd.ctl.twin 1288, 1303, 1339, 1375, 1439, 1464). A value over 255 characters would be
  written past the string. The package's, not twinBASIC's; not reproduced.

### Late binding (from the VBCCR18 work)

- **An unknown member of a `Collection` reached late never returns.** Narrowed, BETA 1042, a
  console project with no package, win32 and win64:
  `Dim o As Object: Set o = New Collection: On Error Resume Next: Debug.Print o.Foo` does not
  return; with `On Error GoTo` a handler, the same. The same statements with `New StdFont`
  print error 438. Found from VBCCR18's Pager: `BuddyControl = <a Collection>` hangs in
  `ControlIsValid`'s `Control.Container`. VB6, expected to raise 438, not checked; a reproducer under
  `bugs/` is the next step (WIP.BugHunt.md's steps).
- **`CallByName obj, "", VbGet`** (the default member, by an empty name) raises 438. Found from
  VBCCR18's `UpDown.SyncBuddy = True`, which reads the buddy's default property so
  (UpDown.ctl.twin 831-866) and raises 380; NOTE and failing case on UpDown.md
  (`UpDownTests.SyncBuddy_True_UsesTheDefaultPropertyOfTheBuddy`). Whether VB6 accepts an empty
  name is not checked: that decides whether this is a defect.

### WinNativeCommonCtls

Seen on BETA 1042 by the `commonctls` setup (fixture `test/shots/commonctls`).

- **A ListView filled while hidden** shows no items in `lvwIcon` view.
- **`MonthView.DayBold`** raises error 380 for a month scrolled into view by setting `Value`.
- **An icon in an ImageList with `ColorDepth24Bit`** draws on black.
- **The DTPicker's long date format** draws its fields with wide gaps.
- **`DTPicker.HandleDropDown`** tests `styles And MCS_NOTODAY = 0`, which by operator
  precedence is `styles And (MCS_NOTODAY = 0)` and never true. Seen in the source, not run.

### CustomControls

- **`Class_Initialize` and `Sub New` together in a WaynesForm class** give TB5135. BETA 1042,
  the `waynes` setup.

### tbIDE and the add-ins that ship with the IDE

BETA 1045: met in its update, reading the tbIDE sources, Samples 24 to 27 and `ide/main.js`.
None of them run yet.

- **`DesignerHost` and `DesignerFactory` have one CoClassId**, `30262402-4D7A-4170-9E63-FE158040EC0F`
  (`Designers.twin`, lines 30 and 101); every other CoClass has its own. Whatever looks a
  CoClass up by its id may find the wrong one.
- **`"monacoDiff"` creates its editor with `theme: "vs-dark"`** (`main.js`, the
  `toolWindowElementAddChild` branch). Monaco's theme is global, so opening Diff Compare in a
  light IDE theme may turn the IDE's code editor dark too. **Page affected**: none states a
  colour yet.
- **Sample 24's `HexEditorFactory.New` writes `Set Addin = Addin`** where Sample 25's writes
  `Set Me.Addin = Addin`. The parameter hides the field (a `tbrun` probe on BETA 1045: the
  field stays **Nothing**, `Set Me.` sets it), so the Hex Editor's designers get **Nothing** for
  their `Addin`, and its message boxes (an invalid Find text) should fail. Not run in the add-in:
  a Find of `zz` in the Hex Editor shows what the user sees.
- **Sample 25's Undo back to an empty new icon passes an erased array to `SetFileData`**
  (`IcoEditorDesigner.twin` 2423), where Sample 24's comment says the bridge needs a real
  zero-element array. New, draw, Undo.
- **A package's JSON view is gone from the Project Explorer's menu.** BETA 1042's **View As
  JSON** worked on the rows under `Packages`; 1045 moves it into **Open with → JSON Preview**,
  which lists it only for the four form extensions, and hides **Open with** on a read-only row,
  which a package's is (`showContextMenuOpenWithComponent`). The command
  `tbProjectExplorer_SelectedItemsViewAsJSON` still exists: a key bound to it may still work.
  **Page affected**: Features/Compiler-IDE/IDE-Features.md and Projects/Files-and-Folders.md
  now describe forms only; their package pictures are removed.
- **Open with is hidden when no add-in offers an editor for the file**, and with it **JSON
  Preview** and **Markdown Preview**: in an IDE whose add-ins did not load (Shift held), a form's
  JSON view and a `.md` file's preview cannot be reached from the menu.
- **The Hex Editor's grid tooltip** says Ctrl+C "uses that column", but Ctrl+C always copies hex.
  **Page affected**: HexEditor.md says what the code does.

### VBFLXGRD18

- **Without an explicit `Load Form1`**, `Form1.VBFlexGrid1` through the implicit instance
  raises -2147467262 at the grid's first property. BETA 1042, the samples' template project.
  May be twinBASIC's implicit form instance rather than the package.

### tbKMode

BETA 1042: met while moving the section to 0.3.0.6, and still in 0.3.0.8, which fixed the other
two leads of 0.3.0.6 (RtlFailFast's fixed reason, MmCopyMemory's 4-byte *NumberOfBytes*).

- **SE_SELF_RELATIVE** (`SECURITY_DESCRIPTOR_CONTROL`, modWDM.twin line 4964) is `&H8000&`, a
  Long 32768, which an Integer cannot hold: **SECURITY_DESCRIPTOR.Control** (line 236) and the
  *Control* of RtlGetControlSecurityDescriptor and RtlSetControlSecurityDescriptor (lines
  5164-5165) are Integers, so assigning the flag to one may raise overflow, and comparing one with
  it is never true. Not run. By the package's convention for 16-bit values (0.3.0.8's
  ImageMachineType) it would be `&H8000`.

### User-defined types (from the GdiPlus work)

Seen on BETA 1005, 32-bit, by the agents documenting GdiPlus; not seen again since. Check on
the newest BETA first: each may be gone. The GdiPlus samples avoid every form below.

- **An element of a UDT array passed as a `ByVal` UDT argument** never returns:
  `pts(1).Diff(pts(2))`, `g.DrawLine p, pts(1), pts(2)`, with `pts` a `GpPointF` array and no
  GDI+ call involved.
- **A property read on an element of a UDT array** never returns: `types(1).CloseSubpath`,
  with `types` a `PathPointType` array. Copying the element to a local first works. Another
  agent got an access violation for the same read on a local array. Probably the same cause
  as the lead above.
- **`m.Scale(2, 3)` as a statement**, with parentheses and no `Call`, does nothing and raises
  nothing, on any class with a `Scale` method (also on a test class of its own).
- **`p.Scale(2)`** is a syntax error on `GpPointF` and `GpSizeF`; `p.Scale 2` compiles.
  Probably related to the lead above.
- **GdiPlus's `PathIterator.NextSubpathPath`** gives a LINKER code generation error for any
  project that uses `PathIterator`, though `tbbuild --build` still makes an exe.
- **Some UDT members do not link** ("compilation (codegen) error in Types.X"):
  `GpPointF.Normalized`, and `OffsetBy`, `OffsetByPt`, `InflatedBy` and `InflatedByPt` on
  `GpRect` and `GpRectF`.
