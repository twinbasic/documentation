Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises for each call the twinBASIC test cases make, in the same order.
' Build and run it with:  node scripts/bug_repro.mjs vb6 createobject-getobject-raw-hresults

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Replace(Err.Description, vbCrLf, " / ")
    Err.Clear
End Sub

Sub Main()
    Dim O As Object
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Set O = CreateObject("Scripting.Dictionary"): Report "CreateObject_RegisteredClass"
    Set O = CreateObject(Null): Report "CreateObject_Null"
    Set O = GetObject("", "Scripting.Dictionary"): Report "GetObject_EmptyPathWithClass"
    Set O = CreateObject("No.Such.Class"): Report "CreateObject_UnknownClass"
    Set O = CreateObject("new:{00000000-0000-0000-0000-000000000000}"): Report "CreateObject_UnregisteredClsid"
    Set O = CreateObject("new:not-a-guid"): Report "CreateObject_MalformedClsid"
    Set O = CreateObject(""): Report "CreateObject_EmptyClass"
    Set O = GetObject("C:\no\such\file.xyz"): Report "GetObject_MissingFile"
    Set O = GetObject("C:\no\such\file.xyz", "Scripting.Dictionary"): Report "GetObject_MissingFileWithClass"
    Set O = GetObject(, "No.Such.Class"): Report "GetObject_UnknownClass"
    Set O = GetObject(, "Scripting.Dictionary"): Report "GetObject_NoRunningInstance"
    Close #9
End Sub
