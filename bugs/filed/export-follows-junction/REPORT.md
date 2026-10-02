Filed as [twinbasic/twinbasic#2456](https://github.com/twinbasic/twinbasic/issues/2456).

## Export Project follows a directory junction in its folder and deletes what it points to

**Describe the bug**
**File → Export Project** empties its export folder before it writes, as the *Export Path* setting warns. It does not stop at a directory junction in that folder: it goes through the junction, deletes the files in the folder the junction points to, and then deletes the junction. Data outside the export folder is lost, and the only record is the Debug Console, with *Export Verbose* on.

**To Reproduce**
**This deletes files.** Do it only in a scratch folder made for this, `<S>` below, for example `C:\Scratch\junction-test`. Everything in `<S>\outside` is deleted.

Steps to reproduce the behavior:
1. Open `export-follows-junction.twinproj` (attached as `export-follows-junction.zip`), after unzipping it into `<S>`. Its *Export Path* is `${SourcePath}\export` and *Export Verbose* is on (Project Settings, Export).
2. In a Command Prompt, make the export folder, a folder outside it that holds a file, and a junction in the export folder to that folder:
   ```
   mkdir <S>\export
   mkdir <S>\outside
   echo keep me> <S>\outside\precious.txt
   mklink /J <S>\export\linked <S>\outside
   ```
3. Choose **File → Export Project**.
4. The Debug Console shows:
   ```
   [EXPORT]  DELETED: \\?\<S>\export\linked\precious.txt
   [EXPORT]  DELETED: \\?\<S>\export\linked
   ```
   and `<S>\outside` is empty afterwards.

**Expected behavior**
The export deletes the junction itself, or leaves it alone, and never what it points to. A junction (or symbolic link) is not part of the export folder's contents.

**Desktop:**
 - OS: Windows 10 Pro 22H2 (build 19045)
 - twinBASIC compiler version: BETA 995

**Additional context**
Severity: data loss outside the folder the user chose. The command-line `export` verb does not reproduce it: it deletes nothing.

<!-- Asserted by `ide-test.bat --only export` (test/ide/export.test.mjs, "a junction in the export folder is followed, and its target emptied"), which calls the IDE's own `exportProjectTo()` over DevTools on a folder in the lane's work folder; passes on BETA 995. Found by the Export Project probe for round 8's UC-55. When fixed: update that test, docs/IDE/Menu/File.md and docs/IDE/Project Settings.md if they warn about it. The reproducer is mode manual: its steps are what a person does in the IDE, and nothing here changes the reader's registry. -->
