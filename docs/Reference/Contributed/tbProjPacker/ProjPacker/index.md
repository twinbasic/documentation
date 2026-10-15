---
title: ProjPacker
parent: tbProjPacker Package
permalink: /tB/Packages/Contributed/tbProjPacker/ProjPacker/
has_toc: false
---

# ProjPacker class
{: .no_toc }

Unpacks a twinBASIC project file into a folder of source files, packs a folder into a project file, and runs the package's own tests.

The class has three methods and no properties or events. It holds no data, so one instance serves any number of calls. The class is not predeclared: create an instance with **New**, then call a method.

```tb check_build
Dim pp As New ProjPacker
Dim logPath As String
logPath = Environ$("TEMP") & "\projpacker.log"

If Not pp.Unpack(inputFile:=App.Path & "\MyApp.twinproj", outputDir:=Environ$("TEMP") & "\MyApp-src", logFile:=logPath) Then
    ' The log holds the reason.
    Dim f As Integer, text As String
    f = FreeFile
    Open logPath For Input As #f
    Do Until EOF(f)
        Line Input #f, text
        Debug.Print text
    Loop
    Close #f
End If
```

## Results and errors

<!-- test: ProjPackerTests.Methods_RaiseNoError_WhenTheyFail, ProjPackerTests.Log_ThatCannotBeCreated_MakesTheCallFailBeforeItDoesAnything -->
Each method returns a **Boolean**: **True** when it did its work, **False** when it did not. No method raises a run-time error. A file that does not exist, a folder that cannot be written, a damaged project file, a log file that cannot be opened and each refusal described on the method pages all give **False**. A caller that only needs to know whether the call worked tests the return value. A caller that needs the reason reads the lines the call printed.

**Pack** and **Unpack** print a summary line when they succeed. When they fail they print one line, `Pack failed: ` or `Unpack failed: ` and the reason. [**Test**](Test) prints a line for each test.

The lines are printed with **Debug.Print** when the program runs in the IDE (when [**App.IsInIDE**](../../../AppGlobalClassObject/_App/IsInIDE) is **True**), so they appear in the [Debug Console](../../../../IDE/Project/DebugConsole). A compiled program prints nothing. Pass *logFile* when the program needs the lines outside the IDE.
<!-- /test -->

## The log file

<!-- test: ProjPackerTests.Log_IsCreatedWhenItDoesNotExist, ProjPackerTests.Log_IsEmptiedWhenItExists, ProjPackerTests.Log_HoldsTheLinesOfTheLastCallOnly, ProjPackerTests.Log_IsUtf8WithCrLfAndNoByteOrderMark, ProjPackerTests.Log_ThatCannotBeCreated_MakesTheCallFailBeforeItDoesAnything, ProjPackerTests.Log_LeftOut_WritesNoFile -->
Every method has an optional *logFile* argument, the path of a text file for the lines the call prints. With the default, an empty string, no log is written.

- The file is created, or emptied if it already exists, when the call starts. It is never added to, so a log holds the lines of the last call only.
- The file is UTF-8 with CR LF line endings and no byte order mark, so a non-ASCII character, such as one in a folder name, is written correctly.
- A log that cannot be created, for example because its folder does not exist, makes the call return **False** at once, before it does anything else. The reason, `Cannot open log file for writing`, is printed but cannot be logged.
- The log holds the failure line too, so the reason for a **False** can be read from it afterwards.
<!-- /test -->

## Paths

<!-- test: ProjPackerTests.Paths_Relative_StartFromTheCurrentDirectory, ProjPackerTests.Paths_WithForwardSlashes_AreAccepted, ProjPackerTests.Paths_LongerThan260Characters_AreAccepted -->
Every path argument can be absolute or relative, and can use `\` or `/` as the separator. A relative path starts from the current directory of the program, which is not necessarily the folder that holds the program. Paths longer than 260 characters are accepted.
<!-- /test -->

## Methods

- [Pack](Pack) -- packs a folder into a project file
- [Test](Test) -- runs the package's tests
- [Unpack](Unpack) -- unpacks a project file into a folder

## See Also

- [tbProjPacker package](../) -- overview
- [Import/export tool](../../../../../Features/Packages/Import-Export-Tool) -- the command-line programs that do the same
