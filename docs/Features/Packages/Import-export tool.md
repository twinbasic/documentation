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

### The exit code is always zero

The exit code is `0` whether the operation succeeded or failed --- observed on a
missing input file, a refused overwrite, and unrecognised command-line syntax alike.
A build script that tests it will carry on after a failure.

The result is on the last line of standard output instead: `... DONE` on success,
`... FAILED` on failure. A batch file can test for it:

```batch
twinBASIC_win32.exe export "%PROJ%" "%TREE%" --overwrite > tb.log
find "... DONE" tb.log > nul || exit /b 1
```

> [!NOTE]
>
> There is no command that compiles a project. The executable accepts `export` and
> `import` and nothing else; building is done from the IDE. Passing any argument that
> begins with `--` on its own puts the process into one of its internal server roles,
> where it waits instead of exiting.

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

```
node impexp.mjs export unpacked/ MyProject.twinproj
```

```
python impexp.py export unpacked/ MyPackage.twinpack
```

### Self-test

Both implementations include a built-in test suite that exercises parsing,
serialization, and full round-trip fidelity.

```
node impexp.mjs --self-test
python impexp.py --self-test
```

### Round-trip notes

Importing and re-exporting a binary file preserves all file contents
byte-for-byte.  The following metadata fields are reset to defaults on a
disk round-trip (they are not stored on the filesystem):

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
