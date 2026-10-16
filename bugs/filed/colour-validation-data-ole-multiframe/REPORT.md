Filed as [twinbasic/twinbasic#2532](https://github.com/twinbasic/twinbasic/issues/2532).

## `Data.ForeColor`, `Data.BackColor`, `OLE.BackColor` and `MultiFrame.BackColor` store a value that is not a colour, where VB6 raises error 380

**Describe the bug**
Follow-up to #2484, which is fixed in BETA 1005 for every colour property of Form, PictureBox, UserControl, Printer, MDIForm, Label, TextBox, CommandButton and the other controls it named: each now raises error 380, *Invalid property value*, and keeps its colour, as VB6 does. This is the four properties that still store the value: `ForeColor` and `BackColor` of the Data control, `BackColor` of the OLE control and `BackColor` of the MultiFrame. Assigning `-1` to any of them raises no error, and the property then reads `FFFFFFFF`. Observed by running the reproducer's test cases.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `colour-validation-data-ole-multiframe.twinproj` (attached as `colour-validation-data-ole-multiframe.zip`). Its `Form1` holds a PictureBox, a Label, a TextBox, a CommandButton, a user control (`UC1`), a Data control, an OLE control and a MultiFrame; `MyMDIForm` is an MDIForm.
2. Run, with `On Error Resume Next`:
   ```
   Load Form1
   Form1.Data1.ForeColor = vbGreen
   Form1.Data1.ForeColor = -1
   Debug.Print Err.Number, Hex$(Form1.Data1.ForeColor)
   ```
3. See `0 FFFFFFFF`. The same with `Form1.Label1.ForeColor` prints `380 FF00`.

The module below is the reproducer's, and is meant to be adapted as a regression test. It loads the forms and never shows them. On BETA 1005 the seventeen cases from #2484 pass, and the four cases for the Data control, the OLE control and the MultiFrame fail with `Expected: 380, Actual: 0`.
```vb
' Regression tests for #2484 and its follow-up. Assigning a value that is not a
' colour to a colour property raises error 380, Invalid property value, and
' leaves the colour it had: VB6 6.0 does this for each property it has (the VB6
' project beside this one prints them), and twinBASIC does it for the other
' controls. Form1 holds one control of each class; it is loaded, never shown.
' Each case sets the colour to vbGreen, assigns the bad value early-bound under
' On Error Resume Next, and checks the error and the colour read back.
[TestFixture]
Module ColourPropertyTests

    Private Const NotAColour As Long = -1
    Private Const SystemColourOutOfRange As Long = &H8000001F

    Private Sub Expect380(ByVal Number As Long, ByVal After As Long)
        Assert.Strict.AreEqual 380, Number, "the error"                   ' VB6: 380, Invalid property value
        Assert.Strict.AreEqual CLng(vbGreen), After, "the colour it had"  ' VB6: the old colour is kept
    End Sub

    ' Fixed in #2484 (BETA 1005).

    [TestCase]
    Public Sub Form_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.ForeColor = vbGreen
        On Error Resume Next: Form1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Form_ForeColor_SystemColourOutOfRange()
        Dim number As Long, after As Long
        Load Form1: Form1.ForeColor = vbGreen
        On Error Resume Next: Form1.ForeColor = SystemColourOutOfRange: number = Err.Number: On Error GoTo 0
        after = Form1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Form_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.BackColor = vbGreen
        On Error Resume Next: Form1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Form_FillColor()
        Dim number As Long, after As Long
        Load Form1: Form1.FillColor = vbGreen
        On Error Resume Next: Form1.FillColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.FillColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub PictureBox_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.PictureBox1.ForeColor = vbGreen
        On Error Resume Next: Form1.PictureBox1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.PictureBox1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub PictureBox_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.PictureBox1.BackColor = vbGreen
        On Error Resume Next: Form1.PictureBox1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.PictureBox1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub PictureBox_FillColor()
        Dim number As Long, after As Long
        Load Form1: Form1.PictureBox1.FillColor = vbGreen
        On Error Resume Next: Form1.PictureBox1.FillColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.PictureBox1.FillColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Label_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Label1.ForeColor = vbGreen
        On Error Resume Next: Form1.Label1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Label1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Label_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Label1.BackColor = vbGreen
        On Error Resume Next: Form1.Label1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Label1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub TextBox_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.TextBox1.ForeColor = vbGreen
        On Error Resume Next: Form1.TextBox1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.TextBox1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub TextBox_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.TextBox1.BackColor = vbGreen
        On Error Resume Next: Form1.TextBox1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.TextBox1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub CommandButton_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.CommandButton1.BackColor = vbGreen
        On Error Resume Next: Form1.CommandButton1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.CommandButton1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub UserControl_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.UC1.TrySet "ForeColor", NotAColour, number, after: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub UserControl_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.UC1.TrySet "BackColor", NotAColour, number, after: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub UserControl_FillColor()
        Dim number As Long, after As Long
        Load Form1: Form1.UC1.TrySet "FillColor", NotAColour, number, after: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub MDIForm_BackColor()
        Dim number As Long, after As Long
        Load MyMDIForm: MyMDIForm.BackColor = vbGreen
        On Error Resume Next: MyMDIForm.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = MyMDIForm.BackColor: Unload MyMDIForm
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub MDIForm_BackColor_SystemColourOutOfRange()
        Dim number As Long, after As Long
        Load MyMDIForm: MyMDIForm.BackColor = vbGreen
        On Error Resume Next: MyMDIForm.BackColor = SystemColourOutOfRange: number = Err.Number: On Error GoTo 0
        after = MyMDIForm.BackColor: Unload MyMDIForm
        Expect380 number, after
    End Sub

    ' Left in BETA 1005: these store the value and raise no error.

    [TestCase]
    Public Sub Data_ForeColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Data1.ForeColor = vbGreen
        On Error Resume Next: Form1.Data1.ForeColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Data1.ForeColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub Data_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.Data1.BackColor = vbGreen
        On Error Resume Next: Form1.Data1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.Data1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub OLE_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.OLE1.BackColor = vbGreen
        On Error Resume Next: Form1.OLE1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.OLE1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

    [TestCase]
    Public Sub MultiFrame_BackColor()
        Dim number As Long, after As Long
        Load Form1: Form1.MultiFrame1.BackColor = vbGreen
        On Error Resume Next: Form1.MultiFrame1.BackColor = NotAColour: number = Err.Number: On Error GoTo 0
        after = Form1.MultiFrame1.BackColor: Unload Form1
        Expect380 number, after
    End Sub

End Module
```
`UC1`, the user control on `Form1`, sets its own colour properties for the three `UserControl_` cases:
```vb
    ' Sets one of the user control's own colour properties to vbGreen, then to
    ' Value; returns the error the second assignment raised, and the colour after it.
    Public Sub TrySet(ByVal Prop As String, ByVal Value As Long, ByRef Number As Long, ByRef After As Long)
        Select Case Prop
            Case "ForeColor": ForeColor = vbGreen
            Case "BackColor": BackColor = vbGreen
            Case "FillColor": FillColor = vbGreen
        End Select
        On Error Resume Next
        Select Case Prop
            Case "ForeColor": ForeColor = Value
            Case "BackColor": BackColor = Value
            Case "FillColor": FillColor = Value
        End Select
        Number = Err.Number
        On Error GoTo 0
        Select Case Prop
            Case "ForeColor": After = ForeColor
            Case "BackColor": After = BackColor
            Case "FillColor": After = FillColor
        End Select
    End Sub
```

**Expected behavior**
Error 380 for each assignment, and the old colour kept, as twinBASIC now does for the other controls, and as VB6 does for `OLE.BackColor`. The VB6 project, attached as `colour-validation-data-ole-multiframe-vb6.zip`, prints `OLE.BackColor = -1: Err 380, reads FF00`, and 380 for each of the other properties of the test. It has no Data control (none could be loaded in VB6 on the machine), and VB6 has no MultiFrame.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
`&H8000001F` and `&HFF0000FF`, which are not colours either, are stored by the same four properties with no error. In the BETA 1005 package source, the Data control, the OLE control and the MultiFrame declare these as plain `Public ... As OLE_COLOR` fields, with no `OnPropertyLet` handler that calls `CommonValidateColorOrRevert`, unlike the other controls. `OLE.BackColor` also gets the compile warning TB0009, *[BackColor] has not yet been implemented*, wherever it is used, and stores the value all the same.

Not tested here: `Printer.ForeColor` and `Printer.FillColor`, which #2484 named, need a default printer; on BETA 1005 they raise 380 and keep the colour when there is one (#2484's reproducer prints them).

Severity: low. The stored value is what the control then paints with, and no error tells the program that the colour it was given is not one.

<!-- Reproducer: bugs/colour-validation-data-ole-multiframe/ (mode test: `tbrun --tests`; expect lists the seventeen PASS and four FAIL lines); verified on BETA 1005 by `bug_repro.mjs verify`. VB6 side in vb6/ (VB6 6.0, the same project as #2484's): `bug_repro.mjs vb6` prints 380 for every property it has, OLE.BackColor included. The tests assign early-bound: set late-bound or through CallByName, every one of these properties raises &H80020009 instead of 380 (the entry "An error raised with a constant number, in a member called late-bound, reaches the caller as &H80020009, *Exception occurred.*"). Follow-up to #2484 ("Setting a colour property to a value that is not a colour stores it, and raises error 5 or nothing, where VB6 raises error 380 and keeps the old value"), closed as fixed in BETA 1004; its reproducer, bugs/filed/forecolor-invalid-value-stored/, still reproduces these four lines and stays until a fix is released. Stated in a WARNING naming BETA 1005 on docs/Reference/Default/VB/Data/index.md (under ForeColor and under BackColor), OLE/index.md (under BackColor) and MultiFrame/index.md (under BackColor): when fixed, each WARNING goes, and the property says that a value that is not a colour raises error 380, as the other controls' pages do. -->
