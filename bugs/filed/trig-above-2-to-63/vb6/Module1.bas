Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with Cos, Sin and Tan of a number of 2^63 or more in magnitude:
' error 5, from 9.223372E+18 up.
' Build and run it with:  node scripts/bug_repro.mjs vb6 trig-above-2-to-63

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim X As Double, R As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    X = 2 ^ 62: R = Empty: R = Cos(X): Report "Cos_2To62", R
    X = 2 ^ 62: R = Empty: R = Sin(X): Report "Sin_2To62", R
    X = 2 ^ 62: R = Empty: R = Tan(X): Report "Tan_2To62", R
    X = 2 ^ 63: R = Empty: R = Cos(X): Report "Cos_2To63", R
    X = 1E+300: R = Empty: R = Cos(X): Report "Cos_1E300", R
    X = -(2 ^ 63): R = Empty: R = Sin(X): Report "Sin_Minus2To63", R
    X = 2 ^ 63: R = Empty: R = Tan(X): Report "Tan_2To63", R
    X = 9.223372E+18 - 2048: R = Empty: R = Cos(X): Report "Cos_JustBelow9.223372E18", R
    X = 9.223372E+18: R = Empty: R = Cos(X): Report "Cos_9.223372E18", R
    Close #9
End Sub
