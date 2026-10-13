Attribute VB_Name = "Module1"
Option Explicit

' IUnknown::QueryInterface (slot 0 of an object's vtable), asked for an interface that the
' object does not have, called with DispCallFunc on the vtable. The output is preset to 12345,
' so that a call which leaves it alone shows. The twinBASIC side is in src/.
' Build and run it with:  node scripts/bug_repro.mjs vb6 queryinterface-leaves-out-pointer

Private Declare Function DispCallFunc Lib "oleaut32.dll" (ByVal pvInstance As Long, ByVal oVft As Long, ByVal cc As Long, ByVal vtReturn As Integer, ByVal cActuals As Long, prgvt As Integer, prgpvarg As Long, pvargResult As Variant) As Long

Private Const CC_STDCALL As Long = 4
Private Const VT_I4 As Integer = 3
Private Const SENTINEL As Long = 12345

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Ask "Class (Source.cls)", New Source
    Ask "Collection", New Collection
    Ask "Err", Err
    Ask "Scripting.Dictionary", CreateObject("Scripting.Dictionary")
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Private Sub Ask(ByVal Label As String, ByVal Obj As Object)
    Dim missing(0 To 15) As Byte        ' {00012345-0000-0000-0000-000000000000}: no object here has it
    Dim iidUnknown(0 To 15) As Byte     ' {00000000-0000-0000-C000-000000000046}
    Dim iidDispatch(0 To 15) As Byte    ' {00020400-0000-0000-C000-000000000046}
    Dim p As Long
    Dim hr As Long
    Dim s As String

    missing(0) = &H45: missing(1) = &H23: missing(2) = &H1
    iidUnknown(8) = &HC0: iidUnknown(15) = &H46
    iidDispatch(1) = &H4: iidDispatch(2) = &H2: iidDispatch(8) = &HC0: iidDispatch(15) = &H46

    p = SENTINEL
    hr = QueryInterface(ObjPtr(Obj), VarPtr(missing(0)), p)     ' the pointer of the Object variable
    s = Label & ": missing interface: hr=" & Hex$(hr) & " out=" & CStr(p)

    p = SENTINEL
    hr = QueryInterface(ObjPtr(Obj), VarPtr(iidUnknown(0)), p)
    s = s & "; IUnknown: hr=" & Hex$(hr) & " out is a pointer=" & CStr(p <> SENTINEL And p <> 0)
    GiveBack p

    p = SENTINEL
    hr = QueryInterface(ObjPtr(Obj), VarPtr(iidDispatch(0)), p)
    s = s & "; IDispatch: hr=" & Hex$(hr) & " out is a pointer=" & CStr(p <> SENTINEL And p <> 0)
    GiveBack p

    Print #9, s
End Sub

' Slot 0 of the vtable of pObj, called with DispCallFunc; returns its HRESULT.
Private Function QueryInterface(ByVal pObj As Long, ByVal pIid As Long, ByRef pOut As Long) As Long
    Dim vals(0 To 1) As Variant
    Dim vts(0 To 1) As Integer
    Dim ptrs(0 To 1) As Long
    Dim vRet As Variant
    Dim hr As Long

    vals(0) = pIid
    vals(1) = VarPtr(pOut)
    vts(0) = VT_I4: vts(1) = VT_I4
    ptrs(0) = VarPtr(vals(0)): ptrs(1) = VarPtr(vals(1))
    vRet = CLng(0)
    hr = DispCallFunc(pObj, 0, CC_STDCALL, VT_I4, 2, vts(0), ptrs(0), vRet)
    If hr <> 0 Then
        QueryInterface = hr
    Else
        QueryInterface = CLng(vRet)
    End If
End Function

' Releases the reference that a successful QueryInterface added: slot 2.
Private Sub GiveBack(ByVal p As Long)
    Dim vts(0 To 0) As Integer
    Dim ptrs(0 To 0) As Long
    Dim vRet As Variant

    If p = 0 Or p = SENTINEL Then Exit Sub
    vRet = CLng(0)
    DispCallFunc p, 2 * 4, CC_STDCALL, VT_I4, 0, vts(0), ptrs(0), vRet
End Sub
