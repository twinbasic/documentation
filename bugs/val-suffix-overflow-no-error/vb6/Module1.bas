Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with Val of a number followed by a type-declaration character that the
' number does not fit: error 6.
' Build and run it with:  node scripts/bug_repro.mjs vb6 val-suffix-overflow-no-error

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim R As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    R = Empty: R = Val("32767%"): Report "Val_LargestInteger", R
    R = Empty: R = Val("2147483647&"): Report "Val_LargestLong", R
    R = Empty: R = Val("50.5%"): Report "Val_FractionInteger", R
    R = Empty: R = Val("32768%"): Report "Val_IntegerPastLargest", R
    R = Empty: R = Val("-32769%"): Report "Val_IntegerPastSmallest", R
    R = Empty: R = Val("2147483648&"): Report "Val_LongPastLargest", R
    R = Empty: R = Val("1e15@"): Report "Val_CurrencyPastLargest", R
    Close #9
End Sub
