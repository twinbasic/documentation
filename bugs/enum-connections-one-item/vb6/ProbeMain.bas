Attribute VB_Name = "ProbeMain"
Option Explicit

' The VB6 counterpart of bugs/enum-connections-one-item and bugs/enum-connection-points-contract.
' VB6 cannot declare IConnectionPointContainer, IEnumConnectionPoints, IConnectionPoint or
' IEnumConnections, so each call goes through the vtable with DispCallFunc on raw pointers.
' Vtable slots: IUnknown 0..2; IConnectionPointContainer.EnumConnectionPoints 3;
' IEnumConnectionPoints / IEnumConnections Next 3, Skip 4, Reset 5, Clone 6;
' IConnectionPoint.EnumConnections 7. Output goes to out.txt beside the exe.

Private Declare Function DispCallFunc Lib "oleaut32" (ByVal pvInstance As Long, ByVal oVft As Long, ByVal cc As Long, ByVal vtReturn As Integer, ByVal cActuals As Long, prgvt As Integer, prgpvarg As Long, pvargResult As Variant) As Long
Private Declare Function IIDFromString Lib "ole32" (ByVal lpsz As Long, lpiid As GUID) As Long

Private Type GUID
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type

Private Type CONNECTDATA
    pUnk As Long
    dwCookie As Long
End Type

Private Const CC_STDCALL As Long = 4
Private Const VT_I4 As Integer = 3

Private Items(0 To 3) As CONNECTDATA
Private Points(0 To 3) As Long

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Run
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Private Sub Emit(ByVal s As String)
    Print #9, s
End Sub

Private Function H(ByVal v As Long) As String
    H = Right$("00000000" & Hex$(v), 8)
End Function

' Calls vtable slot Slot of the object at pObj with up to four Long arguments; returns the HRESULT.
Private Function VCall(ByVal pObj As Long, ByVal Slot As Long, ParamArray A() As Variant) As Long
    Dim n As Long, i As Long
    Dim vars(0 To 3) As Variant
    Dim vts(0 To 3) As Integer
    Dim ptrs(0 To 3) As Long
    Dim res As Variant
    Dim rc As Long
    n = UBound(A) + 1
    For i = 0 To n - 1
        vars(i) = CLng(A(i))
        vts(i) = VT_I4
        ptrs(i) = VarPtr(vars(i))
    Next i
    res = Empty
    rc = DispCallFunc(pObj, Slot * 4, CC_STDCALL, VT_I4, n, vts(0), ptrs(0), res)
    If rc <> 0 Then
        VCall = rc
    Else
        VCall = CLng(res)
    End If
End Function

Private Sub ReleasePtr(ByVal p As Long)
    If p <> 0 Then VCall p, 2
End Sub

Private Sub Run()
    Dim src As Source
    Dim a As Holder, b As Holder
    Dim iid As GUID
    Dim pCPC As Long, pEnumPts As Long, pPoint As Long
    Dim hr As Long

    Set src = New Source
    Set a = New Holder
    Set b = New Holder
    a.Attach src
    b.Attach src

    hr = IIDFromString(StrPtr("{B196B284-BAB4-101A-B69C-00AA00341D07}"), iid)
    Emit "IIDFromString: hr=" & H(hr)
    hr = VCall(ObjPtr(src), 0, VarPtr(iid), VarPtr(pCPC))
    Emit "QueryInterface(IConnectionPointContainer): hr=" & H(hr) & " ptr<>0: " & (pCPC <> 0)
    If pCPC = 0 Then Exit Sub

    ' --- IEnumConnectionPoints: the sequence of enum-connection-points-contract ---
    hr = VCall(pCPC, 3, VarPtr(pEnumPts))
    Emit "EnumConnectionPoints: hr=" & H(hr)
    If pEnumPts = 0 Then Exit Sub
    PointsNext pEnumPts, 1, "Next 1, one point"
    PointsNext pEnumPts, 1, "Next 1, at the end"
    Emit "Reset: hr=" & H(VCall(pEnumPts, 5))
    PointsNext pEnumPts, 2, "Next 2, one point"
    Emit "Reset: hr=" & H(VCall(pEnumPts, 5))
    Emit "Skip 1: hr=" & H(VCall(pEnumPts, 4, 1))
    Dim pCopy As Long
    hr = VCall(pEnumPts, 6, VarPtr(pCopy))
    Emit "Clone: hr=" & H(hr) & " ptr<>0: " & (pCopy <> 0)
    ReleasePtr pCopy
    ReleasePtr pEnumPts

    ' --- IEnumConnections: the sequence of enum-connections-one-item ---
    hr = VCall(pCPC, 3, VarPtr(pEnumPts))
    Emit "EnumConnectionPoints (again): hr=" & H(hr)
    PointsNext pEnumPts, 1, "Next 1, one point (to get the point)"
    pPoint = Points(0)
    Points(0) = 0
    ReleasePtr pEnumPts
    If pPoint = 0 Then Exit Sub

    Dim pEnum As Long, pClone As Long

    pEnum = NewConnEnum(pPoint)
    ConnNext pEnum, 2, "Next 2, two connections"
    ConnNext pEnum, 1, "Next 1, after Next 2 took both"
    ReleasePtr pEnum

    pEnum = NewConnEnum(pPoint)
    ConnNext pEnum, 3, "Next 3, two connections"
    ReleasePtr pEnum

    pEnum = NewConnEnum(pPoint)
    ConnNext pEnum, 1, "Next 1, first"
    ConnNext pEnum, 1, "Next 1, second"
    ConnNext pEnum, 1, "Next 1, at the end"
    Emit "Reset: hr=" & H(VCall(pEnum, 5))
    ConnNext pEnum, 2, "Next 2, after Reset"
    ReleasePtr pEnum

    pEnum = NewConnEnum(pPoint)
    Emit "Skip 1: hr=" & H(VCall(pEnum, 4, 1))
    ConnNext pEnum, 1, "Next 1, after Skip 1"
    ReleasePtr pEnum

    pEnum = NewConnEnum(pPoint)
    ConnNext pEnum, 1, "Next 1, before Clone"
    pClone = 0
    hr = VCall(pEnum, 6, VarPtr(pClone))
    Emit "Clone: hr=" & H(hr) & " ptr<>0: " & (pClone <> 0)
    If pClone <> 0 Then ConnNext pClone, 2, "Next 2 on the clone, one left"
    ReleasePtr pClone
    ReleasePtr pEnum

    pEnum = NewConnEnum(pPoint)
    ClearItems
    hr = VCall(pEnum, 3, 1, VarPtr(Items(0)), 0)
    Emit "Next 1 with null pcFetched: hr=" & H(hr) & " cookie=" & Items(0).dwCookie
    ReleaseItems
    ReleasePtr pEnum

    ReleasePtr pPoint
    ReleasePtr pCPC
End Sub

Private Sub PointsNext(ByVal pEnumPts As Long, ByVal Count As Long, ByVal Label As String)
    Dim i As Long, hr As Long, fetched As Long
    For i = 0 To 3
        Points(i) = 0
    Next i
    fetched = -1
    hr = VCall(pEnumPts, 3, Count, VarPtr(Points(0)), VarPtr(fetched))
    Emit Label & ": hr=" & H(hr) & " fetched=" & fetched
    ' Points(0) stays set for the caller that wants the point; release every other pointer.
    Dim keep As Long
    If InStr(Label, "to get the point") > 0 Then keep = 1 Else keep = 0
    For i = keep To 3
        ReleasePtr Points(i)
        Points(i) = 0
    Next i
End Sub

Private Function NewConnEnum(ByVal pPoint As Long) As Long
    Dim hr As Long, p As Long
    hr = VCall(pPoint, 7, VarPtr(p))
    If hr <> 0 Then Emit "EnumConnections: hr=" & H(hr)
    NewConnEnum = p
End Function

Private Sub ClearItems()
    Dim i As Long
    For i = 0 To 3
        Items(i).pUnk = 0
        Items(i).dwCookie = 0
    Next i
End Sub

Private Sub ReleaseItems()
    Dim i As Long
    For i = 0 To 3
        ReleasePtr Items(i).pUnk
        Items(i).pUnk = 0
    Next i
End Sub

Private Sub ConnNext(ByVal pEnum As Long, ByVal Count As Long, ByVal Label As String)
    Dim hr As Long, fetched As Long, i As Long, s As String
    ClearItems
    fetched = -1
    hr = VCall(pEnum, 3, Count, VarPtr(Items(0)), VarPtr(fetched))
    s = ""
    For i = 0 To Count - 1
        s = s & " " & Items(i).dwCookie
    Next i
    Emit Label & ": hr=" & H(hr) & " fetched=" & fetched & ", cookies" & s
    ReleaseItems
End Sub
