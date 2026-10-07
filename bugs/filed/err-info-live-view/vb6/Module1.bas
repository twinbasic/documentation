Attribute VB_Name = "Module1"
Option Explicit

Private Declare Function GetErrorInfo Lib "oleaut32" (ByVal dwReserved As Long, ByRef pperrinfo As Long) As Long

Sub Emit(ByVal s As String)
    Print #9, s
End Sub

Function Slot() As String
    Dim p As Long, r As Long
    r = GetErrorInfo(0, p)
    If p = 0 Then
        Slot = "empty (GetErrorInfo " & Hex(r) & ")"
    Else
        Slot = "an object"
    End If
End Function

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
    On Error Resume Next
    Dim t As New Thrower
    Emit "T1 fresh thread: " & Slot()
    Err.Raise 5
    Emit "T2 after Err.Raise 5 handled in this procedure: " & Slot()
    Err.Clear
    t.RaiseFull
    Emit "T4 Err " & Err.Number & " [" & Err.Description & "] [" & Err.Source & "]"
    Emit "T4 slot afterwards: " & Slot()
    Err.Clear
    t.Handled
    Emit "T6 slot after a call that handled its own error: " & Slot()
    Err.Clear
End Sub
