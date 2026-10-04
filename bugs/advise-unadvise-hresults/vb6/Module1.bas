Attribute VB_Name = "Module1"
Option Explicit

' VB6 cannot call IConnectionPoint directly, so the vtable is called with DispCallFunc.
' IUnknown: 0 QueryInterface, 1 AddRef, 2 Release.
' IConnectionPointContainer: 3 EnumConnectionPoints, 4 FindConnectionPoint.
' IEnumConnectionPoints: 3 Next.  IConnectionPoint: 3 GetConnectionInterface,
' 4 GetConnectionPointContainer, 5 Advise, 6 Unadvise.

Private Declare Function DispCallFunc Lib "oleaut32.dll" (ByVal pvInstance As Long, ByVal oVft As Long, ByVal cc As Long, ByVal vtReturn As Integer, ByVal cActuals As Long, prgvt As Integer, prgpvarg As Long, pvargResult As Variant) As Long
Private Declare Function IIDFromString Lib "ole32.dll" (ByVal lpsz As Long, lpiid As Any) As Long

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

' Calls slot Slot of the COM object pObj with up to four 32-bit arguments; returns its HRESULT.
Function CallSlot(ByVal pObj As Long, ByVal Slot As Long, ByVal nArgs As Long, ByVal a0 As Long, ByVal a1 As Long, ByVal a2 As Long, ByVal a3 As Long) As Long
    Dim vals(0 To 3) As Variant
    Dim vts(0 To 3) As Integer
    Dim ptrs(0 To 3) As Long
    Dim vRet As Variant
    Dim hr As Long
    Dim i As Long
    vals(0) = a0: vals(1) = a1: vals(2) = a2: vals(3) = a3
    For i = 0 To 3
        vts(i) = VT_I4
        ptrs(i) = VarPtr(vals(i))
    Next
    vRet = CLng(0)
    hr = DispCallFunc(pObj, Slot * 4, CC_STDCALL, VT_I4, nArgs, vts(0), ptrs(0), vRet)
    If hr <> 0 Then
        CallSlot = hr
    Else
        CallSlot = CLng(vRet)
    End If
End Function

Sub Report(ByVal What As String, ByVal hr As Long)
    Note What & ": error=" & Hex$(hr)
End Sub

Sub Note(ByVal Text As String)
    Print #9, Text
    ' Close and reopen so every line is on disk even if the next call crashes the exe.
    Close #9
    Open App.Path & "\out.txt" For Append As #9
End Sub

Sub Cases()
    Dim src As New Source
    Dim sink As New NotASink
    Dim iidContainer(0 To 15) As Byte
    Dim pContainer As Long, pEnum As Long, pPoint As Long, fetched As Long
    Dim cookie As Long
    Dim hr As Long

    IIDFromString StrPtr("{B196B284-BAB4-101A-B69C-00AA00341D07}"), iidContainer(0)
    hr = CallSlot(ObjPtr(src), 0, 2, VarPtr(iidContainer(0)), VarPtr(pContainer), 0, 0)
    Report "QueryInterface IConnectionPointContainer", hr
    If hr <> 0 Then Exit Sub

    hr = CallSlot(pContainer, 3, 1, VarPtr(pEnum), 0, 0, 0)
    Report "EnumConnectionPoints", hr
    If hr <> 0 Then Exit Sub

    hr = CallSlot(pEnum, 3, 3, 1, VarPtr(pPoint), VarPtr(fetched), 0)
    Report "Next (fetched=" & fetched & ")", hr
    If hr <> 0 Or pPoint = 0 Then Exit Sub

    cookie = -1
    hr = CallSlot(pPoint, 5, 2, ObjPtr(sink), VarPtr(cookie), 0, 0)
    Report "Advise, a sink without the outgoing interface", hr
    Print #9, "  cookie=" & cookie

    hr = CallSlot(pPoint, 6, 1, 99, 0, 0, 0)
    Report "Unadvise 99", hr
    ' Unadvise 0 ends the VB6 exe on the spot, so it is last and flagged first.
    Note "before Unadvise 0"
    hr = CallSlot(pPoint, 6, 1, 0, 0, 0, 0)
    Report "Unadvise 0", hr

    CallSlot pPoint, 2, 0, 0, 0, 0, 0
    CallSlot pEnum, 2, 0, 0, 0, 0, 0
    CallSlot pContainer, 2, 0, 0, 0, 0, 0
End Sub
