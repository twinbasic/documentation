Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: node scripts/bug_repro.mjs vb6 system-colour-extra-bytes-black

Private Declare Function GetPixel Lib "gdi32" (ByVal hdc As Long, ByVal x As Long, ByVal y As Long) As Long

Private Sub Draw(ByVal Label As String, ByVal Color As Long)
    Form1.Cls
    Form1.PSet (10, 10), Color
    Print #9, Label & " -> " & Right$("000000" & Hex$(GetPixel(Form1.hdc, 10, 10)), 6)
End Sub

Private Sub Cases()
    Load Form1
    Form1.AutoRedraw = True
    Form1.ScaleMode = vbPixels
    Form1.BackColor = &H30201
    Draw "&H8000000F", &H8000000F
    Draw "&H80FF000F", &H80FF000F
    Draw "&H80010003", &H80010003
    Unload Form1
End Sub

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
