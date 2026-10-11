---
title: Pack
parent: ProjPacker
permalink: /tB/Packages/Contributed/tbProjPacker/ProjPacker/Pack
has_toc: false
---

# Pack
{: .no_toc }

Packs a folder, and everything in it, into a project file.

Syntax: *object*.**Pack** ( *inputDir*, *outputFile* [, *overwrite* [, *logFile* ]] ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **ProjPacker**.

*inputDir*
: *required* A **String**, the folder to pack. It must exist, and it must hold a file named `Settings`.

*outputFile*
: *required* A **String**, the project file to write. The name is used as given: **Pack** adds no extension and checks none.

*overwrite*
: *optional* A **Boolean**. **True** replaces *outputFile* when it exists. The default is **False**, and the call then fails when anything exists at that path.

*logFile*
: *optional* A **String**, the path of a [log file](.#the-log-file) for the lines the call prints. The default is an empty string, which writes no log.

Returns **True** when *outputFile* was written, and **False** when it was not. The method raises no error; [Results and errors](.#results-and-errors) describes how the reason is reported.

## What is packed

The root of the project file is named after the last folder of *inputDir*. Everything in *inputDir* is stored, in all its subfolders: hidden files, empty folders and a `.git` folder included. Keep the project's files in a folder of their own. The top folder of a Git repository would put the repository's own data into the project file.

Version 1.0.5.0 stores each file exactly as it is on disk. It does not convert line endings. The IDE stores `.twin`, `.bas` and `.cls` files with CR LF line endings, so a checkout that has changed them to LF is packed with LF.

Every project that the IDE exports has the folders `Resources`, `Sources`, `ImportedTypeLibraries`, `Miscellaneous` and `Packages`, even when they are empty. Git does not store an empty folder, so a folder checked out from a repository can lack some of them. **Pack** does not add the missing folders. It prints two lines after the summary line, and still returns **True**:

```
  note: expected folders not present on disk: Resources, Sources, ImportedTypeLibraries, Miscellaneous, Packages.
  twinBASIC should rebuild them on Open Project.
```

## Refusals

**Pack** returns **False** and writes nothing in these cases:

- *inputDir* is not a folder. The line is `Pack failed: Not a directory: ` and the path.
- *outputFile* exists and *overwrite* is **False**. The call makes this check before it reads the folder.
- *inputDir* has no `Settings` file directly in it. The file holds the project's name, references, version and compile options, and a project file packed without it would open without them. A folder named `Settings` does not count, and the file name must be spelled exactly `Settings`. The line begins `Pack failed: Refusing to pack: no 'Settings' file at the top level of`.

The line for the second case reads `Output already exists: ` and the path, then `Refusing to overwrite it. Use the overwrite option (CLI: --force) to replace it.` **Pack** has no `--force`: the option the message means is the *overwrite* argument.

## Replacing a project file

With *overwrite* **True**, **Pack** deletes the existing file just before it writes the new one, after the folder has been read. Do not put *outputFile* inside *inputDir*. A project file left there by an earlier call is packed into the new one, and the file grows with each call.

## Output

On success **Pack** prints one summary line:

```
Exported "MyApp-src" -> C:\Temp\MyApp.twinproj  (170594 bytes, 18 files, 6 directories)
```

The name is the root's name, the last folder of *inputDir*. The byte count is the size of the new file, and the file and folder counts do not include the root.

> [!NOTE]
> The summary line of **Pack** begins `Exported`, and that of [**Unpack**](Unpack) begins `Imported`. The Import/export tool names the two directions the other way round: its `import` command packs a folder and its `export` command unpacks a project.

## Example

This example packs a folder into a project file in the TEMP folder and replaces the file if it exists.

```tb check_build
Dim pp As New ProjPacker
Dim src As String, outFile As String

src = Environ$("TEMP") & "\MyApp-src"
outFile = Environ$("TEMP") & "\MyApp.twinproj"

If pp.Pack(src, outFile, True) Then
    Debug.Print "Packed " & outFile
Else
    Debug.Print "Nothing was packed"
End If
```

Without *overwrite*, a second call with the same *outFile* fails and prints:

```
Pack failed: Output already exists: "C:\Temp\MyApp.twinproj". Refusing to overwrite it. Use the overwrite option (CLI: --force) to replace it.
```

## See Also

- [Unpack](Unpack) method -- unpacks a project file into a folder
- [Test](Test) method -- runs the package's tests
- [ProjPacker](./) class -- overview, the log file and the paths
- [Import/export tool](../../../../../Features/Packages/Import-Export-Tool) -- the command-line programs that do the same
