Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/paramarray-variant-array: the cases of src/Sources/Cases.twin, each
' printed with what it gives in VB6, which is what the [TestCase]s of ParamArrayTests.twin assert.
' Build and run it with:  node scripts/bug_repro.mjs vb6 paramarray-variant-array

Private Type Holder
    v As Variant
End Type

Private mVariant As Variant

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Show "ArrayVariable_AssignedToByteArray", ArrayVariable_AssignedToByteArray()
    Show "VariantVariable_AssignedToByteArray", VariantVariable_AssignedToByteArray()
    Show "VariantVariable_AssignedToLongArray", VariantVariable_AssignedToLongArray()
    Show "VariantVariable_AssignedToStringArray", VariantVariable_AssignedToStringArray()
    Show "VariantVariable_AssignedToDoubleArray", VariantVariable_AssignedToDoubleArray()
    Show "VariantVariable_AssignedToVariantArray", VariantVariable_AssignedToVariantArray()
    Show "VariantVariable_Indexed", VariantVariable_Indexed()
    Show "VariantVariable_TwoDimensions_Indexed", VariantVariable_TwoDimensions_Indexed()
    Show "VariantVariable_WrittenThrough", VariantVariable_WrittenThrough()
    Show "VariantVariable_Bounds", VariantVariable_Bounds()
    Show "VariantVariable_IsArrayAndVarType", VariantVariable_IsArrayAndVarType()
    Show "VariantVariable_ForEach", VariantVariable_ForEach()
    Show "VariantVariable_Join", VariantVariable_Join()
    Show "VariantVariable_PassedOnByVal_Indexed", VariantVariable_PassedOnByVal_Indexed()
    Show "VariantVariable_ForwardedToParamArray_Indexed", VariantVariable_ForwardedToParamArray_Indexed()
    Show "VariantVariable_ParamArrayPassedWhole_Indexed", VariantVariable_ParamArrayPassedWhole_Indexed()
    Show "VariantVariable_UnpackedAsInIssue1660", VariantVariable_UnpackedAsInIssue1660()
    Show "ModuleLevelVariant_Indexed", ModuleLevelVariant_Indexed()
    Show "VariantArrayElement_Indexed", VariantArrayElement_Indexed()
    Show "UdtVariantField_Indexed", UdtVariantField_Indexed()
    Show "ByValParameter_Forwarded_Indexed", ByValParameter_Forwarded_Indexed()
    Show "ByRefParameter_Forwarded_Indexed", ByRefParameter_Forwarded_Indexed()
    Show "ClassMethod_EarlyBound_Indexed", ClassMethod_EarlyBound_Indexed()
    Show "ClassMethod_LateBound_Indexed", ClassMethod_LateBound_Indexed()
    Show "VariantInParentheses_Indexed", VariantInParentheses_Indexed()
    Show "CVarOfArray_Indexed", CVarOfArray_Indexed()
    Show "VariantFunctionResult_Indexed", VariantFunctionResult_Indexed()
    Show "VariantVariable_ThroughLocalVariant_Indexed", VariantVariable_ThroughLocalVariant_Indexed()
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Private Sub Show(ByVal name As String, ByVal result As String)
    Print #9, name & ": " & result
End Sub

' --- The cases: each passes an array to a ParamArray one way and does one thing with it ---------

Public Function ArrayVariable_AssignedToByteArray() As String
    Dim b() As Byte
    b = Abc()
    ArrayVariable_AssignedToByteArray = ToBytes(b)
End Function

Public Function VariantVariable_AssignedToByteArray() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_AssignedToByteArray = ToBytes(v)
End Function

Public Function VariantVariable_AssignedToLongArray() As String
    Dim a() As Long, v As Variant
    ReDim a(0 To 2)
    a(1) = 7
    v = a
    VariantVariable_AssignedToLongArray = ToLongs(v)
End Function

Public Function VariantVariable_AssignedToStringArray() As String
    Dim v As Variant
    v = Split("x,y,z", ",")
    VariantVariable_AssignedToStringArray = ToStrings(v)
End Function

Public Function VariantVariable_AssignedToDoubleArray() As String
    Dim a() As Double, v As Variant
    ReDim a(0 To 2)
    a(1) = 2.5
    v = a
    VariantVariable_AssignedToDoubleArray = ToDoubles(v)
End Function

Public Function VariantVariable_AssignedToVariantArray() As String
    Dim v As Variant
    v = Array("x", "y", "z")
    VariantVariable_AssignedToVariantArray = ToVariants(v)
End Function

Public Function VariantVariable_Indexed() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_Indexed = Second(v)
End Function

Public Function VariantVariable_TwoDimensions_Indexed() As String
    Dim a() As Long, v As Variant
    ReDim a(0 To 1, 0 To 2)
    a(1, 2) = 12
    v = a
    VariantVariable_TwoDimensions_Indexed = Cell12(v)
End Function

Public Function VariantVariable_WrittenThrough() As String
    Dim v As Variant, r As String
    v = Array(1, 2, 3)
    r = SetSecond(v)
    VariantVariable_WrittenThrough = r & "; the caller's element 1 is now " & v(1)
End Function

Public Function VariantVariable_Bounds() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_Bounds = Bounds(v)
End Function

Public Function VariantVariable_IsArrayAndVarType() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_IsArrayAndVarType = Kind(v)
End Function

Public Function VariantVariable_ForEach() As String
    Dim v As Variant
    v = Array(1, 2, 3)
    VariantVariable_ForEach = Sum(v)
End Function

Public Function VariantVariable_Join() As String
    Dim v As Variant
    v = Split("x,y,z", ",")
    VariantVariable_Join = Joined(v)
End Function

Public Function VariantVariable_PassedOnByVal_Indexed() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_PassedOnByVal_Indexed = PassOnByVal(v)
End Function

Public Function VariantVariable_ForwardedToParamArray_Indexed() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_ForwardedToParamArray_Indexed = ForwardElement(v)
End Function

Public Function VariantVariable_ParamArrayPassedWhole_Indexed() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_ParamArrayPassedWhole_Indexed = ForwardWhole(v)
End Function

' The function of #1660: a ParamArray passed whole, copied, and its element assigned to an array.
Public Function VariantVariable_UnpackedAsInIssue1660() As String
    Dim v As Variant
    v = Array(1, -2, 300, 20.3)
    VariantVariable_UnpackedAsInIssue1660 = Unpacked(v)
End Function

Public Function ModuleLevelVariant_Indexed() As String
    mVariant = Abc()
    ModuleLevelVariant_Indexed = Second(mVariant)
End Function

Public Function VariantArrayElement_Indexed() As String
    Dim va(0 To 0) As Variant
    va(0) = Abc()
    VariantArrayElement_Indexed = Second(va(0))
End Function

Public Function UdtVariantField_Indexed() As String
    Dim t As Holder
    t.v = Abc()
    UdtVariantField_Indexed = Second(t.v)
End Function

Public Function ByValParameter_Forwarded_Indexed() As String
    ByValParameter_Forwarded_Indexed = ViaByVal(Abc())
End Function

Public Function ByRefParameter_Forwarded_Indexed() As String
    Dim v As Variant
    v = Abc()
    ByRefParameter_Forwarded_Indexed = ViaByRef(v)
End Function

Public Function ClassMethod_EarlyBound_Indexed() As String
    Dim w As New Widget, v As Variant
    v = Abc()
    ClassMethod_EarlyBound_Indexed = w.Second(v)
End Function

Public Function ClassMethod_LateBound_Indexed() As String
    Dim o As Object, v As Variant
    Set o = New Widget
    v = Abc()
    ClassMethod_LateBound_Indexed = o.Second(v)
End Function

Public Function VariantInParentheses_Indexed() As String
    Dim v As Variant
    v = Abc()
    VariantInParentheses_Indexed = Second((v))
End Function

Public Function CVarOfArray_Indexed() As String
    Dim b() As Byte
    b = Abc()
    CVarOfArray_Indexed = Second(CVar(b))
End Function

Public Function VariantFunctionResult_Indexed() As String
    VariantFunctionResult_Indexed = Second(AbcVariant())
End Function

Public Function VariantVariable_ThroughLocalVariant_Indexed() As String
    Dim v As Variant
    v = Abc()
    VariantVariable_ThroughLocalVariant_Indexed = SecondThroughLocal(v)
End Function

' --- What each does with the element ------------------------------------------------------------

Private Function ToBytes(ParamArray p() As Variant) As String
    Dim a() As Byte
    On Error GoTo Failed
    a = p(0)
    ToBytes = UBound(a) & " " & a(1)
    Exit Function
Failed:
    ToBytes = "error " & Err.Number
End Function

Private Function ToLongs(ParamArray p() As Variant) As String
    Dim a() As Long
    On Error GoTo Failed
    a = p(0)
    ToLongs = UBound(a) & " " & a(1)
    Exit Function
Failed:
    ToLongs = "error " & Err.Number
End Function

Private Function ToStrings(ParamArray p() As Variant) As String
    Dim a() As String
    On Error GoTo Failed
    a = p(0)
    ToStrings = UBound(a) & " " & a(1)
    Exit Function
Failed:
    ToStrings = "error " & Err.Number
End Function

Private Function ToDoubles(ParamArray p() As Variant) As String
    Dim a() As Double
    On Error GoTo Failed
    a = p(0)
    ToDoubles = UBound(a) & " " & a(1)
    Exit Function
Failed:
    ToDoubles = "error " & Err.Number
End Function

Private Function ToVariants(ParamArray p() As Variant) As String
    Dim a() As Variant
    On Error GoTo Failed
    a = p(0)
    ToVariants = UBound(a) & " " & a(1)
    Exit Function
Failed:
    ToVariants = "error " & Err.Number
End Function

Private Function Second(ParamArray p() As Variant) As String
    On Error GoTo Failed
    Second = CStr(p(0)(1))
    Exit Function
Failed:
    Second = "error " & Err.Number
End Function

Private Function Cell12(ParamArray p() As Variant) As String
    On Error GoTo Failed
    Cell12 = CStr(p(0)(1, 2))
    Exit Function
Failed:
    Cell12 = "error " & Err.Number
End Function

Private Function SetSecond(ParamArray p() As Variant) As String
    On Error GoTo Failed
    p(0)(1) = 99
    SetSecond = "written"
    Exit Function
Failed:
    SetSecond = "error " & Err.Number
End Function

Private Function Bounds(ParamArray p() As Variant) As String
    On Error GoTo Failed
    Bounds = LBound(p(0)) & " to " & UBound(p(0))
    Exit Function
Failed:
    Bounds = "error " & Err.Number
End Function

Private Function Kind(ParamArray p() As Variant) As String
    On Error GoTo Failed
    Kind = IsArray(p(0)) & " " & VarType(p(0))
    Exit Function
Failed:
    Kind = "error " & Err.Number
End Function

Private Function Sum(ParamArray p() As Variant) As String
    Dim x As Variant, total As Long
    On Error GoTo Failed
    For Each x In p(0)
        total = total + x
    Next
    Sum = CStr(total)
    Exit Function
Failed:
    Sum = "error " & Err.Number
End Function

Private Function Joined(ParamArray p() As Variant) As String
    On Error GoTo Failed
    Joined = Join(p(0), "+")
    Exit Function
Failed:
    Joined = "error " & Err.Number
End Function

Private Function PassOnByVal(ParamArray p() As Variant) As String
    PassOnByVal = SecondOf(p(0))
End Function

Private Function SecondOf(ByVal x As Variant) As String
    On Error GoTo Failed
    SecondOf = CStr(x(1))
    Exit Function
Failed:
    SecondOf = "error " & Err.Number
End Function

Private Function ForwardElement(ParamArray p() As Variant) As String
    ForwardElement = Second(p(0))
End Function

Private Function ForwardWhole(ParamArray p() As Variant) As String
    ForwardWhole = SecondOfFirstOfFirst(p)
End Function

Private Function SecondOfFirstOfFirst(ParamArray q() As Variant) As String
    On Error GoTo Failed
    SecondOfFirstOfFirst = CStr(q(0)(0)(1))
    Exit Function
Failed:
    SecondOfFirstOfFirst = "error " & Err.Number
End Function

' As Max and UnpackParamArray in #1660: the largest value.
Private Function Unpacked(ParamArray vals() As Variant) As String
    Dim t As Variant, i As Long, best As Double
    On Error GoTo Failed
    t = UnpackParamArray(vals)
    best = t(LBound(t))
    For i = LBound(t) To UBound(t)
        If t(i) > best Then best = t(i)
    Next
    Unpacked = CStr(best)
    Exit Function
Failed:
    Unpacked = "error " & Err.Number
End Function

Private Function UnpackParamArray(ParamArray vParameters() As Variant) As Variant()
    Dim vOut() As Variant, vTemp() As Variant, lUBound As Long
    vOut() = vParameters()
    lUBound = UBound(vOut)
    Do While lUBound = 0
        If IsArray(vOut(0)) Then
            vTemp() = vOut(0)
            Erase vOut()
            vOut() = vTemp()
            Erase vTemp()
            lUBound = UBound(vOut)
        Else
            lUBound = 1
        End If
    Loop
    UnpackParamArray = vOut
End Function

Private Function ViaByVal(ByVal d As Variant) As String
    ViaByVal = Second(d)
End Function

Private Function ViaByRef(ByRef d As Variant) As String
    ViaByRef = Second(d)
End Function

Private Function SecondThroughLocal(ParamArray p() As Variant) As String
    Dim x As Variant
    On Error GoTo Failed
    x = p(0)
    SecondThroughLocal = CStr(x(1))
    Exit Function
Failed:
    SecondThroughLocal = "error " & Err.Number
End Function

Private Function Abc() As Byte()
    Abc = StrConv("abc", vbFromUnicode)
End Function

' Through a Byte() variable: StrConv assigned to a Variant gives a String.
Private Function AbcVariant() As Variant
    Dim b() As Byte
    b = StrConv("abc", vbFromUnicode)
    AbcVariant = b
End Function
