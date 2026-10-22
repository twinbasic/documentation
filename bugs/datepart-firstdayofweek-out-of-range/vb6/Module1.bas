Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with a firstdayofweek outside 0 to 7: error 5 where the interval uses it.
' Build and run it with:  node scripts/bug_repro.mjs vb6 datepart-firstdayofweek-out-of-range

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    V = Empty: V = DatePart("w", #1/1/2000#, vbSunday): Report "DatePart_W_Sunday", V
    V = Empty: V = DatePart("w", #1/1/2000#, vbSaturday): Report "DatePart_W_Saturday", V
    V = Empty: V = DatePart("d", #1/1/2000#, 8): Report "DatePart_D_Eight", V
    V = Empty: V = DatePart("w", #1/1/2000#, 8): Report "DatePart_W_Eight", V
    V = Empty: V = DatePart("w", #1/1/2000#, 255): Report "DatePart_W_255", V
    V = Empty: V = DatePart("w", #1/1/2000#, -1): Report "DatePart_W_MinusOne", V
    V = Empty: V = DatePart("ww", #1/1/2000#, 8): Report "DatePart_WW_Eight", V
    V = Empty: V = DateDiff("ww", #1/1/2000#, #1/1/2001#, 8): Report "DateDiff_WW_Eight", V
    Close #9
End Sub
