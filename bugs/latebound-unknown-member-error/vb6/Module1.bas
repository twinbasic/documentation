Attribute VB_Name = "Module1"
Option Explicit

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Cases
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Sub Show(ByVal label As String)
    Print #9, label & " -> error " & Err.Number & " (" & Hex(Err.Number) & ") [" & Err.Description & "]"
    Err.Clear
End Sub

Sub Cases()
    Dim w As New Widget
    Dim o As Object
    Dim v As Variant
    Dim c As New Collection
    Dim d As Object
    Set o = w
    v = Empty
    Set v = w
    On Error Resume Next
    o.Nope
    Show "o.Nope (class)"
    v.Nope
    Show "v.Nope (class in a Variant)"
    Dim oc As Object
    Set oc = c
    oc.Nope
    Show "Collection.Nope"
    Set d = CreateObject("Scripting.Dictionary")
    d.Nope
    Show "Dictionary.Nope"
    CallByName o, "Nope", VbMethod
    Show "CallByName class Nope"
    CallByName d, "Nope", VbMethod
    Show "CallByName Dictionary Nope"
    CallByName oc, "Nope", VbMethod
    Show "CallByName Collection Nope"
    w.Hits = 0
    o.Hello 1
    Show "o.Hello 1"
    Print #9, "  Hits=" & w.Hits
    w.Hits = 0: w.Gets = 0
    o.Prop = 1
    Show "o.Prop = 1"
    Print #9, "  Hits=" & w.Hits & " Gets=" & w.Gets
End Sub
