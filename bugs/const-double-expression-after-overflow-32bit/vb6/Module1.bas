Attribute VB_Name = "Module1"
Option Explicit

' VB6 has no LongLong. The twinBASIC reproducer asserts that a constant Double expression with an
' operator after the ^ (2 ^ 10 * 2) is accepted after a constant Double that does not fit a Long
' has raised error 6. VB6 has the same two statements for a Double and a Long: the first raises error 6
' and the second is accepted with its own value and no error.

Private Sub Report(ByVal Label As String, ByVal Value As Double)
    Print #9, Label & " -> error " & Err.Number & " " & Err.Description & ", value = " & Value
    Err.Clear
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim d As Double, l As Long, n As Long
    On Error Resume Next

    l = 0: l = 2 ^ 31
    Report "l = 2 ^ 31 (the overflow)", l
    d = 0: d = 2 ^ 10 * 2
    Report "d = 2 ^ 10 * 2, directly after", d
    d = 0: d = 2 ^ 10 * 2
    Report "d = 2 ^ 10 * 2, again", d

    l = 0: l = 2147483648#
    Report "l = 2147483648# (the overflow)", l
    n = 0: n = 2 ^ 30 + 2 ^ 29
    Report "n = 2 ^ 30 + 2 ^ 29, directly after", n

    d = 0: d = 2 ^ 10 * 2
    Report "control: d = 2 ^ 10 * 2 with no overflow before", d

    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
