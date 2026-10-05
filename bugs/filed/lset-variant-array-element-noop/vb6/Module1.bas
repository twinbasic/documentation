Attribute VB_Name = "Module1"
Option Explicit

Sub Main()
    Dim v As Variant
    Dim w(0 To 1) As Variant
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9

    v = Array("0123456789", "abcde")
    LSet v(0) = "zz"
    RSet v(1) = "zz"
    Print #9, "LSet v(0), v = Array(...):   [" & v(0) & "]"
    Print #9, "RSet v(1), v = Array(...):   [" & v(1) & "]"

    w(0) = "0123456789"
    w(1) = "abcde"
    LSet w(0) = "zz"
    RSet w(1) = "zz"
    Print #9, "LSet w(0), w(0 To 1) As Variant: [" & w(0) & "]"
    Print #9, "RSet w(1), w(0 To 1) As Variant: [" & w(1) & "]"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
