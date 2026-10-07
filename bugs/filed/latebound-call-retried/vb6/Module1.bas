Attribute VB_Name = "Module1"
Option Explicit

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

Sub Show(ByVal label As String)
    Print #9, label & " -> error " & Err.Number & " (" & Hex(Err.Number) & ") [" & Err.Description & "]"
    Err.Clear
End Sub

Sub Cases()
    Dim w As New Widget
    Dim o As Object
    Set o = w
    On Error Resume Next
    w.Hits = 0
    o.Hello 1
    Show "o.Hello 1"
    Print #9, "  Hits=" & w.Hits
    w.Hits = 0: w.Gets = 0
    o.Prop = 1
    Show "o.Prop = 1"
    Print #9, "  Hits=" & w.Hits & " Gets=" & w.Gets
End Sub
