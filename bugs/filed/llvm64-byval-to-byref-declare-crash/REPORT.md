Filed as [twinbasic/twinbasic#2514](https://github.com/twinbasic/twinbasic/issues/2514).

## LLVM, 64-bit: passing `ByVal 0&` for a `ByRef Long` 8th parameter of a `Declare` crashes the call

**Describe the bug**
In a 64-bit build with LLVM turned on, a call to a `Declare`d API whose 8th parameter is declared `ByRef` with a 32-bit type (`Long`, or an Enum such as `BOOL`), with `ByVal 0&` (or `ByVal CFALSE`, an Enum member of value 0) passed for that parameter to give the API a NULL pointer, ends with an access violation (0xC0000005, no message box) inside the API (`KERNELBASE.dll`: in `WideCharToMultiByte`, and in `CreateNamedPipeW` with its 8th parameter declared the same way). It happens in a built exe and in a run in the IDE with LLVM turned on for the debug run (Compiler Options (DEBUG)). The same code is right in a 32-bit LLVM build and in a 64-bit build without LLVM. In the same 64-bit LLVM build, `ByVal 0&` for a `ByRef Long` parameter in the 1st, 4th, 5th, 6th or 7th position is right, and so is an 8th parameter declared `ByVal ... As LongPtr` or `ByRef ... As LongPtr`. Whether the call crashes depends on what the stack held before it: the argument's slot is evidently not written with a whole pointer, so leftover data on the stack makes it a bad one. A clean stack hides the fault, which is why the same call in a calling procedure with fewer local variables seems to work, and a procedure with two local variables crashes after another call has left data on the stack. Observed with `bug_repro.mjs run` (which uses `tbrun`) on the exe and in the IDE run, and with the exe's exit code read.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `llvm64-byval-to-byref-declare-crash.twinproj` (attached as `llvm64-byval-to-byref-declare-crash.zip`). It needs an LLVM licence (Ultimate). Its module `Startup` is:
   ```
   Private Declare PtrSafe Function WideCharToMultiByte Lib "kernel32" (ByVal CodePage As Long, ByVal dwFlags As Long, ByVal lpWideCharStr As LongPtr, ByVal cchWideChar As Long, ByVal lpMultiByteStr As LongPtr, ByVal cbMultiByte As Long, ByVal lpDefaultChar As LongPtr, ByRef lpUsedDefaultChar As Long) As Long
   Private Declare PtrSafe Sub ExitProcess Lib "kernel32" (ByVal uExitCode As Long)

   Private Function Count() As Long
       Dim text As String, n As Long, a As String, b As String, c As Long, d As Double
       text = "hello"
       a = "x": b = "y": c = 1: d = 2
       n = WideCharToMultiByte(65001, 0, StrPtr(text), Len(text), 0&, 0&, 0&, ByVal 0&)
       If Len(a & b) + c + d = 5 Then Count = n
   End Function

   Public Sub Main()
       If App.IsInIDE Then
           Debug.Print "Count = " & Count()
       Else
           ExitProcess Count()
       End If
   End Sub
   ```
2. In Project Settings, set the architecture to 64-bit and turn **Enable LLVM Compilation** on under **Compiler Options (BUILD)** and under **Compiler Options (DEBUG)**.
3. Run the project in the IDE (F5), and build the exe and run it from a command prompt, reading its exit code (`echo %errorlevel%`).
4. The IDE run ends without printing `Count = 5`, and the exe exits with -1073741819 (0xC0000005), the fault recorded in the Application log at `KERNELBASE.dll` offset 0x4C3FE. Turn LLVM off, or build 32-bit, and run again: it prints `Count = 5`, and the exe exits with code 5.

**Expected behavior**
`Count` returns 5, the number of bytes of "hello" in UTF-8, so the exe exits with code 5, as it does without LLVM and in a 32-bit build. `ByVal 0&` for a `ByRef` parameter of a `Declare` passes a NULL pointer, which `WideCharToMultiByte` requires for these two parameters when the code page is 65001.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 1005

**Additional context**
The 8th parameter written `Optional lpUsedDefaultChar As BOOL` (an Enum) fails the same way as `ByRef ... As Long`, and the argument can be `ByVal 0&` or `ByVal CFALSE`. Passing a variable for it, or leaving the last two arguments out, returns the right value in the same large procedure. It needs both the 8th position and the `ByVal`-for-`ByRef` override of a 32-bit parameter: the override at the 1st to 7th positions (registers and stack alike), a `ByRef ... As LongPtr` 8th parameter given `ByVal 0&`, and an 8th parameter declared `ByVal ... As LongPtr` given 0 are all right, after the same call that leaves data on the stack. Declaring the parameter `ByVal ... As LongPtr` (as `lpDefaultChar` is) is a way round it. The package tbFileSysTools 1.9.0.0 makes this call in `TextCodec.ConvertFromUTF16` (`WinAPI.twin`, line 52), which every text-writing member goes through (`StringToTextFile`, `WriteStream` and the members that call them), so an exe built with LLVM for 64-bit that writes a text file ends the same way, with no message box.

Severity: high for a 64-bit program built with LLVM that makes such a call: it ends at the call, with no message, and no wrong result is produced. It is hard to find, because it depends on what the stack held. Building without LLVM, building 32-bit, or declaring the parameter `ByVal ... As LongPtr` avoids it.

Not tried: a 9th or later parameter, other types of 32 bits or fewer (`Integer`, `Byte`, `Single`), a `ByVal` override of a ByRef parameter that is not a number (a string or an UDT), a non-zero value, and the generated code. A `ByVal` argument for a `ByRef` parameter of a twinBASIC `Sub` or `Function` is a different defect, in both architectures, with an entry of its own.

<!-- Reproducer: bugs/llvm64-byval-to-byref-declare-crash/ (mode run with arch win64, llvm and exe: the IDE run prints nothing, and tbrun --exe --llvm --arch win64 shows the exe exiting 0xC0000005 in KERNELBASE.dll; expect is tbrun exit 5, those two lines, and absent `Count = 5` and `exit 5`); verified on BETA 1005 by `bug_repro.mjs verify`. Controls, all printing `Count = 5` and exiting 5: `run --exe --llvm --arch win32`, `run --exe --arch win64`, `run --exe --arch win32`. Pages: docs/LLVM/Getting-Started.md, "Language support", and docs/Reference/Core/Declare.md carry the WARNING labelled BETA 1005; remove both when a fix is released. Found 2026-10-15 when text-writing samples of tbFileSysTools ended a 64-bit LLVM exe with no box. -->
