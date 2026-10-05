Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of err-raise-helpcontext: the twinBASIC project's call, with all five
' arguments named, compiles; the handler writes what Err holds to out.txt.

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    T
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Sub T()
    Dim myHelpFile As String, myHelpContext As Long
    myHelpFile = "my.hlp"
    myHelpContext = 42
    On Error GoTo Handler
    Err.Raise vbObjectError + 894, Source:="MyApp.MyClass", _
              Description:="Was not able to complete your task", _
              HelpFile:=myHelpFile, HelpContext:=myHelpContext
    Exit Sub
Handler:
    Print #9, "Number:      "; Err.Number - vbObjectError; "+ vbObjectError"
    Print #9, "Source:      "; Err.Source
    Print #9, "Description: "; Err.Description
    Print #9, "HelpFile:    "; Err.HelpFile
    Print #9, "HelpContext: "; Err.HelpContext
End Sub
