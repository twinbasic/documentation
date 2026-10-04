Attribute VB_Name = "Module1"
Option Explicit

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "one space:    [" & StrConv("a b", vbProperCase) & "]"
    Print #9, "two spaces:   [" & StrConv("a  b", vbProperCase) & "]"
    Print #9, "three spaces: [" & StrConv("a   b", vbProperCase) & "]"
    Print #9, "vbCrLf:       [" & Replace(StrConv("a" & vbCrLf & "b", vbProperCase), vbCrLf, "<CRLF>") & "]"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
