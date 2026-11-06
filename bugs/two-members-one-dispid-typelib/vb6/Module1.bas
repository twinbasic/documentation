Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side: two events of one class with the procedure ID of a default member.
' Build and run it with:  node scripts/bug_repro.mjs vb6 marked-events-share-dispid

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim s As New Sink
    Set s.Src = New Source
    s.Src.Go
    Print #9, s.Got
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
