Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/vbacastobj-no-type-mismatch: the cases of src/Sources/RegressionTests.twin,
' in the same order, each calling the VB6 runtime's own __vbaCastObj and printing the error
' it raises (0: none) and whether it returned an interface. Build and run it with:
'     node scripts/bug_repro.mjs vb6 vbacastobj-no-type-mismatch

Private Type InterfaceGuid
    Data1 As Long
    Data2 As Integer
    Data3 As Integer
    Data4(0 To 7) As Byte
End Type

Private Declare Function vbaCastObj Lib "msvbvm60" Alias "__vbaCastObj" (ByVal Obj As Long, ByVal pIid As Long) As Long
Private Declare Function vbaObjSet Lib "msvbvm60" Alias "__vbaObjSet" (ByRef Dst As Any, ByVal Src As Long) As Long

Private Iid As InterfaceGuid

Private Function StdIid(ByVal Data1 As Long) As Long
    Iid.Data1 = Data1
    Iid.Data4(0) = &HC0
    Iid.Data4(7) = &H46
    StdIid = VarPtr(Iid)
End Function

' Calls __vbaCastObj and prints the error and the result; an interface returned is released.
Private Sub Try(ByVal Name As String, ByVal Obj As Long, ByVal pIid As Long)
    Dim P As Long, E As Long, U As Object
    On Error Resume Next
    P = vbaCastObj(Obj, pIid)
    E = Err.Number
    On Error GoTo 0
    Print #9, Name & ": " & E & " " & IIf(P = 0, "Nothing", "an interface")
    If P <> 0 Then vbaObjSet U, P
End Sub

Sub Main()
    Dim C As New Collection, S As String
    Open App.Path & "\out.txt" For Output As #9
    C.Add 1
    Try "Control_IUnknown_ReturnsTheInterface", ObjPtr(C), StdIid(0)
    Try "Control_IDispatch_ReturnsTheInterface", ObjPtr(C), StdIid(&H20400)
    Try "Control_Nothing_ReturnsNothing", 0, StdIid(0)
    Try "InterfaceItLacks_Raises13", ObjPtr(C), StdIid(&H12345)
    S = "{00000000-0000-0000-C000-000000000046}"
    Try "StringGivenAsTheInterfaceId_Raises13", ObjPtr(C), StrPtr(S)
    Close #9
End Sub
