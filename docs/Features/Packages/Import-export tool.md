---
title: Import/Export Tool
parent: Package Management
grand_parent: Features
nav_order: 7
permalink: /Features/Packages/Import-Export-Tool
---

# Import/export tool

Unpacks a `.twinproj` or `.twinpack` file into a folder of source files, and packs a folder
back into a project file.

Use it to put a project under version control, to edit source outside the IDE, or to see
what a package contains. Two programs do it, and they take the same commands:

- **The tB executable**, `twinBASIC_win32.exe` or `twinBASIC_win64.exe` in the `bin\` folder
  of a twinBASIC installation. This is the officially supported way to read or write a
  project file outside the IDE.
- **The standalone script**, in a Node.js edition and a Python edition, which runs on any
  platform and needs no twinBASIC installation. It reads and writes the file format itself,
  so an IDE update can break it; in return it removes several of the tB executable's
  limitations.

| Runtime | Download |
|---------|----------|
| Node.js 18+ | <a href="downloads/impexp.mjs" download>impexp.mjs</a> |
| Python 3.6+ | <a href="downloads/impexp.py" download>impexp.py</a> |

> [!WARNING]
>
> Older copies of the script use `import` and `export` the other way round, and overwrite
> files without asking: with one, `impexp import MyProject.twinproj tree` unpacks the project
> over whatever `tree` holds. Run your copy with no arguments. If its usage message shows
> `impexp import <file.twinproj|.twinpack> [output_dir]`, download it again.

## Usage

```
<program> export <project> <folder> [--overwrite]
<program> import <project> <folder> [--overwrite]
<program> settings <project>
<program> licence <project>
<program> changelog <project>
<program> readme <project>
<program> --self-test
<program> --help
```

`<program>` is the tB executable, `node impexp.mjs` or `python impexp.py`. `<project>` is a
`.twinproj` or `.twinpack` file, and it always comes first. The verb says what happens to it:
`export` takes source out of the project, and `import` puts source into it.

| Command or option | What it does | tB executable | Script |
|-------------------|--------------|---------------|--------|
| `export` | writes the project's files into the folder, which is created if it does not exist | yes | yes |
| `import` | packs the folder into the project file | yes | yes |
| `--overwrite` | lets `export` replace files already in the folder, and `import` replace an existing project file | yes | yes |
| `settings` | prints the project's `Settings` file, which is JSON | yes | yes |
| `licence` | prints the project's `LICENCE.md` | yes | yes |
| `changelog` | prints the project's `CHANGELOG.md` | yes | yes |
| `readme` | prints the project's `README.md` | yes | yes |
| `--self-test` | runs the script's own tests | no | yes |
| `--help` | prints the usage | no | yes |

```batch
twinBASIC_win32.exe export "C:\Projects\MyProject.twinproj" "C:\Projects\MyProject\"
node impexp.mjs import MyProject.twinproj MyProject --overwrite
```

A package is a project file too: every folder under the installation's `packages\` holds one,
named `package.twinproj`, so every command works on packages as well.

The tB executable has no `--help`. Given a command it does not recognise, it prints a usage
message that names only `export` and `import`; given no arguments at all, it does not exit.

> [!IMPORTANT]
>
> Use the tB executable from `bin\`. The `twinBASIC.exe` in the installation folder is the
> IDE: given these commands, it writes nothing and exits with a success code.

## What both programs do

- **`export` never deletes a file.** A file that the project no longer holds stays in the
  folder, and the next `import` packs it back into the project. Export into an empty folder
  to get exactly the project's files. The script lists such files in a warning; the tB
  executable does not.
- **`import` packs everything in the folder**, hidden files and empty folders included, so
  keep the folder for the project's files alone. Do not use the top folder of a Git
  repository: the tB executable packs the `.git` folder into the project, and a later
  `export` with `--overwrite` writes it back over the working repository.
  *The script skips `.git`.*
- **`import` converts LF line endings to CRLF** in `.twin`, `.bas` and `.cls` files, which
  the IDE stores with CRLF. A tree that Git or an editor left with LF line endings needs no
  conversion first. Every other file is stored exactly as it is on disk.
- **`export` leaves out the `.meta` file**, which holds the IDE's editor state: open editors,
  cursor positions and watches. A project packed without one opens normally.
- **The printing commands** write the file byte for byte to standard output. They look only
  at the top of the project, and match the name in any case. When the project has no such
  file, the tB executable prints nothing and the script reports an error.

## Where the two differ

| | tB executable | Script |
|---|---|---|
| Runs on | Windows, with twinBASIC installed | any system with Node.js or Python |
| A `.twinpack` file for `export` or `import` | not accepted, see below | accepted |
| A project that embeds a package | `import` fails, see below | packed |
| Paths | folders need backslashes, and `export` needs a full path, with backslashes, to the project | any form |
| `export` refused because `--overwrite` is missing | writes the files that were not there yet | writes nothing |
| Files in the folder that the project does not hold | left in place, with no warning | left in place, and listed in a warning |
| A `.git` folder | packed by `import`, and written back by `export` | skipped by both |
| A damaged project file | shows a message box and waits until it is closed | fails with an error |
| A printing command, when the project lacks the file | prints nothing | fails with an error |
| Error messages | on standard output | on standard error |
| Exit code | `0` even after a failure, except the `999` below | says what happened, see [Checking the result](#checking-the-result) |

**The tB executable accepts `.twinpack` only in the printing commands.** `export` and `import`
add `.twinproj` to a name that does not already end with it: `export MyPackage.twinpack out\`
reports that its input does not exist, and `import MyPackage.twinpack in\` writes
`MyPackage.twinpack.twinproj`. The two formats are one container, so copy the file to a
`.twinproj` name first, and copy the result back afterwards.

**The tB executable cannot pack a project that embeds a package.** A package added to a
project from TWINSERV or from a TWINPACK file is embedded in it by default, as a folder under
`Packages\` (see [Linked Packages](Linked)). `export` writes that folder out, but `import`
stops at the first folder inside `Packages\`: it writes nothing, prints neither `... DONE` nor
`... FAILED`, and exits with code `999`. Five of the project files that come with the IDE are
like this, among them the **WinNativeCommonCtls** package and the *Standard EXE (plus VBCCR
v1.8)* template. The script packs them. An export made by the IDE's **File → Export Project**
stops the same way, because it holds the compiler packages under `Packages\`; see [Packing
the export back into a project](../../tB/IDE/Project/Menu/File#packing-the-export-back-into-a-project).

## Checking the result

The tB executable's exit code is `0` after every failure it reports itself, so a build script
has to test the last line of the output instead: `... DONE` on success. The script ends the
same way, so one test works with both:

```batch
twinBASIC_win32.exe export "%PROJ%" "%TREE%" --overwrite > tb.log
find "... DONE" tb.log > nul || exit /b 1
```

Test for `... DONE` rather than for `... FAILED`, which the `999` failure does not print.
`... DONE` is not proof on its own, either: once the message box about a damaged project file
is closed, the tB executable's `export` prints a warning that it could not read the project,
and then `... DONE`. Its printing commands write their error messages to standard output as
well, so check that what `settings` printed is not an `ERROR:` line before using it.

The script needs none of this: its exit code says what happened, so the output need not be
read at all. A warning counts, so an `export` that did its work but warned exits with `6`, not
`0`.

| Exit code | Meaning |
|-----------|---------|
| `0` | done, with nothing to report |
| `1` | failed for a reason not listed here, such as a file that could not be written |
| `2` | a mistake in the command line |
| `3` | refused, because a file exists and `--overwrite` is not set |
| `4` | the project file, the folder, or the file to print does not exist |
| `5` | the project file is damaged or is not one, or the folder has no `Settings` file |
| `6` | done, with a warning: the folder holds files the project does not, or the project holds one name twice |

```batch
node impexp.mjs export MyProject.twinproj MyProject --overwrite
if errorlevel 6 (
    echo MyProject holds files that MyProject.twinproj does not.
) else if errorlevel 1 exit /b 1
```

## Keeping a project in Git
{: #keeping-a-project-in-git }

The usual reason to export is version control. The exported folder is plain text that Git can
diff and merge, where a `.twinproj` is one binary file. The steps below use the tB executable
or the script, and everything they take is described above. The IDE can also keep the folder
up to date by itself, on every save: see [Keeping a project in Git from the
IDE](#keeping-a-project-in-git-from-the-ide).

> [!WARNING]
> The IDE's **File → Export Project** empties its folder before it writes --- a `.git` folder
> included --- and with the *Export After Save* setting it does so on every save. Never point
> it at the repository's top folder or at the folder that holds the `.twinproj`; give it a
> folder of its own, as the next section does. Its export also holds the source of the
> compiler packages, and the tB executable cannot pack that export back into a project while
> any folder remains under its `Packages`. See
> [Export Project](../../tB/IDE/Project/Menu/File#export-project).

The steps, in order:

1. **Export into a folder of its own, not the repository's top folder** --- a `src` folder
   beside `.git`, for example. `import` packs everything in the folder it is given, and the
   tB executable packs a `.git` folder with it. The script skips `.git`, but a folder of
   its own is the safe layout for both.
2. **Export with `--overwrite`, every time.** One command serves the first export and every
   one after it. Into a folder that does not exist yet, `--overwrite` changes nothing: the
   export writes the same files as without it, and ends `... DONE`. Without it, an export
   into a folder that already holds the files goes wrong. The tB executable writes only the
   files that are not there yet, prints an `ERROR:` line for each of the others and then
   `... FAILED`, and exits `0` --- so every changed file keeps its old contents, and the
   commit leaves the changes out. The script refuses the whole export, and exits `3`.

   ```batch
   twinBASIC_win32.exe export "C:\Projects\MyProject.twinproj" "C:\Projects\MyProject\src\" --overwrite > tb.log
   find "... DONE" tb.log > nul || exit /b 1
   ```

   **Empty the folder first** when a file has been removed or renamed in the IDE. `export`
   never deletes a file, so one the project no longer holds stays in the folder, and the
   next `import` packs it back. The script warns about such files; the tB executable does
   not.
3. **Commit the folder.** `export` leaves out the `.meta` file of editor state, and a project
   packed without one opens normally. A checkout with LF line endings needs no conversion:
   `import` converts LF to CRLF in `.twin`, `.bas` and `.cls` files.
4. **Rebuild the project file with `import --overwrite`**, and [check the
   result](#checking-the-result): the tB executable exits `0` after the failures it reports.
   It also cannot pack a project that embeds a package, and a package added from TWINSERV
   or from a TWINPACK file is embedded by default; the script packs those. The project
   comes first, as in every command:

   ```batch
   twinBASIC_win32.exe import "C:\Projects\MyProject.twinproj" "C:\Projects\MyProject\src\" --overwrite > tb.log
   find "... DONE" tb.log > nul || exit /b 1
   ```

   With the order reversed, the tB executable prints `... FAILED`, writes nothing and still
   exits `0`, so the second line is what catches it.

## Keeping a project in Git from the IDE
{: #keeping-a-project-in-git-from-the-ide }

The IDE can export the project by itself every time it is saved, into a folder that Git
tracks, so the repository is ready to commit after every save. Two project settings set this
up, and a fresh clone is opened in the IDE too; the import/export tool is not needed.

**Set these two project settings**, under *Export* in [Project
Settings](../../tB/IDE/Project/Settings#export) (**Project → Project Settings...**):

| Setting | Value |
|---------|-------|
| [*Export Path*](../../tB/IDE/Project/Settings#export-path) | `${SourcePath}\src` |
| [*Export After Save*](../../tB/IDE/Project/Settings#export-after-save) | **Yes** |

`${SourcePath}` is the folder that holds the `.twinproj` file, so every **Save Project**
(<kbd>CTRL</kbd> + <kbd>S</kbd>) now exports the project into a `src` folder beside it. The
`Settings` file that the export writes keeps both settings, so a clone of the repository has
them too.

> [!WARNING]
> Keep *Export Path* on a folder of its own. Every export deletes everything in its folder
> before it writes, a `.git` folder included, so never set it to the repository's top folder
> or to the folder that holds the `.twinproj`. See
> [Export Project](../../tB/IDE/Project/Menu/File#export-project).

**Make the folder that holds the `.twinproj` the repository's top folder**, with `git init`
there. Once the project has been saved and the `.gitignore` below added, it holds:

```text
MyApp\
    .git\
    .gitignore
    MyApp.twinproj
    src\
```

`src` holds the project's `Settings` file and its `Sources`, `Resources`, `References`,
`Miscellaneous`, `ImportedTypeLibraries` and `Packages` folders. The `.gitignore` is this:

```text
/src/Packages/VB/
/src/Packages/VBA/
/src/Packages/VBRUN/
/src/Packages/AppGlobalClassProject/
/*.twinproj
/Build/
```

**The first four lines keep the compiler packages out of Git.** Every export writes their
full source into `src\Packages`, but they are not part of the project: a `.twinproj` that the
IDE saves does not hold them, and the compiler uses the IDE's own. Imported back from `src`,
they become a copy inside the project that the compiler ignores, and every later export
writes that copy back into `src\Packages`. So after an IDE update, a repository that holds
them keeps the package source of the IDE that first exported them, while the project
compiles against the packages of the IDE in use. [Packing the export back into a
project](../../tB/IDE/Project/Menu/File#packing-the-export-back-into-a-project) has the
measurements.

Those four are the compiler packages of a Standard EXE with the default references. Add a
line for each other compiler package the project references --- `/src/Packages/WebView2Package/`
for the WebView2 package, for example. The project's `Settings` file marks each one's reference
`"isCompilerPackage": true`, and its folder in `src\Packages` is named after the package's own
project, which is not always the name the reference uses: the reference `WindowsControlsPackage`
is the VB package, and its folder is `VB`. Keep the folder of any package the project embeds: a
package added from TWINSERV or from a TWINPACK file is embedded by default (see [Linked
Packages](Linked)), is part of the saved `.twinproj`, and belongs in the repository with the rest
of `src`.

**The fifth line leaves out the `.twinproj`.** `src` is what gets committed and merged, and
the project file is rebuilt from it, as a fresh clone does below; the `.twinproj` itself is
one binary file that Git cannot merge. The last line leaves out what
[**Build**](../../tB/IDE/Project/Menu/File#build) writes: the project templates build into a
`Build` folder beside the `.twinproj`.

**Commit after a save.** Once the save has finished, `src` matches the project:

```batch
git add -A
git commit -m "Describe the change"
```

A file removed or renamed in the IDE disappears from `src` as well, because the export empties
the folder first, and `git add -A` records that. An export can fail without a message box, so
check that the [Debug Console](../../tB/IDE/Project/DebugConsole) shows `[EXPORT] COMPLETED`
for the save before committing.

**Open a fresh clone** in the IDE. It holds `src` and the `.gitignore`, but no `.twinproj`:

1. Choose **File → New Project**, then **Import from folder...** (see [New
   Project](../../tB/IDE/Project/New#import-from-folder)).
2. In the *Browse For Folder* dialog, choose the clone's `src` folder. The project opens
   unsaved, with no file behind it yet.
3. Save it with <kbd>CTRL</kbd> + <kbd>S</kbd>. The project has no file, so **Save Project**
   opens the *Save As* dialog. Save the `.twinproj` in the clone's top folder, beside `src`,
   and not inside `src`: *Export Path* is relative to the folder that holds the `.twinproj`,
   so a project saved inside `src` exports into `src\src`, and the `src` that Git tracks is
   never updated again.

The same save exports the project into `src`, and from then on every save updates it.

**If the repository holds the compiler packages**, because they were committed before the
`.gitignore` listed them, remove them from the clone before step 1, and commit that:

```batch
git rm -r --ignore-unmatch src/Packages/VB src/Packages/VBA src/Packages/VBRUN src/Packages/AppGlobalClassProject
```

Imported with them, the project gets its own copy of each: its `.twinproj` measured 4,222,833
bytes, against 4,207 bytes for the same folder without them.

**After a pull or a merge, open the project from `src` again.** Every save empties `src` and
writes the project as the IDE has it open, so once Git has changed `src`, the next save would
undo those changes. Save and commit before pulling. Afterwards, close the project without
saving it, delete the compiler packages' folders from `src\Packages` --- the last export wrote
them there, though Git ignores them --- and follow the three fresh-clone steps above, saving
over the old `.twinproj`.

A clone that has no compiler packages, of a project that embeds no package, holds no folder
under `src\Packages`, so the tB executable's `import` can pack it as well: see step 4 of
[Keeping a project in Git](#keeping-a-project-in-git).

## Compiling from the command line

None of these commands builds a project. The IDE, `twinBASIC.exe`, accepts
`--buildAndExit32` and `--buildAndExit64` next to a project path, but it prints nothing,
exits `0` when the project has errors, and does not exit at all when the build fails, so it
cannot check a build unattended. The repository behind this documentation has
`scripts/tbbuild.mjs` for that; see [Tools and Scripts](../../Documentation/Development/Tools#tbbuild).

## See also

- [TWINPACK File Format](File-Format) -- binary format specification
- [Creating a TWINPACK Package](Creating-TWINPACK)
- [Importing a Package from a TWINPACK File](Importing-TWINPACK)
