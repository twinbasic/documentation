Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with the assignments of ../src/Sources/Startup.twin to the object-typed
' member of a UDT: a let-assignment (no Set) goes to the object's default member.

Private Type Holder
    o As Widget
End Type

Private Type PlainHolder
    o As Plain
End Type

Sub Main()
    Dim msg As String
    On Error GoTo Fail
    Dim h As Holder
    Open App.Path & "\out.txt" For Output As #9
    Set h.o = New Widget
    h.o = 5
    Print #9, "h.o = 5 (default member): N = " & h.o.N
    Dim q As Widget
    Set q = New Widget
    q = 6
    Print #9, "q = 6 (local): N = " & q.N
    ' Plain has no default member: a let-assignment of an object to its member.
    Dim ph As PlainHolder
    Dim p As New Plain
    On Error Resume Next
    ph.o = p
    Print #9, "ph.o = p (no default member): Err " & Err.Number & " " & Err.Description
    On Error GoTo Fail
    Close #9
    Exit Sub
Fail:
    msg = Err.Number & ": " & Err.Description
    On Error Resume Next
    Print #9, "unhandled error " & msg
    Close #9
End Sub
