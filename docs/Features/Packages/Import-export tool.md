---
title: Import/Export Tool
parent: Package Management
grand_parent: Features
nav_order: 7
permalink: /Features/Packages/Import-Export-Tool
---

# Import/export tool

A standalone command-line tool for unpacking `.twinproj` and `.twinpack`
files to a directory tree, and for repacking a directory tree back into a
binary project file.  Useful for inspecting package contents, batch-editing
source files outside the IDE, or integrating twinBASIC projects into
version-control workflows.

> [!WARNING]
>
> There is no official support for reading or writing project files outside of the twinBASIC executable. This tool may break when the IDE is updated.

Two functionally identical, single-file implementations are provided -- pick
whichever runtime you already have installed:

| Runtime | Download |
|---------|----------|
| Node.js 18+ | <a href="downloads/impexp.mjs" download>impexp.mjs</a> |
| Python 3.6+ | <a href="downloads/impexp.py" download>impexp.py</a> |

Neither script has any external dependencies.

## Usage

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
tagged with the correct `mark2` category values automatically.

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

## Round-trip notes

Importing and re-exporting a binary file preserves all file contents
byte-for-byte.  The following metadata fields are reset to defaults on a
disk round-trip (they are not stored on the filesystem):

- **mark1** (revision counter) -- directories get `0x0000`; files get
  `0x0002`.
- **Revision entries** -- always written as zero.
- **Entry order** -- directories first, then files, sorted alphabetically
  within each group.

The IDE regenerates these fields when the project is opened, so the
round-tripped file is fully functional.

## See also

- [TWINPACK File Format](File-Format) -- binary format specification
- [Creating a TWINPACK Package](Creating-TWINPACK)
- [Importing a Package from a TWINPACK File](Importing-TWINPACK)
