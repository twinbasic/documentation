Attribute VB_Name = "Module1"
Option Explicit

' What VB6 raises for an index out of range on an array member of a UDT: error 9
' in every case, as for an array that is not in a UDT.
' Build and run it with:  node scripts/bug_repro.mjs vb6 udt-array-member-subscript-error

Private Type Holder
    X As Long
    A(1 To 3) As Long
    M(1 To 2, 1 To 2) As Long
    D() As Long
End Type

Private ModuleLevel As Holder
Private ModuleArray(1 To 3) As Long

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    Dim a(1 To 3) As Long
    Dim u As Holder
    Dim us(1 To 2) As Holder
    Dim r As Long
    a(4) = 1
    Report "PlainArray_WriteAboveRange"
    ModuleArray(4) = 1
    Report "ModuleLevelArray_WriteAboveRange"
    u.A(4) = 1
    Report "UdtMember_WriteAboveRange"
    u.A(0) = 1
    Report "UdtMember_WriteBelowRange"
    r = u.A(4)
    Report "UdtMember_ReadAboveRange"
    u.M(1, 3) = 1
    Report "UdtMember_TwoDimensions"
    ReDim u.D(1 To 3)
    u.D(4) = 1
    Report "UdtDynamicMember_WriteAboveRange"
    ModuleLevel.A(4) = 1
    Report "ModuleLevelUdtMember_WriteAboveRange"
    us(1).A(4) = 1
    Report "UdtArrayElementMember_WriteAboveRange"
    Close #9
End Sub
