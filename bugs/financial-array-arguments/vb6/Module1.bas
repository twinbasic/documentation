Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/financial-array-arguments: the cases of src/Sources/RegressionTests.twin, in the same
' order, each printing the error VB6 raises (0: none) and the value. Build and run it with:
'     node scripts/bug_repro.mjs vb6 financial-array-arguments

Private Sub Control_IRR()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(1)
    A(0) = -100
    A(1) = 110
    R = IRR(A)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_IRR: " & E & " " & R
End Sub

Private Sub Control_MIRR()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(2)
    A(0) = -100
    A(1) = 50
    A(2) = 60
    R = MIRR(A, 0.1, 0.1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_MIRR: " & E & " " & R
End Sub

Private Sub Control_NPV()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(2)
    A(0) = -100
    A(1) = 50
    A(2) = 60
    R = NPV(0.1, A)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_NPV: " & E & " " & R
End Sub

Private Sub IRR_Unsized_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = IRR(A)
    E = Err.Number
    On Error GoTo 0
    Print #9, "IRR_Unsized_Raises5: " & E & " " & R
End Sub

Private Sub IRR_Erased_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(1)
    A(0) = -100
    A(1) = 110
    Erase A
    R = IRR(A)
    E = Err.Number
    On Error GoTo 0
    Print #9, "IRR_Erased_Raises5: " & E & " " & R
End Sub

Private Sub MIRR_Unsized_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = MIRR(A, 0.1, 0.1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "MIRR_Unsized_Raises5: " & E & " " & R
End Sub

Private Sub NPV_Unsized_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPV(0.1, A)
    E = Err.Number
    On Error GoTo 0
    Print #9, "NPV_Unsized_Raises5: " & E & " " & R
End Sub

Private Sub IRR_TwoDimensions_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    B(0, 0) = -100
    B(1, 0) = 110
    B(0, 1) = -100
    B(1, 1) = 110
    R = IRR(B)
    E = Err.Number
    On Error GoTo 0
    Print #9, "IRR_TwoDimensions_Raises5: " & E & " " & R
End Sub

Private Sub MIRR_TwoDimensions_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    B(0, 0) = -100
    B(1, 0) = 110
    B(0, 1) = -100
    B(1, 1) = 110
    R = MIRR(B, 0.1, 0.1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "MIRR_TwoDimensions_Raises5: " & E & " " & R
End Sub

Private Sub NPV_TwoDimensions_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    B(0, 0) = -100
    B(1, 0) = 110
    B(0, 1) = -100
    B(1, 1) = 110
    R = NPV(0.1, B)
    E = Err.Number
    On Error GoTo 0
    Print #9, "NPV_TwoDimensions_Raises5: " & E & " " & R
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    Control_IRR
    Control_MIRR
    Control_NPV
    IRR_Unsized_Raises5
    IRR_Erased_Raises5
    MIRR_Unsized_Raises5
    NPV_Unsized_Raises5
    IRR_TwoDimensions_Raises5
    MIRR_TwoDimensions_Raises5
    NPV_TwoDimensions_Raises5
    Close #9
End Sub
