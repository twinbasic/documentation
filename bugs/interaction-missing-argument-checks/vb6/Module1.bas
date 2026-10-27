Attribute VB_Name = "Module1"
Option Explicit

' What VB6 does for each case of the twinBASIC test cases, in the same order: the error it
' raises, and how many boxes it showed. Build and run it with:
'     node scripts/bug_repro.mjs vb6 interaction-missing-argument-checks
' ---- copies of errors/harnesses/dialog.bas and window.bas (twinBASIC documentation): the
' dialog harness answers each box MsgBox or InputBox shows, and the window harness makes a
' window to activate. Their declarations first, then their procedures.
' The dialog harness, for twinBASIC, VB6 and VBA alike: a case that calls MsgBox or InputBox
' runs with the box answered as soon as it is shown, so the real MessageBox and the real
' dialog run, and what they refuse is what the probe measures. dialog_Begin installs a WH_CBT
' hook on the probe's own thread: each top-level #32770 window the thread creates is noted, and
' when it is activated the hook hides it and sends it WM_COMMAND from a button, as a click
' does: Cancel (2) when it has a Cancel button, else its first push button that is not Help
' (9). It is sent, not posted: in Access a posted WM_COMMAND never reaches the box. Nor is the
' box ended with EndDialog, which skips the dialog procedure: twinBASIC's InputBox then
' returns a string it never set, and faults in OLEAUT32 (BETA 1010). Windows the hook did
' not see created (Access's own) are left alone. Each box answered is counted, with its
' title, its text and the button, for dialog_Expect.
' A style with MB_SERVICE_NOTIFICATION (&H200000), its NT 3.x form (&H40000) or
' MB_DEFAULT_DESKTOP_ONLY (&H20000) puts a message box on the user's desktop, where no thread
' hook sees it. So dialog_Begin also patches MessageBoxIndirectA and MessageBoxIndirectW, the
' ones the runtimes call (twinBASIC the W form, VB6 and VBA the A form), with a guard that
' refuses such a style, and passes any other to the real function (its bytes put back for the
' call); the six other MessageBox entry points, which no runtime calls, are refused whatever
' the style. dialog_End raises 1002 when the guard refused a box, so such a case never passes.
' dialog_End puts the bytes back and removes the hook. VBA7 is true in twinBASIC and in VBA 7;
' VB6 compiles only the #Else branches, so they hold what it cannot parse.

#If VBA7 Then
Private Declare PtrSafe Function dialog_GetModuleHandleA Lib "kernel32" Alias "GetModuleHandleA" (ByVal Name As String) As LongPtr
Private Declare PtrSafe Function dialog_GetProcAddress Lib "kernel32" Alias "GetProcAddress" (ByVal H As LongPtr, ByVal Name As String) As LongPtr
Private Declare PtrSafe Function dialog_VirtualProtect Lib "kernel32" Alias "VirtualProtect" (ByVal A As LongPtr, ByVal S As LongPtr, ByVal P As Long, ByRef Old As Long) As Long
Private Declare PtrSafe Sub dialog_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef D As Any, ByRef S As Any, ByVal N As LongPtr)
Private Declare PtrSafe Sub dialog_SetLastError Lib "kernel32" Alias "SetLastError" (ByVal E As Long)
Private Declare PtrSafe Function dialog_GetCurrentThreadId Lib "kernel32" Alias "GetCurrentThreadId" () As Long
Private Declare PtrSafe Function dialog_SetWindowsHookExA Lib "user32" Alias "SetWindowsHookExA" (ByVal Id As Long, ByVal Fn As LongPtr, ByVal M As LongPtr, ByVal T As Long) As LongPtr
Private Declare PtrSafe Function dialog_UnhookWindowsHookEx Lib "user32" Alias "UnhookWindowsHookEx" (ByVal H As LongPtr) As Long
Private Declare PtrSafe Function dialog_CallNextHookEx Lib "user32" Alias "CallNextHookEx" (ByVal H As LongPtr, ByVal Code As Long, ByVal W As LongPtr, ByVal L As LongPtr) As LongPtr
Private Declare PtrSafe Function dialog_GetClassNameA Lib "user32" Alias "GetClassNameA" (ByVal H As LongPtr, ByVal S As String, ByVal N As Long) As Long
Private Declare PtrSafe Function dialog_GetWindowTextA Lib "user32" Alias "GetWindowTextA" (ByVal H As LongPtr, ByVal S As String, ByVal N As Long) As Long
Private Declare PtrSafe Function dialog_GetDlgItem Lib "user32" Alias "GetDlgItem" (ByVal H As LongPtr, ByVal Id As Long) As LongPtr
Private Declare PtrSafe Function dialog_GetDlgCtrlID Lib "user32" Alias "GetDlgCtrlID" (ByVal H As LongPtr) As Long
Private Declare PtrSafe Function dialog_GetWindow Lib "user32" Alias "GetWindow" (ByVal H As LongPtr, ByVal Cmd As Long) As LongPtr
Private Declare PtrSafe Function dialog_GetWindowLongA Lib "user32" Alias "GetWindowLongA" (ByVal H As LongPtr, ByVal I As Long) As Long
Private Declare PtrSafe Function dialog_ShowWindow Lib "user32" Alias "ShowWindow" (ByVal H As LongPtr, ByVal Cmd As Long) As Long
Private Declare PtrSafe Function dialog_SendMessageA Lib "user32" Alias "SendMessageA" (ByVal H As LongPtr, ByVal M As Long, ByVal W As LongPtr, ByVal L As LongPtr) As LongPtr
Private Declare PtrSafe Function dialog_RealIndirectA Lib "user32" Alias "MessageBoxIndirectA" (ByVal P As LongPtr) As Long
Private Declare PtrSafe Function dialog_RealIndirectW Lib "user32" Alias "MessageBoxIndirectW" (ByVal P As LongPtr) As Long
#Else
Private Declare Function dialog_GetModuleHandleA Lib "kernel32" Alias "GetModuleHandleA" (ByVal Name As String) As Long
Private Declare Function dialog_GetProcAddress Lib "kernel32" Alias "GetProcAddress" (ByVal H As Long, ByVal Name As String) As Long
Private Declare Function dialog_VirtualProtect Lib "kernel32" Alias "VirtualProtect" (ByVal A As Long, ByVal S As Long, ByVal P As Long, ByRef Old As Long) As Long
Private Declare Sub dialog_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef D As Any, ByRef S As Any, ByVal N As Long)
Private Declare Sub dialog_SetLastError Lib "kernel32" Alias "SetLastError" (ByVal E As Long)
Private Declare Function dialog_GetCurrentThreadId Lib "kernel32" Alias "GetCurrentThreadId" () As Long
Private Declare Function dialog_SetWindowsHookExA Lib "user32" Alias "SetWindowsHookExA" (ByVal Id As Long, ByVal Fn As Long, ByVal M As Long, ByVal T As Long) As Long
Private Declare Function dialog_UnhookWindowsHookEx Lib "user32" Alias "UnhookWindowsHookEx" (ByVal H As Long) As Long
Private Declare Function dialog_CallNextHookEx Lib "user32" Alias "CallNextHookEx" (ByVal H As Long, ByVal Code As Long, ByVal W As Long, ByVal L As Long) As Long
Private Declare Function dialog_GetClassNameA Lib "user32" Alias "GetClassNameA" (ByVal H As Long, ByVal S As String, ByVal N As Long) As Long
Private Declare Function dialog_GetWindowTextA Lib "user32" Alias "GetWindowTextA" (ByVal H As Long, ByVal S As String, ByVal N As Long) As Long
Private Declare Function dialog_GetDlgItem Lib "user32" Alias "GetDlgItem" (ByVal H As Long, ByVal Id As Long) As Long
Private Declare Function dialog_GetDlgCtrlID Lib "user32" Alias "GetDlgCtrlID" (ByVal H As Long) As Long
Private Declare Function dialog_GetWindow Lib "user32" Alias "GetWindow" (ByVal H As Long, ByVal Cmd As Long) As Long
Private Declare Function dialog_GetWindowLongA Lib "user32" Alias "GetWindowLongA" (ByVal H As Long, ByVal I As Long) As Long
Private Declare Function dialog_ShowWindow Lib "user32" Alias "ShowWindow" (ByVal H As Long, ByVal Cmd As Long) As Long
Private Declare Function dialog_SendMessageA Lib "user32" Alias "SendMessageA" (ByVal H As Long, ByVal M As Long, ByVal W As Long, ByVal L As Long) As Long
Private Declare Function dialog_RealIndirectA Lib "user32" Alias "MessageBoxIndirectA" (ByVal P As Long) As Long
Private Declare Function dialog_RealIndirectW Lib "user32" Alias "MessageBoxIndirectW" (ByVal P As Long) As Long
#End If

' Each address and window is kept in a Variant: a LongPtr in twinBASIC and VBA 7, a Long in VB6.
' Targets 0 and 1 are MessageBoxIndirectA and W, the guarded ones; 2 to 7 are refused.
Private dialog_Targets(7) As Variant
Private dialog_Saved(95) As Byte
Private dialog_Hook As Variant
Private dialog_Noted(7) As Variant
Private dialog_Guarded As Long
' The boxes answered, and the last one's title, text and button.
Private dialog_Count As Long
Private dialog_Title As String
Private dialog_Text As String
Private dialog_Button As Long
' The style the last MessageBoxIndirect call was given.
Private dialog_Style As Long

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

Private Function dialog_WindowText(ByVal H As Variant) As String
    Dim S As String, N As Long
    S = String$(1024, 0)
    N = dialog_GetWindowTextA(H, S, 1024)
    dialog_WindowText = Left$(S, N)
End Function

' Notes a top-level window of class #32770 that the thread creates.
Private Sub dialog_Created(ByVal H As Variant, ByVal Style As Long)
    Dim S As String, N As Long, I As Long
    If (Style And &H40000000) <> 0 Then Exit Sub
    S = String$(64, 0)
    N = dialog_GetClassNameA(H, S, 64)
    If Left$(S, N) <> "#32770" Then Exit Sub
    For I = 0 To 7
        If IsEmpty(dialog_Noted(I)) Then
            dialog_Noted(I) = H
            Exit Sub
        End If
    Next
End Sub

' Answers a noted window as it is activated: hides it, then ends it as the button.
Private Sub dialog_Activated(ByVal H As Variant)
    Dim I As Long, C As Variant, Id As Long, T As Long
    For I = 0 To 7
        If Not IsEmpty(dialog_Noted(I)) Then
            If dialog_Noted(I) = H Then Exit For
        End If
    Next
    If I > 7 Then Exit Sub
    dialog_Noted(I) = Empty
    If dialog_GetDlgItem(H, 2) <> 0 Then
        Id = 2
    Else
        C = dialog_GetWindow(H, 5)
        Do While C <> 0
            T = dialog_GetWindowLongA(C, -16) And &HF&
            If dialog_GetDlgCtrlID(C) <> 9 And (T = 0 Or T = 1) Then
                If dialog_ClassOf(C) = "Button" Then
                    Id = dialog_GetDlgCtrlID(C)
                    Exit Do
                End If
            End If
            C = dialog_GetWindow(C, 2)
        Loop
    End If
    dialog_Count = dialog_Count + 1
    dialog_Title = dialog_WindowText(H)
    C = dialog_GetDlgItem(H, 65535)
    If C <> 0 Then dialog_Text = dialog_WindowText(C) Else dialog_Text = ""
    dialog_Button = Id
    dialog_ShowWindow H, 0
    dialog_SendMessageA H, &H111, Id, dialog_GetDlgItem(H, Id)
End Sub

Private Function dialog_ClassOf(ByVal H As Variant) As String
    Dim S As String, N As Long
    S = String$(64, 0)
    N = dialog_GetClassNameA(H, S, 64)
    dialog_ClassOf = Left$(S, N)
End Function

' A style the guard refuses: one that shows the box on another desktop.
Private Function dialog_Refused(ByVal Style As Long) As Boolean
    dialog_Style = Style
    If (Style And &H260000) = 0 Then Exit Function
    dialog_Guarded = dialog_Guarded + 1
    dialog_SetLastError 87
    dialog_Refused = True
End Function

' The six MessageBox entry points no runtime calls: refused, whatever the style.
Private Function dialog_Box4(ByVal A As Long, ByVal B As Long, ByVal C As Long, ByVal D As Long) As Long
    dialog_Refused &H200000
End Function
Private Function dialog_Box5(ByVal A As Long, ByVal B As Long, ByVal C As Long, ByVal D As Long, ByVal E As Long) As Long
    dialog_Refused &H200000
End Function
Private Function dialog_Box6(ByVal A As Long, ByVal B As Long, ByVal C As Long, ByVal D As Long, ByVal E As Long, ByVal F As Long) As Long
    dialog_Refused &H200000
End Function

#If VBA7 Then
Private Function dialog_Address(ByVal A As LongPtr) As Variant
    dialog_Address = A
End Function

Private Function dialog_Cbt(ByVal Code As Long, ByVal W As LongPtr, ByVal L As LongPtr) As LongPtr
    Dim Cs As LongPtr, Style As Long
    If Code = 3 Then
        dialog_CopyMemory Cs, ByVal L, LenB(Cs)
        dialog_CopyMemory Style, ByVal Cs + 4 * LenB(Cs) + 16, 4
        dialog_Created W, Style
    ElseIf Code = 5 Then
        dialog_Activated W
    End If
    dialog_Cbt = dialog_CallNextHookEx(0, Code, W, L)
End Function

' MSGBOXPARAMS: cbSize, then hwndOwner, hInstance, lpszText and lpszCaption, then dwStyle.
Private Function dialog_GuardA(ByVal P As LongPtr) As Long
    Dim Style As Long
    dialog_CopyMemory Style, ByVal P + 4 * LenB(P) + LenB(P), 4
    If dialog_Refused(Style) Then Exit Function
    dialog_Put 0, False
    dialog_GuardA = dialog_RealIndirectA(P)
    dialog_Put 0, True
End Function

Private Function dialog_GuardW(ByVal P As LongPtr) As Long
    Dim Style As Long
    dialog_CopyMemory Style, ByVal P + 4 * LenB(P) + LenB(P), 4
    If dialog_Refused(Style) Then Exit Function
    dialog_Put 1, False
    dialog_GuardW = dialog_RealIndirectW(P)
    dialog_Put 1, True
End Function
#Else
Private Function dialog_Address(ByVal A As Long) As Variant
    dialog_Address = A
End Function

Private Function dialog_Cbt(ByVal Code As Long, ByVal W As Long, ByVal L As Long) As Long
    Dim Cs As Long, Style As Long
    If Code = 3 Then
        dialog_CopyMemory Cs, ByVal L, 4
        dialog_CopyMemory Style, ByVal Cs + 32, 4
        dialog_Created W, Style
    ElseIf Code = 5 Then
        dialog_Activated W
    End If
    dialog_Cbt = dialog_CallNextHookEx(0, Code, W, L)
End Function

Private Function dialog_GuardA(ByVal P As Long) As Long
    Dim Style As Long
    dialog_CopyMemory Style, ByVal P + 20, 4
    If dialog_Refused(Style) Then Exit Function
    dialog_Put 0, False
    dialog_GuardA = dialog_RealIndirectA(P)
    dialog_Put 0, True
End Function

Private Function dialog_GuardW(ByVal P As Long) As Long
    Dim Style As Long
    dialog_CopyMemory Style, ByVal P + 20, 4
    If dialog_Refused(Style) Then Exit Function
    dialog_Put 1, False
    dialog_GuardW = dialog_RealIndirectW(P)
    dialog_Put 1, True
End Function
#End If

' Writes target I's jump (On) or its original bytes back (not On).
Private Sub dialog_Put(ByVal I As Long, ByVal IsOn As Boolean)
    Static Jumps(95) As Byte
    Dim N As Long, Old As Long
    #If Win64 Then
        Dim P As LongPtr
        N = 12
    #Else
        Dim P As Long
        N = 7
    #End If
    If IsEmpty(dialog_Targets(I)) Then Exit Sub
    P = dialog_Targets(I)
    If IsOn Then
        dialog_CopyMemory ByVal P, Jumps(I * 12), N
    Else
        dialog_CopyMemory Jumps(I * 12), ByVal P, N
        dialog_CopyMemory ByVal P, dialog_Saved(I * 12), N
    End If
End Sub

' The jump to Fn: mov eax, Fn; jmp eax, or in 64-bit code mov rax, Fn; jmp rax.
Private Sub dialog_Patch(ByVal I As Long, ByVal Name As String, ByVal Fn As Variant)
    Dim B(11) As Byte, N As Long, Old As Long, Target As Variant
    Target = dialog_GetProcAddress(dialog_GetModuleHandleA("user32"), Name)
    If Target = 0 Then Exit Sub
    #If Win64 Then
        Dim F As LongPtr, P As LongPtr
        F = Fn
        B(0) = &H48: B(1) = &HB8
        dialog_CopyMemory B(2), F, 8
        B(10) = &HFF: B(11) = &HE0
        N = 12
    #Else
        Dim F As Long, P As Long
        F = Fn
        B(0) = &HB8
        dialog_CopyMemory B(1), F, 4
        B(5) = &HFF: B(6) = &HE0
        N = 7
    #End If
    P = Target
    dialog_VirtualProtect P, N, &H40, Old
    dialog_CopyMemory dialog_Saved(I * 12), ByVal P, N
    dialog_CopyMemory ByVal P, B(0), N
    dialog_Targets(I) = Target
End Sub

Private Sub dialog_Begin()
    Dim I As Long
    dialog_Count = 0
    dialog_Guarded = 0
    dialog_Title = ""
    dialog_Text = ""
    dialog_Button = 0
    dialog_Style = 0
    For I = 0 To 7
        dialog_Noted(I) = Empty
        dialog_Targets(I) = Empty
    Next
    dialog_Patch 0, "MessageBoxIndirectA", dialog_Address(AddressOf dialog_GuardA)
    dialog_Patch 1, "MessageBoxIndirectW", dialog_Address(AddressOf dialog_GuardW)
    dialog_Patch 2, "MessageBoxA", dialog_Address(AddressOf dialog_Box4)
    dialog_Patch 3, "MessageBoxW", dialog_Address(AddressOf dialog_Box4)
    dialog_Patch 4, "MessageBoxExA", dialog_Address(AddressOf dialog_Box5)
    dialog_Patch 5, "MessageBoxExW", dialog_Address(AddressOf dialog_Box5)
    dialog_Patch 6, "MessageBoxTimeoutA", dialog_Address(AddressOf dialog_Box6)
    dialog_Patch 7, "MessageBoxTimeoutW", dialog_Address(AddressOf dialog_Box6)
    dialog_Hook = dialog_SetWindowsHookExA(5, dialog_Address(AddressOf dialog_Cbt), 0, dialog_GetCurrentThreadId())
End Sub

Private Sub dialog_End()
    Dim I As Long, N As Long
    #If Win64 Then
        Dim P As LongPtr
        N = 12
    #Else
        Dim P As Long
        N = 7
    #End If
    If dialog_Hook <> 0 Then dialog_UnhookWindowsHookEx dialog_Hook
    dialog_Hook = 0
    For I = 7 To 0 Step -1
        If Not IsEmpty(dialog_Targets(I)) Then
            P = dialog_Targets(I)
            dialog_CopyMemory ByVal P, dialog_Saved(I * 12), N
            dialog_Targets(I) = Empty
        End If
    Next
    If dialog_Guarded <> 0 Then Err.Raise 1002, , "the guard refused a box for another desktop"
End Sub

' Raises 1001 when the case did not show Count boxes. Does nothing when it has already raised.
Private Sub dialog_Expect(ByVal Count As Long)
    If Err.Number <> 0 Then Exit Sub
    If dialog_Count <> Count Then Err.Raise 1001, , dialog_Count & " boxes shown, not " & Count
End Sub
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

Private Sub Report(ByVal Label As String, ByVal Returned As Variant)
    Print #9, Label & ": " & Err.Number & " " & Err.Description & ", boxes " & dialog_Count & ", returned " & Returned
    Err.Clear
End Sub

Sub Main()
    Dim V As Variant
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    dialog_Count = 0
    V = Empty
    V = Shell("cmd.exe /c exit", 9)
    Report "Shell_WindowStyle9_Runs", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = MsgBox("x", , , "help.hlp", 5)
    dialog_End
    Report "MsgBox_HelpFileAndContext_ShowsBox", V
    dialog_Count = 0
    V = Empty
    window_Begin
    AppActivate window_Title()
    window_End
    Report "AppActivate_VisibleWindow_Activates", V
    dialog_Count = 0
    V = Empty
    V = Shell("cmd.exe /c exit", 10)
    Report "Shell_WindowStyle10_Raises5", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = InputBox("x", , , 32768, 0)
    dialog_End
    Report "InputBox_XPos32768_Raises6", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = InputBox("x", , , 0, -32769)
    dialog_End
    Report "InputBox_YPosMinus32769_Raises6", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = MsgBox("x", , , , 5)
    dialog_End
    Report "MsgBox_ContextWithoutHelpFile_Raises5", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = InputBox("x", , , , , , 5)
    dialog_End
    Report "InputBox_ContextWithoutHelpFile_Raises5", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = MsgBox("x", 0, "t", Null)
    dialog_End
    Report "MsgBox_HelpFileNull_Raises5", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = InputBox("x", , , , , Null)
    dialog_End
    Report "InputBox_HelpFileNull_Raises5", V
    dialog_Count = 0
    V = Empty
    window_Begin
    window_Hide
    AppActivate window_Title()
    window_End
    Report "AppActivate_HiddenWindow_Raises5", V
    dialog_Count = 0
    V = Empty
    window_Begin
    AppActivate window_Title(), Null
    window_End
    Report "AppActivate_WaitNull_Raises94", V
    dialog_Count = 0
    V = Empty
    window_Begin
    AppActivate window_Title(), "x"
    window_End
    Report "AppActivate_WaitString_Raises13", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = MsgBox("x", 7)
    dialog_End
    Report "MsgBox_ButtonGroup7_Raises5", V
    dialog_Count = 0
    V = Empty
    dialog_Begin
    V = MsgBox("x", -1)
    dialog_End
    Report "MsgBox_StyleMinus1_Raises5", V
    Close #9
End Sub
