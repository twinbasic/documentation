---
title: Project Types
parent: Project Configuration
nav_order: 1
permalink: /Features/Project-Configuration/Project-Types
---

# Project Types

twinBASIC provides built-in support for several project types beyond the traditional EXE and ActiveX DLL/Control.

## Standard DLLs

While it was possible to accomplish this via hacks previously, tB offers it as a built in project type. You can choose this project type at startup, then you simply need to mark functions with `[DllExport]` when you want them exported. The name will be used as-is, it will not be mangled. The `CDecl` calling convention is supported with the normal syntax, e.g. `Public Function foo CDecl(bar As Long) As Long`.

Standard DLLs in twinBASIC can still specify a startup point; each export will then check if this code has run yet, and if not, run it.

```tb check_build
[DllExport]
Public Function Add(ByVal a As Long, ByVal b As Long) As Long
    Add = a + b
End Function

[DllExport]
Public Function Multiply CDecl(ByVal a As Long, ByVal b As Long) As Long
    Multiply = a * b
End Function
```

## Calling a Standard DLL from VBA or Excel

VBA code in Excel, or in any other Office application, calls a Standard DLL through a `Declare` statement, the same way it calls a Windows API function. On the twinBASIC side the functions are ordinary [`[DllExport]`](../../tB/Core/Attributes#dllexport) code. This Standard DLL project is named `MathGreetLib`:

```tb check_build
[DllExport]
Public Function AddNumbers(ByVal a As Long, ByVal b As Long) As Long
    AddNumbers = a + b
End Function

[DllExport]
Public Function Greet(ByVal name As String) As String
    Greet = "Hello, " & name
End Function
```

Three things stop the obvious VBA code from working: a new project builds a 32-bit DLL, the file the build writes is not called `MathGreetLib.dll`, and a `String` comes back garbled.

### Build for the bitness of Office

64-bit Office --- the usual installation today --- loads only 64-bit DLLs, because Windows does not load a 32-bit DLL into a 64-bit process. Set the [build configuration](../../tB/IDE/Project/Toolbar#build-configuration) box on the toolbar to **win64** before building. Only 32-bit Office uses the **win32** build.

### Name the DLL by its full path

With the default [Build Output Path](../../tB/IDE/Project/Settings#build-output-path), the file goes into a `Build` folder beside the `.twinproj` file, and its name ends in the architecture: `Build\MathGreetLib_win64.dll` from a win64 build, `Build\MathGreetLib_win32.dll` from a win32 one. So `Lib "MathGreetLib.dll"` names a file that does not exist. Give `Lib` the full path.

### Pass strings as pointers

Numbers pass as they are, so an ordinary declaration of `AddNumbers` works. Strings do not. A VBA `Declare` converts a `String` argument to ANSI before the call, and converts a `String` result from ANSI after it, but the DLL takes and returns Unicode text. The DLL receives an ANSI copy of the argument, and VBA reads the DLL's Unicode result as if each byte were one character. Declared with `String` for both, `Greet("Ann")` comes back with a NUL character, `Chr(0)`, after every character of `"Hello, "`, and then `Ann`.

To avoid both conversions, declare the parameter and the result `As LongPtr`, so that only addresses cross the call. The DLL does not change. With the project in `C:\Projects\MathGreetLib` and built with **win64**:

```vba
Private Declare PtrSafe Function AddNumbers Lib "C:\Projects\MathGreetLib\Build\MathGreetLib_win64.dll" (ByVal a As Long, ByVal b As Long) As Long
Private Declare PtrSafe Function GreetPtr Lib "C:\Projects\MathGreetLib\Build\MathGreetLib_win64.dll" Alias "Greet" (ByVal name As LongPtr) As LongPtr
Private Declare PtrSafe Sub CopyMemory Lib "kernel32" Alias "RtlMoveMemory" (ByRef dst As Any, ByRef src As Any, ByVal cb As LongPtr)

Public Function Greet(ByVal name As String) As String
    Dim p As LongPtr
    p = GreetPtr(StrPtr(name))                  ' pass the characters, not an ANSI copy
    CopyMemory ByVal VarPtr(Greet), p, LenB(p)  ' make the DLL's string this function's result
End Function

Sub TestMathGreetLib()
    Debug.Print AddNumbers(2, 3)
    Debug.Print Greet("Ann")
End Sub
```

`TestMathGreetLib` prints `5`, then `Hello, Ann`. `StrPtr(name)` passes the address of the VBA string's own characters. The DLL returns a new string --- a BSTR, which twinBASIC allocates for a `String` result --- and the `CopyMemory` line makes that string the result of the VBA `Greet` function. VBA frees it later like any other string, so nothing is copied and nothing leaks.

Text that ANSI cannot hold survives as well. Tested from a twinBASIC caller with the same pattern, a name that mixed Polish and Japanese characters came back intact.

For 32-bit Office, change the two paths to the win32 build. The rest of the code stays the same.

## Console Applications

This project type allows making a true console project rather than a GUI project: the program runs in the Command Prompt window it was started from, or in a console window of its own. Start one with **File → New Project → Standard EXE (Console App)**. The template turns on [*Is Console Application*](../../tB/IDE/Project/Settings#is-console-application), starts the program at `Sub Main` in its `MainModule`, and adds a `Console` class with `Cls`, `WriteLine` and `ReadLine` members for the console window. The class is a starting point, not a requirement; [Writing a command-line tool](#writing-a-command-line-tool-output-exit-code-and-arguments) replaces it with output that a batch file can capture.

## Writing a command-line tool: output, exit code and arguments

A tool that a batch file runs must put its output where the batch file can redirect it, and report failure through its exit code, which a batch file tests with `if errorlevel`. Four things behave differently from what the template and VBA suggest:

- **`Debug.Print` writes only to the IDE's [Debug Console](../../tB/IDE/Project/DebugConsole).** The built `.exe` prints nothing with it.
- **The template's `Console.WriteLine` writes only to a console window.** It calls `WriteConsoleW`, which writes nothing to a file or a pipe. With the program's output redirected, as in `mytool > out.txt`, it writes nothing and raises error 5.
- **`End` stops the program with exit code 0.** To set the exit code, call the Windows `ExitProcess` function, after closing any files the program has open.
- **`Command$` returns the arguments as they were typed.** For `mytool "my file.txt"` it returns `"my file.txt"`, quotes included.

The module below counts the lines in a file. It replaces the template's `MainModule`, whose own `Sub Main` has to go: with a second `Sub Main` in another module, the build fails with *'Main' is ambiguous*. `WriteOut` and `WriteErr` write a line to standard output and standard error, stdout and stderr. They use `WriteConsoleW` when the output goes to a console window, which takes the text unconverted, and `WriteFile` when it goes to a file or a pipe.

```tb check_build
Module MainModule
    Private Declare PtrSafe Function GetStdHandle Lib "kernel32" (ByVal nStdHandle As Long) As LongPtr
    Private Declare PtrSafe Function GetConsoleMode Lib "kernel32" (ByVal hConsoleHandle As LongPtr, ByRef lpMode As Long) As Long
    Private Declare PtrSafe Function WriteConsoleW Lib "kernel32" (ByVal hConsoleOutput As LongPtr, ByVal lpBuffer As LongPtr, ByVal nNumberOfCharsToWrite As Long, ByRef lpNumberOfCharsWritten As Long, ByVal lpReserved As LongPtr) As Long
    Private Declare PtrSafe Function WriteFile Lib "kernel32" (ByVal hFile As LongPtr, ByRef lpBuffer As Any, ByVal nNumberOfBytesToWrite As Long, ByRef lpNumberOfBytesWritten As Long, ByVal lpOverlapped As LongPtr) As Long
    Private Declare PtrSafe Sub ExitProcess Lib "kernel32" (ByVal uExitCode As Long)

    Private Const STD_OUTPUT_HANDLE As Long = -11
    Private Const STD_ERROR_HANDLE As Long = -12

    Public Sub Main()
        Dim fileName As String
        fileName = Trim$(Command$())
        If Len(fileName) > 1 And Left$(fileName, 1) = """" And Right$(fileName, 1) = """" Then
            fileName = Mid$(fileName, 2, Len(fileName) - 2)    ' a quoted name keeps its quotes
        End If
        If fileName = "" Then
            WriteErr "Usage: linecount <file>"
            ExitProcess 1
        End If
        If Dir$(fileName) = "" Then
            WriteErr "linecount: file not found: " & fileName
            ExitProcess 1
        End If

        Dim f As Integer, lineText As String, count As Long
        f = FreeFile
        Open fileName For Input As #f
        Do While Not EOF(f)
            Line Input #f, lineText
            count = count + 1
        Loop
        Close #f
        WriteOut fileName & ": " & count & " lines"
    End Sub

    ' Writes a line to standard output or standard error: with WriteConsoleW to
    ' a console window, and with WriteFile to a file or a pipe.
    Public Sub WriteOut(ByVal text As String)
        WriteTo STD_OUTPUT_HANDLE, text & vbCrLf
    End Sub

    Public Sub WriteErr(ByVal text As String)
        WriteTo STD_ERROR_HANDLE, text & vbCrLf
    End Sub

    Private Sub WriteTo(ByVal stream As Long, ByVal text As String)
        Dim handle As LongPtr, mode As Long, written As Long
        handle = GetStdHandle(stream)
        If GetConsoleMode(handle, mode) <> 0 Then
            WriteConsoleW handle, StrPtr(text), Len(text), written, 0
        Else
            Dim bytes() As Byte
            bytes = StrConv(text, vbFromUnicode)
            WriteFile handle, bytes(0), UBound(bytes) + 1, written, 0
        End If
    End Sub
End Module
```

With the default [Build Output Path](../../tB/IDE/Project/Settings#build-output-path), a project named `linecount` builds `Build\linecount_win32.exe`. Rename the file, or change the setting, to run it as `linecount`. At a command prompt, with `three.txt` holding three lines:

```text
C:\Tools>linecount three.txt
three.txt: 3 lines

C:\Tools>linecount missing.txt
linecount: file not found: missing.txt

C:\Tools>echo %errorlevel%
1
```

The error message goes to standard error, so `linecount missing.txt 2> errors.txt` puts it in the file. `linecount three.txt > count.txt` writes `three.txt: 3 lines` into `count.txt`, and `linecount three.txt | find "lines"` passes it through the pipe.

Output written to a file or a pipe is in the system's ANSI code page, as `StrConv` converts it. A character the code page does not have is replaced: on a Western European system, `Ł` becomes `L`. In a console window, `WriteConsoleW` writes the text unconverted, so `Zoë Łódź` shows as it is.

`Line Input #` ends a line at a carriage return, so a file with Unix line endings, where each line ends with a line feed alone, counts as one line. See [Line Input #](../../tB/Core/Line-Input).

## Windows Services

tB has a services package (WinServicesLib) that makes creating full featured true services a breeze. It simplifies use of MESSAGETABLE resources, multiple services per exe, named pipes for IPC, and more. See samples 21-22.

## Kernel-Mode Drivers

Kernel mode drivers can only access a very limited subset of the API, and can't call usermode DLLs like a runtime. So it would typically require elaborate hacks and dramatically limit what you could do in prior BASIC products, if possible at all. And of course, there's no WOW64 layer for kernel mode, so tB is the first BASIC product to support making drivers for 64bit Windows. This is controlled by the 'Project: Native subsystem' option, as well as the following two features:

### Overriding Entry Point

BASIC applications typically have a hidden entry point that is the first to run, before `Sub Main` or the startup form's `Form_Load`. This sets up features of the app like initializing COM. twinBASIC supports overriding this and setting one of your own procedures as the true entry point. This is mostly useful for kernel mode projects, which must have a specific kind of entry point and can't call the normal APIs in the default. But there are other reasons you might want to use this option, but be warned: Many things will break in a normal application if you don't do the initialization procedures yourself or understand precisely what you can't use.

### Place API Declares in the IAT

tB has the option to put all API declares in the import address table rather than call them at runtime via `LoadLibrary/GetProcAddress` like VBx (which puts TLB-declared APIs in the import table; tB replicates this too but further provides an option for in-project declares).

This has a small performance advantage in that it's loaded and bound at startup rather than on the first call, but the primary use is for kernel mode, which cannot call `LoadLibrary` and other user mode APIs to use late binding.
