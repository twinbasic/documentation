Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with a firstweekofyear outside 0 to 3: error 5 with the "ww" interval.
' Build and run it with:  node scripts/bug_repro.mjs vb6 datepart-firstweekofyear-out-of-range

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    V = Empty: V = DatePart("ww", #1/1/2000#, vbSunday, vbFirstJan1): Report "DatePart_WW_FirstJan1", V
    V = Empty: V = DatePart("ww", #1/1/2000#, vbSunday, vbFirstFullWeek): Report "DatePart_WW_FirstFullWeek", V
    V = Empty: V = DatePart("d", #1/1/2000#, vbSunday, 4): Report "DatePart_D_Four", V
    V = Empty: V = DatePart("ww", #1/1/2000#, vbSunday, 4): Report "DatePart_WW_Four", V
    V = Empty: V = DatePart("ww", #1/1/2000#, vbSunday, -1): Report "DatePart_WW_MinusOne", V
    Close #9
End Sub
