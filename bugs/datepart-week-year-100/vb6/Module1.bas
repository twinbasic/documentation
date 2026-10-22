Attribute VB_Name = "Module1"
Option Explicit

' What VB6 gives for DatePart("ww", ...) of January 1, 100, whose week belongs to year 99.
' Build and run it with:  node scripts/bug_repro.mjs vb6 datepart-week-year-100

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Print #9, "ww of 1/1/100, vbFirstFourDays: " & DatePart("ww", #1/1/100#, vbSunday, vbFirstFourDays) & " error " & Err.Number
    Err.Clear
    Print #9, "ww of 1/3/100, vbFirstFullWeek: " & DatePart("ww", #1/3/100#, vbSunday, vbFirstFullWeek) & " error " & Err.Number
    Err.Clear
    Print #9, "ww of 1/1/2000, vbFirstFullWeek: " & DatePart("ww", #1/1/2000#, vbSunday, vbFirstFullWeek) & " error " & Err.Number
    Err.Clear
    Print #9, "ww of 1/1/100, vbFirstFullWeek: " & DatePart("ww", #1/1/100#, vbSunday, vbFirstFullWeek) & " error " & Err.Number
    Close #9
End Sub
