---
title: Projects and files
parent: IDE
nav_order: 3
permalink: /tB/IDE/Projects/
has_toc: false
index:
  - project
  - twinproj
  - project file
  - files in a project
---

# Projects and files

A project is a set of files that the compiler holds in memory, and the IDE keeps a copy of the set and shows it in the **PROJECT EXPLORER**. On disk, the project is one `.twinproj` file. This chapter describes how to see the files, add them, change them and keep them.

- [**Project Explorer**](Project-Explorer) --- the panel, its file view and object view, what a click opens, and the special folders.
- [**Files and folders**](Files-and-Folders) --- the right-click menu, and renaming, moving, copying, exporting and deleting.
- [**Adding files**](Adding-Files) --- the **Add** menu, importing files and projects, and resources.
- [**References and packages**](References-and-Packages) --- the libraries a project uses, and the packages it embeds or links.
- [**Saving and exporting**](Saving-and-Exporting) --- Save, Save As, closing, the recent list, and **Export Project**.

The dialog that holds the project's settings has a page of its own, [Project Settings](../Project-Settings). The commands of the **File** and **Project** menus are listed in the [File menu](../Reference/Menu/File) and [Project menu](../Reference/Menu/Project) reference pages.

## The project is in memory

A project is not a folder on disk that the IDE reads and writes. The compiler process holds the files, and the IDE asks it for every operation: read a file, create one, move one, delete one. Two results follow.

- **Adding, renaming, moving and deleting change the project in memory.** They reach the disk when the project is saved. **File → Save Project** writes the whole project to the `.twinproj` file, and a few other actions save it too. [Saving and exporting](Saving-and-Exporting) describes it.
- **A change made outside the IDE is not noticed.** There is nothing to watch: the files that the Project Explorer shows are not files on disk. Windows Explorer cannot drop a file into the tree, and the clipboard commands cannot take a file from Windows. [Adding files](Adding-Files#import) shows how to bring a file in.

A path in the IDE is written `/<ProjectName>/<folder>/<file>`, and **Copy Path** puts exactly this on the clipboard. It is not a path on disk.

A project made from a template or a sample, or opened from a folder or a VB6 project, has no file yet. The title bar says `Unsaved.twinproj`, and the first save asks for a file name.

## The parts of a project

A project holds these top-level folders. The Project Explorer draws all but `Settings`.

| Folder | Holds |
|---|---|
| `Sources` | The code: `.twin`, `.bas` and `.cls` files, and the designer files of forms, user controls, property pages and reports. |
| `Resources` | The files that the build embeds in the program. See [Resources](Adding-Files#resources). |
| `References` | One entry for each library the project refers to. See [References and packages](References-and-Packages#the-references-folder). |
| `Packages` | The packages that the project embeds, and the compiler packages `VB`, `VBA` and `VBRUN`. |
| `ImportedTypeLibraries` | The type libraries that were imported from a file. See [Import from file](References-and-Packages#import-from-file). |
| `Miscellaneous` | Empty in a new project. |
| `Settings` | The project's settings, as JSON. [Project Settings](../Project-Settings) edits them. |

## See Also

- [Project Settings](../Project-Settings) -- the settings of the project, with a section for each
- [Writing code](../Code/) -- the editor that opens the code files
- [Designing forms](../Forms/) -- the designer that opens the form files
- [New Project](../Project/New) -- making a project from a template, a sample or a folder
- [Package Management](../../../Features/Packages/) -- the language side of packages
