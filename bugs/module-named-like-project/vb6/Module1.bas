Attribute VB_Name = "ModuleNamedLikeProject"
Option Explicit

' The VB6 side of the reproducer: a project named ModuleNamedLikeProject with a
' standard module of the same name. VB6 has no [RunAfterBuild], so what is checked
' is whether it accepts the name at all.
' Build and run it with:  node scripts/bug_repro.mjs vb6 module-named-like-project

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "Sub Main ran, in a module named like the project"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
