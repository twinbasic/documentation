Attribute VB_Name = "Module1"
Option Explicit

' IDispatch::GetTypeInfoCount and GetTypeInfo called by vtable slot (3 and 4) on a
' VB6 class, through DispCallFunc. The HRESULT is the call's own result.

Private Declare Function DispCallFunc Lib "oleaut32.dll" (ByVal pvInstance As Long, ByVal oVft As Long, ByVal cc As Long, ByVal vtReturn As Integer, ByVal cActuals As Long, ByRef prgvt As Integer, ByRef prgpvarg As Long, ByRef pvargResult As Variant) As Long

Private Const CC_STDCALL As Long = 4
Private Const VT_I4 As Integer = 3

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

' Calls slot SlotNo of the interface at Ptr with Count Long arguments (at most 3);
' returns the HRESULT the method returned, or DispCallFunc's own failure.
Private Function CallSlot(ByVal Ptr As Long, ByVal SlotNo As Long, ByVal Count As Long, ByVal Arg0 As Long, ByVal Arg1 As Long, ByVal Arg2 As Long) As Long
    Dim types(0 To 2) As Integer
    Dim vars(0 To 2) As Variant
    Dim ptrs(0 To 2) As Long
    Dim result As Variant
    Dim hr As Long
    Dim i As Long
    vars(0) = Arg0
    vars(1) = Arg1
    vars(2) = Arg2
    For i = 0 To 2
        types(i) = VT_I4
        ptrs(i) = VarPtr(vars(i))
    Next
    result = CLng(0)
    hr = DispCallFunc(Ptr, SlotNo * 4, CC_STDCALL, VT_I4, Count, types(0), ptrs(0), result)
    If hr <> 0 Then
        CallSlot = hr
    Else
        CallSlot = CLng(result)
    End If
End Function

Private Sub TryIndex(ByVal Ptr As Long, ByVal Index As Long)
    Dim ti As Long
    Dim hr As Long
    ti = 0
    hr = CallSlot(Ptr, 4, 3, Index, 0, VarPtr(ti))
    Print #9, "GetTypeInfo(" & Index & "): HRESULT " & Hex(hr) & ", pointer returned " & (ti <> 0)
    If ti <> 0 Then hr = CallSlot(ti, 2, 0, 0, 0, 0)
End Sub

Private Sub Cases()
    Dim w As Widget
    Dim o As Object
    Dim p As Long
    Dim count As Long
    Dim hr As Long
    Set w = New Widget
    Set o = w
    p = ObjPtr(o)
    hr = CallSlot(p, 3, 1, VarPtr(count), 0, 0)
    Print #9, "GetTypeInfoCount = " & count & " (HRESULT " & Hex(hr) & ")"
    TryIndex p, 0
    TryIndex p, 1
    TryIndex p, 2
    TryIndex p, -1
End Sub
