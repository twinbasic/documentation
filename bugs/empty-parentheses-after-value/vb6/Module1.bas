Attribute VB_Name = "Module1"
Option Explicit

' The same lines as the twinBASIC side in src/. VB6 refuses the ones with a value that is not a
' Variant, so they are commented out below with the message of the build:
'   t = Asc(s)()     Type mismatch
'   t = Len(s)()     Syntax error
'   t = Twice(3)()   Type mismatch
'   t = Chr$(65)()   Type mismatch
'   t = n()          Expected array
'   t = s()          Expected array
' It compiles the lines with a Variant, and raises error 9, "Subscript out of range", where they run.
' Build and run it with:  node scripts/bug_repro.mjs vb6 empty-parentheses-after-value

Private Function VarLong() As Variant
    VarLong = 7&
End Function

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": result=[" & Result & "] error " & Err.Number
    Err.Clear
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim s As String, v As Variant, t As Variant
    s = "abc": v = 6
    On Error Resume Next

    t = Empty: t = Chr(65)()
    Report "Chr(65)() [Variant]", t
    t = Empty: t = VarLong()()
    Report "VarLong()() [Variant]", t
    t = Empty: t = v()
    Report "v() [Variant variable]", t

    On Error GoTo Fail
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
