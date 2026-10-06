Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of a bug reproducer: what VB6 does where the report says twinBASIC differs.
' Build and run it with:  node scripts/bug_repro.mjs vb6 exe-error-box-title
' The error is left unhandled on purpose: that is the case the report is about. Form1 is never
' shown; it is there so that bug_repro.mjs builds the exe without Unattended Execution, which
' would write the error to the event log instead of showing the box.

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "main start"
    Close #9
    Err.Raise 5, "MySrc", "my text"
End Sub
