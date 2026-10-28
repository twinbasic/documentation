Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/financial-null-optional-argument: the cases of src/Sources/RegressionTests.twin, in the same
' order, each printing the error VB6 raises (0: none) and the value. Build and run it with:
'     node scripts/bug_repro.mjs vb6 financial-null-optional-argument

Private Sub Control_RequiredNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = FV(Null, 10, -100)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_RequiredNull_Raises94: " & E & " " & R
End Sub

Private Sub Control_OptionalString_Raises13()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = FV(0.01, 10, -100, "abc")
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_OptionalString_Raises13: " & E & " " & R
End Sub

Private Sub Control_OptionalNumber()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = FV(0.01, 10, -100, 1000)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Control_OptionalNumber: " & E & " " & R
End Sub

Private Sub FV_PvNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = FV(0.01, 10, -100, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "FV_PvNull_Raises94: " & E & " " & R
End Sub

Private Sub FV_TypeNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = FV(0.01, 10, -100, 0, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "FV_TypeNull_Raises94: " & E & " " & R
End Sub

Private Sub PV_FvNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PV(0.01, 10, -100, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PV_FvNull_Raises94: " & E & " " & R
End Sub

Private Sub Pmt_FvNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Pmt(0.01, 10, 1000, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Pmt_FvNull_Raises94: " & E & " " & R
End Sub

Private Sub NPer_TypeNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = NPer(0.01, 100, -1000, 0, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "NPer_TypeNull_Raises94: " & E & " " & R
End Sub

Private Sub IPmt_FvNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = IPmt(0.01, 1, 10, 1000, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "IPmt_FvNull_Raises94: " & E & " " & R
End Sub

Private Sub PPmt_TypeNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = PPmt(0.01, 1, 10, 1000, 0, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "PPmt_TypeNull_Raises94: " & E & " " & R
End Sub

Private Sub Rate_TypeNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = Rate(1, 0, 100, -110, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "Rate_TypeNull_Raises94: " & E & " " & R
End Sub

Private Sub DDB_FactorNull_Raises94()
    Dim A() As Double, B(1, 1) As Double
    Dim E As Long, R As Variant
    On Error Resume Next
    R = DDB(1000, 100, 5, 1, Null)
    E = Err.Number
    On Error GoTo 0
    Print #9, "DDB_FactorNull_Raises94: " & E & " " & R
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    Control_RequiredNull_Raises94
    Control_OptionalString_Raises13
    Control_OptionalNumber
    FV_PvNull_Raises94
    FV_TypeNull_Raises94
    PV_FvNull_Raises94
    Pmt_FvNull_Raises94
    NPer_TypeNull_Raises94
    IPmt_FvNull_Raises94
    PPmt_TypeNull_Raises94
    Rate_TypeNull_Raises94
    DDB_FactorNull_Raises94
    Close #9
End Sub
