Attribute VB_Name = "Module1"
Option Explicit

' The text VB6 gives for infinity and NaN, which the twinBASIC reproducer's cases assert
' (a 32-bit twinBASIC build gives the same; a 64-bit one gives inf, -inf, nan, -nan(ind),
' inf.00 and nan.00). The values are made by copying their bytes into the variable.

Private Declare Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef Destination As Any, ByRef Source As Any, ByVal Length As Long)

Private Sub P(ByVal s As String)
    Print #9, s
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim x As Double, w(1) As Long, s As Single, n As Long
    On Error Resume Next

    w(0) = 0
    w(1) = &H7FF00000
    CopyMemory x, w(0), 8
    P "CStr(+Infinity) = " & CStr(x)
    P "Concatenated    = x=" & x
    P "Format(x, 0.00) = " & Format(x, "0.00")
    w(1) = &HFFF00000
    CopyMemory x, w(0), 8
    P "CStr(-Infinity) = " & CStr(x)
    w(1) = &H7FF80000
    CopyMemory x, w(0), 8
    P "CStr(NaN)       = " & CStr(x)
    P "Format(NaN, 0.00) = " & Format(x, "0.00")
    w(1) = &HFFF80000
    CopyMemory x, w(0), 8
    P "CStr(indeterminate) = " & CStr(x)
    n = &H7F800000
    CopyMemory s, n, 4
    P "CStr(Single +Infinity) = " & CStr(s)
    P "CStr(1.5)       = " & CStr(1.5)
    P "error " & Err.Number & " " & Err.Description

    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
