Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/rate-fails: the cases of src/Sources/RegressionTests.twin, in the same
' order, each printing the error VB6 raises (0: none) and the value. Build and run it with:
'     node scripts/bug_repro.mjs vb6 rate-fails

Private Sub Control_PmtZeroOnePeriod()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(1, 0, 100, -110)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_PmtZeroOnePeriod: " & E & " " & R
End Sub

Private Sub Control_PmtZeroThreePeriods()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(3, 0, 100, -133.1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_PmtZeroThreePeriods: " & E & " " & R
End Sub

Private Sub Control_NperNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(Null, -100, 800)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_NperNull_Raises94: " & E & " " & R
End Sub

Private Sub PmtZeroTwoPeriods_ReturnsPositiveRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(2, 0, 100, -121)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PmtZeroTwoPeriods_ReturnsPositiveRate: " & E & " " & R
End Sub

Private Sub PmtZeroFourPeriods_ReturnsPositiveRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(4, 0, 100, -146.41)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PmtZeroFourPeriods_ReturnsPositiveRate: " & E & " " & R
End Sub

Private Sub Loan_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(10, -100, 800)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Loan_ReturnsRate: " & E & " " & R
End Sub

Private Sub Mortgage_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(360, -600, 100000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Mortgage_ReturnsRate: " & E & " " & R
End Sub

Private Sub DueAtStart_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(10, -100, 800, 0, 1)
    E = Err.Number
    On Error GoTo 0
    Print #9, "DueAtStart_ReturnsRate: " & E & " " & R
End Sub

Private Sub SavingsPlan_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(10, -100, 0, 1200)
    E = Err.Number
    On Error GoTo 0
    Print #9, "SavingsPlan_ReturnsRate: " & E & " " & R
End Sub

Private Sub SignsReversed_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(10, 100, -800)
    E = Err.Number
    On Error GoTo 0
    Print #9, "SignsReversed_ReturnsRate: " & E & " " & R
End Sub

Private Sub PmtZeroTenPeriods_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(10, 0, 1000, -2000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PmtZeroTenPeriods_ReturnsRate: " & E & " " & R
End Sub

Private Sub WithGuess_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(10, -100, 800, 0, 0, 0.04)
    E = Err.Number
    On Error GoTo 0
    Print #9, "WithGuess_ReturnsRate: " & E & " " & R
End Sub

Private Sub NperBelowOne_ReturnsRate()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(0.5, 0, 100, -110)
    E = Err.Number
    On Error GoTo 0
    Print #9, "NperBelowOne_ReturnsRate: " & E & " " & R
End Sub

Private Sub GuessNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(1, 0, 100, -110, 0, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "GuessNull_Raises94: " & E & " " & R
End Sub

Private Sub GuessString_Raises13()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(1, 0, 100, -110, 0, "abc")
    E = Err.Number
    On Error GoTo 0
    Print #9, "GuessString_Raises13: " & E & " " & R
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    Control_PmtZeroOnePeriod
    Control_PmtZeroThreePeriods
    Control_NperNull_Raises94
    PmtZeroTwoPeriods_ReturnsPositiveRate
    PmtZeroFourPeriods_ReturnsPositiveRate
    Loan_ReturnsRate
    Mortgage_ReturnsRate
    DueAtStart_ReturnsRate
    SavingsPlan_ReturnsRate
    SignsReversed_ReturnsRate
    PmtZeroTenPeriods_ReturnsRate
    WithGuess_ReturnsRate
    NperBelowOne_ReturnsRate
    GuessNull_Raises94
    GuessString_Raises13
    Close #9
End Sub
