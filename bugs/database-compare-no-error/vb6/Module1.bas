Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with a compare argument of 2 (vbDatabaseCompare) outside Access.
' Build and run it with:  node scripts/bug_repro.mjs vb6 instr-database-compare-no-error

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (result " & CStr(Result) & ")"
    Err.Clear
End Sub

Sub Main()
    Dim R As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    R = Empty: R = InStr(1, "abc", "a", 0): Report "InStr_Binary", R
    R = Empty: R = InStr(1, "abc", "A", 1): Report "InStr_Text", R
    R = Empty: R = InStr(1, "abc", "a", 2): Report "InStr_Database", R
    R = Empty: R = InStr(1, "abc", "A", 2): Report "InStr_Database_Upper", R
    R = Empty: R = InStr(1, "abc", "a", 3): Report "InStr_Three", R
    R = Empty: R = InStrB(1, "abc", "a", 2): Report "InStrB_Database", R
    R = Empty: R = InStrRev("abc", "a", -1, 2): Report "InStrRev_Database", R
    R = Empty: R = StrComp("a", "A", 2): Report "StrComp_Database", R
    R = Empty: R = Replace("abc", "a", "x", 1, -1, 2): Report "Replace_Database", R
    R = Empty: R = UBound(Split("a,b", ",", -1, 2)): Report "Split_Database", R
    Dim F(0 To 1) As String
    F(0) = "abc": F(1) = "x"
    R = Empty: R = UBound(Filter(F, "a", True, 2)): Report "Filter_Database", R
    Close #9
End Sub
