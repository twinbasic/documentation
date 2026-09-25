---
title: Multithreading
parent: Advanced Features
nav_order: 1
permalink: /Features/Advanced/Multithreading
---

# Thread Safety / Multithreading Support

While there's no native language syntax yet (planned), you can call `CreateThread` directly with no hacks. Previously, VBx and other BASIC languages typically required elaborate workarounds to be able to use `CreateThread` for anything but some specialized, extremely simple things. In twinBASIC, you can call it and all other threading APIs without any special steps, other than of course the careful management of doing threading at a low level like this.

## Example

In a new Standard EXE project, add a CommandButton and TextBox to your form:

```tb check_build
Private Declare PtrSafe Function GetCurrentThreadId Lib "kernel32" () As Long

Private Declare PtrSafe Function CreateThread Lib "kernel32" ( _
                        ByRef lpThreadAttributes As Any, _
                        ByVal dwStackSize As LongPtr, _
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

Public Function TestThread(ByVal parameter As LongPtr) As Long
    MsgBox "Hello thread"
End Function
```

Under a single-threaded code, if you called `TestThread` before updating `Text1.Text`, the text wouldn't update until you clicked ok on the message box. But here, the message box in launched in a separate thread, so execution continues and updates the text, after which we manually choose to wait for the message box thread to exit.

`CreateThread` passes the thread procedure one pointer-sized value, its `lpParameter` argument, and takes the procedure's return value as the thread's exit code. So a thread procedure is a **Function** with one **LongPtr** parameter that returns a **Long**, as `TestThread` is.

## Running code on two threads and waiting for both to finish

**RunBoth** below runs two calculations at the same time, one on each of two new threads, and prints both results once both threads have finished. Three things make it work:

- **Each thread leaves its result in a module-level variable.** All threads see the same module-level variables, so **RunBoth** reads a result once the thread that wrote it has finished.
- **`WaitForSingleObject` on each thread's handle in turn** waits until both threads have finished: the second thread goes on running while **RunBoth** waits for the first. `CloseHandle` then releases the two handles.
- **Each thread procedure handles its own errors.** An error that nothing handles stops the thread where it happened, and the thread never finishes, so a wait with `INFINITE` never returns. Run from the IDE, a thread stopped by an overflow was still running ten seconds later.

```tb check_build
Module Threads
    Private Declare PtrSafe Function CreateThread Lib "kernel32" ( _
                            ByRef lpThreadAttributes As Any, _
                            ByVal dwStackSize As LongPtr, _
                            ByVal lpStartAddress As LongPtr, _
                            ByRef lpParameter As Any, _
                            ByVal dwCreationFlags As Long, _
                            ByRef lpThreadId As Long) As LongPtr
    Private Declare PtrSafe Function WaitForSingleObject Lib "kernel32" (ByVal hHandle As LongPtr, ByVal dwMilliseconds As Long) As Long
    Private Declare PtrSafe Function CloseHandle Lib "kernel32" (ByVal hObject As LongPtr) As Long

    Private Const INFINITE As Long = -1

    ' Every thread sees the same module-level variables, so each thread leaves
    ' its result here and RunBoth reads both once the threads have finished.
    Private primeCount As Long
    Private divisibleCount As Long

    Public Sub RunBoth()
        Dim threadId As Long, first As LongPtr, second As LongPtr
        first = CreateThread(ByVal 0, 0, AddressOf CountPrimes, ByVal 0, 0, threadId)
        second = CreateThread(ByVal 0, 0, AddressOf CountDivisible, ByVal 0, 0, threadId)
        WaitForSingleObject first, INFINITE     ' returns when CountPrimes has finished
        WaitForSingleObject second, INFINITE    ' returns when CountDivisible has finished
        CloseHandle first
        CloseHandle second
        Debug.Print "Primes below 200,000: " & primeCount
        Debug.Print "Divisible by 7 or 11, 1 to 5,000,000: " & divisibleCount
    End Sub

    ' A thread procedure takes one pointer-sized value, the lpParameter given
    ' to CreateThread, and returns the thread's exit code.
    Public Function CountPrimes(ByVal parameter As LongPtr) As Long
        On Error GoTo Failed
        Dim n As Long, d As Long, isPrime As Boolean
        For n = 2 To 199999
            isPrime = True
            For d = 2 To Sqr(n)
                If n Mod d = 0 Then
                    isPrime = False
                    Exit For
                End If
            Next d
            If isPrime Then primeCount = primeCount + 1
        Next n
        Exit Function
    Failed:
        primeCount = -1         ' an error nothing handles would stop the thread for good
    End Function

    Public Function CountDivisible(ByVal parameter As LongPtr) As Long
        On Error GoTo Failed
        Dim n As Long
        For n = 1 To 5000000
            If n Mod 7 = 0 Or n Mod 11 = 0 Then divisibleCount = divisibleCount + 1
        Next n
        Exit Function
    Failed:
        divisibleCount = -1
    End Function
End Module
```

Run from the IDE, in a 32-bit or a 64-bit build, **RunBoth** prints to the [Debug Console](../../tB/IDE/Project/DebugConsole):

```text
Primes below 200,000: 17984
Divisible by 7 or 11, 1 to 5,000,000: 1103895
```

With an overflow forced at the start of **CountPrimes**, its handler set the first result to `-1`, and the second line was unchanged. A built `.exe` prints nothing with `Debug.Print`; see [Writing a command-line tool](../Project-Configuration/Project-Types#writing-a-command-line-tool-output-exit-code-and-arguments) for output from a console program.
