Filed as [twinbasic/twinbasic#2457](https://github.com/twinbasic/twinbasic/issues/2457).

## Export Path refuses `${SourcePath}` alone, but not the same folder written as a path

**Describe the bug**
The Settings editor refuses `${SourcePath}` as the *Export Path*, because **File → Export Project** empties its folder and `${SourcePath}` is the folder that holds the project file. The check compares the text only: the same folder typed in full is accepted, and the compiler applies no check of its own. An export into the project's own folder deletes the project file.

**To Reproduce**
**This deletes the project file.** Do it in a scratch folder made for this, `<S>` below, for example `C:\Scratch\sourcepath-test`, which holds nothing but the unzipped project.

Steps to reproduce the behavior:
1. Open `export-path-sourcepath-as-path.twinproj` (attached as `export-path-sourcepath-as-path.zip`), after unzipping it into `<S>`, so that it is the only file there. *Export Verbose* is on.
2. In Project Settings, Export, set *Export Path* to `${SourcePath}`. The editor refuses it: "${SourcePath} on it's own is not allowed. This would DELETE the project file, as the `Export Project` command empties the output folder before exporting."
3. Set it to `<S>` written out in full instead (`C:\Scratch\sourcepath-test`). The editor accepts it. Apply.
4. Choose **File → Export Project**.
5. The Debug Console shows `[EXPORT]  DELETED: \\?\<S>\export-path-sourcepath-as-path.twinproj`, and then `[EXPORT] COMPLETED`. The project file is no longer on disk. The project is still open, and **Save Project** writes the file back; closing without saving loses it.

**Expected behavior**
The check resolves the path, so that any spelling of the project's own folder (or a folder above it that the export would empty, down to the project file) is refused alike. Failing that, the compiler refuses to delete the project file it was exporting.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: the project file is deleted when the export folder is the folder that holds it.

The check is the `validate` function of `project.exportPath` in `ide/main.js`. It compares the lower-cased text with `${sourcepath}` and `${sourcepath}\`, and does not resolve the path. The compiler's side was measured by calling `exportProjectTo()` with the project's own folder: it logged `[EXPORT]  DELETED: \\?\<folder>\<project>.twinproj` and completed. That the editor accepts the same folder typed as a path (step 3) is read from the check's code, not tried by hand. The **Save** that writes the file back (step 5) was seen on BETA 983 only.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs, "an export into the project's own folder deletes the project file"), which exports into the project's own folder with exportProjectTo() over DevTools; passes on BETA 995. The validate() text was read again in BETA 995's ide/main.js. Found by the same Export Project probe as the junction entry. When fixed: update that test, docs/IDE/Menu/File.md ("accepts the same folder written out in full") and docs/IDE/Project Settings.md, Export Path. -->
