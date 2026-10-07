Filed as [twinbasic/twinbasic#2493](https://github.com/twinbasic/twinbasic/issues/2493).

## `import` of a folder with no `Settings` file fails without saying why

**Describe the bug**
Given a folder with no `Settings` file at its top, `import` lists the files it read, ends `... FAILED` with no `ERROR:` line, and writes nothing. Every other failure measured names its cause. The refusal is right, and the silence is not.

**To Reproduce**
Steps to reproduce the behavior:
1. Unzip `import-no-settings-silent.zip` (it holds `import-no-settings-silent.twinproj`, an ordinary project) and export it: `twinBASIC_win32.exe export C:\p\import-no-settings-silent.twinproj C:\p\src\`.
2. Import only the folder `Sources`, which has no `Settings` file at its top: `twinBASIC_win32.exe import C:\p\x.twinproj C:\p\src\Sources\`.
3. See:
   ```
   importing into "C:\p\x.twinproj" from "C:\p\src\Sources\"...
     IMPORTED: C:\p\src\Sources\\Startup.twin
   ... FAILED
   ```
4. See that there is no `ERROR:` line, the exit code is 0, and `C:\p\x.twinproj` was not written.

**Expected behavior**
An `ERROR:` line that names the cause, such as `ERROR: no Settings file in the input folder`, before `... FAILED`, as the other failures print. A failure should also not exit with 0.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: minor, because the refusal is right.

Also on BETA 983, where a copy of the HelloWorld sample's tree with `Settings` deleted behaves the same: it lists `Resources\ICON\twinBASIC.ico` and `Sources\HelloWorld.twin`, ends `... FAILED` and writes no project.

<!-- Automated: bugs/import-no-settings-silent/repro.json is a cli reproducer, import of {src}\Sources\, expecting the IMPORTED line for Startup.twin, `... FAILED` and exit 0. A repro.json cannot assert that a line is absent, so it checks the IMPORTED line, `... FAILED` and exit 0 only: after a fix that adds an ERROR line, read the output by hand. Nothing in scripts/ or WIP.md states the compiler's behaviour; scripts/impexp.mjs import refuses a folder with no Settings file by name ("has no Settings file", with a self-test). Measured on BETA 983 and 995 (cli995/log1-*.txt, ENTRY 9) and by bug_repro verify on 995. -->
