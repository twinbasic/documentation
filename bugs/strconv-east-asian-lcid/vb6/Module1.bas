Attribute VB_Name = "Module1"
Option Explicit

Private Declare Function GetSystemDefaultLCID Lib "kernel32" () As Long

' What VB6 does with StrConv's East Asian conversions given an East Asian LCID, on a
' system whose locale is not East Asian.
' Build and run it with:  node scripts/bug_repro.mjs vb6 strconv-east-asian-lcid

Private Function Codes(ByVal S As Variant) As String
    Dim I As Long
    If VarType(S) <> vbString Then Codes = "-": Exit Function
    For I = 1 To Len(S)
        Codes = Codes & Hex$(AscW(Mid$(S, I, 1))) & " "
    Next
End Function

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Codes(Result) & ")"
    Err.Clear
End Sub

Sub Main()
    Dim R As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Print #9, "System locale: " & Hex$(GetSystemDefaultLCID())
    R = Empty: R = StrConv("a", vbUpperCase, 1041): Report "UpperCase_1041", R
    R = Empty: R = StrConv("a", vbWide): Report "Wide_NoLcid", R
    R = Empty: R = StrConv("a", vbWide, 1033): Report "Wide_1033", R
    R = Empty: R = StrConv("a", vbWide, 1041): Report "Wide_1041", R
    R = Empty: R = StrConv(ChrW(&HFF41), vbNarrow, 1041): Report "Narrow_1041", R
    R = Empty: R = StrConv(ChrW(&H3042), vbKatakana, 1041): Report "Katakana_1041", R
    R = Empty: R = StrConv(ChrW(&H30A2), vbHiragana, 1041): Report "Hiragana_1041", R
    R = Empty: R = StrConv("a", vbWide, 2052): Report "Wide_2052", R
    R = Empty: R = StrConv("a", vbWide, 1042): Report "Wide_1042", R
    Close #9
End Sub
