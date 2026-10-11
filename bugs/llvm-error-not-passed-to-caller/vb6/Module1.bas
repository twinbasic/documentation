Attribute VB_Name = "Module1"
Option Explicit

' The VB6 side of bugs/llvm-error-not-passed-to-caller: the cases of src/Sources/Cases.twin, each
' printed with what its handler catches in VB6. VB6 has no LLVM, so the procedures that the twinBASIC
' project compiles with [CompilerOptions("+llvm")] are ordinary procedures here, and every case is caught.
' Build and run it with:  node scripts/bug_repro.mjs vb6 llvm-error-not-passed-to-caller

Sub Main()
    On Error GoTo Fail
    Open App.Path & "\out.txt" For Output As #9
    Show "CallerPlain_CalleePlain_ErrRaise", CallerPlain_CalleePlain_ErrRaise()
    Show "CallerPlain_CalleePlain_Divide", CallerPlain_CalleePlain_Divide()
    Show "Llvm_OwnHandler_Divide", Llvm_OwnHandler_Divide()
    Show "CallerPlain_CalleeLlvm_ErrRaise", CallerPlain_CalleeLlvm_ErrRaise()
    Show "CallerLlvm_CalleePlain_ErrRaise", CallerLlvm_CalleePlain_ErrRaise()
    Show "CallerLlvm_CalleeLlvm_ErrRaise", CallerLlvm_CalleeLlvm_ErrRaise()
    Show "CallerPlain_CalleeLlvm_Divide", CallerPlain_CalleeLlvm_Divide()
    Show "CallerLlvm_CalleePlain_Divide", CallerLlvm_CalleePlain_Divide()
    Show "CallerLlvm_CalleeLlvm_Divide", CallerLlvm_CalleeLlvm_Divide()
    Show "CallerPlain_CalleeLlvm_ResumeNext", CallerPlain_CalleeLlvm_ResumeNext()
    Show "CallerLlvm_CalleePlain_ResumeNext", CallerLlvm_CalleePlain_ResumeNext()
    Show "CallerPlain_MiddlePlain_CalleeLlvm", CallerPlain_MiddlePlain_CalleeLlvm()
    Close #9
    Exit Sub
Fail:
    On Error Resume Next
    Print #9, "unhandled error " & Err.Number & ": " & Err.Description
    Close #9
End Sub

Private Sub Show(ByVal name As String, ByVal result As String)
    Print #9, name & ": " & result
End Sub

' --- The callees: none of them has an error handler ------------------------------------------

Private Sub ErrRaise_Plain()
    Err.Raise 5000, "Callee", "raised by Err.Raise"
End Sub

Private Sub ErrRaise_Llvm()
    Err.Raise 5000, "Callee", "raised by Err.Raise"
End Sub

Private Sub Divide_Plain(ByVal divisor As Long)
    Dim x As Long
    x = 1 \ divisor
End Sub

Private Sub Divide_Llvm(ByVal divisor As Long)
    Dim x As Long
    x = 1 \ divisor
End Sub

Private Sub Middle_Plain()
    ErrRaise_Llvm
End Sub

' --- The callers: each has an On Error GoTo handler and returns what it caught ---------------

Public Function CallerPlain_CalleePlain_ErrRaise() As String
    On Error GoTo Handler
    ErrRaise_Plain
    CallerPlain_CalleePlain_ErrRaise = "no error"
    Exit Function
Handler:
    CallerPlain_CalleePlain_ErrRaise = "caught " & Err.Number
End Function

Public Function CallerPlain_CalleeLlvm_ErrRaise() As String
    On Error GoTo Handler
    ErrRaise_Llvm
    CallerPlain_CalleeLlvm_ErrRaise = "no error"
    Exit Function
Handler:
    CallerPlain_CalleeLlvm_ErrRaise = "caught " & Err.Number
End Function

Public Function CallerLlvm_CalleePlain_ErrRaise() As String
    On Error GoTo Handler
    ErrRaise_Plain
    CallerLlvm_CalleePlain_ErrRaise = "no error"
    Exit Function
Handler:
    CallerLlvm_CalleePlain_ErrRaise = "caught " & Err.Number
End Function

Public Function CallerLlvm_CalleeLlvm_ErrRaise() As String
    On Error GoTo Handler
    ErrRaise_Llvm
    CallerLlvm_CalleeLlvm_ErrRaise = "no error"
    Exit Function
Handler:
    CallerLlvm_CalleeLlvm_ErrRaise = "caught " & Err.Number
End Function

Public Function CallerPlain_CalleePlain_Divide() As String
    On Error GoTo Handler
    Divide_Plain 0
    CallerPlain_CalleePlain_Divide = "no error"
    Exit Function
Handler:
    CallerPlain_CalleePlain_Divide = "caught " & Err.Number
End Function

Public Function CallerPlain_CalleeLlvm_Divide() As String
    On Error GoTo Handler
    Divide_Llvm 0
    CallerPlain_CalleeLlvm_Divide = "no error"
    Exit Function
Handler:
    CallerPlain_CalleeLlvm_Divide = "caught " & Err.Number
End Function

Public Function CallerLlvm_CalleePlain_Divide() As String
    On Error GoTo Handler
    Divide_Plain 0
    CallerLlvm_CalleePlain_Divide = "no error"
    Exit Function
Handler:
    CallerLlvm_CalleePlain_Divide = "caught " & Err.Number
End Function

Public Function CallerLlvm_CalleeLlvm_Divide() As String
    On Error GoTo Handler
    Divide_Llvm 0
    CallerLlvm_CalleeLlvm_Divide = "no error"
    Exit Function
Handler:
    CallerLlvm_CalleeLlvm_Divide = "caught " & Err.Number
End Function

' --- The same with On Error Resume Next, and with a procedure between caller and callee ------

Public Function CallerPlain_CalleeLlvm_ResumeNext() As String
    On Error Resume Next
    ErrRaise_Llvm
    CallerPlain_CalleeLlvm_ResumeNext = "continued, Err.Number " & Err.Number
End Function

Public Function CallerLlvm_CalleePlain_ResumeNext() As String
    On Error Resume Next
    ErrRaise_Plain
    CallerLlvm_CalleePlain_ResumeNext = "continued, Err.Number " & Err.Number
End Function

Public Function CallerPlain_MiddlePlain_CalleeLlvm() As String
    On Error GoTo Handler
    Middle_Plain
    CallerPlain_MiddlePlain_CalleeLlvm = "no error"
    Exit Function
Handler:
    CallerPlain_MiddlePlain_CalleeLlvm = "caught " & Err.Number
End Function

' --- A procedure that handles its own error ---------------------------------------------------

Public Function Llvm_OwnHandler_Divide() As String
    On Error GoTo Handler
    Dim divisor As Long
    Dim x As Long
    x = 1 \ divisor
    Llvm_OwnHandler_Divide = "no error"
    Exit Function
Handler:
    Llvm_OwnHandler_Divide = "caught " & Err.Number
End Function
