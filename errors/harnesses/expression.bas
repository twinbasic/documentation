' The expression harness, for twinBASIC only: every case that uses it is `only: tb`, since VB6
' and VBA have no Eval and no TbExpressionService.
' In a built exe the first error the expression service raises in a process has the
' description "Automation error", and every later one "Unspecified error" (BETA 1010; the
' pages' NOTEs). expression_Begin raises that first one once, and clears it, so that what a
' case reports does not depend on which case runs first.

Private Sub expression_Begin()
    Static Done As Boolean
    If Done Then Exit Sub
    Done = True
    Dim V As Variant
    On Error Resume Next
    V = Eval("1 2")
    Err.Clear
End Sub

Private Sub expression_End()
End Sub
