Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does where the twinBASIC side of the report calls a Private method by its dispid.
' Widget has PubFn (returns 1), a Private PrivFn (2), a Friend FrFn (3) and PubFn2 (4), in that
' order. Each dispid from &H60030000 is invoked as a method through IDispatch::Invoke, which
' DispCallFunc calls at its place in the vtable, and the HRESULT and the result are written.
' Build and run it with:  node scripts/bug_repro.mjs vb6 private-member-by-dispid

Private Declare Function DispCallFunc Lib "oleaut32" (ByVal pvInstance As Long, ByVal oVft As Long, _
    ByVal cc As Long, ByVal vtReturn As Integer, ByVal cActuals As Long, prgvt As Integer, _
    prgpvarg As Long, pvargResult As Variant) As Long

Private Type DISPPARAMS
    rgvarg As Long
    rgdispidNamedArgs As Long
    cArgs As Long
    cNamedArgs As Long
End Type

Private Type GUIDT
    Data(15) As Byte
End Type

Private Const CC_STDCALL As Long = 4
Private Const INVOKE_SLOT As Long = 24  ' IDispatch::Invoke, the seventh entry of the vtable

Private Function Invoke(ByVal O As Object, ByVal DispId As Long, Result As Variant) As Long
    Dim Iid As GUIDT
    Dim Params As DISPPARAMS
    Dim Excep(15) As Long
    Dim ArgErr As Long
    Dim Types(7) As Integer
    Dim Args(7) As Variant
    Dim Ptrs(7) As Long
    Dim HR As Variant
    Dim I As Long
    Args(0) = DispId
    Args(1) = VarPtr(Iid)
    Args(2) = CLng(0)
    Args(3) = CInt(1)  ' DISPATCH_METHOD
    Args(4) = VarPtr(Params)
    Args(5) = VarPtr(Result)
    Args(6) = VarPtr(Excep(0))
    Args(7) = VarPtr(ArgErr)
    For I = 0 To 7
        Types(I) = VarType(Args(I))
        Ptrs(I) = VarPtr(Args(I))
    Next
    DispCallFunc ObjPtr(O), INVOKE_SLOT, CC_STDCALL, vbLong, 8, Types(0), Ptrs(0), HR
    Invoke = HR
End Function

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim W As Object
    Set W = New Widget
    Dim I As Long
    Dim R As Variant
    Dim HR As Long
    For I = 0 To 5
        R = Empty
        HR = Invoke(W, &H60030000 + I, R)
        Print #9, "dispid &H" & Hex(&H60030000 + I) & ": hr &H" & Hex(HR) & " result " & R
    Next
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
