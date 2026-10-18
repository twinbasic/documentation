Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does where the twinBASIC reproducer's cases assert error 6: every way of
' making a Date outside January 1, 100 to December 31, 9999 raises error 6, Overflow, and
' the Date keeps its old value (0 here). The two controls are the ends of the range.

Private Sub Report(ByVal Label As String, ByVal Value As Double)
    Print #9, Label & " -> error " & Err.Number & " " & Err.Description & ", d = " & Value
    Err.Clear
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim d As Date, n As Long, x As Double, last As Date, first As Date
    On Error Resume Next

    n = 2958466
    d = 0: d = n
    Report "d = 2958466 (Long)", CDbl(d)
    d = 0: d = CDate(n)
    Report "CDate(2958466)", CDbl(d)
    n = -657435
    d = 0: d = CDate(n)
    Report "CDate(-657435)", CDbl(d)
    last = #12/31/9999#
    d = 0: d = last + 1
    Report "#12/31/9999# + 1", CDbl(d)
    first = #1/1/100#
    d = 0: d = first - 1
    Report "#1/1/100# - 1", CDbl(d)
    x = 1E+300
    d = 0: d = x
    Report "d = 1E+300 (Double)", CDbl(d)

    n = 2958465
    d = 0: d = n
    Report "control: d = 2958465", CDbl(d)
    n = -657434
    d = 0: d = n
    Report "control: d = -657434", CDbl(d)

    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
