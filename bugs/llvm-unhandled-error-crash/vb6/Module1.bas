Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of a bug reproducer: what VB6 does where the report says twinBASIC differs.
' Build and run it with:  node scripts/bug_repro.mjs vb6 llvm-unhandled-error-crash
' The error is left unhandled on purpose: that is the case the report is about. Built by hand,
' the exe shows a box with the error's number and description, and ends when it is closed.
' Built by bug_repro.mjs, with Unattended Execution, the VB runtime writes that text to the
' Application event log instead, and bug_repro.mjs prints it.

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "main start"
    Close #9
    Err.Raise 5, "MySrc", "my text"
End Sub
