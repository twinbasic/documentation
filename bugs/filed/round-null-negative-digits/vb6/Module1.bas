Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with Round of Null and a negative numdecimalplaces: error 5.
' Build and run it with:  node scripts/bug_repro.mjs vb6 round-null-negative-digits

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & TypeName(Result) & ")"
    Err.Clear
End Sub

Sub Main()
    Dim V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    V = Empty: V = Round(1.5, -1): Report "Round_NumberNegativeDigits", V
    V = Empty: V = Round(Empty, -1): Report "Round_EmptyNegativeDigits", V
    V = Empty: V = Round(Null, 2): Report "Round_NullValidDigits", V
    V = Empty: V = Round(Null, -1): Report "Round_NullNegativeDigits", V
    Close #9
End Sub
