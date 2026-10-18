Attribute VB_Name = "Module1"
Option Explicit

' VB6 refuses As Any anywhere but the parameter of a Declare statement. The Declare
' below is the control, and the project builds. The other declarations of the
' twinBASIC reproducer were each tried in this module alone (the build stops at the
' first it refuses); the command-line build's compile error for each was:
'
'   Private ModuleLevel As Any                  Expected: New or type name
'   Private Type HasAny: Value As Any           Expected: New or type name
'   Private Function ReturnsAny() As Any        Expected: type name
'   Private Sub TakesAny(ByRef p As Any)        Expected: type name
'   Dim x As Any        (in a procedure)        Syntax error
'   Static s As Any     (in a procedure)        Syntax error
'   Dim a(1) As Any    (in a procedure)         Syntax error

Private Declare Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef Destination As Any, ByRef Source As Any, ByVal Length As Long)

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Print #9, "probe ran"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
