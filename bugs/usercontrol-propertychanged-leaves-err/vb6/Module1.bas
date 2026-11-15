Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side: Err.Number after a property of a UserControl calls PropertyChanged.
' Build and run it with:  node scripts/bug_repro.mjs vb6 usercontrol-propertychanged-leaves-err

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Load Form1

    On Error Resume Next
    Err.Clear
    Form1.ProbeControl1.WithChanged = 1
    Print #9, "Let with PropertyChanged: Err " & Err.Number & ", reads " & Form1.ProbeControl1.WithChanged
    Err.Clear
    Form1.ProbeControl1.CallsChangedNoName
    Print #9, "PropertyChanged with no name: Err " & Err.Number
    Err.Clear
    Form1.ProbeControl1.WithoutChanged = 1
    Print #9, "Let without PropertyChanged: Err " & Err.Number
    On Error GoTo Fail

    Err.Clear
    Form1.ProbeControl1.WithChanged = 2
    Print #9, "No handler: Err " & Err.Number

    Unload Form1
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
