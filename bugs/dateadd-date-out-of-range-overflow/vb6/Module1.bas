Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises for a date that is a number outside the range of dates: 13, in DatePart,
' Day, DateAdd and DateDiff alike.
' Build and run it with:  node scripts/bug_repro.mjs vb6 dateadd-date-out-of-range-overflow

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    Dim V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    V = DatePart("d", 3000000): Report "DatePart_NumberOutOfRange"
    V = Day(3000000): Report "Day_NumberOutOfRange"
    V = DateAdd("d", 0, 2958466): Report "DateAdd_NumberAboveRange"
    V = DateAdd("d", 0, -657435): Report "DateAdd_NumberBelowRange"
    V = DateDiff("d", #1/1/2000#, 3000000): Report "DateDiff_NumberOutOfRange"
    Close #9
End Sub
