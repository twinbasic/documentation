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

Every node in the tree — the root, directories, and files — shares the same common header.  The first 2 bytes carry one of two meanings depending on position: at the root entry they hold the file format version; everywhere else they hold the entry kind.

| Offset | Size | Type      | Field      | Description |
|--------|------|-----------|------------|-------------|
| +0     | 2    | int16     | `kind`     | At the root: file format version (currently `1`).  Everywhere else: entry kind (`1` = file, `2` = directory). |
| +2     | var  | LenString | `name`     | Entry name (filename or folder name). |
| +2+var | 8    | uint64    | `revision` | Revision counter (see [revision](#revision-counter)). |
| ...    | 4    | uint32    | `flags`    | File-system flags bitmask (see [flags](#flags)). |
| ...    | 1    | uint8     | `category` | Category tag (see [category](#category-tag)). |

After this common header, the entry body depends on whether the entry is a **file** or a **directory**.

### Determining entry type

The root entry is always the first entry parsed.  It is always a directory — its 2-byte field is the file format version, not a kind tag, and its value (currently `1`) coincides with the file-kind value but should not be read as one.  Every entry after the root is determined by its `kind`:

- **File** — `kind == 1`.
  Body: content blob followed by a revision trailer.
- **Directory** — `kind == 2`.
  Body: child count followed by child entries.

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

### revision counter

For files, `revision` is a 64-bit counter that starts at a low value and increments with each edit inside the IDE.  For the root entry and directories it is always 0.

| Context | Typical values |
|---------|----------------|
| New or untouched file | `0x0002`–`0x0009` |
| Heavily edited file | `0x17D5`, `0x1AA0` |
| Root and directories | `0x0000` |

Only the low 16 bits have been observed to vary in real-world files; the upper 48 bits are always zero in practice.

### flags

A 32-bit bitmask describing file-system-level properties of the entry.  Every entry observed so far has `flags == 0`, but the IDE recognises the following bits:

| Bit value    | Name          | Meaning |
|--------------|---------------|---------|
| `0x00000000` | `None`        | Default — no flags set. |
| `0x00000001` | `Hidden`      | Hidden from the user, but accessible via the VFS. |
| `0x00000002` | `SuperHidden` | Not accessible via the VFS — internal only. |
| `0x00000004` | `Virtual`     | Virtual items are skipped during serialization. |

Other bits are reserved.

### category tag

Encodes the semantic role of the entry within the project:

| category | Entry name              | Meaning |
|----------|-------------------------|---------|
| 0x00     | *(various)*             | Default.  Used for the root, most files, and resource subdirectories (`BITMAP`, `ICON`, `MANIFEST`). |
| 0x01     | `References`            | References directory.  Always virtual — see note below. |
| 0x02     | `Resources`             | Resource directory. |
| 0x03     | `Sources`               | Source code directory. |
| 0x04     | `Settings`              | Project settings file (JSON). |
| 0x05     | `ImportedTypeLibraries` | Imported type library directory. |
| 0x06     | `Miscellaneous`         | Miscellaneous files directory (screenshots, etc.). |
| 0x07     | `Packages`              | Package references directory. |

> [!NOTE]
> The `References` directory (category `0x01`) is a virtual folder — it carries the [`Virtual`](#flags) flag and is skipped during serialization, so it never appears in saved `.twinproj` or `.twinpack` files.  The IDE materialises it at runtime from the project's references list.

## Differences between .twinproj and .twinpack

Both formats use the identical binary structure.  The differences are in which entries are present:

| Entry                  | .twinproj | .twinpack |
|------------------------|-----------|-----------|
| `.meta` file           | Yes       | No        |
| `CHANGELOG.md`         | Sometimes | Sometimes |
| `LICENCE.md`           | Sometimes | Sometimes |
| `Settings` file        | Yes       | Yes       |
| `Sources` directory    | Yes       | Yes       |
| `Resources` directory  | Yes       | Yes       |
| `Packages` directory   | Yes       | Yes       |

The `References` directory (category `0x01`) is virtual and is omitted from both formats during serialization — see [category tag](#category-tag).

### .meta file

Present only in `.twinproj` files.  Contains JSON storing the user's IDE layout preferences — expanded folders, open editors, watch list, and outline-panel options.  This file is stripped when the IDE generates a `.twinpack` for distribution.

### Settings file

Always present (`category = 0x04`).  Contains JSON with project configuration including the build type, references, version numbers, and other project settings.

## Typical tree structures

### .twinproj (Standard EXE project)

```
ROOT "NewProject"               (version=1, category=0x00)
  DIR  "Miscellaneous"          (kind=2, category=0x06)
  DIR  "Packages"               (kind=2, category=0x07)
  DIR  "ImportedTypeLibraries"  (kind=2, category=0x05)
  DIR  "Resources"              (kind=2, category=0x02)
    DIR  "ICON"                 (kind=2, category=0x00)
      FILE "twinBASIC.ico"      (kind=1, category=0x00)
  DIR  "Sources"                (kind=2, category=0x03)
    FILE "Form1.tbform"         (kind=1, category=0x00)
    FILE "Form1.twin"           (kind=1, category=0x00)
  FILE "Settings"               (kind=1, category=0x04)
  FILE ".meta"                  (kind=1, category=0x00)
```

### .twinpack (distributed package)

```
ROOT "CustomControlsPackage"    (version=1, category=0x00)
  FILE "CHANGELOG.md"           (kind=1, category=0x00)
  FILE "LICENCE.md"             (kind=1, category=0x00)
  DIR  "Miscellaneous"          (kind=2, category=0x06)
    FILE "frmTextbox.png"       (kind=1, category=0x00)
  DIR  "ImportedTypeLibraries"  (kind=2, category=0x05)
  FILE "Settings"               (kind=1, category=0x04)
  DIR  "Sources"                (kind=2, category=0x03)
    FILE "WaynesGrid.twin"      (kind=1, category=0x00)
  DIR  "Resources"              (kind=2, category=0x02)
    DIR  "MANIFEST"             (kind=2, category=0x00)
      FILE "#1.xml"             (kind=1, category=0x00)
    DIR  "BITMAP"               (kind=2, category=0x00)
      FILE "twinBASIC.bmp"      (kind=1, category=0x00)
  DIR  "Packages"               (kind=2, category=0x07)
```

## Notes

- Child entry order within a directory is not sorted; it reflects the insertion order within the IDE.
- The format has no index or offset table — entries must be read sequentially from the start of the file.
- The `.twinproj` format is also used for the file system of the IDE itself; the same binary encoding applies.
