Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with the calls of ../src/Sources/Startup.twin. VB6 does not allow a
' procedure named Scale (in a class or a module: "Expected: identifier"), and allows
' Line only in a module, where only the graphics syntax reaches it. Each of these is
' "Compile Error: Syntax error", so none is in this program:
'     Module1.Line (2, 3)                  -- one point
'     Module1.Line 7, 1, 2, 3, 4, 5        -- the plain list
'     Call Module1.Line(7, 1, 2, 3, 4, 5)  -- with Call
' What VB6 accepts is below.

Public Sub Line(ByVal Flags As Long, ByVal X1 As Single, ByVal Y1 As Single, ByVal X2 As Single, ByVal Y2 As Single, ByVal Color As Long)
    Print #9, "Line F=" & Flags & " (" & X1 & "," & Y1 & ")-(" & X2 & "," & Y2 & ") C=" & Color
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Module1.Line (1, 2)-(3, 4)
    Module1.Line (1, 2)-(3, 4), 5, BF
    Close #9
    Exit Sub
Fail:
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
