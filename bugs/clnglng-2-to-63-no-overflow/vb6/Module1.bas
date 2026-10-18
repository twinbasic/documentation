Attribute VB_Name = "Module1"
Option Explicit

' VB6 has no LongLong, so the nearest case is the conversion of the first Double beyond
' the Long range, 2^31, to a Long, written as a constant expression and as a variable. Both
' raise error 6, Overflow, which is what the twinBASIC reproducer asserts for 2^63 and
' LongLong. The controls are the last Double inside the range.

Private Sub Report(ByVal Label As String, ByVal Value As Double)
    Print #9, Label & " -> error " & Err.Number & " " & Err.Description & ", n = " & Value
    Err.Clear
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim n As Long, x As Double
    On Error Resume Next

    n = 0: n = CLng(2 ^ 31)
    Report "CLng(2 ^ 31)", n
    n = 0: n = CLng(2147483648#)
    Report "CLng(2147483648#)", n
    n = 0: n = 2147483648#
    Report "n = 2147483648#", n
    x = 2 ^ 31
    n = 0: n = CLng(x)
    Report "CLng(x), x = 2 ^ 31", n
    n = 0: n = CLng(2147483647.4)
    Report "control: CLng(2147483647.4)", n
    n = 0: n = CLng(-(2 ^ 31))
    Report "control: CLng(-(2 ^ 31))", n

    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
