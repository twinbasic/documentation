Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of first-conversion-spurious-overflow: the same statements as the
' twinBASIC project's Sub Main, writing to out.txt.
' Build and run it with:  node scripts/bug_repro.mjs vb6 first-conversion-spurious-overflow

Sub Main()
    Dim s As Single
    Dim t As Long
    Open App.Path & "\out.txt" For Output As #9
    s = 4.5
    On Error Resume Next
    t = CLng(s)
    Print #9, "first  CLng(s): t=" & t & " Err=" & Err.Number
    Err.Clear
    t = CLng(s)
    Print #9, "second CLng(s): t=" & t & " Err=" & Err.Number
    Err.Clear
    If False Then t = CLng(1E+20)
    Close #9
End Sub
