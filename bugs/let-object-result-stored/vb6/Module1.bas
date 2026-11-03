Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of let-object-result-stored: an object assigned to a Variant without Set
' is read through its default member, wherever the object comes from: 450 when that
' member needs an argument, 438 when the class has none.
' Build and run it with:  node scripts/bug_repro.mjs vb6 let-object-result-stored

Private Function NewCollection() As Collection
    Set NewCollection = New Collection
End Function

Private Function NewNoDefault() As NoDefault
    Set NewNoDefault = New NoDefault
End Function

Private Function NewWithDefault() As WithDefault
    Set NewWithDefault = New WithDefault
End Function

Private Sub Show(ByVal Label As String, ByVal Number As Long, ByRef Value As Variant)
    Print #9, Label & " Err=" & Number & " " & TypeName(Value)
End Sub

Sub Main()
    Dim v As Variant
    Dim c As New Collection
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    v = Empty: Err.Clear: v = New Collection: Show "v = New Collection         ", Err.Number, v
    v = Empty: Err.Clear: v = NewCollection(): Show "v = NewCollection()        ", Err.Number, v
    v = Empty: Err.Clear: v = CreateObject("Scripting.Dictionary"): Show "v = CreateObject(Dict)     ", Err.Number, v
    v = Empty: Err.Clear: v = NewNoDefault(): Show "v = NewNoDefault()         ", Err.Number, v
    v = Empty: Err.Clear: v = c: Show "v = c (a Collection)       ", Err.Number, v
    v = Empty: Err.Clear: v = New NoDefault: Show "v = New NoDefault          ", Err.Number, v
    v = Empty: Err.Clear: v = NewWithDefault(): Show "v = NewWithDefault()       ", Err.Number, v
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
