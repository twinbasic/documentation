Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with Abs of the smallest Integer, Long and Currency: error 6.
' Build and run it with:  node scripts/bug_repro.mjs vb6 abs-minimum-widens-type

Private Sub Report(ByVal Label As String, ByVal Result As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & " (" & TypeName(Result) & " " & Result & ")"
    Err.Clear
End Sub

Sub Main()
    Dim I As Integer, L As Long, C As Currency, V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    I = -32767: V = Empty: V = Abs(I): Report "Abs_IntegerAboveSmallest", V
    C = -922337203685477.5807@ - 0.0001@: V = Empty: V = Abs(C): Report "Abs_SmallestCurrency", V
    V = CInt(-32768): V = Abs(V): Report "Abs_VariantSmallestInteger", V
    I = -32768: V = Empty: V = Abs(I): Report "Abs_SmallestInteger", V
    L = -2147483647 - 1: V = Empty: V = Abs(L): Report "Abs_SmallestLong", V
    Close #9
End Sub
