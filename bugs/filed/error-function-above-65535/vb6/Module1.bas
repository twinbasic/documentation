Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with Error and Error$ of a number above 65535: error 6.
' Build and run it with:  node scripts/bug_repro.mjs vb6 error-function-above-65535

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim R As Variant
    Dim N As Long
    Dim X As Double
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    N = 65535: R = Empty: R = Error$(N): Report "Error_Largest", R
    N = -1: R = Empty: R = Error$(N): Report "Error_Negative", R
    N = -2147467259: R = Empty: R = Error$(N): Report "Error_HResult", R
    N = 65536: R = Empty: R = Error$(N): Report "ErrorDollar_65536", R
    N = 65536: R = Empty: R = Error(N): Report "Error_65536", R
    N = 2147483647: R = Empty: R = Error(N): Report "Error_LargestLong", R
    X = 65535.5: R = Empty: R = Error(X): Report "Error_RoundsTo65536", R
    Close #9
End Sub
