Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of latebound-constant-raise-exception: the error a late-bound caller
' sees when the member raises error 380, each way Thing raises it.
' Build and run it with:  node scripts/bug_repro.mjs vb6 latebound-constant-raise-exception
' Probe.vbp builds Probe.exe, which writes what it finds to out.txt beside the exe.

Private Sub Show(ByVal What As String)
    Print #9, What & " -> " & Err.Number & " [" & Err.Description & "]"
    Err.Clear
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim t As Thing, o As Object
    Set t = New Thing
    Set o = t
    On Error Resume Next
    o.Nope
    Show "late-bound Nope"
    t.RaiseConstant
    Show "early-bound RaiseConstant"
    o.RaiseVariable 380
    Show "late-bound RaiseVariable 380"
    o.RaiseConstantWithSource
    Show "late-bound RaiseConstantWithSource"
    o.RaiseConstantWithDescription
    Show "late-bound RaiseConstantWithDescription"
    o.RaiseConstant
    Show "late-bound RaiseConstant"
    o.ErrorStatement
    Show "late-bound ErrorStatement"
    o.Value = -1
    Show "late-bound Value = -1"
    CallByName o, "RaiseConstant", VbMethod
    Show "CallByName RaiseConstant"
    On Error GoTo Fail
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
