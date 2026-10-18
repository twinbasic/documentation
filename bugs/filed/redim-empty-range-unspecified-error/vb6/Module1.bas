Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: the same ReDim statements as src/Sources/Startup.twin,
' written to out.txt beside Probe.exe. Build and run it with:
'   node scripts/bug_repro.mjs vb6 redim-empty-range-unspecified-error

Private Type Pt
    X As Long
    Y As Long
End Type

Private Sub Show(ByVal label As String)
    Print #9, label & vbTab & Err.Number & vbTab & Err.Description
    Err.Clear
End Sub

Sub Main()
    Dim a() As Long
    Dim s() As String
    Dim p() As Pt
    Dim o() As Object
    Dim v As Variant
    Dim va() As Variant
    Dim n As Long
    Dim u As String
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next

    ' the bounds, in a Long array
    ReDim a(0 To -1): Show "Long (0 To -1)"
    ReDim a(1 To 0): Show "Long (1 To 0)"
    ReDim a(5 To 2): Show "Long (5 To 2)"
    ReDim a(-3 To -5): Show "Long (-3 To -5)"
    ReDim a(-1): Show "Long (-1)"
    n = -1
    ReDim a(n): Show "Long (n), n = -1"
    ReDim a(0 To n): Show "Long (0 To n), n = -1"
    ReDim a(0, 0 To -1): Show "Long (0, 0 To -1)"
    ReDim a(1 To 0, 0 To 1): Show "Long (1 To 0, 0 To 1)"

    ' the other element types
    ReDim s(0 To -1): Show "String (0 To -1)"
    ReDim p(0 To -1): Show "UDT (0 To -1)"
    ReDim o(0 To -1): Show "Object (0 To -1)"
    ReDim va(0 To -1): Show "Variant array (0 To -1)"
    ReDim v(0 To -1): Show "Variant variable (0 To -1)"
    v = Array(1, 2, 3)
    ReDim v(0 To -1): Show "Variant holding an array (0 To -1)"
    ReDim s(5 To 2) As String: Show "String (5 To 2) As String"

    ' Preserve
    ReDim a(0 To 2)
    ReDim Preserve a(0 To -1): Show "Long Preserve (0 To -1)"
    u = "unchanged"
    u = CStr(UBound(a))
    Print #9, "  after it, UBound(a) = " & u & ", error " & Err.Number
    Err.Clear
    ReDim a(0 To 2)
    ReDim Preserve a(5 To 2): Show "Long Preserve (5 To 2)"
    ReDim s(0 To 2)
    ReDim Preserve s(0 To -1): Show "String Preserve (0 To -1)"
    v = Array(1, 2, 3)
    ReDim Preserve v(0 To -1): Show "Variant Preserve (0 To -1)"

    ' the controls: a range of one element, and an empty array that is not ReDim'd
    ReDim a(0 To 0): Show "Long (0 To 0)"
    ReDim a(2 To 2): Show "Long (2 To 2)"
    ReDim a(1 To 2): Show "Long (1 To 2)"
    ReDim a(0): Show "Long (0)"
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
