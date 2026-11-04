---
title: Starting a project
parent: IDE
nav_order: 2
permalink: /tB/IDE/Starting/
has_toc: false
index:
  - start a project
  - first start of the IDE
---

# Starting a project

This chapter follows the IDE from the moment it starts to a project that is open: what the first start asks, the dialog that makes or opens a project, every way of opening one, importing a VB6 project, and the sample projects that ship with the IDE.

- [**First launch**](First-Launch) --- the questions the first start asks, the splash, the empty IDE, the licence and the edition.
- [**New Project**](New-Project) --- the **New / Open Project** dialog: its sections, its search and keys, what each template makes, the **New Project Options** box, and the recent lists.
- [**Opening projects**](Opening-Projects) --- the ways to open a project, one project at a time, the file association, what happens as a project loads, and what to do when one will not open.
- [**Importing a VB6 project**](Importing-VB6) --- the routes for a `.vbp` file, what the importer converts and what it leaves, and its log.
- [**Samples**](Samples) --- the 26 sample projects: what each is, and where the documentation uses it.

## From a double-click to a project

When the IDE starts, it shows a banner picture while it reads its saved settings. Three questions can come before anything else, each only until you have answered it once: the licence agreement, whether the IDE may send error reports, and, on the very first start, the **IDE Options** dialog. [First launch](First-Launch) describes them.

What happens next depends on how the IDE was started:

- **With a project on the command line**, for example by a double-click on a `.twinproj` file, the IDE opens that project at once. It shows no splash and no **New / Open Project** dialog. See [Opening projects](Opening-Projects).
- **With no project**, for example from the IDE's own icon, the IDE shows the [splash](First-Launch#the-splash) for two and a half seconds, and then the [**New / Open Project**](New-Project) dialog.

The dialog makes a project from a template or a sample, imports one, or opens a recent project. A project made from a template or a sample, or imported, is new and has no file on disk until you save it. See [What a new project is](New-Project#what-a-new-project-is).

The compiler starts only when a project loads. Until then the status bar reads **tB Services: UNAVAILABLE** and **tB Licence: NOT READY**, and the editor's language features have nothing to work on. [The empty IDE](First-Launch#the-empty-ide) says what works without a project.

## See Also

- [Projects and files](../Projects/) -- the Project Explorer, adding files, saving and exporting
- [Project Settings](../Project-Settings) -- the settings of a project
- [Customising the IDE](../Customising/) -- the options for the start-up dialog and the other IDE settings
- [Status Bar](../Reference/StatusBar) -- the services and licence boxes
