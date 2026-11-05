Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does with the calls the twinBASIC side of the report makes: a Friend member
' called early-bound, called late-bound, and called through a class that implements its class.
' Build and run it with:  node scripts/bug_repro.mjs vb6 friend-late-bound

Private Sub Report(ByVal What As String)
    Print #9, What & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9

    Dim W As New Widget
    Print #9, "early Friend Function = " & W.GetValue()
    W.Prop = 11
    Print #9, "early Friend Property = " & W.Prop

    Dim O As Object
    Set O = W
    Dim V As Variant
    On Error Resume Next
    V = O.PubValue()
    Report "late Public Function"
    V = O.GetValue()
    Report "late Friend Function"
    V = O.Prop
    Report "late Friend Property Get"
    O.Prop = 1
    Report "late Friend Property Let"
    V = CallByName(O, "GetValue", VbMethod)
    Report "CallByName Friend Function"

    Dim Through As Widget
    Set Through = New Impl
    V = Through.PubValue()
    Report "Implements, Public"
    V = Through.GetValue()
    Report "Implements, Friend Function"
    V = Through.Prop
    Report "Implements, Friend Property"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
