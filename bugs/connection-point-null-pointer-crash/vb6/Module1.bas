Attribute VB_Name = "Module1"
Option Explicit

' VB6 cannot call IConnectionPoint directly, so the vtable is called with DispCallFunc.
' IUnknown: 0 QueryInterface, 1 AddRef, 2 Release.
' IConnectionPointContainer: 3 EnumConnectionPoints, 4 FindConnectionPoint.
' IEnumConnectionPoints: 3 Next.  IConnectionPoint: 3 GetConnectionInterface,
' 4 GetConnectionPointContainer, 5 Advise, 6 Unadvise.
' The case to run comes from the environment variable CASE (1 to 8), and is 2 when
' it is not set: 1, 3 and 4 are controls, and 2 and 5 to 8 pass a null pointer.
' Build and run it with: node scripts/bug_repro.mjs vb6 connection-point-null-pointer-crash

Private Declare Function DispCallFunc Lib "oleaut32.dll" (ByVal pvInstance As Long, ByVal oVft As Long, ByVal cc As Long, ByVal vtReturn As Integer, ByVal cActuals As Long, prgvt As Integer, prgpvarg As Long, pvargResult As Variant) As Long
Private Declare Function IIDFromString Lib "ole32.dll" (ByVal lpsz As Long, lpiid As Any) As Long
Private Declare Function StringFromGUID2 Lib "ole32.dll" (rguid As Any, ByVal lpsz As Long, ByVal cchMax As Long) As Long
Private Declare Sub CopyMemory Lib "kernel32.dll" Alias "RtlMoveMemory" (Destination As Any, Source As Any, ByVal Length As Long)

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

Function GuidText(buf() As Byte) As String
    Dim s As String
    Dim n As Long
    s = String$(80, vbNullChar)
    n = StringFromGUID2(buf(0), StrPtr(s), 80)
    If n > 1 Then GuidText = Left$(s, n - 1) Else GuidText = "(StringFromGUID2 failed)"
End Function

Sub Cases()
    Dim src As New Source
    Dim iidContainer(0 To 15) As Byte
    Dim iidOut(0 To 15) As Byte
    Dim iidNull(0 To 15) As Byte
    Dim iidSentinel(0 To 15) As Byte
    Dim pContainer As Long, pEnum As Long, pPoint As Long, fetched As Long
    Dim pOut As Long
    Dim hr As Long
    Dim which As String
    Dim i As Long

    which = Environ$("CASE")
    If which = "" Then which = "2"
    Print #9, "case=" & which

    IIDFromString StrPtr("{B196B284-BAB4-101A-B69C-00AA00341D07}"), iidContainer(0)
    hr = CallSlot(ObjPtr(src), 0, 2, VarPtr(iidContainer(0)), VarPtr(pContainer), 0, 0)
    Print #9, "QueryInterface IConnectionPointContainer: hr=" & Hex$(hr)
    If hr <> 0 Then Exit Sub

    hr = CallSlot(pContainer, 3, 1, VarPtr(pEnum), 0, 0, 0)
    Print #9, "EnumConnectionPoints: hr=" & Hex$(hr)
    If hr <> 0 Then Exit Sub

    hr = CallSlot(pEnum, 3, 3, 1, VarPtr(pPoint), VarPtr(fetched), 0)
    Print #9, "Next: hr=" & Hex$(hr) & " fetched=" & fetched
    If hr <> 0 Or pPoint = 0 Then Exit Sub

    ' Preliminary, a valid GetConnectionInterface: gives the IID the other cases need.
    For i = 0 To 15: iidSentinel(i) = &HAA: iidOut(i) = &HAA: Next
    hr = CallSlot(pPoint, 3, 1, VarPtr(iidOut(0)), 0, 0, 0)

    Select Case which
    Case "1"
        Print #9, "GetConnectionInterface(valid buffer): hr=" & Hex$(hr) & " iid=" & GuidText(iidOut) & " (buffer started as AA bytes)"

    Case "2"
        Print #9, "valid GetConnectionInterface first: hr=" & Hex$(hr) & " iid=" & GuidText(iidOut)
        Print #9, "before GetConnectionInterface(NULL)"
        Close #9
        hr = CallSlot(pPoint, 3, 1, 0, 0, 0, 0)
        Open App.Path & "\out.txt" For Append As #9
        Print #9, "after GetConnectionInterface(NULL): hr=" & Hex$(hr)

    Case "3"
        Print #9, "valid GetConnectionInterface first: hr=" & Hex$(hr) & " iid=" & GuidText(iidOut)
        pOut = 0
        hr = CallSlot(pContainer, 4, 2, VarPtr(iidOut(0)), VarPtr(pOut), 0, 0)
        Print #9, "FindConnectionPoint(right IID, valid out): hr=" & Hex$(hr) & " pointer nonzero=" & (pOut <> 0) & " same as enumerated=" & (pOut = pPoint)

    Case "4"
        pOut = 0
        hr = CallSlot(pContainer, 4, 2, VarPtr(iidNull(0)), VarPtr(pOut), 0, 0)
        Print #9, "FindConnectionPoint(GUID_NULL, valid out): hr=" & Hex$(hr) & " pointer nonzero=" & (pOut <> 0)

    Case "5"
        pOut = 0
        Print #9, "before FindConnectionPoint(NULL riid, valid out)"
        Close #9
        hr = CallSlot(pContainer, 4, 2, 0, VarPtr(pOut), 0, 0)
        Open App.Path & "\out.txt" For Append As #9
        Print #9, "after FindConnectionPoint(NULL riid, valid out): hr=" & Hex$(hr) & " pointer nonzero=" & (pOut <> 0)

    Case "6"
        Print #9, "valid GetConnectionInterface first: hr=" & Hex$(hr) & " iid=" & GuidText(iidOut)
        Print #9, "before FindConnectionPoint(right IID, NULL out)"
        Close #9
        hr = CallSlot(pContainer, 4, 2, VarPtr(iidOut(0)), 0, 0, 0)
        Open App.Path & "\out.txt" For Append As #9
        Print #9, "after FindConnectionPoint(right IID, NULL out): hr=" & Hex$(hr)

    Case "7"
        Print #9, "before GetConnectionPointContainer(NULL out)"
        Close #9
        hr = CallSlot(pPoint, 4, 1, 0, 0, 0, 0)
        Open App.Path & "\out.txt" For Append As #9
        Print #9, "after GetConnectionPointContainer(NULL out): hr=" & Hex$(hr)

    Case "8"
        Print #9, "before EnumConnectionPoints(NULL out)"
        Close #9
        hr = CallSlot(pContainer, 3, 1, 0, 0, 0, 0)
        Open App.Path & "\out.txt" For Append As #9
        Print #9, "after EnumConnectionPoints(NULL out): hr=" & Hex$(hr)

    Case Else
        Print #9, "unknown case"
    End Select

    CallSlot pPoint, 2, 0, 0, 0, 0, 0
    CallSlot pEnum, 2, 0, 0, 0, 0, 0
    CallSlot pContainer, 2, 0, 0, 0, 0, 0
End Sub
