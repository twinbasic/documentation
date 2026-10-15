---
title: FileProps Package
parent: Contributed Packages
has_toc: false
exclude_from_docs:
  - VCOMObject
  - Example
  - FilePropertyExplorer_Helper
indexed_from: 1.7.1.0
permalink: /tB/Packages/Contributed/FileProps/
---

# FileProps Package
{: .no_toc }

**Author:** WaynePhillipsEA. **Version:** 1.7.1.0

The **FileProps** contributed package provides access to Windows shell file properties through a Virtual-COM wrapper. It exposes a predeclared **FilePropertyExplorer** class that opens a file and returns a **FileProperties** collection; each entry in that collection is a **FileProperty** object with the system name, localized name, unique ID, and current value of one shell property.

## Classes

- [FileProperties](FileProperties/) -- a read-only collection of Windows shell properties for a single file, returned by FilePropertyExplorer
  - [Count](FileProperties/Count) -- returns the number of properties in the collection
  - [FilePath](FileProperties/FilePath) -- returns the full file path of the file that was opened
  - [Item](FileProperties/Item) -- returns the FileProperty object at the given index, name, or ID in the collection
- [FileProperty](FileProperty/) -- one Windows shell property of a file
  - [ID](FileProperty/ID) -- returns a unique identifier string for the shell property
  - [Name](FileProperty/Name) -- returns the system identity name of the property
  - [NameDesc](FileProperty/NameDesc) -- returns the localized display name of the property
  - [Value](FileProperty/Value) -- returns or sets the current value of the shell property as a Variant
  - [ValueDesc](FileProperty/ValueDesc) -- returns the current value of the property as a localized string
- [FilePropertyExplorer](FilePropertyExplorer/) -- a predeclared factory class that opens a file and returns a FileProperties collection of its Windows shell properties
  - [BrowseAndOpenFile](FilePropertyExplorer/BrowseAndOpenFile) -- displays a file-open dialog and returns a FileProperties collection for the selected file
  - [OpenFile](FilePropertyExplorer/OpenFile) -- opens a file by path and returns a FileProperties collection of its shell properties

## Test cases

The notes and warnings of this section are checked by the test cases in [FileProps-tests.twinproj](FileProps-tests.twinproj), a twinBASIC project. It uses FileProps as a [linked package](../../../../Features/Packages/Linked#manual-management): put the package's `.twinpack` in `%APPDATA%\twinBASIC\packages`, then run the project, and each case prints whether it passes.
