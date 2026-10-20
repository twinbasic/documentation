Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with String given a character of Null: String returns Null, String$ raises 94.
' Build and run it with:  node scripts/bug_repro.mjs vb6 string-null-character

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (VarType " & VarType(Result) & ")"
    Err.Clear
End Sub

Sub Main()
    Dim R As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    R = Empty: R = String(3, "a"): Report "String_Letter", R
    R = Empty: R = String(Null, "a"): Report "String_NullNumber", R
    R = Empty: R = String$(Null, "a"): Report "StringDollar_NullNumber", R
    R = Empty: R = String$(3, Null): Report "StringDollar_NullCharacter", R
    R = Empty: R = String(3, Null): Report "String_NullCharacter", R
    R = Empty: R = String(0, Null): Report "String_Zero_NullCharacter", R
    Close #9
End Sub
