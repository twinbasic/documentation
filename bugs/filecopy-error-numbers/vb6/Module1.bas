Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/filecopy-error-numbers: the cases of src/Sources/RegressionTests.twin, in the same
' order, each printing the error VB6 raises and, where the case checks it, whether the file
' is as the case expects. Build and run it with:
'     node scripts/bug_repro.mjs vb6 filecopy-error-numbers
' ---- a copy of errors/harnesses/files.bas (twinBASIC documentation): each case runs in a
' folder of its own under the temporary folder, made the current directory and filled with
' a.txt (10 bytes), empty.txt, ro.txt (read-only), hid.txt (hidden), the empty folder sub and
' the folder full holding f.txt, and the folder is deleted after it.
' The files harness, for twinBASIC, VB6 and VBA alike: every case that touches the file system
' runs in a folder of its own. files_Begin makes the folder files_Dir, tbdocsErrorsProbe and the
' process id under the temporary folder (the four runtimes run at once), fills it with the
' fixtures below and makes it the current directory, so that a case names its files relatively
' ("a.txt"). files_End closes every file the case left open, puts the current directory back,
' and deletes the folder with everything in it, read-only, hidden and system files included.
' The error the case raised is kept: files_End raises it again, with its description.
'
' The fixtures: a.txt (abc, CR LF, def, CR LF: 10 bytes), empty.txt (0 bytes), ro.txt (x,
' read-only), hid.txt (x, hidden), the empty folder sub, and the folder full holding f.txt (x).
'
' files_Begin raises 1003 when it cannot make the folder or make it current, and the case is
' then skipped (its setup failed), so that no case runs with a relative name in another folder.
' The folder and the files are made with Windows' own calls, never with a statement under test,
' except the fixtures' contents, written with Open and Print #. Nothing is deleted outside
' files_Dir: files_Clear refuses a path that does not end in the folder's own name.
'
' files_Attr(name) is GetFileAttributesW of a name, -1 when it does not exist;
' files_Expect Cond raises 1001 when Cond is False and the case has raised nothing;
' files_NoDrive is a drive letter no drive has. VBA7 is true in twinBASIC and in VBA 7; VB6
' compiles only the #Else branch.

#If VBA7 Then
Private Declare PtrSafe Function files_GetCurrentProcessId Lib "kernel32" Alias "GetCurrentProcessId" () As Long
Private Declare PtrSafe Function files_GetTempPath Lib "kernel32" Alias "GetTempPathW" (ByVal Size As Long, ByVal Buffer As LongPtr) As Long
Private Declare PtrSafe Function files_GetCurrentDirectory Lib "kernel32" Alias "GetCurrentDirectoryW" (ByVal Size As Long, ByVal Buffer As LongPtr) As Long
Private Declare PtrSafe Function files_SetCurrentDirectory Lib "kernel32" Alias "SetCurrentDirectoryW" (ByVal Path As LongPtr) As Long
Private Declare PtrSafe Function files_CreateDirectory Lib "kernel32" Alias "CreateDirectoryW" (ByVal Path As LongPtr, ByVal Security As LongPtr) As Long
Private Declare PtrSafe Function files_RemoveDirectory Lib "kernel32" Alias "RemoveDirectoryW" (ByVal Path As LongPtr) As Long
Private Declare PtrSafe Function files_DeleteFile Lib "kernel32" Alias "DeleteFileW" (ByVal Path As LongPtr) As Long
Private Declare PtrSafe Function files_GetFileAttributes Lib "kernel32" Alias "GetFileAttributesW" (ByVal Path As LongPtr) As Long
Private Declare PtrSafe Function files_SetFileAttributes Lib "kernel32" Alias "SetFileAttributesW" (ByVal Path As LongPtr, ByVal Attributes As Long) As Long
Private Declare PtrSafe Function files_FindFirstFile Lib "kernel32" Alias "FindFirstFileW" (ByVal Pattern As LongPtr, ByVal Data As LongPtr) As LongPtr
Private Declare PtrSafe Function files_FindNextFile Lib "kernel32" Alias "FindNextFileW" (ByVal Find As LongPtr, ByVal Data As LongPtr) As Long
Private Declare PtrSafe Function files_FindClose Lib "kernel32" Alias "FindClose" (ByVal Find As LongPtr) As Long
Private Declare PtrSafe Function files_GetLogicalDrives Lib "kernel32" Alias "GetLogicalDrives" () As Long
Private Declare PtrSafe Sub files_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal Dest As LongPtr, ByVal Source As LongPtr, ByVal Length As LongPtr)
#Else
Private Declare Function files_GetCurrentProcessId Lib "kernel32" Alias "GetCurrentProcessId" () As Long
Private Declare Function files_GetTempPath Lib "kernel32" Alias "GetTempPathW" (ByVal Size As Long, ByVal Buffer As Long) As Long
Private Declare Function files_GetCurrentDirectory Lib "kernel32" Alias "GetCurrentDirectoryW" (ByVal Size As Long, ByVal Buffer As Long) As Long
Private Declare Function files_SetCurrentDirectory Lib "kernel32" Alias "SetCurrentDirectoryW" (ByVal Path As Long) As Long
Private Declare Function files_CreateDirectory Lib "kernel32" Alias "CreateDirectoryW" (ByVal Path As Long, ByVal Security As Long) As Long
Private Declare Function files_RemoveDirectory Lib "kernel32" Alias "RemoveDirectoryW" (ByVal Path As Long) As Long
Private Declare Function files_DeleteFile Lib "kernel32" Alias "DeleteFileW" (ByVal Path As Long) As Long
Private Declare Function files_GetFileAttributes Lib "kernel32" Alias "GetFileAttributesW" (ByVal Path As Long) As Long
Private Declare Function files_SetFileAttributes Lib "kernel32" Alias "SetFileAttributesW" (ByVal Path As Long, ByVal Attributes As Long) As Long
Private Declare Function files_FindFirstFile Lib "kernel32" Alias "FindFirstFileW" (ByVal Pattern As Long, ByVal Data As Long) As Long
Private Declare Function files_FindNextFile Lib "kernel32" Alias "FindNextFileW" (ByVal Find As Long, ByVal Data As Long) As Long
Private Declare Function files_FindClose Lib "kernel32" Alias "FindClose" (ByVal Find As Long) As Long
Private Declare Function files_GetLogicalDrives Lib "kernel32" Alias "GetLogicalDrives" () As Long
Private Declare Sub files_CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByVal Dest As Long, ByVal Source As Long, ByVal Length As Long)
#End If

' The current directory before the case, put back by files_End.
Private files_Saved As String

Private Function files_Name() As String
    files_Name = "tbdocsErrorsProbe" & files_GetCurrentProcessId()
End Function

' The case's folder: the temporary folder's path, with no backslash at its end.
Private Function files_Dir() As String
    Dim B As String, N As Long
    B = String$(1024, vbNullChar)
    N = files_GetTempPath(1024, StrPtr(B))
    B = Left$(B, N)
    If Right$(B, 1) = "\" Then B = Left$(B, Len(B) - 1)
    files_Dir = B & "\" & files_Name()
End Function

Private Function files_Attr(ByVal Path As String) As Long
    files_Attr = files_GetFileAttributes(StrPtr(Path))
End Function

Private Sub files_Expect(ByVal Cond As Boolean)
    If Err.Number <> 0 Then Exit Sub
    If Not Cond Then Err.Raise 1001, , "files_Expect: not as expected"
End Sub

' A drive letter that no drive has, from Z down.
Private Function files_NoDrive() As String
    Dim Mask As Long, I As Long
    Mask = files_GetLogicalDrives()
    For I = 25 To 3 Step -1
        If (Mask And (2 ^ I)) = 0 Then files_NoDrive = Chr$(65 + I): Exit Function
    Next
End Function

' Deletes Path and everything in it, whatever their attributes.
Private Sub files_DeleteTree(ByVal Path As String)
    Dim Data(0 To 599) As Byte, Pattern As String, Nm As String, Attr As Long, N As Long
    Dim H As Variant, Names() As String, Dirs() As Boolean, Count As Long, I As Long
    ReDim Names(0 To 15): ReDim Dirs(0 To 15)
    Pattern = Path & "\*"
    H = files_FindFirstFile(StrPtr(Pattern), VarPtr(Data(0)))
    If H <> -1 Then
        Do
            Nm = String$(260, vbNullChar)
            files_CopyMemory StrPtr(Nm), VarPtr(Data(44)), 520
            N = InStr(Nm, vbNullChar)
            If N > 0 Then Nm = Left$(Nm, N - 1)
            files_CopyMemory VarPtr(Attr), VarPtr(Data(0)), 4
            If Nm <> "." And Nm <> ".." Then
                If Count > UBound(Names) Then ReDim Preserve Names(0 To Count * 2): ReDim Preserve Dirs(0 To Count * 2)
                Names(Count) = Nm
                Dirs(Count) = (Attr And 16) <> 0 And (Attr And &H400) = 0
                Count = Count + 1
            End If
        Loop While files_FindNextFile(H, VarPtr(Data(0))) <> 0
        files_FindClose H
    End If
    For I = 0 To Count - 1
        Nm = Path & "\" & Names(I)
        files_SetFileAttributes StrPtr(Nm), 128
        If Dirs(I) Then files_DeleteTree Nm Else files_DeleteFile StrPtr(Nm)
    Next
    files_SetFileAttributes StrPtr(Path), 128
    files_RemoveDirectory StrPtr(Path)
End Sub

' Closes every file, puts the current directory back and deletes the folder.
Private Sub files_Clear()
    Dim D As String
    Close
    If Len(files_Saved) Then files_SetCurrentDirectory StrPtr(files_Saved)
    D = files_Dir()
    If Right$(D, Len(files_Name()) + 1) <> "\" & files_Name() Then Exit Sub
    If files_Attr(D) <> -1 Then files_DeleteTree D
End Sub

Private Sub files_Make(ByVal Path As String, ByVal Contents As String, ByVal Attr As Long)
    Dim F As Integer
    F = FreeFile
    Open Path For Output As #F
    Print #F, Contents;
    Close #F
    If Attr <> 0 Then files_SetFileAttributes StrPtr(Path), Attr
End Sub

Private Sub files_Begin()
    Dim D As String, B As String, N As Long
    B = String$(1024, vbNullChar)
    N = files_GetCurrentDirectory(1024, StrPtr(B))
    files_Saved = Left$(B, N)
    files_Clear
    D = files_Dir()
    If files_CreateDirectory(StrPtr(D), 0) = 0 Then Err.Raise 1003, , "files_Begin: cannot make " & D: Exit Sub
    If files_SetCurrentDirectory(StrPtr(D)) = 0 Then Err.Raise 1003, , "files_Begin: cannot enter " & D: Exit Sub
    files_Make D & "\a.txt", "abc" & vbCrLf & "def" & vbCrLf, 0
    files_Make D & "\empty.txt", "", 0
    files_Make D & "\ro.txt", "x", 1
    files_Make D & "\hid.txt", "x", 2
    files_CreateDirectory StrPtr(D & "\sub"), 0
    files_CreateDirectory StrPtr(D & "\full"), 0
    files_Make D & "\full\f.txt", "x", 0
End Sub

Private Sub files_End()
    Dim N As Long, D As String
    N = Err.Number: D = Err.Description
    files_Clear
    If N <> 0 Then Err.Raise N, , D
End Sub

' out.txt is opened for each line: the harness closes every file after a case.
Private Sub Report(ByVal Label As String, ByVal Check As String)
    Dim F As Integer
    F = FreeFile
    Open App.Path & "\out.txt" For Append As #F
    Print #F, Label & ": " & Err.Number & " " & Err.Description & Check
    Close #F
End Sub

Sub Main()
    Dim V As Variant, Holds As Boolean
    On Error Resume Next
    Kill App.Path & "\out.txt"

    Err.Clear
    V = Empty
    files_Begin
    FileCopy "nosuch.txt", "b.txt"
    files_End
    Report "FileCopy_MissingSource_Raises53", ""

    Err.Clear
    V = Empty
    files_Begin
    Open "a.txt" For Append As #1
    FileCopy "a.txt", "b.txt"
    files_End
    Report "FileCopy_SourceOpenForAppend_Raises55", ""

    Err.Clear
    V = Empty
    files_Begin
    FileCopy "a.txt", "a.txt"
    files_End
    Report "FileCopy_OntoItself_Raises70", ""

    Err.Clear
    V = Empty
    files_Begin
    FileCopy "a.txt", "A.TXT"
    files_End
    Report "FileCopy_OntoItselfOtherCase_Raises70", ""

    Err.Clear
    V = Empty
    files_Begin
    Open "a.txt" For Input Lock Read As #1
    FileCopy "a.txt", "b.txt"
    files_End
    Report "FileCopy_SourceOpenLockRead_Raises70", ""

    Err.Clear
    V = Empty
    files_Begin
    FileCopy "sub", "b.txt"
    files_End
    Report "FileCopy_SourceFolder_Raises75", ""

    Err.Clear
    V = Empty
    files_Begin
    FileCopy "a.txt", "sub"
    files_End
    Report "FileCopy_DestinationFolder_Raises75", ""

    Err.Clear
    V = Empty
    files_Begin
    FileCopy "a.txt", "ro.txt"
    Holds = FileLen("ro.txt") = 1
    files_End
    Report "FileCopy_DestinationReadOnly_Raises75", " (check " & IIf(Holds, "holds", "fails") & ")"

    Err.Clear
    V = Empty
    files_Begin
    FileCopy "a.txt", "hid.txt"
    Holds = FileLen("hid.txt") = 1
    files_End
    Report "FileCopy_DestinationHidden_Raises75", " (check " & IIf(Holds, "holds", "fails") & ")"
End Sub
