' The clock harness, for twinBASIC and VB6 alike: a case that sets Date, Date$, Time or
' Time$ runs with the system's clock setters replaced, so that what the runtime would set is
' recorded and the real clock is never changed. clock_Begin patches SetLocalTime and
' SetSystemTime (kernelbase and kernel32) with a jump to clock_FakeSet, which records the
' SYSTEMTIME and succeeds where the real setter would, and AdjustTokenPrivileges (kernelbase and advapi32), which
' VB6 calls first and twinBASIC does not, with one to clock_FakeAdjust, which succeeds.
' clock_End puts the original bytes back. The patch is of the probe's own process, and only
' its exe runs the cases. clock_Expect raises 1001 when the clock was not set to what the
' case expects. VB6 compiles only the #Else branches, so they hold what it cannot parse.

Private Type clock_SYSTEMTIME
    wYear As Integer
    wMonth As Integer
    wDayOfWeek As Integer
    wDay As Integer
    wHour As Integer
    wMinute As Integer
    wSecond As Integer
    wMilliseconds As Integer
End Type

#If TWINBASIC Then
Private Declare PtrSafe Function clock_GetModuleHandleA Lib "kernel32" Alias "GetModuleHandleA" (ByVal Name As String) As LongPtr
Private Declare PtrSafe Function clock_LoadLibraryA Lib "kernel32" Alias "LoadLibraryA" (ByVal Name As String) As LongPtr
Private Declare PtrSafe Function clock_GetProcAddress Lib "kernel32" Alias "GetProcAddress" (ByVal H As LongPtr, ByVal Name As String) As LongPtr
Private Declare PtrSafe Function clock_VirtualProtect Lib "kernel32" Alias "VirtualProtect" (ByVal A As LongPtr, ByVal S As LongPtr, ByVal P As Long, ByRef Old As Long) As Long
Private Declare PtrSafe Sub clock_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef D As Any, ByRef S As Any, ByVal N As LongPtr)
Private Declare PtrSafe Sub clock_SetLastError Lib "kernel32" Alias "SetLastError" (ByVal E As Long)
Private Declare PtrSafe Function clock_SystemTimeToFileTime Lib "kernel32" Alias "SystemTimeToFileTime" (ByRef St As clock_SYSTEMTIME, ByRef Ft As Currency) As Long
#Else
Private Declare Function clock_GetModuleHandleA Lib "kernel32" Alias "GetModuleHandleA" (ByVal Name As String) As Long
Private Declare Function clock_LoadLibraryA Lib "kernel32" Alias "LoadLibraryA" (ByVal Name As String) As Long
Private Declare Function clock_GetProcAddress Lib "kernel32" Alias "GetProcAddress" (ByVal H As Long, ByVal Name As String) As Long
Private Declare Function clock_VirtualProtect Lib "kernel32" Alias "VirtualProtect" (ByVal A As Long, ByVal S As Long, ByVal P As Long, ByRef Old As Long) As Long
Private Declare Sub clock_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef D As Any, ByRef S As Any, ByVal N As Long)
Private Declare Sub clock_SetLastError Lib "kernel32" Alias "SetLastError" (ByVal E As Long)
Private Declare Function clock_SystemTimeToFileTime Lib "kernel32" Alias "SystemTimeToFileTime" (ByRef St As clock_SYSTEMTIME, ByRef Ft As Currency) As Long
#End If

' Each address is kept in a Variant: a LongPtr in twinBASIC, a Long in VB6.
Private clock_Targets(5) As Variant
Private clock_Saved(71) As Byte
Private clock_Count As Long
Private clock_Hits As Long
Private clock_Last As clock_SYSTEMTIME

' Refuses what the real setters refuse: a time SystemTimeToFileTime cannot convert (a year
' outside 1601 to 30827, hour 24, February 30, ...) fails with ERROR_INVALID_PARAMETER.
Private Function clock_FakeSet(ByRef St As clock_SYSTEMTIME) As Long
    Dim Ft As Currency
    clock_Hits = clock_Hits + 1
    clock_Last = St
    If clock_SystemTimeToFileTime(St, Ft) = 0 Then
        clock_SetLastError 87
        Exit Function
    End If
    clock_FakeSet = 1
End Function

' AdjustTokenPrivileges' six parameters. Only VB6, a 32-bit runtime, calls it, so Long fits.
Private Function clock_FakeAdjust(ByVal Token As Long, ByVal DisableAll As Long, ByVal NewState As Long, ByVal BufferLength As Long, ByVal PreviousState As Long, ByVal ReturnLength As Long) As Long
    clock_SetLastError 0
    clock_FakeAdjust = 1
End Function

#If TWINBASIC Then
Private Function clock_Address(ByVal A As LongPtr) As Variant
    clock_Address = A
End Function
#Else
Private Function clock_Address(ByVal A As Long) As Variant
    clock_Address = A
End Function
#End If

' The jump to Fn: mov eax, Fn; jmp eax, or in 64-bit code mov rax, Fn; jmp rax.
Private Sub clock_Patch(ByVal Target As Variant, ByVal Fn As Variant)
    Dim B(11) As Byte, N As Long, Old As Long, I As Long
    If Target = 0 Then Exit Sub
    For I = 0 To clock_Count - 1
        If clock_Targets(I) = Target Then Exit Sub
    Next
    #If Win64 Then
        Dim F As LongPtr, P As LongPtr
        F = Fn
        B(0) = &H48: B(1) = &HB8
        clock_CopyMemory B(2), F, 8
        B(10) = &HFF: B(11) = &HE0
        N = 12
    #Else
        Dim F As Long, P As Long
        F = Fn
        B(0) = &HB8
        clock_CopyMemory B(1), F, 4
        B(5) = &HFF: B(6) = &HE0
        N = 7
    #End If
    P = Target
    clock_VirtualProtect P, N, &H40, Old
    clock_CopyMemory clock_Saved(clock_Count * 12), ByVal P, N
    clock_CopyMemory ByVal P, B(0), N
    clock_Targets(clock_Count) = Target
    clock_Count = clock_Count + 1
End Sub

Private Sub clock_Begin()
    Dim KB As Variant, K32 As Variant, Adv As Variant
    KB = clock_GetModuleHandleA("kernelbase")
    K32 = clock_GetModuleHandleA("kernel32")
    Adv = clock_LoadLibraryA("advapi32")
    clock_Hits = 0
    clock_Patch clock_GetProcAddress(KB, "SetLocalTime"), clock_Address(AddressOf clock_FakeSet)
    clock_Patch clock_GetProcAddress(KB, "SetSystemTime"), clock_Address(AddressOf clock_FakeSet)
    clock_Patch clock_GetProcAddress(K32, "SetLocalTime"), clock_Address(AddressOf clock_FakeSet)
    clock_Patch clock_GetProcAddress(K32, "SetSystemTime"), clock_Address(AddressOf clock_FakeSet)
    clock_Patch clock_GetProcAddress(KB, "AdjustTokenPrivileges"), clock_Address(AddressOf clock_FakeAdjust)
    clock_Patch clock_GetProcAddress(Adv, "AdjustTokenPrivileges"), clock_Address(AddressOf clock_FakeAdjust)
End Sub

Private Sub clock_End()
    Dim I As Long, N As Long
    #If Win64 Then
        Dim P As LongPtr
        N = 12
    #Else
        Dim P As Long
        N = 7
    #End If
    For I = 0 To clock_Count - 1
        P = clock_Targets(I)
        clock_CopyMemory ByVal P, clock_Saved(I * 12), N
    Next
    clock_Count = 0
End Sub

' Raises 1001 when the clock was not set, or its date part is not Day, or its time part is
' not Clock (each skipped when Null). Does nothing when the case has already raised.
Private Sub clock_Expect(ByVal Day As Variant, ByVal Clock As Variant)
    Dim D As Date, T As Date
    If Err.Number <> 0 Then Exit Sub
    If clock_Hits = 0 Then Err.Raise 1001, , "the clock was not set"
    D = DateSerial(clock_Last.wYear, clock_Last.wMonth, clock_Last.wDay)
    T = TimeSerial(clock_Last.wHour, clock_Last.wMinute, clock_Last.wSecond)
    If Not IsNull(Day) Then
        If D <> CDate(Day) Then Err.Raise 1001, , "the date was set to " & Format$(D, "yyyy-mm-dd")
    End If
    If Not IsNull(Clock) Then
        If T <> CDate(Clock) Then Err.Raise 1001, , "the time was set to " & Format$(T, "hh:nn:ss")
    End If
End Sub
