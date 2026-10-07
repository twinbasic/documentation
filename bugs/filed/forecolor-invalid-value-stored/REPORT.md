Filed as [twinbasic/twinbasic#2484](https://github.com/twinbasic/twinbasic/issues/2484).

## Setting a colour property to a value that is not a colour stores it, and raises error 5 or nothing, where VB6 raises error 380 and keeps the old value

**Describe the bug**
Assigning a value that is not a colour to a colour property does not leave the property as it was, on a form, on a PictureBox or UserControl, on the Printer, and on every control tried. `Form.ForeColor = -1` and `Form.ForeColor = &H8000001F` raise error 5 (*Invalid procedure call or argument*) and still store the value, so `ForeColor` reads back `FFFFFFFF` and `8000001F` afterwards. `Form.BackColor = -1` and `Form.FillColor = -1` raise nothing and store the value. `ForeColor` raises error 5 on the surfaces that draw with a device context (Form, PictureBox, UserControl, Printer); every other colour property tried raises nothing, for `-1`, `&H8000001F` and `&HFF0000FF` alike. VB6 raises error 380 (*Invalid property value*) for every one of these assignments and keeps the colour the property had. Observed by assigning with `On Error Resume Next` and printing `Err.Number` and the value read back.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `forecolor-invalid-value-stored.twinproj` (attached as `forecolor-invalid-value-stored.zip`). Its `Sub Main` loads `Form1`, which holds a PictureBox, a Label, a TextBox, a CommandButton and a user control, UC1, whose `RunCases` assigns its own colour properties; it then loads `MyMDIForm`, an MDIForm, assigns the same values to its `BackColor`, shows it and assigns them again. For each property tried it sets `vbGreen`, then assigns `-1` (and `&H8000001F` to the form's `ForeColor`) under `On Error Resume Next` and prints the error number and the value read back. The Printer lines need a default printer; nothing is printed.
2. Run it (F5) and read the DEBUG CONSOLE:
   ```
   Form.ForeColor = -1: Err 5, reads FFFFFFFF
   Form.ForeColor = &H8000001F: Err 5, reads 8000001F
   Form.BackColor = -1: Err 0, reads FFFFFFFF
   Form.FillColor = -1: Err 0, reads FFFFFFFF
   PictureBox.ForeColor = -1: Err 5, reads FFFFFFFF
   PictureBox.BackColor = -1: Err 0, reads FFFFFFFF
   PictureBox.FillColor = -1: Err 0, reads FFFFFFFF
   Label.ForeColor = -1: Err 0, reads FFFFFFFF
   Label.BackColor = -1: Err 0, reads FFFFFFFF
   TextBox.ForeColor = -1: Err 0, reads FFFFFFFF
   TextBox.BackColor = -1: Err 0, reads FFFFFFFF
   CommandButton.BackColor = -1: Err 0, reads FFFFFFFF
   Printer.ForeColor = -1: Err 5, reads FFFFFFFF
   Printer.FillColor = -1: Err 0, reads FFFFFFFF
   UserControl.ForeColor = -1: Err 5, reads FFFFFFFF
   UserControl.BackColor = -1: Err 0, reads FFFFFFFF
   UserControl.FillColor = -1: Err 0, reads FFFFFFFF
   MDIForm.BackColor = -1: Err 0, reads FFFFFFFF
   MDIForm.BackColor = &H8000001F: Err 0, reads 8000001F
   MDIForm (shown).BackColor = -1: Err 5, reads FFFFFFFF
   MDIForm (shown).BackColor = &H8000001F: Err 5, reads 8000001F
   ```

**Expected behavior**
Error 380 for each assignment, and the old value kept, as VB6 does (the VB6 project, attached as `forecolor-invalid-value-stored-vb6.zip`, prints):
```
Form.ForeColor = -1: Err 380, reads FF00
Form.ForeColor = &H8000001F: Err 380, reads FF00
Form.BackColor = -1: Err 380, reads FF00
Form.FillColor = -1: Err 380, reads FF00
PictureBox.ForeColor = -1: Err 380, reads FF00
PictureBox.BackColor = -1: Err 380, reads FF00
PictureBox.FillColor = -1: Err 380, reads FF00
Label.ForeColor = -1: Err 380, reads FF00
Label.BackColor = -1: Err 380, reads FF00
TextBox.ForeColor = -1: Err 380, reads FF00
TextBox.BackColor = -1: Err 380, reads FF00
CommandButton.BackColor = -1: Err 380, reads FF00
Printer.ForeColor = -1: Err 380, reads FF00
Printer.FillColor = -1: Err 380, reads FF00
UserControl.ForeColor = -1: Err 380, reads FF00
UserControl.BackColor = -1: Err 380, reads FF00
UserControl.FillColor = -1: Err 380, reads FF00
MDIForm.BackColor = -1: Err 380, reads FF00
MDIForm.BackColor = &H8000001F: Err 380, reads FF00
MDIForm (shown).BackColor = -1: Err 380, reads FF00
MDIForm (shown).BackColor = &H8000001F: Err 380, reads FF00
```
`FF00` is `vbGreen`, which each property held before the assignment. A program that sets a colour from user input and handles the error then keeps the colour it had.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: low. `ForeColor` raises the error on the surfaces and the other properties do not, and the stored value is what a later `Line`, `Circle`, `PSet` or `Print` then uses (or what the control paints with), so a handled error leaves the invalid colour in force.

What was tried: the same lines on BETA 983 print the same, so this is not a change of BETA 984. A value that is a valid colour, such as `&H100FF00` or `&H20000FF`, is accepted by `ForeColor` with no error, as in VB6. Besides the attached project, each of `-1`, `&H8000001F` and `&HFF0000FF` was assigned to every colour property of a UserControl (placed on the form), CheckBox, Frame, ListBox, Shape, ComboBox, DirListBox, DriveListBox, FileListBox, OptionButton and OLE in a project of its own, on BETA 995 and 983 and in VB6: the results are the same as above, error 5 for the UserControl's `ForeColor` and none for the rest in twinBASIC, error 380 and the old value kept in VB6. The twinBASIC-only controls behave the same (`QRCode.ForeColor` raises error 5, `CheckMark.BackColor` and `MultiFrame.BackColor` raise nothing), and so do `CommandButton.ForeColor` and the Data control's colours, which VB6 has no counterpart or no loadable project for. The package source explains the pattern: the colour properties are plain stored fields (`Public ForeColor As OLE_COLOR` and so on, in `GraphicsBase` for Form, PictureBox, UserControl, PropertyPage and Report, and declared again in each control), with nothing that validates the value; the error 5 comes from the `ForeColor` change handler of `GraphicsBase`, which runs after the value is stored.

<!-- Reproducer: bugs/forecolor-invalid-value-stored/ (mode run, expects the twenty-one lines above in twinBASIC); verified on 995 and 983 for the first seventeen lines, and the four MDIForm lines were run on 997 (MyMDIForm needs a FormDesignerId of its own: given Form1's, its lines test Form1). The VB6 project is in bugs/forecolor-invalid-value-stored/vb6/ (`bug_repro.mjs vb6 forecolor-invalid-value-stored` prints the twenty-one lines above). The wider sweep (every colour property of the classes named under "What was tried", three values each, on 995, 983 and VB6) is in .claude/tooling-review-scratch/beta995-probes/s73/colours/ (c4.out995.txt, c4.out983.txt, c5.outvb6.txt, c6.Data.outvb6.txt, c3.out*.txt for the UserControl), local scratch files that are not in the repository. Stated in a WARNING naming BETA 995 under each of the colour properties on the pages under docs/Reference/Default/VB/ for: Form, PictureBox, UserControl, PropertyPage, Report, Printer, Label, TextBox, CommandButton, CheckBox, OptionButton, Frame, ListBox, ComboBox, DirListBox, DriveListBox, FileListBox, Shape, OLE (the VB6 comparison is in the WARNING), MDIForm (BackColor only; its WARNING names BETA 997) and Data, CheckMark, MultiFrame, QRCode (twinBASIC behaviour only; CommandButton.ForeColor likewise). PropertyPage and Report were not run: they inherit GraphicsBase, as Form does. MDIForm's BackColor was run on 997 with a real MDIForm and stores the value, raising no error while the form is only loaded and error 5 once it is shown; its ForeColor and FillColor are not on its interface (a compile error early-bound; 380 through As Form). When fixed, remove each WARNING. -->
