Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/nper-opposite-signs-overflow: the cases of src/Sources/RegressionTests.twin, in the same
' order, each printing the error VB6 raises (0: none) and the value. Build and run it with:
'     node scripts/bug_repro.mjs vb6 nper-opposite-signs-overflow

Private Sub Control_PositivePmt()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, 100, -1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_PositivePmt: " & E & " " & R
End Sub

Private Sub Control_RateZero()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0, -100, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_RateZero: " & E & " " & R
End Sub

Private Sub Control_SameSigns()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, 100, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_SameSigns: " & E & " " & R
End Sub

Private Sub Loan_ReturnsPeriods()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, -100, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Loan_ReturnsPeriods: " & E & " " & R
End Sub

Private Sub CarLoan_ReturnsPeriods()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.1 / 12, -500, 20000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "CarLoan_ReturnsPeriods: " & E & " " & R
End Sub

Private Sub LoanWithBalance_ReturnsPeriods()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, -100, 1000, 100)
    E = Err.Number
    On Error GoTo 0
    Print #9, "LoanWithBalance_ReturnsPeriods: " & E & " " & R
End Sub

Private Sub LoanDueAtStart_ReturnsPeriods()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, -100, 1000, 0, 1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "LoanDueAtStart_ReturnsPeriods: " & E & " " & R
End Sub

Private Sub SavingsPlan_ReturnsPeriods()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, -100, 0, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "SavingsPlan_ReturnsPeriods: " & E & " " & R
End Sub

Private Sub NegativeRate_ReturnsPeriods()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(-0.5, 100, -1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "NegativeRate_ReturnsPeriods: " & E & " " & R
End Sub

Private Sub PmtBelowInterest_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, -1, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PmtBelowInterest_Raises5: " & E & " " & R
End Sub

Private Sub PmtZero_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, 0, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PmtZero_Raises5: " & E & " " & R
End Sub

Private Sub RateMinusOne_Raises5()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(-1, -100, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "RateMinusOne_Raises5: " & E & " " & R
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    Control_PositivePmt
    Control_RateZero
    Control_SameSigns
    Loan_ReturnsPeriods
    CarLoan_ReturnsPeriods
    LoanWithBalance_ReturnsPeriods
    LoanDueAtStart_ReturnsPeriods
    SavingsPlan_ReturnsPeriods
    NegativeRate_ReturnsPeriods
    PmtBelowInterest_Raises5
    PmtZero_Raises5
    RateMinusOne_Raises5
    Close #9
End Sub
