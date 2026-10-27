Attribute VB_Name = "Module1"
Option Explicit

' ---- the dialog harness, a copy of errors/harnesses/dialog.bas: it answers any box MsgBox or InputBox shows
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


' What VB6 raises for each argument the twinBASIC test cases give, in the same order.
' Build and run it with:  node scripts/bug_repro.mjs vb6 argument-errors-unspecified-error
' No case writes to the registry: GetSetting and DeleteSetting are given names that do not exist.

Private Sub Report(ByVal Label As String)
    Print #9, Label & ": " & Err.Number & " " & Err.Description
    Err.Clear
End Sub

Sub Main()
    Dim A() As Long, B(1 To 3) As Long, N As Long, S As String, V As Variant
    Dim O As Object, D As Object
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    N = LBound(A): Report "LBound_UnsizedArray"
    N = QBColor(16): Report "QBColor_Sixteen"
    S = Environ(Null): Report "Environ_Null"
    N = LBound(B, 0): Report "LBound_DimensionZero"
    N = UBound(B, 2): Report "UBound_DimensionPastRank"
    N = LBound(B, 32768): Report "LBound_Dimension32768"
    V = Switch(True, 1, False): Report "Switch_OddArguments"
    V = Partition(5, -1, 10, 1): Report "Partition_NegativeStart"
    V = Partition(5, 0, 10, 0): Report "Partition_IntervalZero"
    V = Partition("abc", 0, 10, 1): Report "Partition_StringNumber"
    V = Partition(1E+20, 0, 10, 1): Report "Partition_BeyondLongLong"
    S = Environ(0): Report "Environ_Zero"
    S = Environ(32767): Report "Environ_PositionWithNoEntry"
    S = Environ(""): Report "Environ_EmptyName"
    S = Environ(32768): Report "Environ_Above32767"
    Set O = GetObject(): Report "GetObject_NoArguments"
    Set D = CreateObject("Scripting.Dictionary")
    V = CallByName(D, "Count", 0): Report "CallByName_CallTypeZero"
    Set D = Nothing
    V = CallByName(D, "Count", VbGet): Report "CallByName_Nothing"
    S = GetSetting("", "Section", "Key"): Report "GetSetting_EmptyAppName"
    DeleteSetting "NoSuchApplication-argument-errors-unspecified-error": Report "DeleteSetting_MissingApplication"
    AppActivate "No such window: argument-errors-unspecified-error": Report "AppActivate_NoSuchWindow"
    V = Shell(""): Report "Shell_EmptyPath"
    V = Shell("no-such-program-argument-errors-unspecified-error.exe"): Report "Shell_MissingProgram"
    V = Shell("cmd.exe /c exit", 11): Report "Shell_WindowStyle11"
    dialog_Begin
    V = MsgBox("x", , , "help.hlp"): Report "MsgBox_HelpFileWithoutContext"
    V = InputBox("x", , , , , "help.hlp"): Report "InputBox_HelpFileWithoutContext"
    dialog_End
    SendKeys "{BAD}": Report "SendKeys_UnknownKeyCode"
    SendKeys "", Null: Report "SendKeys_WaitNull"
    Close #9
End Sub
