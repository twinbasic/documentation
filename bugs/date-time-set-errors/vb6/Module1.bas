Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises when Date, Date$, Time and Time$ are assigned. Every value is the clock's
' own or one that cannot be read, so a run with the privilege to set the clock changes
' nothing; without it, an accepted value raises 70, Permission denied.
' Build and run it with:  node scripts/bug_repro.mjs vb6 date-time-set-errors

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Date = "abc": Report "Date_SetNotADate"
    Date$ = Null: Report "DateString_SetNull"
    Date$ = Format$(Date, "mm-dd-yyyy"): Report "DateString_SetMmDdYyyy"
    Time$ = Format$(Time, "hh:mm:ss"): Report "TimeString_SetHhMmSs"
    Date = Null: Report "Date_SetNull"
    Time = Null: Report "Time_SetNull"
    Date$ = "abc": Report "DateString_SetNotADate"
    Time$ = "abc": Report "TimeString_SetNotATime"
    Date$ = Format$(Date, "m/d/yyyy"): Report "DateString_SetSlashes"
    Date$ = Format$(Date, "mm-dd-yy"): Report "DateString_SetTwoDigitYear"
    Time$ = Format$(Time, "hh:mm"): Report "TimeString_SetHhMm"
    Close #9
End Sub
