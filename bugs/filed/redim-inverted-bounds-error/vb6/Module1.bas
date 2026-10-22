Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises for ReDim with an upper bound less than its lower bound: error 9.
' Build and run it with:  node scripts/bug_repro.mjs vb6 redim-inverted-bounds-error

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Dim X() As Long
    Dim A(1 To 3) As Long
    ReDim X(0 To 0)
    Report "ReDim_OneElement"
    ReDim X(-3 To -1)
    Report "ReDim_NegativeBoundsInOrder"
    A(4) = 1
    Report "FixedArray_SubscriptAboveRange"
    ReDim X(0 To -1)
    Report "ReDim_ZeroToMinusOne"
    ReDim X(-1)
    Report "ReDim_MinusOne"
    ReDim X(5 To 4, 1)
    Report "ReDim_FiveToFour_SecondDimension"
    Close #9
End Sub
