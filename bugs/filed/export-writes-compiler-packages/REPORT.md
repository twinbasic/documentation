Covered by the existing issue [twinbasic/twinbasic#841](https://github.com/twinbasic/twinbasic/issues/841).

## Export Project writes the compiler packages, which the project does not hold, and the command line cannot pack the result

**Describe the bug**
**File → Export Project** writes a `Packages` folder holding the full source of the compiler packages the project uses: `VB`, `VBA`, `VBRUN` and `AppGlobalClassProject` for a project with the default references. That is 475 of the 477 files an export of a two-file project wrote. The project file does not hold them: a `.twinproj` the IDE saved holds only the packages the project embeds, and `twinBASIC_win32.exe export` of it writes only those.

The result is an export that cannot be packed back into a project by the supported tool, so it cannot serve for version control, and a two-file project exports as 477 files. `twinBASIC_win32.exe import` stops with exit code 999 and writes nothing on any folder under `Packages`.

**To Reproduce**
Do it in a scratch folder made for this, `<S>` below, for example `C:\Scratch\packages-test`. **File → Export Project** empties `<S>\export`. `<IDE>` is the folder that holds `twinBASIC.exe`.

Steps to reproduce the behavior:
1. Open `export-writes-compiler-packages.twinproj` (attached as `export-writes-compiler-packages.zip`), after unzipping it into `<S>`. It has two files and the default references. Its *Export Path* is `${SourcePath}\export`. In a Command Prompt: `mkdir <S>\export`.
2. Choose **File → Export Project**.
3. `<S>\export\Packages` holds the source of `VB`, `VBA`, `VBRUN` and `AppGlobalClassProject`.
4. In a Command Prompt:
   ```
   "<IDE>\bin\twinBASIC_win32.exe" import <S>\repacked.twinproj <S>\export\ --overwrite
   ```
   It stops with exit code 999 and writes nothing.
5. For comparison, `"<IDE>\bin\twinBASIC_win32.exe" export <S>\export-writes-compiler-packages.twinproj <S>\fromfile\ --overwrite` writes three files (`Settings` and the two sources) and an empty `Packages` folder, because the project file holds no package. (For a project embedding WinDevLib it writes `Packages\WinDevLib` and no other package.)

Then, on the 477-file export:
- the standalone script `scripts/impexp.mjs` packs it into a 4,220,723-byte project, against 2,055 bytes for the same export with `Packages` removed. The project now embeds its own copy of the four compiler packages. It compiles with no errors;
- the IDE's own **New Project → Import from folder...** does the same, into a 4,222,833-byte project, against 4,207 bytes from the export with `Packages` removed.

**The embedded copy is dead, and every later export writes it back.** Measured on the IDE's import:
1. Export a project with the default references into an empty folder `E`.
2. In `E\Packages\VBA\Sources\Math.twin`, add `Public Function ProbeEmbeddedMarker() As Long` before `End Module`, and a call to it in one of the project's own modules.
3. **Import from folder...** on `E`: TB5079, *Unrecognized symbol 'ProbeEmbeddedMarker'*. The compiler uses its own VBA package, not the copy the project now holds.
4. Save the project, and export it again: the Debug Console reports `[EXPORT] COMPLETED (139 folders, 954 files)`, against `(72 folders, 479 files)` before, and the exported `Math.twin` holds the marker. The export writes both copies to the same paths, the embedded one last.

So a project kept in Git through *Export After Save* and rebuilt from a clone keeps committing the package source of the IDE that first exported it, while it compiles against the current IDE's.

**Expected behavior**
A `.twinproj` the IDE saves holds no compiler packages, and so the export of it should not write them either; or **Import from folder** (and `import`) should skip the compiler packages' folders, or the export should write the IDE's own copy rather than the project's. The IDE's export of a project should pack back into the same project with the supported tool.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the IDE's export of a project cannot be packed back into a project by the supported tool, so it cannot serve for version control; and a two-file project exports as 477 files.

Measured on BETA 995: the export writing `Packages\VBA` and the others, and the command line's `import` of it stopping with 999. The IDE's own import, the 4,222,833-byte project and the dead copy were measured on BETA 983. The two byte counts for the standalone script come from the earlier export, not from the reproducer project, whose two files differ a little.

What does not reproduce it: the command line's own `export`, which writes what the project file holds; and **Import from folder** on the export with the compiler packages' folders removed, which gives the 4,207-byte project, compiles, and exports 479 files.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs: "an export into an empty folder writes the compiler packages" and "the command line's import refuses the IDE's export, for its compiler packages"); passes on BETA 995. The reproducer is manual because the export is a menu command. Found by checking round 9's UC-62 answer (Export After Save into a Git repository, rebuilt from a fresh clone with the tB executable); the export was round 8's, from exportProjectTo() over DevTools. The dead copy was measured after round 10's UC-66, with root.loadProjectFromFolder() and root.saveProjectAs(). When fixed: update that test, the `import` entry about exit 999 on a folder inside Packages, and docs/Features/Packages/Import-export tool.md and docs/IDE/Menu/File.md if they warn about it. -->
