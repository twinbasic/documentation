Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with a public array in a class: it refuses the declaration (see Holder.cls),
' so the project here uses a property with an index in its place, and assigns through it.
' Build and run it with:  node scripts/bug_repro.mjs vb6 class-array-field-element-assignment-crash

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim h As New Holder
    h.Values(1) = 5
    Print #9, "h.Values(1) after the assignment: " & h.Values(1)
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
