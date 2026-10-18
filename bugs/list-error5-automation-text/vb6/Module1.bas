Attribute VB_Name = "Module1"
Option Explicit

' What VB6 reports for error 5 raised by Collection.Add with Before = 1 on an emptied Collection.
' Build and run it with:  node scripts/bug_repro.mjs vb6 list-error5-automation-text

Sub Main()
    Dim a As New Cls
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    a.Add "a"
    On Error Resume Next
    a.Replace "Z"
    Print #9, "Dim a As New: " & Err.Number & ": " & Err.Description
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
