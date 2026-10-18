Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises when CreateObject or GetObject cannot create or find the object.
' Build and run it with:  node scripts/bug_repro.mjs vb6 createobject-error-not-429

Private Sub TryCreate(ByVal ProgId As String)
    On Error Resume Next
    Dim o As Object
    Set o = CreateObject(ProgId)
    Print #9, "CreateObject(""" & ProgId & """): " & Err.Number & " " & Err.Description
End Sub

Private Sub TryGet(ByVal ProgId As String)
    On Error Resume Next
    Dim o As Object
    Set o = GetObject(, ProgId)
    Print #9, "GetObject(, """ & ProgId & """): " & Err.Number & " " & Err.Description
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    TryCreate "Scripting.Dictionary"
    TryCreate "No.Such.Class"
    TryCreate "Scripting.NoSuchClass"
    TryGet "No.Such.Class"
    TryGet "Scripting.Dictionary"
    Close #9
End Sub
