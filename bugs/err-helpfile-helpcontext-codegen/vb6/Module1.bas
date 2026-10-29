Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of err-helpfile-helpcontext-codegen: the same assignments as the
' twinBASIC tests, each read back. Build and run with:
'   node scripts/bug_repro.mjs vb6 err-helpfile-helpcontext-codegen

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Err.HelpFile = "x"
    Print #9, "HelpFile: [" & Err.HelpFile & "]"
    Err.HelpContext = 5
    Print #9, "HelpContext: " & Err.HelpContext
    Dim e As ErrObject
    Set e = Err
    e.HelpFile = "y"
    Print #9, "HelpFile through ErrObject: [" & Err.HelpFile & "]"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
