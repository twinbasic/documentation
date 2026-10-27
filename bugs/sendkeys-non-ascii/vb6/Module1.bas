Attribute VB_Name = "Module1"
Option Explicit

' The key events VB6 sends for each string of the twinBASIC test cases, in the same order.
' Build and run it with:  node scripts/bug_repro.mjs vb6 sendkeys-non-ascii
' ---- a copy of errors/harnesses/keys.bas (twinBASIC documentation): it records the key
' events SendKeys would send, and sends none.
' The keys harness, for twinBASIC, VB6 and VBA alike: a case that calls SendKeys runs with
' the calls that inject input replaced, so that the key events are recorded and none is sent.
' twinBASIC sends each key down and up with keybd_event; VB6 and VBA first set a journal
' playback hook (SetWindowsHookExW, WH_JOURNALPLAYBACK), which Windows refuses to a process
' without UIAccess, and then send one event at a time with SendInput. keys_Begin patches
' keybd_event and SendInput with fakes that record each event and succeed, and
' SetWindowsHookExA and W with one that refuses a journal playback hook (ERROR_ACCESS_DENIED,
' as Windows does) and passes any other hook to the real function (its bytes put back for
' the call). keys_End puts the bytes back. keys_Expect raises 1001 when the events recorded
' are not the ones given: each `<virtual key in hex><d|u>`, down or up, space-separated
' ("10d 41d 41u 10u" for "+a"), or `U<character code in hex><d|u>` for one SendInput sends
' as a character (KEYEVENTF_UNICODE). VBA7 is true in twinBASIC and in VBA 7; VB6 compiles
' only the #Else branches, so they hold what it cannot parse.

#If VBA7 Then
Private Declare PtrSafe Function keys_GetModuleHandleA Lib "kernel32" Alias "GetModuleHandleA" (ByVal Name As String) As LongPtr
Private Declare PtrSafe Function keys_GetProcAddress Lib "kernel32" Alias "GetProcAddress" (ByVal H As LongPtr, ByVal Name As String) As LongPtr
Private Declare PtrSafe Function keys_VirtualProtect Lib "kernel32" Alias "VirtualProtect" (ByVal A As LongPtr, ByVal S As LongPtr, ByVal P As Long, ByRef Old As Long) As Long
Private Declare PtrSafe Sub keys_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef D As Any, ByRef S As Any, ByVal N As LongPtr)
Private Declare PtrSafe Sub keys_SetLastError Lib "kernel32" Alias "SetLastError" (ByVal E As Long)
Private Declare PtrSafe Function keys_RealHookA Lib "user32" Alias "SetWindowsHookExA" (ByVal Id As Long, ByVal Fn As LongPtr, ByVal M As LongPtr, ByVal T As Long) As LongPtr
Private Declare PtrSafe Function keys_RealHookW Lib "user32" Alias "SetWindowsHookExW" (ByVal Id As Long, ByVal Fn As LongPtr, ByVal M As LongPtr, ByVal T As Long) As LongPtr
#Else
Private Declare Function keys_GetModuleHandleA Lib "kernel32" Alias "GetModuleHandleA" (ByVal Name As String) As Long
Private Declare Function keys_GetProcAddress Lib "kernel32" Alias "GetProcAddress" (ByVal H As Long, ByVal Name As String) As Long
Private Declare Function keys_VirtualProtect Lib "kernel32" Alias "VirtualProtect" (ByVal A As Long, ByVal S As Long, ByVal P As Long, ByRef Old As Long) As Long
Private Declare Sub keys_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef D As Any, ByRef S As Any, ByVal N As Long)
Private Declare Sub keys_SetLastError Lib "kernel32" Alias "SetLastError" (ByVal E As Long)
Private Declare Function keys_RealHookA Lib "user32" Alias "SetWindowsHookExA" (ByVal Id As Long, ByVal Fn As Long, ByVal M As Long, ByVal T As Long) As Long
Private Declare Function keys_RealHookW Lib "user32" Alias "SetWindowsHookExW" (ByVal Id As Long, ByVal Fn As Long, ByVal M As Long, ByVal T As Long) As Long
#End If

' Each address is kept in a Variant: a LongPtr in twinBASIC and VBA 7, a Long in VB6.
' Targets: 0 keybd_event, 1 SendInput, 2 SetWindowsHookExA, 3 SetWindowsHookExW.
Private keys_Targets(3) As Variant
Private keys_Saved(47) As Byte
Private keys_Jumps(47) As Byte
Private keys_Sent As String

Private Sub keys_Record(ByVal Text As String)
    If Len(keys_Sent) Then keys_Sent = keys_Sent & " "
    keys_Sent = keys_Sent & Text
End Sub

Private Sub keys_FakeEvent(ByVal Vk As Long, ByVal Scan As Long, ByVal Flags As Long, ByVal Extra As Long)
    keys_Record Hex$(Vk And &HFF&) & IIf((Flags And 2) <> 0, "u", "d")
End Sub

#If VBA7 Then
Private Function keys_Address(ByVal A As LongPtr) As Variant
    keys_Address = A
End Function

' INPUT: type, then (aligned to a pointer in 64-bit code) KEYBDINPUT: wVk, wScan, dwFlags.
Private Function keys_FakeInput(ByVal N As Long, ByVal P As LongPtr, ByVal Size As Long) As Long
    Dim I As Long, Kind As Long, Vk As Integer, Scan As Integer, Flags As Long, At As LongPtr
    For I = 0 To N - 1
        At = P + I * Size
        keys_CopyMemory Kind, ByVal At, 4
        If Kind = 1 Then
            At = At + LenB(P)
            keys_CopyMemory Vk, ByVal At, 2
            keys_CopyMemory Scan, ByVal At + 2, 2
            keys_CopyMemory Flags, ByVal At + 4, 4
            keys_RecordInput Vk, Scan, Flags
        End If
    Next
    keys_FakeInput = N
End Function

Private Function keys_FakeHookA(ByVal Id As Long, ByVal Fn As LongPtr, ByVal M As LongPtr, ByVal T As Long) As LongPtr
    If Id = 1 Then keys_SetLastError 5: Exit Function
    keys_Put 2, False
    keys_FakeHookA = keys_RealHookA(Id, Fn, M, T)
    keys_Put 2, True
End Function

Private Function keys_FakeHookW(ByVal Id As Long, ByVal Fn As LongPtr, ByVal M As LongPtr, ByVal T As Long) As LongPtr
    If Id = 1 Then keys_SetLastError 5: Exit Function
    keys_Put 3, False
    keys_FakeHookW = keys_RealHookW(Id, Fn, M, T)
    keys_Put 3, True
End Function
#Else
Private Function keys_Address(ByVal A As Long) As Variant
    keys_Address = A
End Function

Private Function keys_FakeInput(ByVal N As Long, ByVal P As Long, ByVal Size As Long) As Long
    Dim I As Long, Kind As Long, Vk As Integer, Scan As Integer, Flags As Long, At As Long
    For I = 0 To N - 1
        At = P + I * Size
        keys_CopyMemory Kind, ByVal At, 4
        If Kind = 1 Then
            At = At + 4
            keys_CopyMemory Vk, ByVal At, 2
            keys_CopyMemory Scan, ByVal At + 2, 2
            keys_CopyMemory Flags, ByVal At + 4, 4
            keys_RecordInput Vk, Scan, Flags
        End If
    Next
    keys_FakeInput = N
End Function

Private Function keys_FakeHookA(ByVal Id As Long, ByVal Fn As Long, ByVal M As Long, ByVal T As Long) As Long
    If Id = 1 Then keys_SetLastError 5: Exit Function
    keys_Put 2, False
    keys_FakeHookA = keys_RealHookA(Id, Fn, M, T)
    keys_Put 2, True
End Function

Private Function keys_FakeHookW(ByVal Id As Long, ByVal Fn As Long, ByVal M As Long, ByVal T As Long) As Long
    If Id = 1 Then keys_SetLastError 5: Exit Function
    keys_Put 3, False
    keys_FakeHookW = keys_RealHookW(Id, Fn, M, T)
    keys_Put 3, True
End Function
#End If

' KEYEVENTF_KEYUP is 2, KEYEVENTF_UNICODE 4 (the character in wScan).
Private Sub keys_RecordInput(ByVal Vk As Integer, ByVal Scan As Integer, ByVal Flags As Long)
    Dim UpDown As String
    UpDown = IIf((Flags And 2) <> 0, "u", "d")
    If (Flags And 4) <> 0 Then
        keys_Record "U" & Hex$(Scan And &HFFFF&) & UpDown
    Else
        keys_Record Hex$(Vk And &HFF&) & UpDown
    End If
End Sub

' Writes target I's jump (IsOn) or its original bytes back (not IsOn).
Private Sub keys_Put(ByVal I As Long, ByVal IsOn As Boolean)
    Dim N As Long
    #If Win64 Then
        Dim P As LongPtr
        N = 12
    #Else
        Dim P As Long
        N = 7
    #End If
    If IsEmpty(keys_Targets(I)) Then Exit Sub
    P = keys_Targets(I)
    If IsOn Then
        keys_CopyMemory ByVal P, keys_Jumps(I * 12), N
    Else
        keys_CopyMemory ByVal P, keys_Saved(I * 12), N
    End If
End Sub

' The jump to Fn: mov eax, Fn; jmp eax, or in 64-bit code mov rax, Fn; jmp rax.
Private Sub keys_Patch(ByVal I As Long, ByVal Name As String, ByVal Fn As Variant)
    Dim N As Long, Old As Long, Target As Variant
    Target = keys_GetProcAddress(keys_GetModuleHandleA("user32"), Name)
    If Target = 0 Then Exit Sub
    #If Win64 Then
        Dim F As LongPtr, P As LongPtr
        F = Fn
        keys_Jumps(I * 12) = &H48: keys_Jumps(I * 12 + 1) = &HB8
        keys_CopyMemory keys_Jumps(I * 12 + 2), F, 8
        keys_Jumps(I * 12 + 10) = &HFF: keys_Jumps(I * 12 + 11) = &HE0
        N = 12
    #Else
        Dim F As Long, P As Long
        F = Fn
        keys_Jumps(I * 12) = &HB8
        keys_CopyMemory keys_Jumps(I * 12 + 1), F, 4
        keys_Jumps(I * 12 + 5) = &HFF: keys_Jumps(I * 12 + 6) = &HE0
        N = 7
    #End If
    P = Target
    keys_VirtualProtect P, N, &H40, Old
    keys_CopyMemory keys_Saved(I * 12), ByVal P, N
    keys_Targets(I) = Target
    keys_Put I, True
End Sub

Private Sub keys_Begin()
    Dim I As Long
    keys_Sent = ""
    For I = 0 To 3
        keys_Targets(I) = Empty
    Next
    keys_Patch 0, "keybd_event", keys_Address(AddressOf keys_FakeEvent)
    keys_Patch 1, "SendInput", keys_Address(AddressOf keys_FakeInput)
    keys_Patch 2, "SetWindowsHookExA", keys_Address(AddressOf keys_FakeHookA)
    keys_Patch 3, "SetWindowsHookExW", keys_Address(AddressOf keys_FakeHookW)
End Sub

Private Sub keys_End()
    Dim I As Long
    For I = 3 To 0 Step -1
        keys_Put I, False
        keys_Targets(I) = Empty
    Next
End Sub

' Forgets the events recorded so far. VB6 and VBA keep the keys of a string they refuse and send
' them with the next SendKeys: a case after a refused one sends those first (SendKeys "") and
' clears them, in its setup.
Private Sub keys_Clear()
    keys_Sent = ""
End Sub

' Raises 1001 when the events recorded are not Keys. Does nothing when the case has already raised.
Private Sub keys_Expect(ByVal Keys As String)
    If Err.Number <> 0 Then Exit Sub
    If keys_Sent <> Keys Then Err.Raise 1001, , "sent " & IIf(keys_Sent = "", "nothing", keys_Sent)
End Sub

Sub Main()
    Open App.Path & "\out.txt" For Output As #9
    On Error Resume Next
    keys_Begin
    SendKeys "a"
    keys_End
    Print #9, "SendKeys_LowerA_SendsA: " & Err.Number & " " & keys_Sent
    Err.Clear
    keys_Begin
    SendKeys "A"
    keys_End
    Print #9, "SendKeys_UpperA_SendsShiftA: " & Err.Number & " " & keys_Sent
    Err.Clear
    keys_Begin
    SendKeys ChrW(&HE9)
    keys_End
    Print #9, "SendKeys_EAcute_SendsTheCharacter: " & Err.Number & " " & keys_Sent
    Err.Clear
    keys_Begin
    SendKeys ChrW(&H263A)
    keys_End
    Print #9, "SendKeys_WhiteSmilingFace_SendsTheCharacter: " & Err.Number & " " & keys_Sent
    Err.Clear
    keys_Begin
    SendKeys ChrW(&H100)
    keys_End
    Print #9, "SendKeys_AMacron_SendsTheCharacter: " & Err.Number & " " & keys_Sent
    Err.Clear
    Close #9
End Sub
