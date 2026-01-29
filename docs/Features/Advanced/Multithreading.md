---
title: Multithreading
parent: Advanced Features
nav_order: 1
---

# Thread Safety / Multithreading Support

While there's no native language syntax yet (planned), you can call `CreateThread` directly with no hacks. Previously, VBx and other BASIC languages typically required elaborate workarounds to be able to use `CreateThread` for anything but some specialized, extremely simple things. In twinBASIC, you can call it and all other threading APIs without any special steps, other than of course the careful management of doing threading at a low level like this.

## Example

In a new Standard EXE project, add a CommandButton and TextBox to your form:

```vb
Private Declare PtrSafe Function GetCurrentThreadId Lib "kernel32" () As Long

Private Declare PtrSafe Function CreateThread Lib "kernel32" ( _
                        ByRef lpThreadAttributes As Any, _
                        ByVal dwStackSize As Long, _
                        ByVal lpStartAddress As LongPtr, _
                        ByRef lpParameter As Any, _
                        ByVal dwCreationFlags As Long, _
                        ByRef lpThreadId As Long) As LongPtr

Private Declare PtrSafe Function WaitForSingleObject Lib "kernel32" ( _
                        ByVal hHandle As LongPtr, _
                        ByVal dwMilliseconds As Long) As Long

Private Const INFINITE = -1&

Private Sub Command1_Click() Handles Command1.Click
    Dim lTID As Long
    Dim lCurTID As Long
    Dim hThreadNew As LongPtr
    lCurTID = GetCurrentThreadId()
    hThreadNew = CreateThread(ByVal 0, 0, AddressOf TestThread, ByVal 0, 0, lTID)
    Text1.Text = "Thread " & lCurTID & " is waiting on thread " & lTID
    Dim hr As Long
    hr = WaitForSingleObject(hThreadNew, 30000&) 'Wait 30s as a default. You can use INFINITE instead if you never want to time out.
    Text1.Text = "Wait end code " & CStr(hr)
End Sub

Public Sub TestThread()
    MsgBox "Hello thread"
End Sub
```

Under a single-threaded code, if you called `TestThread` before updating `Text1.Text`, the text wouldn't update until you clicked ok on the message box. But here, the message box in launched in a separate thread, so execution continues and updates the text, after which we manually choose to wait for the message box thread to exit.
