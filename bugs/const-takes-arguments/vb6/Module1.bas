Attribute VB_Name = "Module1"
Option Explicit

' The same constants as the twinBASIC side in src/. VB6 refuses each line with parentheses after a
' constant, so they are commented out below with the message of the build, each checked in a build
' of its own:
'   x = K(1, 2)             Expected array
'   x = K(1)                Expected array
'   x = K()                 Expected array
'   x = S(1)                Expected array
'   x = K(Effect())         Expected array
'   x = Left("abcd", 2)     Expected array
' Build and run it with:  node scripts/bug_repro.mjs vb6 const-takes-arguments

Private Const K As Long = 5
Private Const S As String = "abc"
Private Const Left As Long = 1

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "K = " & K
    Print #9, "S = " & S
    Print #9, "Left = " & Left
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
