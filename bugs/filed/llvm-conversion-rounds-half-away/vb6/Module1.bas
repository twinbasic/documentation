Attribute VB_Name = "Module1"
Option Explicit

Sub Main()
    Dim d As Double
    Dim s As Single
    Dim v As Variant
    Dim l As Long
    Dim x As Variant
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    For Each x In Array(0.5, 2.5, 3.5, -0.5, -2.5)
        d = x: s = x: v = d
        l = d
        Print #9, "VB6   " & d & ":  CLng(d)=" & CLng(d) & "  CLng(s)=" & CLng(s) & "  CInt(d)=" & CInt(d) & "  l=d:" & l & "  d\1=" & (d \ 1) & "  CLng(v)=" & CLng(v) & "  Round=" & Round(d)
    Next
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
