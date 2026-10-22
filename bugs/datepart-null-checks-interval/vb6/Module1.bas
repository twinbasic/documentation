Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with an interval that is not a setting and a Null date: DatePart, DateAdd
' and DateDiff all return Null.
' Build and run it with:  node scripts/bug_repro.mjs vb6 datepart-null-checks-interval

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & TypeName(Result) & ")"
    Err.Clear
End Sub

Sub Main()
    Dim V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    V = Empty: V = DatePart("x", #1/1/2000#): Report "DatePart_BadIntervalWithDate", V
    V = Empty: V = DateAdd("x", 1, Null): Report "DateAdd_BadIntervalWithNull", V
    V = Empty: V = DateDiff("x", Null, #1/1/2001#): Report "DateDiff_BadIntervalWithNull", V
    V = Empty: V = DatePart("x", Null): Report "DatePart_BadIntervalWithNull", V
    Close #9
End Sub
