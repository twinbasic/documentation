Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of single-division-by-zero-no-error: every division by zero raises
' error 11, and zero divided by zero error 6, whatever the type of the result.
' Build and run it with:  node scripts/bug_repro.mjs vb6 single-division-by-zero-no-error

Sub Main()
    Dim one As Single
    Dim zero As Single
    Dim dOne As Double
    Dim dZero As Double
    Dim lOne As Long
    Dim lZero As Long
    Dim s As Single
    Dim d As Double
    Dim n As Long
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    one = 1!: zero = 0!: dOne = 1#: dZero = 0#: lOne = 1: lZero = 0
    On Error Resume Next
    s = 5!: Err.Clear: s = one / zero: n = Err.Number: Print #9, "s = Single / 0      Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = zero / zero: n = Err.Number: Print #9, "s = 0! / 0!         Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = dOne / dZero: n = Err.Number: Print #9, "s = Double / 0      Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = lOne / lZero: n = Err.Number: Print #9, "s = Long / 0        Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = s / zero: n = Err.Number: Print #9, "s = s / 0           Err=" & n & " s=" & s
    n = -1: Err.Clear: If one / zero > 0 Then n = Err.Number Else n = Err.Number
    Print #9, "If Single / 0 > 0   Err=" & n
    d = 5#: Err.Clear: d = one / zero: n = Err.Number: Print #9, "d = Single / 0      Err=" & n
    d = 5#: Err.Clear: d = dOne / dZero: n = Err.Number: Print #9, "d = Double / 0      Err=" & n
    d = 5#: Err.Clear: d = dZero / dZero: n = Err.Number: Print #9, "d = 0# / 0#         Err=" & n
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
