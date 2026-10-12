Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of the reproducer: the same statements as src/Sources/Startup.twin,
' written to out.txt beside Probe.exe. Build and run it with:
'   node scripts/bug_repro.mjs vb6 activex-control-class-variable

Private ModuleSc As New MSScriptControl.ScriptControl

Private Sub Show(ByVal label As String)
    Print #9, label & vbTab & Err.Number & vbTab & Err.Description
    Err.Clear
End Sub

' Dim As New: the declaration raises nothing, the variable is not Nothing, and its
' members raise error 91 in twinBASIC
Private Sub AsNew()
    On Error Resume Next
    Dim sc As New MSScriptControl.ScriptControl
    Dim t As String
    Dim isNothing As Boolean
    Dim r As Variant
    t = TypeName(sc)
    Show "Dim sc As New ScriptControl: TypeName(sc) = " & t
    isNothing = (sc Is Nothing)
    Show "Dim sc As New ScriptControl: sc Is Nothing = " & isNothing
    sc.Language = "JScript"
    Show "Dim sc As New ScriptControl: sc.Language = ""JScript"""
    r = sc.Eval("1 + 2")
    Show "Dim sc As New ScriptControl: sc.Eval(""1 + 2"") = " & r
    ModuleSc.Language = "JScript"
    Show "Private ModuleSc As New ScriptControl (module level): ModuleSc.Language"
    Dim h As New Holder
    h.Sc.Language = "JScript"
    Show "Public Sc As New ScriptControl (class field): h.Sc.Language"
End Sub

' Set: the variable's type is the class
Private Sub SetTyped()
    On Error Resume Next
    Dim sc As MSScriptControl.ScriptControl
    Dim o As Object
    Set sc = New MSScriptControl.ScriptControl
    Show "Dim sc As ScriptControl: Set sc = New ScriptControl"
    Set sc = CreateObject("MSScriptControl.ScriptControl")
    Show "Dim sc As ScriptControl: Set sc = CreateObject(""MSScriptControl.ScriptControl"")"
    Set o = New MSScriptControl.ScriptControl
    Show "Dim o As Object: Set o = New ScriptControl"
    Set sc = o
    Show "Dim sc As ScriptControl: Set sc = o"
End Sub

' the variable's type is not the class
Private Sub SetOther()
    On Error Resume Next
    Dim o As Object
    Dim i As MSScriptControl.IScriptControl
    Dim r As Variant
    Set o = CreateObject("MSScriptControl.ScriptControl")
    Show "Dim o As Object: Set o = CreateObject(""MSScriptControl.ScriptControl"")"
    o.Language = "JScript"
    r = o.Eval("1 + 2")
    Show "Object variable: o.Eval(""1 + 2"") = " & r
    Set i = New MSScriptControl.ScriptControl
    Show "Dim i As IScriptControl: Set i = New ScriptControl"
    i.Language = "JScript"
    r = i.Eval("1 + 2")
    Show "IScriptControl variable: i.Eval(""1 + 2"") = " & r
End Sub

' two more ActiveX controls
Private Sub OtherControls()
    On Error Resume Next
    Dim w As MSWinsockLib.Winsock
    Dim wo As Object
    Dim wa As New MSWinsockLib.Winsock
    Dim cd As MSComDlg.CommonDialog
    Dim cdo As Object
    Dim n As Long
    Set w = New MSWinsockLib.Winsock
    Show "Dim w As Winsock: Set w = New Winsock"
    n = wa.LocalPort
    Show "Dim wa As New Winsock: wa.LocalPort"
    Set wo = New MSWinsockLib.Winsock
    Show "Dim wo As Object: Set wo = New Winsock"
    Set cd = New MSComDlg.CommonDialog
    Show "Dim cd As CommonDialog: Set cd = New CommonDialog"
    Set cdo = New MSComDlg.CommonDialog
    Show "Dim cdo As Object: Set cdo = New CommonDialog"
End Sub

' classes of libraries that are not controls
Private Sub NotControls()
    On Error Resume Next
    Dim n As Long
    Dim s As String
    Dim d As New Scripting.Dictionary
    Dim c As New ADODB.Connection
    d.Add "a", 1
    n = d.Count
    Show "Dim d As New Scripting.Dictionary: d.Add, d.Count = " & n
    c.ConnectionString = "x"
    s = c.ConnectionString
    Show "Dim c As New ADODB.Connection: ConnectionString = " & s
End Sub

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    AsNew
    SetTyped
    SetOther
    OtherControls
    NotControls
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub
