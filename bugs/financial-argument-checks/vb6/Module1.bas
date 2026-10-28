Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/financial-argument-checks: the cases of src/Sources/RegressionTests.twin, in the same
' order, each printing the error VB6 raises (0: none) and the value. Build and run it with:
'     node scripts/bug_repro.mjs vb6 financial-argument-checks

Private Sub Control_IPmtLastPeriod()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = IPmt(0.01, 10.9999999, 10, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_IPmtLastPeriod: " & E & " " & R
End Sub

Private Sub Control_PmtRateMinusTwo_Raises11()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Pmt(-2, 10, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_PmtRateMinusTwo_Raises11: " & E & " " & R
End Sub

Private Sub Control_DDBLifeOne()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = DDB(1000, 100, 1, 0.5)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_DDBLifeOne: " & E & " " & R
End Sub

Private Sub IPmt_PerZero_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = IPmt(0.01, 0, 10, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "IPmt_PerZero_Raises5: " & E & " " & R
End Sub

Private Sub IPmt_PerNperPlusOne_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = IPmt(0.01, 11, 10, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "IPmt_PerNperPlusOne_Raises5: " & E & " " & R
End Sub

Private Sub PPmt_PerZero_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PPmt(0.01, 0, 10, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PPmt_PerZero_Raises5: " & E & " " & R
End Sub

Private Sub PPmt_PerNperPlusOne_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PPmt(0.01, 11, 10, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PPmt_PerNperPlusOne_Raises5: " & E & " " & R
End Sub

Private Sub Pmt_NperZero_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Pmt(0.01, 0, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Pmt_NperZero_Raises5: " & E & " " & R
End Sub

Private Sub PPmt_NperZero_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PPmt(0.01, 1, 0, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PPmt_NperZero_Raises5: " & E & " " & R
End Sub

Private Sub MIRR_OneElement_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(0)
    A(0) = -100
    R = MIRR(A, 0.1, 0.1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "MIRR_OneElement_Raises5: " & E & " " & R
End Sub

Private Sub MIRR_ReinvestRateMinusOne_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(2)
    A(0) = -100
    A(1) = 50
    A(2) = 60
    R = MIRR(A, 0.1, -1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "MIRR_ReinvestRateMinusOne_Raises5: " & E & " " & R
End Sub

Private Sub MIRR_NoPayment_Raises11()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(1)
    A(0) = 100
    A(1) = 110
    R = MIRR(A, 0.1, 0.1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "MIRR_NoPayment_Raises11: " & E & " " & R
End Sub

Private Sub NPV_RateMinusOne_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    ReDim A(2)
    A(0) = -100
    A(1) = 50
    A(2) = 60
    R = NPV(-1, A)
    E = Err.Number
    On Error GoTo 0
    Print #9, "NPV_RateMinusOne_Raises5: " & E & " " & R
End Sub

Private Sub DDB_LifeBelowOne_Returns900()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = DDB(1000, 100, 0.5, 0.5)
    E = Err.Number
    On Error GoTo 0
    Print #9, "DDB_LifeBelowOne_Returns900: " & E & " " & R
End Sub

Private Sub FV_RateMinusOneNegativeNper_Raises6()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = FV(-1, -1, -100)
    E = Err.Number
    On Error GoTo 0
    Print #9, "FV_RateMinusOneNegativeNper_Raises6: " & E & " " & R
End Sub

Private Sub PV_RateMinusOneNperZero_Returns0()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PV(-1, 0, -100)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PV_RateMinusOneNperZero_Returns0: " & E & " " & R
End Sub

Private Sub PV_RateMinusOne_Raises11()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PV(-1, 10, -100)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PV_RateMinusOne_Raises11: " & E & " " & R
End Sub

Private Sub PV_RateMinusOneNegativeNper_Raises6()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PV(-1, -1, -100)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PV_RateMinusOneNegativeNper_Raises6: " & E & " " & R
End Sub

Private Sub SLN_InfiniteResult_Raises6()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = SLN(1000, 100, 1E-308)
    E = Err.Number
    On Error GoTo 0
    Print #9, "SLN_InfiniteResult_Raises6: " & E & " " & R
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    Control_IPmtLastPeriod
    Control_PmtRateMinusTwo_Raises11
    Control_DDBLifeOne
    IPmt_PerZero_Raises5
    IPmt_PerNperPlusOne_Raises5
    PPmt_PerZero_Raises5
    PPmt_PerNperPlusOne_Raises5
    Pmt_NperZero_Raises5
    PPmt_NperZero_Raises5
    MIRR_OneElement_Raises5
    MIRR_ReinvestRateMinusOne_Raises5
    MIRR_NoPayment_Raises11
    NPV_RateMinusOne_Raises5
    DDB_LifeBelowOne_Returns900
    FV_RateMinusOneNegativeNper_Raises6
    PV_RateMinusOneNperZero_Returns0
    PV_RateMinusOne_Raises11
    PV_RateMinusOneNegativeNper_Raises6
    SLN_InfiniteResult_Raises6
    Close #9
End Sub
