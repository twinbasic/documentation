Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: node scripts/bug_repro.mjs vb6 forecolor-invalid-value-stored

Private Sub Cases()
    Load Form1
    Form1.ForeColor = vbGreen
    Form1.BackColor = vbGreen
    Form1.FillColor = vbGreen
    On Error Resume Next
    Form1.ForeColor = -1
    Print #9, "ForeColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.ForeColor): Err.Clear
    Form1.ForeColor = &H8000001F
    Print #9, "ForeColor = &H8000001F: Err " & Err.Number & ", reads " & Hex$(Form1.ForeColor): Err.Clear
    Form1.BackColor = -1
    Print #9, "BackColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.BackColor): Err.Clear
    Form1.FillColor = -1
    Print #9, "FillColor = -1: Err " & Err.Number & ", reads " & Hex$(Form1.FillColor): Err.Clear
    Unload Form1
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
