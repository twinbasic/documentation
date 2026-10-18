Attribute VB_Name = "Module1"
Option Explicit

' VB6 refuses an array as the argument of Len or LenB. The line below, with an element as
' the argument, is the control, and the project builds. Each of these was tried in this
' module alone (the build stops at the first line it refuses), and each gave the compile
' error  Variable required - can't assign to this expression:
'
'   Dim a(9) As Byte:  n = LenB(a)
'   Dim a(9) As Long:  n = LenB(a)
'   Dim a() As Byte:   n = LenB(a)
'   Dim a(9) As Byte:  n = Len(a)
'   Dim a() As Byte:   n = Len(a)

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim a(9) As Byte
    Dim n As Long
    n = LenB(a(0))
    Print #9, "LenB(a(0)) = " & n
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
