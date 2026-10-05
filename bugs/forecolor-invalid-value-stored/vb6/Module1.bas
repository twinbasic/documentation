Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: node scripts/bug_repro.mjs vb6 forecolor-invalid-value-stored

Private Sub Cases()
    Load Form1
    On Error Resume Next
    Form1.ForeColor = vbGreen
    Form1.ForeColor = -1
    Print #9, "Form.ForeColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.ForeColor): Err.Clear
    Form1.ForeColor = vbGreen
    Form1.ForeColor = &H8000001F
    Print #9, "Form.ForeColor = &H8000001F: Err " & Err.Number & ", reads " & Hex$(Form1.ForeColor): Err.Clear
    Form1.BackColor = vbGreen
    Form1.BackColor = -1
    Print #9, "Form.BackColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.BackColor): Err.Clear
    Form1.FillColor = vbGreen
    Form1.FillColor = -1
    Print #9, "Form.FillColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.FillColor): Err.Clear
    Form1.PictureBox1.ForeColor = vbGreen
    Form1.PictureBox1.ForeColor = -1
    Print #9, "PictureBox.ForeColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.PictureBox1.ForeColor): Err.Clear
    Form1.PictureBox1.BackColor = vbGreen
    Form1.PictureBox1.BackColor = -1
    Print #9, "PictureBox.BackColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.PictureBox1.BackColor): Err.Clear
    Form1.PictureBox1.FillColor = vbGreen
    Form1.PictureBox1.FillColor = -1
    Print #9, "PictureBox.FillColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.PictureBox1.FillColor): Err.Clear
    Form1.Label1.ForeColor = vbGreen
    Form1.Label1.ForeColor = -1
    Print #9, "Label.ForeColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.Label1.ForeColor): Err.Clear
    Form1.Label1.BackColor = vbGreen
    Form1.Label1.BackColor = -1
    Print #9, "Label.BackColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.Label1.BackColor): Err.Clear
    Form1.TextBox1.ForeColor = vbGreen
    Form1.TextBox1.ForeColor = -1
    Print #9, "TextBox.ForeColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.TextBox1.ForeColor): Err.Clear
    Form1.TextBox1.BackColor = vbGreen
    Form1.TextBox1.BackColor = -1
    Print #9, "TextBox.BackColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.TextBox1.BackColor): Err.Clear
    Form1.CommandButton1.BackColor = vbGreen
    Form1.CommandButton1.BackColor = -1
    Print #9, "CommandButton.BackColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.CommandButton1.BackColor): Err.Clear
    Printer.ForeColor = vbGreen
    Printer.ForeColor = -1
    Print #9, "Printer.ForeColor = -1: Err " & Err.Number & ", reads " & Hex$(Printer.ForeColor): Err.Clear
    Printer.FillColor = vbGreen
    Printer.FillColor = -1
    Print #9, "Printer.FillColor = -1: Err " & Err.Number & ", reads " & Hex$(Printer.FillColor): Err.Clear
    Form1.UC1.RunCases
    Unload Form1
    Load MDIForm1
    MDIForm1.BackColor = vbGreen
    MDIForm1.BackColor = -1
    Print #9, "MDIForm.BackColor = -1: Err " & Err.Number & ", reads " & Hex$(MDIForm1.BackColor): Err.Clear
    MDIForm1.BackColor = vbGreen
    MDIForm1.BackColor = &H8000001F
    Print #9, "MDIForm.BackColor = &H8000001F: Err " & Err.Number & ", reads " & Hex$(MDIForm1.BackColor): Err.Clear
    MDIForm1.Show
    MDIForm1.BackColor = vbGreen
    MDIForm1.BackColor = -1
    Print #9, "MDIForm (shown).BackColor = -1: Err " & Err.Number & ", reads " & Hex$(MDIForm1.BackColor): Err.Clear
    MDIForm1.BackColor = vbGreen
    MDIForm1.BackColor = &H8000001F
    Print #9, "MDIForm (shown).BackColor = &H8000001F: Err " & Err.Number & ", reads " & Hex$(MDIForm1.BackColor): Err.Clear
    Unload MDIForm1
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Cases
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
