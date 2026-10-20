Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with an invalid locale ID as compare when a string is zero-length.
' Build and run it with:  node scripts/bug_repro.mjs vb6 instr-invalid-lcid-empty-string

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (result " & CStr(Result) & ")"
    Err.Clear
End Sub

Sub Main()
    Dim R As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    R = Empty: R = InStr(1, "abc", "a", 99999): Report "InStr_BadLcid", R
    R = Empty: R = InStr(1, "", "a", 99999): Report "InStr_BadLcid_EmptyString1", R
    R = Empty: R = InStr(1, "abc", "", 99999): Report "InStr_BadLcid_EmptyString2", R
    R = Empty: R = InStr(1, "", "", 99999): Report "InStr_BadLcid_BothEmpty", R
    R = Empty: R = InStr(5, "abc", "a", 99999): Report "InStr_BadLcid_StartPastEnd", R
    R = Empty: R = InStr(1, "ab", "abc", 99999): Report "InStr_BadLcid_String2Longer", R
    R = Empty: R = InStr(1, "", "a", -2): Report "InStr_MinusTwo_EmptyString1", R
    R = Empty: R = InStr(1, "abc", "", -2): Report "InStr_MinusTwo_EmptyString2", R
    R = Empty: R = InStrB(1, "", "a", 99999): Report "InStrB_BadLcid_EmptyString1", R
    R = Empty: R = InStrB(1, "abc", "", 99999): Report "InStrB_BadLcid_EmptyString2", R
    R = Empty: R = InStrRev("", "a", -1, 99999): Report "InStrRev_BadLcid_EmptyString1", R
    R = Empty: R = InStrRev("abc", "", -1, 99999): Report "InStrRev_BadLcid_EmptyString2", R
    R = Empty: R = StrComp("", "a", 99999): Report "StrComp_BadLcid_Empty", R
    R = Empty: R = Replace("", "a", "x", 1, -1, 99999): Report "Replace_BadLcid_Empty", R
    R = Empty: R = Replace("abc", "a", "x", 1, -1, 99999): Report "Replace_BadLcid", R
    R = Empty: R = UBound(Split("", ",", -1, 99999)): Report "Split_BadLcid_Empty", R
    Close #9
End Sub
