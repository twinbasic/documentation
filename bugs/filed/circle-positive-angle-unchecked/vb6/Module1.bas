Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: node scripts/bug_repro.mjs vb6 circle-positive-angle-unchecked

Sub Main()
    Dim n As Long
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Load Form1
    Form1.AutoRedraw = True
    Form1.ScaleMode = vbPixels
    Form1.BackColor = vbWhite
    Form1.Width = Form1.Width + (260 - Form1.ScaleWidth) * Screen.TwipsPerPixelX
    Form1.Height = Form1.Height + (130 - Form1.ScaleHeight) * Screen.TwipsPerPixelY
    Form1.Cls
    Print #9, "Client area " & Form1.ScaleWidth & " x " & Form1.ScaleHeight & " pixels"
    ' A valid pie, as the picture's context: a negative Start and End draw the radius lines.
    Form1.Circle (65, 65), 50, vbBlue, -0.5, -2
    ' A Start above 2 * pi: VB6 raises error 5 and draws nothing.
    On Error Resume Next
    Form1.Circle (195, 65), 50, vbRed, 7, 3
    n = Err.Number
    On Error GoTo Fail
    Print #9, "Circle Start 7: Err " & n
    PngDump.Surface Form1, "main"
    Unload Form1
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
