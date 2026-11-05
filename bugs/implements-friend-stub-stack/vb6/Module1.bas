Attribute VB_Name = "Module1"
Option Explicit

' The calls the twinBASIC side of the report makes, each in a procedure of its own, followed by
' a return to Main, which is what goes wrong in a 32-bit twinBASIC build.
' Build and run it with:  node scripts/bug_repro.mjs vb6 implements-friend-stub-stack

Private Sub Case0()
    Dim T As Target
    Dim L As Long
    Set T = New Impl
    On Error Resume Next
    T.SubNoArguments
    Print #9, "Sub, no arguments: " & Err.Number & " " & Err.Description
End Sub

Private Sub Case1()
    Dim T As Target
    Dim L As Long
    Set T = New Impl
    On Error Resume Next
    T.SubOneLong 5
    Print #9, "Sub, one Long: " & Err.Number & " " & Err.Description
End Sub

Private Sub Case2()
    Dim T As Target
    Dim L As Long
    Set T = New Impl
    On Error Resume Next
    T.SubTwoLongs 1, 2
    Print #9, "Sub, two Longs: " & Err.Number & " " & Err.Description
End Sub

Private Sub Case3()
    Dim T As Target
    Dim L As Long
    Set T = New Impl
    On Error Resume Next
    T.SubOneCurrency 5
    Print #9, "Sub, one Currency: " & Err.Number & " " & Err.Description
End Sub

Private Sub Case4()
    Dim T As Target
    Dim L As Long
    Set T = New Impl
    On Error Resume Next
    L = T.FunctionNoArguments()
    Print #9, "Function, no arguments: " & Err.Number & " " & Err.Description
End Sub

Private Sub Case5()
    Dim T As Target
    Dim L As Long
    Set T = New Impl
    On Error Resume Next
    L = T.FunctionOneArgument(5)
    Print #9, "Function, one argument: " & Err.Number & " " & Err.Description
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Case0
    Case1
    Case2
    Case3
    Case4
    Case5
    Print #9, "returned to Main"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
