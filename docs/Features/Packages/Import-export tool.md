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

**The tB executable cannot pack a project that embeds a package.** A package a project uses
is embedded in it by default, as a folder under `Packages\` (see [Linked Packages](Linked)).
`export` writes that folder out, but `import` stops at the first folder inside `Packages\`: it
writes nothing, prints neither `... DONE` nor `... FAILED`, and exits with code `999`. Five of
the project files that come with the IDE are like this, among them the
**WinNativeCommonCtls** package and the *Standard EXE (plus VBCCR v1.8)* template. The script
packs them.

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
