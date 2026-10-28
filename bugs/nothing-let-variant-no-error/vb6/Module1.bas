Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of nothing-let-variant-no-error: the statements of the twinBASIC test cases, with
' what each gives. VB6 raises 91 for Value = Nothing and leaves Value as it was.
' Build and run it with:  node scripts/bug_repro.mjs vb6 nothing-let-variant-no-error
' Probe.vbp builds Probe.exe, which writes what it finds to out.txt beside the exe.

Sub Main()
    Dim Value As Variant, Obj As Object
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9

    Value = 3
    On Error Resume Next
    Value = Nothing
    Print #9, "LetVariant: error " & Err.Number & ", Value " & TypeName(Value) & " " & IIf(IsObject(Value), "(object)", CStr(Value))
    Err.Clear
    On Error GoTo Fail

    Value = 3
    Set Value = Nothing
    Print #9, "Control_SetVariant: Value Is Nothing " & (Value Is Nothing)

    On Error Resume Next
    Obj = Nothing
    Print #9, "Control_LetObject: error " & Err.Number
    Err.Clear
    On Error GoTo Fail

    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
