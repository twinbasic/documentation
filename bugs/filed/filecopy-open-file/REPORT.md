Filed as [twinbasic/twinbasic#2451](https://github.com/twinbasic/twinbasic/issues/2451).

## `FileCopy` of an open file raises `&H80004005`, where VB6 raises 55 or copies it

**Describe the bug**
`FileCopy` of a file that is open raises -2147467259 (`&H80004005`, *Unspecified error*), whatever mode the file is open in. VB6 raises error 55, *File already open*, for a file open `For Append`, and copies a file open `For Input` without an error. Code that handles VB6's error 55 does not recognise the error, and a copy that VB6 makes is refused.

**To Reproduce**
Steps to reproduce the behavior:
1. Open `filecopy-open-file.twinproj` (attached as `filecopy-open-file.zip`) and run it (F5). Its `Sub Main` makes a file in `%TEMP%` and then does this:
   ```
   On Error Resume Next
   Open f For Append As #2
   FileCopy f, f & ".copy"
   Debug.Print Err.Number, Err.Description
   ```
2. See `-2147467259 Unspecified error`. VB6 prints `55 File already open`.
3. See the second line the project prints: with the file open `For Input` instead, twinBASIC raises the same `-2147467259`, and VB6 copies the file without an error.

**Expected behavior**
Error 55 for the file open `For Append`, and a successful copy for the file open `For Input`, as in VB6.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
BETA 983 copied an open file with no error, in both modes (the project prints 0 for all three lines); BETA 984's notes list the change ("FileSystem.FileCopy function would previously allow copying of an already open file without error"), and only the error number and the `Input` case differ from VB6. What does not reproduce it: the file closed (the third line the project prints is 0). Severity: code that handles VB6's error 55 does not recognise the error, and a copy that VB6 makes is refused.

<!-- Stated by docs/Reference/Default/VBA/FileSystem/FileCopy.md (the note at line 25); when fixed, update it. Measured with scripts/bug_repro.mjs (run mode, verify) on 995 and 983; the VB6 results are from the same statements compiled by `VB6.EXE /make` and run, on 2026-10-01. -->
