Attribute VB_Name = "Module1"
Option Explicit

Private Function F(d As Date) As String
    F = Format(d, "yyyy-mm-dd")
End Function

Sub Main()
    Dim d As Date
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    d = #1/31/2026#
    ' the month ends that overflow in twinBASIC
    Print #9, "m +1 Jan 31 2026       " & F(DateAdd("m", 1, #1/31/2026#))
    Print #9, "m +1 Date variable     " & F(DateAdd("m", 1, d))
    Print #9, "m +1 31-Jan-95         " & F(DateAdd("m", 1, "31-Jan-95"))
    Print #9, "m +1 Jan 30 2026       " & F(DateAdd("m", 1, #1/30/2026#))
    Print #9, "m +1 Jan 29 2026       " & F(DateAdd("m", 1, #1/29/2026#))
    Print #9, "m +1 Jan 31 2024       " & F(DateAdd("m", 1, #1/31/2024#))
    Print #9, "m +1 Oct 31 2026       " & F(DateAdd("m", 1, #10/31/2026#))
    Print #9, "m -1 Mar 31 2026       " & F(DateAdd("m", -1, #3/31/2026#))
    Print #9, "m -1 Mar 30 2026       " & F(DateAdd("m", -1, #3/30/2026#))
    Print #9, "yyyy +1 Feb 29 2024    " & F(DateAdd("yyyy", 1, #2/29/2024#))
    Print #9, "yyyy -1 Feb 29 2024    " & F(DateAdd("yyyy", -1, #2/29/2024#))
    Print #9, "q +1 Nov 30 2025       " & F(DateAdd("q", 1, #11/30/2025#))
    ' the same intervals where the day exists in the target month, and the other intervals
    Print #9, "m +1 Jan 28 2026       " & F(DateAdd("m", 1, #1/28/2026#))
    Print #9, "yyyy +4 Feb 29 2024    " & F(DateAdd("yyyy", 4, #2/29/2024#))
    Print #9, "d +1 Jan 31 2026       " & F(DateAdd("d", 1, #1/31/2026#))
    Print #9, "y +1 Jan 31 2026       " & F(DateAdd("y", 1, #1/31/2026#))
    Print #9, "ww +1 Jan 31 2026      " & F(DateAdd("ww", 1, #1/31/2026#))
    ' DateSerial normalises a day past the end of the month, in both
    Print #9, "DateSerial(2026, 2, 31) " & F(DateSerial(2026, 2, 31))
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
