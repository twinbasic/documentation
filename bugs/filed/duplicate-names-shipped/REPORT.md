Filed as [twinbasic/twinbasic#2435](https://github.com/twinbasic/twinbasic/issues/2435).

## The IDE has written the same name twice into project files it ships

**Describe the bug**
Two of the 48 project and package files an installation ships hold one name more than once, with different contents: the VB package holds `Resources/MANIFEST/#1.xml` twice, and Sample 16, *twinBASIC IDE Addin (TODO Widgets demo)*, holds `.addins/WaynesTodoItemsData` eight times. A folder can hold only one file of a name, so unpacking keeps one copy. The eight copies in Sample 16 suggest that each save of the add-in's data added an entry instead of replacing the old one, which is a guess and not a measurement.

**To Reproduce**
Steps to reproduce the behavior:
1. The reproducer is not an attachment: it is two files in the installation, so there is no `.zip` for this report. They are `packages\{F50B82D0-DCAB-43FE-9631-11959D4A4728}_VB\package.twinproj` and `projects\Sample 16.    twinBASIC IDE Addin (TODO Widgets demo)\projectName.twinproj`, under the IDE's folder.
2. Run `twinBASIC_win32.exe export "<IDE folder>\packages\{F50B82D0-DCAB-43FE-9631-11959D4A4728}_VB\package.twinproj" C:\out1\`, into a folder that does not exist yet, without `--overwrite`.
3. See one `[EXPORT]  ERROR: output file already exists and --overwrite not set: C:\out1\Resources\MANIFEST\#1.xml`, then `... FAILED`. The folder is empty before the run, so the only file that already exists is the one just written for the first copy of the name.
4. Run `twinBASIC_win32.exe export "<IDE folder>\projects\Sample 16.    twinBASIC IDE Addin (TODO Widgets demo)\projectName.twinproj" C:\out2\` the same way.
5. See seven of `[EXPORT]  ERROR: output file already exists and --overwrite not set: C:\out2\.addins\WaynesTodoItemsData`, then `... FAILED`: one for each copy of the name after the first.

**Expected behavior**
A project file holds each name once. Where the IDE rewrites an entry, it replaces it.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: a folder can hold only one of them, so unpacking keeps one copy; which copy the IDE itself uses is not known.

| file | name | copies |
|---|---|---|
| the VB package | `Resources/MANIFEST/#1.xml` | 2, of 703 and 682 bytes |
| Sample 16, *twinBASIC IDE Addin (TODO Widgets demo)* | `.addins/WaynesTodoItemsData` | 8, no two alike |

`export` writes entries in reverse order, so with `--overwrite` the first copy in the file is the one left on disk. The same two files, and no others of the 48, hold a repeated name on BETA 983 as well as on BETA 995.

<!-- Manual in bugs/duplicate-names-shipped/repro.json, because a repro.json cannot name a path inside the install (an install path contains a username), and no project can be packed with a repeated name. The folder under bugs/ holds only a placeholder project; the entry has no zip to attach, so the folder can go when it is filed. scripts/impexp.mjs keeps the first copy, as the executable does, and warns with "1 name occurs more than once in the project" for both files (cli995/dups.mjs, run over every project and package file of both installs). The VB-package consequence for export without --overwrite is in the report on a refused export (slug export-refused-partial-write). Found by comparing the standalone scripts' export with the executable's over every shipped project file. -->
