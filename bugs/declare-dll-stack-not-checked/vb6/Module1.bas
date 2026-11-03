Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of declare-dll-stack-not-checked: labs in msvcrt.dll is __cdecl, declared here
' without CDecl, as the twinBASIC reproducer declares it. Probe.vbp compiles to P-Code, which
' runs Declare calls as the VB6 IDE does: the call raises error 49, "Bad DLL calling
' convention", and the program goes on. Compiled to native code, VB6 checks nothing either.
' Build and run it with:  node scripts/bug_repro.mjs vb6 declare-dll-stack-not-checked

Private Declare Function labs Lib "msvcrt" (ByVal x As Long) As Long

Private Sub CallDll()
    Dim r As Long
    On Error Resume Next
    r = labs(-7)
    If Err.Number <> 0 Then
        Print #9, "labs(-7): error " & Err.Number & ", " & Err.Description
    Else
        Print #9, "labs(-7) = " & r
    End If
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    CallDll
    Print #9, "returned from CallDll"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
