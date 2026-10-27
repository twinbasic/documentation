Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of ifdef-function-call-is-zero: which branch each #If takes when its
' expression calls a function. Writes one line per test to out.txt beside the exe.
' VB6 has no Win64 and no TWINBASIC_BUILD_TYPE, so those tests are left out.

#Const FROM_CALL = CBool(1)

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
#If 1 = 1 Then
    Print #9, "1 = 1: True"
#Else
    Print #9, "1 = 1: False"
#End If
#If Win32 = 1 Then
    Print #9, "Win32 = 1: True"
#Else
    Print #9, "Win32 = 1: False"
#End If
#If CBool(1) Then
    Print #9, "CBool(1): True"
#Else
    Print #9, "CBool(1): False"
#End If
#If CBool(Win32) Then
    Print #9, "CBool(Win32): True"
#Else
    Print #9, "CBool(Win32): False"
#End If
#If CLng(1) = 1 Then
    Print #9, "CLng(1) = 1: True"
#Else
    Print #9, "CLng(1) = 1: False"
#End If
#If Abs(-1) = 1 Then
    Print #9, "Abs(-1) = 1: True"
#Else
    Print #9, "Abs(-1) = 1: False"
#End If
#If Len("abc") = 3 Then
    Print #9, "Len(""abc"") = 3: True"
#Else
    Print #9, "Len(""abc"") = 3: False"
#End If
#If FROM_CALL Then
    Print #9, "#Const FROM_CALL = CBool(1): True"
#Else
    Print #9, "#Const FROM_CALL = CBool(1): False"
#End If
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
