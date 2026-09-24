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

This project type allows making a true console project rather than a GUI project. Helpfully, it will also add a default `Console` class for reading/writing console IO and provided debug console.

## Windows Services

tB has a services package (WinServicesLib) that makes creating full featured true services a breeze. It simplifies use of MESSAGETABLE resources, multiple services per exe, named pipes for IPC, and more. See samples 21-22.

## Kernel-Mode Drivers

Kernel mode drivers can only access a very limited subset of the API, and can't call usermode DLLs like a runtime. So it would typically require elaborate hacks and dramatically limit what you could do in prior BASIC products, if possible at all. And of course, there's no WOW64 layer for kernel mode, so tB is the first BASIC product to support making drivers for 64bit Windows. This is controlled by the 'Project: Native subsystem' option, as well as the following two features:

### Overriding Entry Point

BASIC applications typically have a hidden entry point that is the first to run, before `Sub Main` or the startup form's `Form_Load`. This sets up features of the app like initializing COM. twinBASIC supports overriding this and setting one of your own procedures as the true entry point. This is mostly useful for kernel mode projects, which must have a specific kind of entry point and can't call the normal APIs in the default. But there are other reasons you might want to use this option, but be warned: Many things will break in a normal application if you don't do the initialization procedures yourself or understand precisely what you can't use.

### Place API Declares in the IAT

tB has the option to put all API declares in the import address table rather than call them at runtime via `LoadLibrary/GetProcAddress` like VBx (which puts TLB-declared APIs in the import table; tB replicates this too but further provides an option for in-project declares).

This has a small performance advantage in that it's loaded and bound at startup rather than on the first call, but the primary use is for kernel mode, which cannot call `LoadLibrary` and other user mode APIs to use late binding.
