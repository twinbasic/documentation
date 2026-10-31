Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: node scripts/bug_repro.mjs vb6 backcolor-resets-current-xy

' Sets CurrentX = 50 and CurrentY = 40, then sets BackColor, and writes where the position is.
Private Sub Check(ByVal Label As String, ByVal Target As Object, ByVal Redraw As Boolean, ByVal NewColour As Long)
    Target.AutoRedraw = Redraw
    Target.ScaleMode = vbPixels
    Target.BackColor = vbWhite
    Target.CurrentX = 50
    Target.CurrentY = 40
    Target.BackColor = NewColour
    Print #9, Label & ": " & Target.CurrentX & " " & Target.CurrentY
End Sub

Private Sub Cases()
    Load Form1
    Dim Pic As Object
    Set Pic = Form1.Controls.Add("VB.PictureBox", "Pic1")
    Check "Form, AutoRedraw True, new colour", Form1, True, vbYellow
    Check "Form, AutoRedraw False, new colour", Form1, False, vbYellow
    Check "Form, AutoRedraw True, same colour", Form1, True, vbWhite
    Check "PictureBox, AutoRedraw True, new colour", Pic, True, vbYellow
    Check "PictureBox, AutoRedraw False, new colour", Pic, False, vbYellow
    Form1.AutoRedraw = True
    Form1.CurrentX = 50
    Form1.CurrentY = 40
    Set Form1.Picture = LoadPicture()
    Print #9, "Form, AutoRedraw True, Picture set: " & Form1.CurrentX & " " & Form1.CurrentY
    Form1.CurrentX = 50
    Form1.CurrentY = 40
    Form1.Cls
    Print #9, "Form, Cls: " & Form1.CurrentX & " " & Form1.CurrentY
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
