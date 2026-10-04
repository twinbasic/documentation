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

Sub Cases()
    Dim w As New Widget
    Dim d As stdole.IDispatch
    Dim count As Long
    Set d = w
    On Error Resume Next
    d.Hello
    Print #9, "d.Hello: error " & Err.Number & ", Hello ran " & w.Hits & " time(s)"
    Err.Clear
    d.GetTypeInfoCount count
    Print #9, "d.GetTypeInfoCount: error " & Err.Number & " (" & Hex(Err.Number) & ") " & Err.Description
    Err.Clear
    d.GetTypeInfoCount "a", "b", "c"
    Print #9, "d.GetTypeInfoCount ""a"", ""b"", ""c"": error " & Err.Number
    Err.Clear
    d.NoSuchMethod
    Print #9, "d.NoSuchMethod: error " & Err.Number
End Sub
