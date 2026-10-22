' The registry harness, for twinBASIC, VB6 and VBA alike: a case that calls SaveSetting,
' GetSetting, GetAllSettings or DeleteSetting names the application registry_App
' (tbdocsErrorsProbe and the process id), and
' registry_Begin and registry_End delete that application's whole key, with every section and
' subkey under it, from HKEY_CURRENT_USER\Software\VB and VBA Program Settings, so nothing a
' case writes stays in the registry. DeleteSetting cannot do it: VB6 and VBA raise error 5 for
' an application or section that has a subkey. SHDeleteKeyW deletes the tree. The error the
' case raised is kept: registry_End raises it again, with its description, once the key is
' gone. A case's setup may save the settings it reads. VBA7 is true in twinBASIC and in VBA 7;
' VB6 compiles only the #Else branch.

#If VBA7 Then
Private Declare PtrSafe Function registry_SHDeleteKey Lib "shlwapi" Alias "SHDeleteKeyW" (ByVal hKey As LongPtr, ByVal SubKey As LongPtr) As Long
Private Declare PtrSafe Function registry_GetCurrentProcessId Lib "kernel32" Alias "GetCurrentProcessId" () As Long
#Else
Private Declare Function registry_SHDeleteKey Lib "shlwapi" Alias "SHDeleteKeyW" (ByVal hKey As Long, ByVal SubKey As Long) As Long
Private Declare Function registry_GetCurrentProcessId Lib "kernel32" Alias "GetCurrentProcessId" () As Long
#End If

' The application's name ends in the process id: errors.mjs run probes every runtime at once,
' and a runtime's cleanup must never delete what another runtime's case has just saved.
Private Function registry_App() As String
    registry_App = "tbdocsErrorsProbe" & registry_GetCurrentProcessId()
End Function

' HKEY_CURRENT_USER, &H80000001, sign-extended in a 64-bit build as Windows defines it.
Private Sub registry_Clear()
    Dim Path As String
    Path = "Software\VB and VBA Program Settings\" & registry_App
    registry_SHDeleteKey &H80000001, StrPtr(Path)
End Sub

Private Sub registry_Begin()
    Dim N As Long, D As String
    N = Err.Number: D = Err.Description
    registry_Clear
    If N <> 0 Then Err.Raise N, , D
End Sub

Private Sub registry_End()
    Dim N As Long, D As String
    N = Err.Number: D = Err.Description
    registry_Clear
    If N <> 0 Then Err.Raise N, , D
End Sub
