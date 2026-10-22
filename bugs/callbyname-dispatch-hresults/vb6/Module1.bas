Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises for each call the twinBASIC test cases make, in the same order.
' Build and run it with:  node scripts/bug_repro.mjs vb6 callbyname-dispatch-hresults

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Replace(Err.Description, vbCrLf, " / ")
    Err.Clear
End Sub

Private Function NewDictionary() As Object
    Set NewDictionary = CreateObject("Scripting.Dictionary")
End Function

Sub Main()
    Dim D As Object, V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Set D = NewDictionary(): D.Add "x", 1
    D.Add "x", 2: Report "LateBound_AddExistingKey"
    Set D = NewDictionary()
    D.Remove "nope": Report "LateBound_RemoveMissingKey"
    V = CallByName(D, "Nope", VbGet): Report "CallByName_UnknownName"
    Set D = NewDictionary(): D.Add "x", 1
    CallByName D, "Add", VbMethod, "x", 2: Report "CallByName_AddExistingKey"
    Set D = NewDictionary()
    CallByName D, "Remove", VbMethod, "nope": Report "CallByName_RemoveMissingKey"
    Set D = NewDictionary(): D.Add "x", 1
    D.CompareMode = 1: Report "LateBound_CompareModeAfterAdd"
    Set D = NewDictionary(): D.Add "x", 1
    CallByName D, "CompareMode", VbLet, 1: Report "CallByName_CompareModeAfterAdd"
    Set D = NewDictionary()
    V = CallByName(D, "", VbGet): Report "CallByName_EmptyName"
    Close #9
End Sub
