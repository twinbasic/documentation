Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/setattr-open-file-no-error: the same cases as src/Sources/Startup.twin.
' Build and run it with:  node scripts/bug_repro.mjs vb6 setattr-open-file-no-error
' File number 9 is out.txt, so no case closes every file or uses number 9.

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Cases
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Sub Cases()
    Dim d As String, f As Integer, m As Variant
    d = Environ$("TEMP") & "\SetattrOpenFileNoError-vb6-" & Hex$(Timer * 100)
    MkDir d
    On Error Resume Next
    For Each m In Array("Input", "Output", "Append", "Binary", "Random")
        f = FreeFile
        Select Case m
            Case "Input"
                Open d & "\a.txt" For Output As #f
                Close #f
                Open d & "\a.txt" For Input As #f
            Case "Output"
                Open d & "\a.txt" For Output As #f
            Case "Append"
                Open d & "\a.txt" For Append As #f
            Case "Binary"
                Open d & "\a.txt" For Binary As #f
            Case "Random"
                Open d & "\a.txt" For Random As #f
        End Select
        Err.Clear
        SetAttr d & "\a.txt", vbReadOnly
        Print #9, "SetAttr vbReadOnly, file open For " & m & ": error " & Err.Number & " " & Err.Description & "; attributes now " & GetAttr(d & "\a.txt")
        Close #f
        SetAttr d & "\a.txt", vbNormal
    Next
    Kill d & "\a.txt"
    RmDir d
End Sub
