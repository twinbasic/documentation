Attribute VB_Name = "Module1"
Option Explicit

' The same four windows as the twinBASIC project, in VB6. Build and run it with:
'     node scripts/bug_repro.mjs vb6 private-desktop-window-activation-delay
' It runs on a private desktop, as the twinBASIC exe does, and every step takes no time.

Private Declare Function CreateWindowExA Lib "user32" (ByVal Ex As Long, ByVal Cls As String, ByVal Title As String, ByVal Style As Long, ByVal X As Long, ByVal Y As Long, ByVal W As Long, ByVal H As Long, ByVal Parent As Long, ByVal Menu As Long, ByVal Inst As Long, ByVal P As Long) As Long
Private Declare Function DestroyWindow Lib "user32" (ByVal H As Long) As Long
Private Declare Function GetCurrentProcessId Lib "kernel32" () As Long

Sub Main()
    Dim I As Long, H As Long, T0 As Double, T1 As Double, T2 As Double, Title As String
    Open App.Path & "\out.txt" For Output As #9
    Title = "WindowActivationDelay" & GetCurrentProcessId()
    DestroyWindow CreateWindowExA(0, "STATIC", "first", &H10CF0000, 0, 0, 100, 50, 0, 0, 0, 0)
    On Error Resume Next
    For I = 1 To 4
        T0 = Timer
        H = CreateWindowExA(0, "STATIC", Title, &H10CF0000, 100 + I * 30, 100 + I * 30, 300, 100, 0, 0, 0, 0)
        T1 = Timer
        AppActivate Title
        T2 = Timer
        Print #9, I & " made " & Format$(T1 - T0, "0.00") & " activated " & Format$(T2 - T1, "0.00") & " error " & Err.Number
        Err.Clear
        DestroyWindow H
    Next
    Close #9
End Sub
