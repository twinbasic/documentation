---
title: File
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/File
has_toc: false
---

# File class
{: .no_toc }

A file inside the IDE's virtual file system. Extends [**FileSystemItem**](FileSystemItem) with content accessors — raw bytes via [**Data**](#data) / [**DataLen**](#datalen), a decoded text view via [**Text**](#text), a text-with-options accessor via [**ReadText**](#readtext), plus an [**IsDirty**](#isdirty) flag indicating unsaved changes.

A **File** also inherits the universal [**FileSystemItem**](FileSystemItem) members — [**Name**](FileSystemItem#name), [**Path**](FileSystemItem#path), [**Type**](FileSystemItem#type), [**Parent**](FileSystemItem#parent). The [**Type**](FileSystemItem#type) value tells the addin what encoding the file is in and whether the text accessors are applicable; see [**FileSystemItemType**](FileSystemItem#filesystemitemtype) for the list.

```tb
' Read every source file's text:
Private Sub WalkAllFiles(ByVal folder As Folder)
    Dim item As FileSystemItem
    For Each item In folder
        If TypeOf item Is Folder Then
            WalkAllFiles item
        Else
            Dim file As File = item
            If file.Type <> FileOTHER Then
                ProcessText file.Path, file.ReadText(ReadTextFlags.CommentsToWhitespace)
            End If
        End If
    Next
End Sub
```

> [!NOTE]
> File **content is currently read-only** from the addin's perspective. The interface declares `Property Let` accessors for [**Data**](#data) and [**Text**](#text) but they are tagged `[Unimplemented]`. Use [**Editor.Save**](Editor#save) on an active editor pane to persist text changes made through that pane, or [**CodeEditor.Text**](CodeEditor#text) / [**CodeEditor.SelectedText**](CodeEditor#selectedtext) for in-editor edits.

* TOC
{:toc}

## Properties

### Data
{: .no_toc }

The raw on-disk bytes of the file. Read returns a **Byte()** of the current content. The `Property Let` form is declared but marked `[Unimplemented]` — writes are not currently supported.

Syntax: *file*.**Data** **As Byte()**

### DataLen
{: .no_toc }

The length in bytes of the current content — equivalent to `UBound(file.Data) + 1` but without copying the array. **LongLong**, read-only. Useful for size displays and quick file-size comparisons.

### IsDirty
{: .no_toc }

**True** if the file has unsaved changes in the IDE. **Boolean**, read-only.

### Text
{: .no_toc }

The file's content decoded as a **String**, with the appropriate UTF-16 conversion for the underlying encoding ([**FileTWIN**](FileSystemItem#FileSystemItemType_FileTWIN) → UTF-8 → UTF-16; [**FileBAS**](FileSystemItem#FileSystemItemType_FileBAS) / [**FileCLS**](FileSystemItem#FileSystemItemType_FileCLS) → System-ANSI → UTF-16; [**FileVIRTUALDOC**](FileSystemItem#FileSystemItemType_FileVIRTUALDOC) / [**FileUIDESIGNER**](FileSystemItem#FileSystemItemType_FileUIDESIGNER) / [**FileJSON**](FileSystemItem#FileSystemItemType_FileJSON) → UTF-8 → UTF-16). Calling on a [**FileOTHER**](FileSystemItem#FileSystemItemType_FileOTHER) is not supported.

Read returns the decoded text. The `Property Let` form is declared but marked `[Unimplemented]` — writes are not currently supported.

Syntax: *file*.**Text** **As String**

## Methods

### ReadText
{: .no_toc }

A text-with-options accessor — the [**Text**](#text) view, but with optional transforms applied. Currently the only option strips comments and replaces them with whitespace; future versions may add more.

Syntax: *file*.**ReadText**( *Options* ) **As String**

*Options*
: *required* A [**ReadTextFlags**](#readtextflags) value. Pass `0` for raw text equivalent to reading [**Text**](#text); pass [**CommentsToWhitespace**](#ReadTextFlags_CommentsToWhitespace) to mask out comments while preserving line and column positions of every non-comment character.

Valid on every text file kind ([**FileTWIN**](FileSystemItem#FileSystemItemType_FileTWIN), [**FileBAS**](FileSystemItem#FileSystemItemType_FileBAS), [**FileCLS**](FileSystemItem#FileSystemItemType_FileCLS), [**FileVIRTUALDOC**](FileSystemItem#FileSystemItemType_FileVIRTUALDOC), [**FileUIDESIGNER**](FileSystemItem#FileSystemItemType_FileUIDESIGNER), [**FileJSON**](FileSystemItem#FileSystemItemType_FileJSON)); calling on a [**FileOTHER**](FileSystemItem#FileSystemItemType_FileOTHER) is not supported.

The line and column structure of the returned text matches the original file — `CommentsToWhitespace` only blanks the comment characters, never moves the surrounding code. That makes the option suitable for indexers / search tools that need both "find non-comment occurrences" and "report the position in the original file".

## ReadTextFlags
{: #readtextflags }

The option flags consumed by [**ReadText**](#readtext). A `[Flags]`-tagged enum — values can be `Or`'ed in future versions.

| Constant | Value | Description |
|----------|-------|-------------|
| **CommentsToWhitespace**{: #ReadTextFlags_CommentsToWhitespace } | 1 | Replace every byte that is part of a comment with a space. Line / column positions of every non-comment character are preserved. |
