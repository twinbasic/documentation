Attribute VB_Name = "Module1"
Option Explicit

Sub Main()
    Dim big As Double
    Dim z As Double
    Dim lmax As Long
    Dim r As Double
    Dim l As Long
    Dim n As Long
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    big = 1E+308
    z = 0#
    lmax = 2147483647
    On Error Resume Next
    r = 5#: Err.Clear: r = big * 10#: n = Err.Number: Print #9, "VB6    Double *   Err=" & n & " r=" & r
    r = 5#: Err.Clear: r = big + big: n = Err.Number: Print #9, "VB6    Double +   Err=" & n & " r=" & r
    r = 5#: Err.Clear: r = 10# ^ 400#: n = Err.Number: Print #9, "VB6    Double ^   Err=" & n
    r = 5#: Err.Clear: r = big / 0.1: n = Err.Number: Print #9, "VB6    Double /   Err=" & n & " r=" & r
    r = 5#: Err.Clear: r = 1# / z: n = Err.Number: Print #9, "VB6    1# / 0#    Err=" & n & " r=" & r
    l = 5: Err.Clear: l = lmax + 1: n = Err.Number: Print #9, "VB6    Long +     Err=" & n & " l=" & l
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
