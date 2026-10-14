# Package test cases --- why they are built this way

What to do is in [WIP.md](WIP.md) (*Where things live*, the contributed packages) and in
[test/package-tests/README.md](test/package-tests/README.md). This file says why.

## What the test cases are for

A contributed section's NOTEs and WARNINGs are claims about someone else's code: that a member
raises 53, that a match is cut short, that a dialog ignores a property. Each was true of one version
when an agent checked it, and nothing kept that evidence: the probe pages were deleted after use.
So the claims are written down as cases that persist, run again whenever the package's version
moves, and say which claims no longer hold. The owner wants the same cases to be usable by the
package's author, which decides most of what follows.

## A case checks what is correct (owner)

A case asserts the behaviour the package should have, not the behaviour it has. To the author a
red case is a defect to fix and a green one is done, with a message that reads as a bug report.
The documentation needs the opposite question answered too (does the page still describe the
package?), and `expect.json` answers it: it records, per case and architecture, the exact failure
report or that the case never returns, on the documented version. The runner's three verdicts
come from comparing the two: *documented*, *fixed* (the callout goes, by the rule that the
documentation is not a record of past defects), *changed*.

The failure report is compared exactly, after the line number and the assertion prefix are
stripped, so a defect that changes shape (a different wrong value) is *changed*, not
*documented*.

## Expect, not Assert (owner)

twinBASIC's own form is a `[TestFixture]` module of `[TestCase]` Subs checked with the Assert
package, and `tbrun --tests` runs those in the compiler's test mode. But in BETA 1005 the IDE has
no way for a person to run a test case, and outside test mode a failed `Assert` stops the run at
the error panel, uncatchable by `On Error` (WIP.Harness.md, *Running a project's test cases*). An
author who opens the project would see the first failure only. So the cases check through
`Expect.twin`:

- **Under `RunAll`** (the project's `Sub Main`, which an author runs with F5), `Expect` collects:
  `Expect.Done` records the case's report, and `RunAll` calls every case under
  `On Error Resume Next` and prints `PASS`, `FAIL` or `SKIP` for each.
- **Under `tbrun --tests`**, `Expect.Done` ends a failed case with `Assert.Strict.Fail` and the
  whole report as its message. An `Assert` failure is the one thing a case's own
  `On Error Resume Next` cannot hide; an `Err.Raise` from `Done` would be swallowed by it and
  the case would pass. Checked on BETA 1005: the message comes back whole in the response's
  `body.error`.
- Every check of a case runs, and `Done` reports all failed ones, so one run of a case shows
  every defect it covers.

The `[TestFixture]` and `[TestCase]` attributes stay, so the cases are in twinBASIC's own form
for whatever runner the IDE gains. `RunAll.twin` is generated rather than written, because a
hand-kept list of calls drifts from the cases; the gate refuses a stale one.

## A case that never returns

Some defects are a loop that never ends (BigNumberLib's modular inverse of zero, TBMANLIB_Xml on
some malformed text). In test mode such a case holds the compiler: `tbrun` gives up on it after
its timeout, and every case after it would time out too. So the runner, on a case that does not
return, records it and runs the cases after it again in a new IDE; once `expect.json` says
`hangs`, the case is run alone with a short timeout, and `RunAll` skips it, because an author's
IDE would hang.

## The download carries no package (owner)

Embedding the package in the published file would mean either the build fetching from TWINSERV
(the deploy then depends on that server) or committing every documented version's `.twinpack`
(about 35 MB, some of it WinDevLib, and four packages declare no licence that allows passing them
on). The owner chose neither.

The published project keeps the template's reference to the package and has no `Packages/`
folder, which makes it a **linked** reference. Checked on BETA 1005 (private APPDATA, private
desktop):

- With the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, the project compiles. The IDE
  finds the file by the package's project id, whatever its name, and takes the version from the
  file: a 1.7.0.0 file under a reference that says 1.8.0.0 compiles against 1.7.0.0.
- Without it, every name of the package is TB5079, and Enabled Libraries shows
  `[LINKED-PACKAGE] ... ERROR unable to load this reference`; its FIX link is not implemented.
- A file put in the folder while the IDE runs is used after Restart Compiler.
- Nothing downloads a missing package by itself. The IDE's only download path is the Available
  Packages tab (`importPackage` in `main.js`); a project load calls only `/packages/checkVersions`,
  and only for a reference with a `publisher` field. `path32`/`path64` set to a file path or a
  TWINSERV URL, or a `.twinpack` beside the project, are not used.

So the reader puts the documented version's file in the packages folder (or adds the package from
Available Packages with Embedded cleared) and restarts the compiler; an author points the folder at
their own build. The runner embeds the package from `%TEMP%\tb-twinserv` instead, as
`check_examples` does, so it never touches a packages folder.

## Markers, and a gate that only tightens

A callout names its cases in an HTML comment on the line above it. The marker lives with the
callout, so moving or rewording the callout keeps its tie, and it is invisible on the page. The
cases name nothing back: a case file referring to a page and a heading would break on every edit
of the page. The gate checks both directions (an unmarked callout, an unnamed case) from the
sources alone, so it runs in `test.bat` and CI, where the cases themselves cannot run.

The sections were written before any project existed, so the gate starts with every section in
`PENDING` and fails on a section that has a project and is still listed, or has none and is not:
the list can only shrink, one package at a time.

`none -- <reason>` exists for a callout no program can check (a fact about the IDE, a licence); it
keeps the decision explicit and visible in review, where a missing marker would be ambiguous.
