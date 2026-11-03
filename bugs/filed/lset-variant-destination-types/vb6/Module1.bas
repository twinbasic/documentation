Attribute VB_Name = "Module1"
Option Explicit

Sub Main()
    Dim v As Variant
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next

    v = Null
    Err.Clear
    LSet v = "abc"
    Print #9, "LSet, destination Null:    error " & Err.Number

    Set v = New Collection
    Err.Clear
    LSet v = "abc"
    Print #9, "LSet, destination Object:  error " & Err.Number

    Set v = New Collection
    Err.Clear
    RSet v = "abc"
    Print #9, "RSet, destination Object:  error " & Err.Number

    v = True
    Err.Clear
    RSet v = "ab"
    Print #9, "RSet, destination True:    [" & v & "] Len " & Len(v)

    v = True
    Err.Clear
    LSet v = "ab"
    Print #9, "LSet, destination True:    [" & v & "] Len " & Len(v)

    v = False
    Err.Clear
    LSet v = "ab"
    Print #9, "LSet, destination False:   [" & v & "] Len " & Len(v)
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
