Attribute VB_Name = "Module1"
Option Explicit

' The text VB6 gives for a negative zero, which the twinBASIC reproducer's cases assert
' (a 32-bit twinBASIC build gives the same; a 64-bit one gives -0 from CStr, Str, Format
' and concatenation). The value is made by copying its bytes into the variable, and the
' bytes are read back to show that the sign bit is set.

Private Declare Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef Destination As Any, ByRef Source As Any, ByVal Length As Long)

Private Sub P(ByVal s As String)
    Print #9, s
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim d As Double, w(1) As Long, s As Single, n As Long, back(1) As Long
    On Error Resume Next

    w(0) = 0
    w(1) = &H80000000
    CopyMemory d, w(0), 8
    CopyMemory back(0), d, 8
    P "Double high word = " & Hex$(back(1)) & ", d = 0 is " & (d = 0)
    P "CStr(-0#)       = [" & CStr(d) & "]"
    P "Str$(-0#)       = [" & Str$(d) & "]"
    P "Format$(-0#)    = [" & Format$(d) & "]"
    P "Concatenated    = [x=" & d & "]"

    n = &H80000000
    CopyMemory s, n, 4
    CopyMemory back(0), s, 4
    P "Single bits     = " & Hex$(back(0)) & ", s = 0 is " & (s = 0)
    P "CStr(-0!)       = [" & CStr(s) & "]"
    P "Str$(-0!)       = [" & Str$(s) & "]"
    P "Concatenated    = [x=" & s & "]"

    P "CStr(0#)        = [" & CStr(0#) & "]"
    P "CStr(-1.5)      = [" & CStr(-1.5) & "]"
    P "error " & Err.Number & " " & Err.Description

    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
