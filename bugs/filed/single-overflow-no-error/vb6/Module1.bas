Attribute VB_Name = "Module1"
Option Explicit

Sub Main()
    Dim sbig As Single
    Dim nbig As Single
    Dim tiny As Single
    Dim dbig As Double
    Dim s As Single
    Dim n As Long
    Dim v As Variant
    Dim vr As Variant
    Dim lten As Long
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    sbig = 3E+38
    nbig = -3E+38
    tiny = 1E-10
    dbig = 1E+300
    lten = 10
    On Error Resume Next
    s = 5!: Err.Clear: s = sbig + sbig: n = Err.Number: Print #9, "Single +        Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = nbig - sbig: n = Err.Number: Print #9, "Single -        Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = sbig * 10!: n = Err.Number: Print #9, "Single *        Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = sbig / tiny: n = Err.Number: Print #9, "Single /        Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = sbig * lten: n = Err.Number: Print #9, "Single * Long   Err=" & n & " s=" & s
    s = sbig: Err.Clear: s = s + sbig: n = Err.Number: Print #9, "s = s + x       Err=" & n & " s=" & s
    s = sbig: Err.Clear: s = s * 10!: n = Err.Number: Print #9, "s = s * x       Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = CSng(dbig): n = Err.Number: Print #9, "CSng(Double)    Err=" & n & " s=" & s
    s = 5!: Err.Clear: s = sbig ^ 2!: n = Err.Number: Print #9, "Single ^        Err=" & n & " s=" & s
    v = sbig: vr = 5!: Err.Clear: vr = v * 10!: n = Err.Number: Print #9, "Variant *       Err=" & n & " " & TypeName(vr)
    v = sbig: vr = 5!: Err.Clear: vr = v + v: n = Err.Number: Print #9, "Variant +       Err=" & n & " " & TypeName(vr)
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
