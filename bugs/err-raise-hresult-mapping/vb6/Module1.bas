Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/err-raise-hresult-mapping: the cases of src/Sources/RegressionTests.twin,
' in the same order, each printing the number Err holds after it. Build and run it with:
'     node scripts/bug_repro.mjs vb6 err-raise-hresult-mapping

Private Function Raised(ByVal Number As Long) As Long
    On Error Resume Next
    Err.Raise Number
    Raised = Err.Number
End Function

Private Sub Report(ByVal Name As String, ByVal Number As Long)
    Print #9, Name & ": " & Number
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Report "Control_Raise5_Raises5", Raised(5)
    Report "Control_RaiseEFail_RaisesEFail", Raised(&H80004005)
    Report "Control_RaiseDispException_RaisesDispException", Raised(&H80020009)
    Report "Raise_EInvalidArg_Raises5", Raised(&H80070057)
    Report "Raise_EOutOfMemory_Raises7", Raised(&H8007000E)
    Report "Raise_ENotImpl_Raises445", Raised(&H80004001)
    Report "Raise_ENoInterface_Raises430", Raised(&H80004002)
    Report "Raise_DispUnknownName_Raises438", Raised(&H80020006)
    Report "Raise_DispTypeMismatch_Raises13", Raised(&H80020005)
    Report "Raise_ClassNotRegistered_Raises429", Raised(&H80040154)
    Report "Raise_VbErrorAsHResult_Raises53", Raised(&H800A0035)
    Dim N As Long
    On Error Resume Next
    Err.Number = &H80070057
    N = Err.Number
    Err.Clear
    On Error GoTo Fail
    Report "Number_EInvalidArg_Is5", N
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
