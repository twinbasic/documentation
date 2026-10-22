Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does when Calendar is set: no error for vbCalGreg and vbCalHijri, 5 otherwise.
' Build and run it with:  node scripts/bug_repro.mjs vb6 calendar-set-unspecified-error

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    Dim C As Long
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Print #9, "Calendar_Read: " & Calendar
    Calendar = Null: Report "Calendar_SetNull"
    Calendar = vbCalGreg: Report "Calendar_SetGregorian"
    Calendar = vbCalHijri: Report "Calendar_SetHijri"
    C = Calendar
    Calendar = vbCalGreg
    Print #9, "Calendar_SetHijri_ReadsBack: " & C
    Calendar = 2: Report "Calendar_SetTwo"
    Close #9
End Sub
