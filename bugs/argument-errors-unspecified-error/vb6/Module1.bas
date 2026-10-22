Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises for each argument the twinBASIC test cases give, in the same order.
' Build and run it with:  node scripts/bug_repro.mjs vb6 argument-errors-unspecified-error
' No case writes to the registry: GetSetting and DeleteSetting are given names that do not exist.

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    Dim A() As Long, B(1 To 3) As Long, N As Long, S As String, V As Variant
    Dim O As Object, D As Object
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    N = LBound(A): Report "LBound_UnsizedArray"
    N = QBColor(16): Report "QBColor_Sixteen"
    S = Environ(Null): Report "Environ_Null"
    N = LBound(B, 0): Report "LBound_DimensionZero"
    N = UBound(B, 2): Report "UBound_DimensionPastRank"
    N = LBound(B, 32768): Report "LBound_Dimension32768"
    V = Switch(True, 1, False): Report "Switch_OddArguments"
    V = Partition(5, -1, 10, 1): Report "Partition_NegativeStart"
    V = Partition(5, 0, 10, 0): Report "Partition_IntervalZero"
    V = Partition("abc", 0, 10, 1): Report "Partition_StringNumber"
    V = Partition(1E+20, 0, 10, 1): Report "Partition_BeyondLongLong"
    S = Environ(0): Report "Environ_Zero"
    S = Environ(32767): Report "Environ_PositionWithNoEntry"
    S = Environ(""): Report "Environ_EmptyName"
    S = Environ(32768): Report "Environ_Above32767"
    Set O = GetObject(): Report "GetObject_NoArguments"
    Set D = CreateObject("Scripting.Dictionary")
    V = CallByName(D, "Count", 0): Report "CallByName_CallTypeZero"
    Set D = Nothing
    V = CallByName(D, "Count", VbGet): Report "CallByName_Nothing"
    S = GetSetting("", "Section", "Key"): Report "GetSetting_EmptyAppName"
    DeleteSetting "NoSuchApplication-argument-errors-unspecified-error": Report "DeleteSetting_MissingApplication"
    Close #9
End Sub
