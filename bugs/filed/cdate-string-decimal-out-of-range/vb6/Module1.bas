Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with CDate of a string holding a number outside the Date range, and of a
' Decimal outside it: error 13 for both.
' Build and run it with:  node scripts/bug_repro.mjs vb6 cdate-string-decimal-out-of-range

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim R As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    R = Empty: R = CDbl(CDate("2958465")): Report "CDate_StringLargest", R
    R = Empty: R = CDbl(CDate("-657434")): Report "CDate_StringSmallest", R
    R = Empty: R = CDbl(CDate(CDec(5))): Report "CDate_DecimalInRange", R
    R = Empty: R = CDate("abc"): Report "CDate_NotADate", R
    R = Empty: R = CDate("2958466"): Report "CDate_StringPastLargest", R
    R = Empty: R = CDate("-657435"): Report "CDate_StringBeforeSmallest", R
    R = Empty: R = CDate(CDec(2958466)): Report "CDate_DecimalPastLargest", R
    R = Empty: R = CDate(CDec(-657435)): Report "CDate_DecimalBeforeSmallest", R
    Close #9
End Sub
