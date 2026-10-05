Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of boolean-intdiv-string: the twinBASIC project's lines, written to out.txt.

Sub Main()
    Dim b As Boolean
    Dim s As String
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    b = True
    s = "2"

    Print #9, "b \ ""2""   = "; b \ "2"; " "; TypeName(b \ "2")
    Print #9, "b Mod ""2"" = "; b Mod "2"; " "; TypeName(b Mod "2")
    Print #9, "b \ s     = "; b \ s; " "; TypeName(b \ s)
    Print #9, "b Mod s   = "; b Mod s; " "; TypeName(b Mod s)

    Print #9, "b \ 2.0   = "; b \ 2#; " "; TypeName(b \ 2#)
    Print #9, "b Mod 2.0 = "; b Mod 2#; " "; TypeName(b Mod 2#)
    Print #9, """2"" \ b   = "; "2" \ b; " "; TypeName("2" \ b)
    Print #9, "b + ""2""   = "; b + "2"; " "; TypeName(b + "2")
    Print #9, "b / ""2""   = "; b / "2"; " "; TypeName(b / "2")
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
