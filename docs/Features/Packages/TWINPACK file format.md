---
title: TWINPACK File Format
parent: Package Management
grand_parent: Features
nav_order: 6
permalink: /Features/Packages/File-Format
---

# TWINPACK file format

> [!WARNING]
> This binary format is an internal implementation detail of the twinBASIC IDE and is subject to change without notice.  There is no official support for reading or writing these files outside of the twinBASIC executable.  If you build tooling that relies on this format, be prepared for breakage when the IDE is updated.

Both `.twinproj` (project files) and `.twinpack` (distributable package files) use the same binary container format.  The format encodes a tree of named entries — directories containing children, and files containing binary content.

All multi-byte integers are **little-endian**.

## File header

Every file begins with a 4-byte magic number:

| Offset | Size | Type   | Value        | Description |
|--------|------|--------|--------------|-------------|
| 0x00   | 4    | uint32 | `0xEA0BA51C` | Magic number (constant). |

The root entry immediately follows the magic.

## Primitive types

### LenString

A length-prefixed byte string.  Encoding is UTF-8 for filenames and text content; binary content (images, etc.) is stored verbatim.

| Offset | Size       | Type   | Description |
|--------|------------|--------|-------------|
| +0     | 4          | uint32 | `length` — byte count.  May be 0. |
| +4     | `length`   | byte[] | Raw bytes.  Absent when `length` is 0. |

## Entry structure

Every node in the tree — the root, directories, and files — shares a common header:

| Offset | Size | Type      | Field   | Description |
|--------|------|-----------|---------|-------------|
| +0     | 2    | int16     | `kind`  | Entry type (see below). |
| +2     | var  | LenString | `name`  | Entry name (filename or folder name). |
| +2+var | 2    | uint16    | `mark1` | Revision counter (see [mark1](#mark1-revision-counter)). |
| ...    | 10   | byte[]    | `pad`   | Reserved.  Always observed as all zeros. |
| ...    | 1    | uint8     | `mark2` | Category tag (see [mark2](#mark2-category-tag)). |

After this common header, the entry body depends on whether the entry is a **file** or a **directory**.

### Determining entry type

The root entry is always the first entry parsed.  It is always a directory (even though it has `kind=1`), because the format uses positional logic:

- **Directory** — the root entry, or any entry with `kind != 1`.
  Body: child count followed by child entries.
- **File** — any non-root entry with `kind == 1`.
  Body: content blob followed by a revision trailer.

Observed `kind` values:

| kind | Meaning |
|------|---------|
| 1    | File (or root directory — always the first entry) |
| 2    | Directory |

### Directory body

Follows the common header for directory entries:

| Offset | Size | Type    | Field      | Description |
|--------|------|---------|------------|-------------|
| +0     | 4    | uint32  | `count`    | Number of child entries.  May be 0. |
| +4     | var  | Entry[] | `children` | `count` child entries, concatenated. |

### File body

Follows the common header for file entries:

| Offset | Size              | Type      | Field           | Description |
|--------|-------------------|-----------|-----------------|-------------|
| +0     | var               | LenString | `contents`      | File content (source code, images, JSON, etc.). |
| +var   | 4                 | uint32    | `revisionCount` | Number of trailing revision entries. |
| +var+4 | `revisionCount`×4 | uint32[]  | `revisions`     | Revision entries.  Absent when `revisionCount` is 0. |

The `revisionCount` field is 0 for the vast majority of files, making the file body effectively just the contents followed by 4 zero bytes.  Non-zero counts have been observed in packages that embed other packages.

## Field details

### mark1 (revision counter)

For files, `mark1` is a revision counter that starts at a low value and increments with each edit inside the IDE.  For the root entry and directories it is always 0.

| Context | Typical values |
|---------|----------------|
| New or untouched file | `0x0002`–`0x0009` |
| Heavily edited file | `0x17D5`, `0x1AA0` |
| Root and directories | `0x0000` |

### mark2 (category tag)

Encodes the semantic role of the entry within the project:

| mark2 | Entry name              | Meaning |
|-------|-------------------------|---------|
| 0x00  | *(various)*             | Default.  Used for the root, most files, and resource subdirectories (`BITMAP`, `ICON`, `MANIFEST`). |
| 0x02  | `Resources`             | Resource directory. |
| 0x03  | `Sources`               | Source code directory. |
| 0x04  | `Settings`              | Project settings file (JSON). |
| 0x05  | `ImportedTypeLibraries` | Imported type library directory. |
| 0x06  | `Miscellaneous`         | Miscellaneous files directory (screenshots, etc.). |
| 0x07  | `Packages`              | Package references directory. |

## Differences between .twinproj and .twinpack

Both formats use the identical binary structure.  The differences are in which entries are present:

| Entry                  | .twinproj | .twinpack |
|------------------------|-----------|-----------|
| `.meta` file           | Yes       | No        |
| `References` directory | Sometimes | No        |
| `CHANGELOG.md`         | Sometimes | Sometimes |
| `LICENCE.md`           | Sometimes | Sometimes |
| `Settings` file        | Yes       | Yes       |
| `Sources` directory    | Yes       | Yes       |
| `Resources` directory  | Yes       | Yes       |
| `Packages` directory   | Yes       | Yes       |

### .meta file

Present only in `.twinproj` files.  Contains JSON storing the user's IDE layout preferences — expanded folders, open editors, watch list, and outline-panel options.  This file is stripped when the IDE generates a `.twinpack` for distribution.

### Settings file

Always present (`mark2 = 0x04`).  Contains JSON with project configuration including the build type, references, version numbers, and other project settings.

## Typical tree structures

### .twinproj (Standard EXE project)

```
ROOT "NewProject"               (kind=1, mark2=0x00)
  DIR  "Miscellaneous"          (kind=2, mark2=0x06)
  DIR  "Packages"               (kind=2, mark2=0x07)
  DIR  "ImportedTypeLibraries"  (kind=2, mark2=0x05)
  DIR  "Resources"              (kind=2, mark2=0x02)
    DIR  "ICON"                 (kind=2, mark2=0x00)
      FILE "twinBASIC.ico"      (kind=1, mark2=0x00)
  DIR  "Sources"                (kind=2, mark2=0x03)
    FILE "Form1.tbform"         (kind=1, mark2=0x00)
    FILE "Form1.twin"           (kind=1, mark2=0x00)
  FILE "Settings"               (kind=1, mark2=0x04)
  FILE ".meta"                  (kind=1, mark2=0x00)
```

### .twinpack (distributed package)

```
ROOT "CustomControlsPackage"    (kind=1, mark2=0x00)
  FILE "CHANGELOG.md"           (kind=1, mark2=0x00)
  FILE "LICENCE.md"             (kind=1, mark2=0x00)
  DIR  "Miscellaneous"          (kind=2, mark2=0x06)
    FILE "frmTextbox.png"       (kind=1, mark2=0x00)
  DIR  "ImportedTypeLibraries"  (kind=2, mark2=0x05)
  FILE "Settings"               (kind=1, mark2=0x04)
  DIR  "Sources"                (kind=2, mark2=0x03)
    FILE "WaynesGrid.twin"      (kind=1, mark2=0x00)
  DIR  "Resources"              (kind=2, mark2=0x02)
    DIR  "MANIFEST"             (kind=2, mark2=0x00)
      FILE "#1.xml"             (kind=1, mark2=0x00)
    DIR  "BITMAP"               (kind=2, mark2=0x00)
      FILE "twinBASIC.bmp"      (kind=1, mark2=0x00)
  DIR  "Packages"               (kind=2, mark2=0x07)
```

## Notes

- Child entry order within a directory is not sorted; it reflects the insertion order within the IDE.
- The format has no index or offset table — entries must be read sequentially from the start of the file.
- The `.twinproj` format is also used for the file system of the IDE itself; the same binary encoding applies.
