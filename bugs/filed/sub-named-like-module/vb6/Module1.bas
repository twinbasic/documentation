Attribute VB_Name = "Probe"
Option Explicit

' The VB6 side of the reproducer: a standard module named Probe that holds a
' Sub named Probe. VB6 has no [RunAfterBuild], so what is checked is whether it
' accepts the name, and whether the Sub can be called.
' Build and run it with:  node scripts/bug_repro.mjs vb6 sub-named-like-module

Public Sub Probe()
    Print #9, "Sub Probe ran, in a module named Probe"
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Probe
    Print #9, "Sub Main ran"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
