---
title: tbProjPacker Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - modPackUnpack
  - modWin32
indexed_from: 1.0.5.0
permalink: /tB/Packages/Contributed/tbProjPacker/
---

# tbProjPacker Package
{: .no_toc }

**Author:** GCuser99. **Version:** 1.0.5.0. **On GitHub:** [GCuser99/tbProjPacker](https://github.com/GCuser99/tbProjPacker), in the folder *Project*.

The **tbProjPacker** contributed package unpacks a twinBASIC project file, a `.twinproj` or `.twinpack` file, into a folder of source files, and packs such a folder into a project file again. It does from twinBASIC code what the [Import/export tool](../../../../Features/Packages/Import-Export-Tool) does from a command line: [**Unpack**](ProjPacker/Unpack) corresponds to the tool's `export` command, and [**Pack**](ProjPacker/Pack) to its `import` command.

A project file is one binary file, which version control can neither compare nor merge. The folder it unpacks to is made of text files, which it can. A build routine can also unpack a copy of a project, change the copy (remove helper code, edit the `Settings` file) and pack it for release, and the original project is not touched.

The package has one public class, [**ProjPacker**](ProjPacker/), with three methods: **Unpack** and **Pack**, and [**Test**](ProjPacker/Test), which runs the package's own tests. A project that references the package sees nothing else. The code that reads and writes the file format, the Windows calls under it and the tests are in private modules and classes. This section documents version 1.0.5.0, published under the MIT licence.

```tb check_build
Dim pp As New ProjPacker
Dim work As String
work = Environ$("TEMP") & "\MyApp-release"

' Unpack a copy of the project into a folder that is emptied first.
If pp.Unpack(App.Path & "\MyApp.twinproj", work, True) Then
    ' ... change files in the folder here ...
    If Not pp.Pack(work, App.Path & "\MyApp-release.twinproj", True) Then
        Debug.Print "Pack failed"
    End If
Else
    Debug.Print "Unpack failed"
End If
```

> [!NOTE]
> The package reads and writes the binary [file format](../../../../Features/Packages/File-Format) itself, as the Import/export tool's script does, and the format is an internal detail of the IDE that can change. [**Test**](ProjPacker/Test) with a project file as its argument parses that file, writes it again and compares the result, so it shows whether the package still understands the files of a given twinBASIC build.

## Output and errors

No method raises an error. Each returns **True** when it did its work and **False** when it did not, and prints what happened with [**Debug.Print**](../../../Modules/Debug). A log file can receive the same lines. [**ProjPacker**](ProjPacker/#results-and-errors) describes both.

Some calls are refused, and return **False**, because they would lose data or produce a project that opens wrongly:

- **Pack** does not replace an existing file unless *overwrite* is **True**.
- **Pack** does not pack a folder that has no `Settings` file, because the packed file would open without its references, name and version.
- **Unpack** with *cleanFirst* does not empty a folder that is a drive root or directly under one, or that is not empty and does not look like an unpacked project.

## Compared with the Import/export tool

The tool's script and the package read and write the same file format. They differ in what they do around it:

- The tool's `import` converts LF line endings to CRLF in `.twin`, `.bas` and `.cls` files. **Pack** stores every file as it is.
- The script skips a `.git` folder. **Pack** packs it, with every other hidden file and empty folder.
- The script adds the folders that the IDE always writes (`ImportedTypeLibraries`, `Miscellaneous`, `Packages`, `Resources` and `Sources`) when the folder lacks them. **Pack** adds none and prints a note naming the missing ones.
- The tool's `export` refuses to replace files already in the folder unless `--overwrite` is given. **Unpack** replaces them without asking, and has *cleanFirst* to empty the folder first.

## Classes

- [ProjPacker](ProjPacker/) -- unpacks a project file into a folder, packs a folder into a project file, and runs the package's tests
  - [Pack](ProjPacker/Pack) -- packs a folder into a project file
  - [Test](ProjPacker/Test) -- runs the package's tests
  - [Unpack](ProjPacker/Unpack) -- unpacks a project file into a folder

## See Also

- [Import/export tool](../../../../Features/Packages/Import-Export-Tool) -- the command-line programs that do the same
- [Keeping a project in Git](../../../../Features/Packages/Import-Export-Tool#keeping-a-project-in-git) -- why and how to keep the unpacked folder under version control
- [TWINPACK file format](../../../../Features/Packages/File-Format) -- the container that both project file types use
