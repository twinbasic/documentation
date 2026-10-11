Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of latebound-hresult-mapping: the error number VB6 raises when a
' late-bound call fails. Build and run it with:
'     node scripts/bug_repro.mjs vb6 latebound-hresult-mapping
' A lightweight COM object whose IDispatch::Invoke returns a chosen HRESULT: the
' name Cn fails with code n of the table in InitCodes.
' Memory block gObj: element 0 = pointer to the vtable, element 1 = reference count.

Private Declare Sub CopyMemory Lib "kernel32.dll" Alias "RtlMoveMemory" (Destination As Any, Source As Any, ByVal Length As Long)
Private Declare Function lstrlenW Lib "kernel32.dll" (ByVal lpString As Long) As Long
Private Declare Function SysAllocString Lib "oleaut32.dll" (ByVal psz As Long) As Long

Private Const NCODES As Long = 24
Private gVtbl(0 To 6) As Long
Private gObj(0 To 1) As Long
Private gCodes(1 To NCODES) As Long
Private gNames(1 To NCODES) As String
Private gCalls(0 To NCODES) As Long
Private gFlags(0 To NCODES) As Long
Private gArgs(0 To NCODES) As Long
Private gHasExc(0 To NCODES) As Long
Private gGetIds As Long

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

Private Sub SetCode(ByVal n As Long, ByVal code As Long, ByVal nm As String)
    gCodes(n) = code
    gNames(n) = nm
End Sub

Private Sub InitCodes()
    SetCode 1, &H80004001, "E_NOTIMPL"
    SetCode 2, &H8007000E, "E_OUTOFMEMORY"
    SetCode 3, &H80070057, "E_INVALIDARG"
    SetCode 4, &H8002000E, "DISP_E_BADPARAMCOUNT"
    SetCode 5, &H8002000F, "DISP_E_PARAMNOTOPTIONAL"
    SetCode 6, &H8002000A, "DISP_E_OVERFLOW"
    SetCode 7, &H80020005, "DISP_E_TYPEMISMATCH"
    SetCode 8, &H8002000B, "DISP_E_BADINDEX"
    SetCode 9, &H80020012, "DISP_E_DIVBYZERO"
    SetCode 10, &H80020007, "DISP_E_NONAMEDARGS"
    SetCode 11, &H80020008, "DISP_E_BADVARTYPE"
    SetCode 12, &H80020004, "DISP_E_PARAMNOTFOUND"
    SetCode 13, &H8002000D, "DISP_E_ARRAYISLOCKED"
    SetCode 14, &H80004002, "E_NOINTERFACE"
    SetCode 15, &H80070005, "E_ACCESSDENIED"
    SetCode 16, &H80004003, "E_POINTER"
    SetCode 17, &H80004004, "E_ABORT"
    SetCode 18, &H80004005, "E_FAIL"
    SetCode 19, &H8000FFFF, "E_UNEXPECTED"
    SetCode 20, &H80020003, "DISP_E_MEMBERNOTFOUND"
    SetCode 21, &H800A01A8, "800A01A8"
    SetCode 22, &H8007000D, "HRESULT_FROM_WIN32(ERROR_INVALID_DATA) 8007000D"
    SetCode 23, &H80020009, "DISP_E_EXCEPTION (excepinfo scode 80041234, wCode 0, description given)"
    SetCode 24, &H80020009, "DISP_E_EXCEPTION (excepinfo scode 0, wCode 1234, description given)"
End Sub

Private Function Fn(ByVal p As Long) As Long
    Fn = p
End Function

Private Sub InitObject()
    gVtbl(0) = Fn(AddressOf Obj_QueryInterface)
    gVtbl(1) = Fn(AddressOf Obj_AddRef)
    gVtbl(2) = Fn(AddressOf Obj_Release)
    gVtbl(3) = Fn(AddressOf Obj_GetTypeInfoCount)
    gVtbl(4) = Fn(AddressOf Obj_GetTypeInfo)
    gVtbl(5) = Fn(AddressOf Obj_GetIDsOfNames)
    gVtbl(6) = Fn(AddressOf Obj_Invoke)
    gObj(0) = VarPtr(gVtbl(0))
    gObj(1) = 1
End Sub

Public Function Obj_QueryInterface(ByVal pThis As Long, ByVal riid As Long, ByVal ppv As Long) As Long
    Dim d1 As Long, d2 As Integer, d3 As Integer, b(0 To 7) As Byte
    Dim isUnk As Boolean, isDisp As Boolean
    If riid = 0 Or ppv = 0 Then
        Obj_QueryInterface = &H80004003
        Exit Function
    End If
    CopyMemory d1, ByVal riid, 4
    CopyMemory d2, ByVal (riid + 4), 2
    CopyMemory d3, ByVal (riid + 6), 2
    CopyMemory b(0), ByVal (riid + 8), 8
    isUnk = (d1 = 0 And d2 = 0 And d3 = 0 And b(0) = &HC0 And b(7) = &H46 And b(1) = 0 And b(6) = 0)
    isDisp = (d1 = &H20400 And d2 = 0 And d3 = 0 And b(0) = &HC0 And b(7) = &H46 And b(1) = 0 And b(6) = 0)
    If isUnk Or isDisp Then
        gObj(1) = gObj(1) + 1
        CopyMemory ByVal ppv, pThis, 4
        Obj_QueryInterface = 0
    Else
        CopyMemory ByVal ppv, 0&, 4
        Obj_QueryInterface = &H80004002
    End If
End Function

Public Function Obj_AddRef(ByVal pThis As Long) As Long
    gObj(1) = gObj(1) + 1
    Obj_AddRef = gObj(1)
End Function

Public Function Obj_Release(ByVal pThis As Long) As Long
    gObj(1) = gObj(1) - 1
    Obj_Release = gObj(1)
End Function

Public Function Obj_GetTypeInfoCount(ByVal pThis As Long, ByVal pctinfo As Long) As Long
    If pctinfo <> 0 Then CopyMemory ByVal pctinfo, 0&, 4
    Obj_GetTypeInfoCount = 0
End Function

Public Function Obj_GetTypeInfo(ByVal pThis As Long, ByVal iTInfo As Long, ByVal lcid As Long, ByVal ppTInfo As Long) As Long
    Obj_GetTypeInfo = &H80004001
End Function

Public Function Obj_GetIDsOfNames(ByVal pThis As Long, ByVal riid As Long, ByVal rgszNames As Long, ByVal cNames As Long, ByVal lcid As Long, ByVal rgDispId As Long) As Long
    Dim pName As Long, n As Long, s As String, num As Long
    gGetIds = gGetIds + 1
    CopyMemory pName, ByVal rgszNames, 4
    n = lstrlenW(pName)
    s = String$(n, vbNullChar)
    If n > 0 Then CopyMemory ByVal StrPtr(s), ByVal pName, n * 2
    If UCase$(Left$(s, 1)) = "C" And IsNumeric(Mid$(s, 2)) Then
        num = CLng(Mid$(s, 2))
        CopyMemory ByVal rgDispId, num, 4
        Obj_GetIDsOfNames = 0
    Else
        num = -1
        CopyMemory ByVal rgDispId, num, 4
        Obj_GetIDsOfNames = &H80020006
    End If
End Function

Public Function Obj_Invoke(ByVal pThis As Long, ByVal dispIdMember As Long, ByVal riid As Long, ByVal lcid As Long, ByVal wFlags As Long, ByVal pDispParams As Long, ByVal pVarResult As Long, ByVal pExcepInfo As Long, ByVal puArgErr As Long) As Long
    Dim cArgs As Long, bstr As Long, sc As Long, wc As Integer
    If dispIdMember >= 1 And dispIdMember <= NCODES Then
        gCalls(dispIdMember) = gCalls(dispIdMember) + 1
        gFlags(dispIdMember) = wFlags And &HFFFF&
        If pDispParams <> 0 Then CopyMemory cArgs, ByVal (pDispParams + 8), 4
        gArgs(dispIdMember) = cArgs
        gHasExc(dispIdMember) = IIf(pExcepInfo <> 0, 1, 0)
        If gCodes(dispIdMember) = &H80020009 And pExcepInfo <> 0 Then
            If dispIdMember = 23 Then
                wc = 0: sc = &H80041234
            Else
                wc = 1234: sc = 0
            End If
            ' the caller need not have zeroed it: fill all 32 bytes
            Dim z(0 To 31) As Byte
            CopyMemory ByVal pExcepInfo, z(0), 32
            CopyMemory ByVal pExcepInfo, wc, 2
            bstr = SysAllocString(StrPtr("Source from excepinfo"))
            CopyMemory ByVal (pExcepInfo + 4), bstr, 4
            bstr = SysAllocString(StrPtr("Description from excepinfo"))
            CopyMemory ByVal (pExcepInfo + 8), bstr, 4
            CopyMemory ByVal (pExcepInfo + 28), sc, 4
        End If
        Obj_Invoke = gCodes(dispIdMember)
    Else
        Obj_Invoke = &H80020003
    End If
End Function

Private Sub Rec(ByVal n As Long, ByVal way As String, ByVal callsBefore As Long)
    Dim num As Long, desc As String, src As String
    num = Err.Number: desc = Err.Description: src = Err.Source
    Print #9, gNames(n) & " (" & Hex$(gCodes(n)) & ") " & way & " -> " & num & " [" & desc & "] invokeCalls=" & (gCalls(n) - callsBefore)
    Err.Clear
End Sub

Private Sub Show(ByVal what As String)
    Print #9, what & " -> " & Err.Number & " [" & Err.Description & "]"
    Err.Clear
End Sub

Sub Cases()
    Dim o As Object, p As Long, n As Long, before As Long
    InitCodes
    InitObject
    p = VarPtr(gObj(0))
    gObj(1) = gObj(1) + 1
    CopyMemory o, p, 4
    Print #9, "object ptr ok: " & (Not (o Is Nothing))

    For n = 1 To NCODES
        On Error Resume Next
        Err.Clear
        before = gCalls(n)
        Select Case n
            Case 1: o.C1
            Case 2: o.C2
            Case 3: o.C3
            Case 4: o.C4
            Case 5: o.C5
            Case 6: o.C6
            Case 7: o.C7
            Case 8: o.C8
            Case 9: o.C9
            Case 10: o.C10
            Case 11: o.C11
            Case 12: o.C12
            Case 13: o.C13
            Case 14: o.C14
            Case 15: o.C15
            Case 16: o.C16
            Case 17: o.C17
            Case 18: o.C18
            Case 19: o.C19
            Case 20: o.C20
            Case 21: o.C21
            Case 22: o.C22
            Case 23: o.C23
            Case 24: o.C24
        End Select
        Rec n, "statement", before
        On Error GoTo 0
    Next

    CopyMemory o, 0&, 4

    ' Ordinary objects: a name they do not have, and a wrong number of arguments.
    Dim w As Object, c As Object, x As Variant
    Set w = New Widget
    Set c = New Collection
    On Error Resume Next
    w.Nope
    Show "Widget.Nope"
    c.Nope
    Show "Collection.Nope"
    CallByName w, "Nope", VbMethod
    Show "CallByName Widget, Nope"
    x = c.Item(1, 2)
    Show "x = Collection.Item(1, 2)"
    On Error GoTo 0
End Sub
