Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does when DateAdd's result would be before January 1, 100: error 5, whatever
' the interval. Build and run it with:  node scripts/bug_repro.mjs vb6 dateadd-year-below-100

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    V = Empty: V = DateAdd("d", -1, #1/1/100#): Report "DateAdd_DayBefore100", V
    V = Empty: V = DateAdd("yyyy", -1900, #1/1/2000#): Report "DateAdd_YearsToYear100", V
    V = Empty: V = DateAdd("yyyy", -1, #1/1/100#): Report "DateAdd_YearBefore100", V
    V = Empty: V = DateAdd("q", -1, #1/1/100#): Report "DateAdd_QuarterBefore100", V
    V = Empty: V = DateAdd("m", -1, #1/1/100#): Report "DateAdd_MonthBefore100", V
    Close #9
End Sub
