Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of llvm-err-after-raise: what Err holds after a handled Err.Raise,
' written to out.txt as the twinBASIC project's lines are.

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    ResumeNextRaise
    GoToRaise
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Private Sub ResumeNextRaise()
    On Error Resume Next
    Err.Raise 5, "MySrc", "my text"
    Print #9, "plain: "; Err.Number; " / "; Err.Source; " / "; Err.Description
End Sub

Private Sub GoToRaise()
    On Error GoTo Handler
    Err.Raise 5, "MySrc", "my text"
    Exit Sub
Handler:
    Print #9, "GoTo:  "; Err.Number; " / "; Err.Source; " / "; Err.Description
End Sub
