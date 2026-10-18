Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does where the twinBASIC reproducer's cases assert error 13: a Set to a variable
' of a class that the object does not support raises error 13, Type mismatch. The control
' is a Set to the object's own class.

Private Sub Report(ByVal Label As String)
    Print #9, Label & " -> error " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim o As Object, b As ClsB, f As IFoo, c As Collection, v As Variant
    On Error Resume Next

    Set o = New ClsA
    Set b = o
    Report "Set b = o (ClsA to ClsB)"
    Set f = o
    Report "Set f = o (ClsA to IFoo)"
    Set o = CreateObject("Scripting.Dictionary")
    Set c = o
    Report "Set c = o (Dictionary to Collection)"
    Set v = New ClsA
    Set b = v
    Report "Set b = v (Variant holding ClsA to ClsB)"
    Set o = New ClsB
    Set b = o
    Report "control: Set b = o (ClsB to ClsB)"

    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
