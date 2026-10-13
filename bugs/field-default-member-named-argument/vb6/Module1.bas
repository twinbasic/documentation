Attribute VB_Name = "Module1"
Option Explicit

' The same assignments as the twinBASIC side in src/. VB6 refuses the ones twinBASIC refuses
' with TB5090: each of the five lines below that is commented out is a compile error here,
' "Wrong number of arguments or invalid property assignment" (and so are Me.Field("a") = 1
' and Field("a") = 1 inside the class Holder, which twinBASIC compiles). The lines left in
' compile, and are the ones twinBASIC compiles too.
' Build and run it with:  node scripts/bug_repro.mjs vb6 field-default-member-named-argument

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Dim h As New Holder
    Dim b As New Bag
    Dim o As Object
    Dim v As Long
    Set h.Plain = New Bag

    'h.Field("a") = 1                    ' refused
    'h.Dict("a") = 1                     ' refused
    'h.Plain("a") = 1                    ' refused
    'h.Field("a") = h.Field("a") + 1     ' refused
    'With h
    '    .Field("a") = 1                 ' refused
    'End With

    h.Field.Item("a") = 1
    Print #9, "h.Field.Item(""a"") = 1: " & h.Field.Item("a")
    v = h.Field("a")
    Print #9, "read h.Field(""a""): " & v
    b("a") = 2
    Print #9, "local variable b(""a"") = 2: " & b.Item("a")
    h.Prop("a") = 3
    Print #9, "property h.Prop(""a"") = 3: " & h.Prop.Item("a")
    Set o = h
    o.Field("a") = 4
    Print #9, "late-bound o.Field(""a"") = 4: " & h.Field.Item("a")
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
