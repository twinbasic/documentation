Attribute VB_Name = "Module1"
Option Explicit

Sub Show(ByVal Label As String)
    Print #9, Label & ": [" & Err.Source & "] [" & Err.Description & "]"
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Cases
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Sub Cases()
    On Error Resume Next

    Err.Clear
    Err.Raise 5
    Show "Raise 5"

    Err.Clear
    Err.Raise 1
    Show "Raise 1"

    Err.Clear
    Err.Raise 513
    Show "Raise 513"

    Err.Clear
    Err.Raise 1000
    Show "Raise 1000"

    Err.Clear
    Err.Raise 1000, "A.Src", "B desc"
    Err.Raise 5
    Show "Raise 5 after a full Raise"
End Sub
