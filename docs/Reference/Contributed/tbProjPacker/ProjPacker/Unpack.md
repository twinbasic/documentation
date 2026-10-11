---
title: Unpack
parent: ProjPacker
permalink: /tB/Packages/Contributed/tbProjPacker/ProjPacker/Unpack
has_toc: false
---

# Unpack
{: .no_toc }

Unpacks a project file into a folder of source files.

Syntax: *object*.**Unpack** ( *inputFile*, *outputDir* [, *cleanFirst* [, *logFile* ]] ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **ProjPacker**.

*inputFile*
: *required* A **String**, the `.twinproj` or `.twinpack` file to unpack. It must exist and must be a file. The extension is not checked.

*outputDir*
: *required* A **String**, the folder to write into. It is created, with any missing parent folders, when it does not exist. When it is an empty string, the folder is named after the project and is created in the current directory.

*cleanFirst*
: *optional* A **Boolean**. **True** empties *outputDir* before anything is written, if the checks under [Emptying the folder first](#emptying-the-folder-first) allow it. The default is **False**.

*logFile*
: *optional* A **String**, the path of a [log file](.#the-log-file) for the lines the call prints. The default is an empty string, which writes no log.

Returns **True** when every file was written, and **False** when it was not. The method raises no error; [Results and errors](.#results-and-errors) describes how the reason is reported. The project file is never changed.

## What is written

The files and folders of the project go directly into *outputDir*: its contents are the project's top-level entries, such as `Settings`, `Sources` and `Resources`. The project's name does not become a folder. It appears only in the summary line.

With *cleanFirst* **False**, a file already in *outputDir* is replaced by the file of the same name from the project, without asking. Files and folders that the project does not hold stay where they are. A later [**Pack**](Pack) of the folder packs them too. To get exactly the project's files, unpack into an empty folder or use *cleanFirst*.

The project file is read and checked before anything is deleted or written. If the file is missing, is a folder, or is not a project file, nothing in *outputDir* changes. A failure while the files are being written, a full disk for example, leaves the files written so far.

## Emptying the folder first

*cleanFirst* deletes files and folders, so **Unpack** makes four checks on *outputDir*, in this order, and deletes nothing unless it passes them:

1. *outputDir* does not exist, or is not a folder. There is nothing to empty, and the unpack goes on.
2. *outputDir* is empty. The unpack goes on, with no further check. This allows the usual sequence of making an empty folder and then unpacking into it with *cleanFirst*.
3. *outputDir* is a drive root or a folder directly under one, such as `C:\` or `C:\Projects`. The call is refused. The folder must be at least two levels below the root, as `C:\Projects\MyApp` is. For a network path, the levels are counted below the share, so `\\server\share\MyApp` is refused and `\\server\share\Projects\MyApp` is accepted.
4. *outputDir* is not empty and has no file named `Settings` directly in it. The call is refused, because the folder does not look like an unpacked project. A folder named `Settings` does not count.

A refusal returns **False** and leaves the folder as it was.

> [!WARNING]
> A folder that passes the checks is deleted with everything in it, including files that are not part of any project. Point *cleanFirst* only at a folder that holds nothing but an earlier unpack.

## Output

On success **Unpack** prints one summary line:

```
Imported "MyApp" -> C:\Temp\MyApp-src\  (18 files, 6 directories)
```

The name is the project's name as stored in the file. The counts do not include *outputDir*.

When the call fails, it prints `Unpack failed: ` and one of these reasons:

| Reason | Cause |
|--------|-------|
| `Input file not found: ` and the path | *inputFile* does not exist. |
| `Input is a directory, not a file: ` and the path | *inputFile* is a folder. |
| `Bad magic: ` and a number | The file is not a project file. |
| `Unsupported file format version: ` and a number | The file is a project file of a format version that the package does not read. |
| `Truncated file: ` and the details | The file ends before its contents do. |
| `Refusing to clean a shallow path: ` and the path | *cleanFirst* is **True** and *outputDir* fails the third check. |
| `Refusing to clean ` and the path in quotes, then `it is not empty and has no top-level 'Settings' file` | *cleanFirst* is **True** and *outputDir* fails the fourth check. |
| `Cannot create directory: ` and the path | *outputDir* or a folder in it could not be created. |

> [!NOTE]
> The summary line of **Unpack** begins `Imported`, and that of [**Pack**](Pack) begins `Exported`. The Import/export tool names the two directions the other way round: its `export` command unpacks a project and its `import` command packs a folder.

## Example

This example unpacks a project into a folder in the TEMP folder, emptying the folder first if an earlier unpack left it there.

```tb check_build
Dim pp As New ProjPacker
Dim src As String, work As String

src = App.Path & "\MyApp.twinproj"
work = Environ$("TEMP") & "\MyApp-src"

If pp.Unpack(src, work, True) Then
    Debug.Print "Unpacked into " & work
Else
    Debug.Print "Nothing was unpacked"
End If
```

The next example writes a log, and reads it back when the unpack fails. A file that is not a project file gives `Unpack failed: Bad magic`, and a missing one `Unpack failed: Input file not found`.

```tb check_build
Dim pp As New ProjPacker
Dim logPath As String
logPath = Environ$("TEMP") & "\unpack.log"

If Not pp.Unpack(App.Path & "\notes.txt", Environ$("TEMP") & "\notes-src", False, logPath) Then
    Dim f As Integer, text As String
    f = FreeFile
    Open logPath For Input As #f
    Line Input #f, text
    Close #f
    Debug.Print text
End If
```

## See Also

- [Pack](Pack) method -- packs a folder into a project file
- [Test](Test) method -- runs the package's tests
- [ProjPacker](./) class -- overview, the log file and the paths
- [Import/export tool](../../../../../Features/Packages/Import-Export-Tool) -- the command-line programs that do the same
