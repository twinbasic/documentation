---
title: Import/Export Tool
parent: Package Management
grand_parent: Features
nav_order: 7
permalink: /Features/Packages/Import-Export-Tool
---

# Import/export tool

Unpacking a `.twinproj` or `.twinpack` file into a directory tree, and repacking a
tree back into a project file, is useful for inspecting package contents,
batch-editing source files outside the IDE, and putting a twinBASIC project under
version control.

There are two ways to do it: the twinBASIC compiler executable does it itself, and
two standalone scripts do it on a machine that has no twinBASIC installation.

| | [compiler executable](#the-compiler-executable) | [standalone scripts](#the-standalone-scripts) |
|---|---|---|
| Officially supported | yes | no |
| Needs twinBASIC installed | yes | no |
| Runs on | Windows | any platform with Node.js or Python |
| Accepts a `.twinpack` path | no, see [Only `.twinproj` is accepted](#only-twinproj-is-accepted) | yes |
| Packs a project that embeds a package | no, see [`import` fails on a tree with an embedded package](#import-fails-on-a-tree-with-an-embedded-package) | yes |
| Verb that unpacks a file into a tree | `export` | `import` |
| Verb that packs a tree into a file | `import` | `export` |

> [!WARNING]
>
> The two tools give the same two verb names opposite meanings, and one pair of
> invocations collides exactly. `impexp import MyProject.twinproj tree/` unpacks the
> project into `tree/`; `twinBASIC_win32.exe import MyProject.twinproj tree/` packs
> `tree/` into the project, and with `--overwrite` set it replaces `MyProject.twinproj`
> without asking. Same words, same argument order, opposite direction of travel.
>
> For the compiler, the verb says what is happening to the *project file*: `export`
> takes source out of it, `import` puts source into it. For the standalone scripts,
> the verb says what is happening to the *working directory*.

## The compiler executable

The executable that ships with the IDE handles both directions itself. This is the
only officially supported way to read or write a project file outside the IDE.

```batch
twinBASIC_win32.exe export "C:\MyProject.twinproj" "C:\Output\" --overwrite
twinBASIC_win32.exe import "C:\MyProject.twinproj" "C:\Input\"  --overwrite
```

`export` reads the project file and writes the tree. `import` reads the tree and
writes the project file. The project file is the first argument and the directory the
second in both directions, so the verb alone decides which one is overwritten.

`--overwrite` is required whenever an output file already exists. Without it the
operation stops and reports what it refused. A trailing backslash on the directory is
optional.

Either architecture works and both behave identically:

```batch
"%TWINBASIC%\bin\twinBASIC_win32.exe"
"%TWINBASIC%\bin\twinBASIC_win64.exe"
```

> [!IMPORTANT]
>
> Use one of the executables under `bin\`, not the `twinBASIC.exe` in the
> installation root. That one is the IDE launcher: given `export` or `import` it
> prints nothing, writes nothing, and exits with a success code.

### The four verbs the usage message leaves out

Run the executable with no recognised verb and it prints a usage message naming only
`export` and `import`. Four more verbs work. Each takes a single `.twinproj` path and
writes to standard output:

| Verb | Prints |
|------|--------|
| `settings` | the project's settings, as JSON |
| `licence` | the project's `LICENCE.md` |
| `changelog` | the project's `CHANGELOG.md` |
| `readme` | the project's `README.md` |

```batch
twinBASIC_win32.exe settings "C:\MyProject.twinproj"
```

`settings` prints the same keys the Project Settings pane edits, including
`project.buildType`, `project.startupObject` and the full `project.references` list.

> [!NOTE]
>
> The three document verbs print nothing when the project does not hold that file, and
> nothing is also what a failure looks like. Test for an empty output rather than
> treating it as an empty document.

An installed package is a project file too --- every folder under the installation's
`packages\` directory holds one named `package.twinproj` --- so all six verbs work on
packages as well as on projects.

### Only `.twinproj` is accepted

The input and output paths must end in `.twinproj`. Any other path has `.twinproj`
appended to it, which fails and succeeds in two different unhelpful ways:

- `export MyPackage.twinpack out\` looks for `MyPackage.twinpack.twinproj`, does not
  find it, and reports `ERROR: input twinproj file does not exist` --- naming a file
  nobody typed.
- `import MyPackage.twinpack in\` writes `MyPackage.twinpack.twinproj` and reports
  success.

The two formats share one container, so a `.twinpack` can be handled by copying it to
a `.twinproj` name first and copying the result back afterwards. The
[standalone scripts](#the-standalone-scripts) accept either extension as given.

### `import` fails on a tree with an embedded package

A package that a project uses is embedded in it by default, stored as a folder of its own
under `Packages\` (see [Linked Packages](Linked)). `export` writes that folder out with the
rest of the tree, but `import` cannot read it back: it stops as soon as it reaches the
first folder inside `Packages\`. Observed against BETA 983, with both executables:

- no project file is written, and a project already at the output path is left unchanged;
- the last line of output is the `IMPORTED FOLDER:` line for `Packages\`, so neither
  `... DONE` nor `... FAILED` is printed;
- the exit code is `999`.

Any folder inside the top-level `Packages\` does this, even an empty one, so the executable
cannot round-trip a project that embeds a package. Five of the project and package files
that ship with the IDE embed one, among them the **WinNativeCommonCtls** package and the
*Standard EXE (plus VBCCR v1.8)* project template.

The [standalone scripts](#the-standalone-scripts) pack such a tree correctly. Their verb for
that is `export`, not `import` --- see the warning at the top of this page.

### A zero exit code does not mean success

The exit code is `0` on success, and also on every failure the executable reports itself:
observed on a missing input file, a refused overwrite, and unrecognised command-line syntax
alike. A build script that tests it will carry on after such a failure. The only non-zero
exit code observed is `999`, from
[`import` on an embedded package](#import-fails-on-a-tree-with-an-embedded-package).

The result is on the last line of standard output instead: `... DONE` on success,
`... FAILED` on a failure the executable reports, and neither after the `999` failure. So
test for `... DONE`, not for `... FAILED`. A batch file can do that:

```batch
twinBASIC_win32.exe export "%PROJ%" "%TREE%" --overwrite > tb.log
find "... DONE" tb.log > nul || exit /b 1
```

### `import` converts code files to CRLF

`import` converts LF line endings to CRLF in every `.twin`, `.bas` and `.cls` file,
whatever folder it is in and whatever the case of its extension. A file with mixed line
endings comes out all CRLF. The IDE stores code files with CRLF line endings, so a tree
whose code files have LF line endings --- as a Git checkout or an editor may leave
them --- needs no conversion before it is imported.

Every other file is stored exactly as it is on disk, line endings included: the designer
files (`.tbform`, `.tbcontrol`, `.tbppage`, `.tbreport`), `Settings`, and all resources.

### Compiling from the command line

The six verbs above are the whole command-line surface of the executables under `bin\`,
and none of them builds a project. Passing any argument that begins with `--` on its own
puts the process into one of its internal server roles, where it waits instead of exiting,
so there is no build flag hiding there either.

The IDE executable is a separate program, and it does take a build flag. Given
`--buildAndExit32` or `--buildAndExit64` alongside a project path, `twinBASIC.exe` builds
that project and then closes:

```batch
twinBASIC.exe "C:\MyProject.twinproj" --buildAndExit32
```

`parseCommandLine()` in `ide\main2.js` reads both flags, and the Personal Edition is
refused with a dialog saying it does not support command line builds. The flags are
deliberate, not a leftover.

> [!IMPORTANT]
>
> The build flags cannot act as an unattended pass/fail gate. Observed against BETA 983:
> the process writes nothing to standard output or standard error at any point, it exits
> `0` even when the IDE reports errors for the project, and when the build genuinely fails
> it does not exit at all --- it holds a progress dialog at 100% until the process tree is
> killed. The only thing that closes the IDE on that path is a build-completed notification
> from the compiler, and a failed build does not produce one.

For an unattended compile that reports what went wrong, the repository behind this
documentation site carries `scripts/tbbuild.mjs`. It starts the IDE with a debugging port,
loads the project, waits for the compile to settle, prints the diagnostics, and exits
non-zero when the project has errors. It belongs to the documentation toolchain rather than
to a twinBASIC installation, so it is available to anyone who clones that repository; see
[Tools and Scripts](../../Documentation/Development/Tools#tbbuild).

## The standalone scripts

Two functionally identical, single-file implementations, for a machine with no
twinBASIC installation. Pick whichever runtime is already installed; neither script
has any external dependencies.

| Runtime | Download |
|---------|----------|
| Node.js 18+ | <a href="downloads/impexp.mjs" download>impexp.mjs</a> |
| Python 3.6+ | <a href="downloads/impexp.py" download>impexp.py</a> |

> [!WARNING]
>
> There is no official support for reading or writing project files outside of the
> twinBASIC executable. These scripts may break when the IDE is updated.

### Usage

```
impexp import <file.twinproj|.twinpack> [output_dir]
impexp export <input_dir> <output.twinproj|.twinpack>
impexp --self-test
```

### Import (unpack)

Reads a `.twinproj` or `.twinpack` binary and extracts its contents to a
directory on disk.  If `output_dir` is omitted, a directory named after the
project root entry is created in the current working directory.

```
node impexp.mjs import MyPackage.twinpack
```

```
python impexp.py import MyProject.twinproj unpacked/
```

### Export (pack)

Scans a directory tree and writes a `.twinproj` or `.twinpack` binary.  The
directory name becomes the root entry name in the output file.  Well-known
directory and file names (`Sources`, `Resources`, `Settings`, etc.) are
tagged with the correct `category` values automatically.

Line endings are converted the same way the compiler's `import` converts them: LF
becomes CRLF in `.twin`, `.bas` and `.cls` files, and every other file is stored
byte-for-byte. See [`import` converts code files to CRLF](#import-converts-code-files-to-crlf).

```
node impexp.mjs export unpacked/ MyProject.twinproj
```

```
python impexp.py export unpacked/ MyPackage.twinpack
```

### Self-test

Both implementations include a built-in test suite that exercises parsing,
serialization, full round-trip fidelity, and the line-ending conversion.

```
node impexp.mjs --self-test
python impexp.py --self-test
```

### Round-trip notes

Importing and re-exporting a binary file preserves all file contents
byte-for-byte, except that a code file with LF line endings comes back with
CRLF (see [Export](#export-pack)).  The following metadata fields are reset to
defaults on a disk round-trip (they are not stored on the filesystem):

- **revision counter** --- directories get `0x0000`; files get `0x0002`.
- **flags** --- always written as zero (no flags set).
- **Revision trailer entries** --- always written as zero.
- **Entry order** --- directories first, then files, sorted alphabetically
  within each group.

The IDE regenerates these fields when the project is opened, so the
round-tripped file is fully functional.

The scripts also write a `.meta` file into the unpacked tree, which the compiler
executable does not. Trees produced by either tool otherwise hold the same files with
the same contents.

## See also

- [TWINPACK File Format](File-Format) -- binary format specification
- [Creating a TWINPACK Package](Creating-TWINPACK)
- [Importing a Package from a TWINPACK File](Importing-TWINPACK)
