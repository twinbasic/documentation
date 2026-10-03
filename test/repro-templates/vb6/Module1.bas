Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of a bug reproducer: what VB6 does where the report says twinBASIC differs.
' Build and run it with:  node scripts/bug_repro.mjs vb6 <slug>
' Probe.vbp builds Probe.exe, which writes what it finds to out.txt beside the exe.
' Handle every error, and never call MsgBox or InputBox: an unhandled error or a box
' opens a modal window on the desktop of whoever runs the exe.

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "probe ran"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
