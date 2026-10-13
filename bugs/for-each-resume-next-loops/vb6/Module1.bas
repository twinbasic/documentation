Attribute VB_Name = "Module1"
Option Explicit

' A For Each whose enumerator cannot be had, under On Error Resume Next and under a handler
' that ends with Resume Next: the same cases as the twinBASIC side in src/. Each case counts
' how often the expression after In is evaluated (header=) and lists the error each pass of
' the body finds, and leaves the loop after six passes.
' Build and run it with:  node scripts/bug_repro.mjs vb6 for-each-resume-next-loops

Private Calls As Long

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    ResumeNext "Collection (control)", 0
    ResumeNext "Nothing", 1
    ResumeNext "Class with no enumerator", 2
    ResumeNext "Enumerator returns Nothing", 3
    ResumeNext "Enumerator raises error 5", 4
    HandlerResumeNext "Nothing, handler with Resume Next", 1
    HandlerResumeNext "Class with no enumerator, handler with Resume Next", 2
    HandlerResumeNext "Enumerator returns Nothing, handler with Resume Next", 3
    HandlerResumeNext "Enumerator raises error 5, handler with Resume Next", 4
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Private Function Source(ByVal Kind As Long) As Object
    Dim ok As Collection
    Calls = Calls + 1
    Select Case Kind
        Case 0
            Set ok = New Collection
            ok.Add "item"
            Set Source = ok
        Case 1
            Set Source = Nothing
        Case 2
            Set Source = New NoEnum
        Case 3
            Set Source = New EnumNothing
        Case 4
            Set Source = New EnumRaises
    End Select
End Function

Private Sub ResumeNext(ByVal Label As String, ByVal Kind As Long)
    Dim v As Variant, body As Long, trace As String
    Calls = 0
    On Error Resume Next
    For Each v In Source(Kind)
        body = body + 1
        trace = trace & " " & Err.Number
        Err.Clear
        If body = 6 Then Exit For
    Next
    trace = trace & " | after Next: " & Err.Number
    On Error GoTo 0
    Print #9, Label & ": header=" & Calls & " body=" & body & " errors:" & trace
End Sub

Private Sub HandlerResumeNext(ByVal Label As String, ByVal Kind As Long)
    Dim v As Variant, body As Long, hits As Long, trace As String
    Calls = 0
    On Error GoTo Handler
    For Each v In Source(Kind)
        body = body + 1
        trace = trace & " body"
        If body = 6 Then Exit For
    Next
Done:
    On Error GoTo 0
    Print #9, Label & ": header=" & Calls & " body=" & body & " passes:" & trace
    Exit Sub
Handler:
    hits = hits + 1
    trace = trace & " error " & Err.Number
    If hits = 6 Then Resume Done
    Resume Next
End Sub
