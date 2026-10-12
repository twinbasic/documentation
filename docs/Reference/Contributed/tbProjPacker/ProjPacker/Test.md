---
title: Test
parent: ProjPacker
permalink: /tB/Packages/Contributed/tbProjPacker/ProjPacker/Test
has_toc: false
---

# Test
{: .no_toc }

Runs the package's own tests and returns whether they all passed.

Syntax: *object*.**Test** ( *samplePath* [, *logFile* ] ) **As Boolean**

*object*
: *required* An object expression that evaluates to a **ProjPacker**.

*samplePath*
: *required* A **String**, the path of a `.twinproj` or `.twinpack` file for the four tests that work on a real project. An empty string skips those four tests. A path to a file that does not exist makes the call fail.

*logFile*
: *optional* A **String**, the path of a [log file](.#the-log-file) for the lines the call prints. The default is an empty string, which writes no log.

Returns **True** when no test failed, and **False** when a test failed or *samplePath* names a file that does not exist. A skipped test is not a failure. The method raises no error; [Results and errors](.#results-and-errors) describes how the reason is reported. The sample file is never changed.

## What the tests check

There are 24 tests. Each runs on its own, so a failure in one does not stop the others. The tests work in a new folder, named `impexp-test-` and a number, in the folder that the `TEMP` environment variable names. The folder is deleted when the tests end.

Four tests need the sample file:

- Parsing the sample, then writing the tree and parsing that copy, gives the same project name, file count and folder count.
- A round trip in memory keeps every path and the content of every file.
- Writing, parsing and writing again gives the same bytes both times.
- Unpacking the sample, packing the folder and unpacking that file gives two folders with the same files and the same bytes.

Twenty tests need no sample:

- **File format (6).** An empty project, a project with one file, the flags of the entries, Unicode names with their sort order, a file with a wrong magic number, and a file cut short.
- **Long path (1).** A file whose path is longer than 260 characters survives a pack and an unpack.
- **Pack (5).** [**Pack**](Pack) refuses a folder with no `Settings` file and accepts one with it. It refuses to replace an existing file, and replaces it when *overwrite* is **True**. It converts the [line endings](Pack#line-endings) of the code files under `Sources`, and leaves a text file there and a code file elsewhere as they are.
- **Unpack with *cleanFirst* (6).** [**Unpack**](Unpack) removes leftover files, counts the levels of a path correctly, refuses a folder that has no `Settings` file and a folder whose `Settings` is a folder, and accepts a project folder and an empty folder.
- **Other refusals (2).** **Pack** refuses a folder whose `Settings` is a folder. **Unpack** reports a project file that does not exist.

## Output

**Test** prints a heading, a line for each test and a summary. A test line is `[PASS]`, `[FAIL]` or `[SKIP]` and the test's name. A failed test is followed by a line with the reason. The first test also prints an `[INFO]` line with the project's name, its number of files and folders, and its size. The summary counts the passed tests against the passed and failed ones; skipped tests are not counted.

This is the output with a sample file, with the paths shortened:

```
Self-test  workdir: C:\...\impexp-test-78561008
Sample:            C:\...\imagestrip.twinproj

  [INFO] root "imagestrip", 18 files, 6 directories, 170595 bytes
  [PASS] Parse sample (invariants + re-parse consistency)
  [PASS] In-memory round-trip (parse -> serialize -> re-parse)
  ... 22 more lines, one for each of the other tests ...

24/24 tests passed.
```

Without a sample, the four sample tests print `[SKIP]` and the summary ends with the number skipped:

```
20/20 tests passed (4 skipped -- pass a .twinproj or .twinpack path to run them).
```

A *samplePath* that does not exist prints `Sample not found: ` and the path. No test runs.

> [!NOTE]
> An empty *samplePath* does not make the method fail. With 20 of the 20 tests that run passed and 4 skipped, it returns **True**. Pass a project file to run all 24.

## Example

This example runs all the tests against a project file, and writes the lines to a log.

```tb check_build
Dim pp As New ProjPacker
Dim ok As Boolean

ok = pp.Test(App.Path & "\MyApp.twinproj", Environ$("TEMP") & "\selftest.log")
If ok Then
    Debug.Print "All tests passed"
Else
    Debug.Print "A test failed; see selftest.log"
End If
```

## See Also

- [Pack](Pack) method -- packs a folder into a project file
- [Unpack](Unpack) method -- unpacks a project file into a folder
- [ProjPacker](./) class -- overview, the log file and the paths
