' The window harness, for twinBASIC, VB6 and VBA alike: a case that calls AppActivate has a
' window to activate. window_Begin creates a visible top-level window of the probe's own
' thread, titled window_Title (tbdocsErrorsProbe and the process id, so that runtimes run at
' once never share one), and window_End destroys it. window_Pid is the probe's process id,
' the task id Shell would return for it; window_Hide hides the window for a case. The real
' activation runs: on the private desktop the window never becomes the foreground one, and
' AppActivate raises nothing for that in any runtime (BETA 1010), so nothing is patched.
' VBA7 is true in twinBASIC and in VBA 7; VB6 compiles only the #Else branch.

#If VBA7 Then
Private Declare PtrSafe Function window_CreateWindowExA Lib "user32" Alias "CreateWindowExA" (ByVal Ex As Long, ByVal Cls As String, ByVal Title As String, ByVal Style As Long, ByVal X As Long, ByVal Y As Long, ByVal W As Long, ByVal H As Long, ByVal Parent As LongPtr, ByVal Menu As LongPtr, ByVal Inst As LongPtr, ByVal P As LongPtr) As LongPtr
Private Declare PtrSafe Function window_DestroyWindow Lib "user32" Alias "DestroyWindow" (ByVal H As LongPtr) As Long
Private Declare PtrSafe Function window_ShowWindow Lib "user32" Alias "ShowWindow" (ByVal H As LongPtr, ByVal Cmd As Long) As Long
Private Declare PtrSafe Function window_IsWindowVisible Lib "user32" Alias "IsWindowVisible" (ByVal H As LongPtr) As Long
Private Declare PtrSafe Function window_IsIconic Lib "user32" Alias "IsIconic" (ByVal H As LongPtr) As Long
Private Declare PtrSafe Function window_GetCurrentProcessId Lib "kernel32" Alias "GetCurrentProcessId" () As Long
#Else
Private Declare Function window_CreateWindowExA Lib "user32" Alias "CreateWindowExA" (ByVal Ex As Long, ByVal Cls As String, ByVal Title As String, ByVal Style As Long, ByVal X As Long, ByVal Y As Long, ByVal W As Long, ByVal H As Long, ByVal Parent As Long, ByVal Menu As Long, ByVal Inst As Long, ByVal P As Long) As Long
Private Declare Function window_DestroyWindow Lib "user32" Alias "DestroyWindow" (ByVal H As Long) As Long
Private Declare Function window_ShowWindow Lib "user32" Alias "ShowWindow" (ByVal H As Long, ByVal Cmd As Long) As Long
Private Declare Function window_IsWindowVisible Lib "user32" Alias "IsWindowVisible" (ByVal H As Long) As Long
Private Declare Function window_IsIconic Lib "user32" Alias "IsIconic" (ByVal H As Long) As Long
Private Declare Function window_GetCurrentProcessId Lib "kernel32" Alias "GetCurrentProcessId" () As Long
#End If

' The window, kept in a Variant: a LongPtr in twinBASIC and VBA 7, a Long in VB6.
Private window_Handle As Variant

Private Function window_Title() As String
    window_Title = "tbdocsErrorsProbe" & window_GetCurrentProcessId()
End Function

Private Function window_Pid() As Long
    window_Pid = window_GetCurrentProcessId()
End Function

' Whether the window is visible now, and whether it is minimized.
Private Function window_Visible() As Boolean
    window_Visible = window_IsWindowVisible(window_Handle) <> 0
End Function

Private Function window_Minimized() As Boolean
    window_Minimized = window_IsIconic(window_Handle) <> 0
End Function

Private Sub window_Hide()
    window_ShowWindow window_Handle, 0
End Sub

' SW_SHOWMINNOACTIVE: minimized, not activated.
Private Sub window_Minimize()
    window_ShowWindow window_Handle, 7
End Sub

' A STATIC window, WS_OVERLAPPEDWINDOW, shown without being activated (SW_SHOWNA): created
' with WS_VISIBLE, which activates it, it takes 2 s to create from the third case on in
' twinBASIC (BETA 1010).
Private Sub window_Begin()
    window_Handle = window_CreateWindowExA(0, "STATIC", window_Title(), &HCF0000, 0, 0, 300, 100, 0, 0, 0, 0)
    window_ShowWindow window_Handle, 8
End Sub

Private Sub window_End()
    If window_Handle <> 0 Then window_DestroyWindow window_Handle
    window_Handle = 0
End Sub
