Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: node scripts/bug_repro.mjs vb6 textbox-text-ignores-maxlength

Private Sub Cases()
    Load Form1
    Form1.Text1.MaxLength = 3
    Form1.Text1.Text = "abcdef"
    Print #9, "Text = ""abcdef"": [" & Form1.Text1.Text & "] Len " & Len(Form1.Text1.Text)
    Form1.Text1.Text = "ab"
    Form1.Text1.SelStart = 2
    Form1.Text1.SelText = "cdef"
    Print #9, "SelText = ""cdef"" after ""ab"": [" & Form1.Text1.Text & "] Len " & Len(Form1.Text1.Text)
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
