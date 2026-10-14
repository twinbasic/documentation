# Package test projects

Each contributed package the reference documents (`docs/Reference/Contributed/<Package>/`) has a
test project here: twinBASIC test cases for every claim its NOTEs and WARNINGs make. The build
publishes each project as `<Package>-tests.twinproj` beside the package's section, for a reader or
the package's author to open, add the package to, and run.

```
test/package-tests/
  Expect.twin              the checks every case makes; part of every project
  <Package>/
    Sources/
      <Fixture>.twin       [TestFixture] modules of [TestCase] Subs
      RunAll.twin          generated: Sub Main runs every case
    expect.json            how each case fails on the documented version
    probe/                 optional: a harness for what only a built program shows
```

A project has no `Settings` of its own: it takes the package's sample template's,
`test/example-projects/contributed-<Package>/Settings`, which names the version the section
documents (`lib/package-tests.mjs`). So a section moved to a new version moves its test project
with it.

## Writing a case

A case is a parameterless `[TestCase]` Sub of a `[TestFixture]` Module. It starts with
`Expect.Begin`, ends with `Expect.Done`, and checks with `Expect.AreEqual expected, actual, what`,
`Expect.IsTrue`, `Expect.IsFalse` and `Expect.Fail what`. A failed check does not stop the case;
`Expect.Done` reports every failed check at once.

```vb
[TestFixture]
Module FilesTests

    [TestCase]
    Public Sub Item_MissingName()
        Expect.Begin
        Dim fso As New FileSystemObject
        On Error Resume Next
        Dim f As File
        Set f = fso.GetFolder(Environ$("TEMP")).Files("no such file.txt")
        Expect.AreEqual 53, Err.Number, "Files.Item of a missing name raises"
        Expect.Done
    End Sub

End Module
```

- **A case checks what is correct**, not what the package does: a defect is a failing case, so the
  project tells the package's author what to fix. What *correct* is comes from the package's own
  description, the object it stands in for (VBScript's **RegExp**, the Scripting Runtime's
  **FileSystemObject**) or the standard it implements.
- **Name a case for the behaviour**, `<Member>_<What>`, one behaviour per case, so a failure names
  one defect. A callout that makes three claims gets three cases.
- **A case is self-contained**: it creates what it needs and removes it. Files go only under
  `%TEMP%\tbdocs-package-tests\<Package>\`; nothing in the registry, a special folder or the
  user's profile changes. No `MsgBox`, `InputBox`, `End`, no window left open, and nothing that
  starts a browser or explorer (`ShellExecute` or `OpenFile` with an empty path does).
- **The checks' `what` is read by the author**: say what was done, so that
  `Files.Item of a missing name raises: expected 53, got 5` is a bug report.
- A claim about what does not compile is a **compile case**: a line ending in
  `' CASE <Name>: TB5001` (or `: error`, `: none`), as `scripts/lib/tb-tests.mjs` describes.
- A claim that needs a dialog operated or a form shown goes in the package's `probe/` harness, as
  TBMANLIB_Dialog's and xCalendar's do.

## Tying a callout to its cases

Every `> [!NOTE]` and `> [!WARNING]` of the section's pages has a marker on the line above it:

```md
<!-- test: FilesTests.Item_MissingName, FilesTests.Item_MissingIndex -->
> [!NOTE]
```

An item is `Fixture.Sub`, `compile <Name>`, `probe <id>` (a scenario of `probe/`), or
`none -- <reason>` for a callout no program can check (a statement about the IDE, a licence).
`node scripts/check_package_tests.mjs`, in `test.bat`, fails when a callout has no marker, an item
names nothing, a case is named by no callout, a case does not start with `Expect.Begin` and end
with `Expect.Done`, `expect.json` is for another version, or `RunAll.twin` is out of date. A
section whose project is not written yet is in the script's `PENDING` set; the package's project
takes it out.

## Running

```
package-tests.bat tbRegExp                  both architectures, judged against expect.json
package-tests.bat tbRegExp --arch win32
package-tests.bat tbRegExp --update         write expect.json from the run
package-tests.bat                           every project
```

`scripts/package_tests.mjs` stages the project with the package embedded (downloaded from TWINSERV
into `%TEMP%\tb-twinserv` once) and runs it with `tbrun --tests`, which runs each case in the
compiler's test mode, so a crash or an access violation ends only its case. Each case is then:

- **documented**: as `expect.json` says: it passes, fails with the recorded report, or never
  returns;
- **fixed**: `expect.json` says it fails or never returns, and it passes. The page's callout goes
  (the documentation is not a record of past defects), and so does the entry;
- **changed**: anything else. A claim of the page is no longer true, or the case is wrong.

A case that never returns stops the compiler, so it is caught, recorded as `{ "hangs": true }` by
`--update`, run alone from then on, and skipped by `RunAll`. The run writes `RunAll.twin` again
whenever the cases or `expect.json` change.

`expect.json`:

```json
{
  "version": "1.9.0.0",
  "cases": {
    "FilesTests.Item_MissingName": { "fails": "1 of 1 checks failed: Files.Item of a missing name raises: expected 53, got 5" },
    "ListTests.ToString_Empty": { "hangs": true },
    "SubClassTests.Hook": { "win32": "pass", "win64": { "fails": "..." } }
  }
}
```

A case not named passes on both architectures. Write it with `--update`, then read every entry: an
entry is a claim that the package is defective, and each one must match a callout.

## In the IDE

`RunAll`'s `Sub Main` is the project's startup object: run the project and each case prints
`PASS`, `FAIL` or `SKIP` in the DEBUG CONSOLE, then a count. That is how a reader or the package's
author runs the published project. The download carries none of the package's code: it references
the package as a *linked* package, which the IDE loads from the package's `.twinpack` in
`%APPDATA%\twinBASIC\packages` (found by its project id) once the compiler has started. So the
reader puts the package's file there, of the version the section documents, or adds the package
from Available Packages with Embedded cleared, and restarts the compiler. The IDE takes the
version from that file, not from the reference, and nothing in the IDE downloads a missing package
by itself (BETA 1005).
