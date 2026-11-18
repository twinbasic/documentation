---
title: Community Tools
parent: Add Ins
nav_order: 4
permalink: /tB/IDE/AddIns/Community-Tools
index:
  - community utilities
---

# Community tools

Community tools are programs that twinBASIC users write and share, and that help with twinBASIC itself: installing a new version, moving code from VB6, editing twinBASIC code outside the IDE. A tool is a program of its own. It is not an add-in, which the IDE loads: those are on the [Community add-ins](Community) page.

> [!WARNING]
> Each tool is a program that its author publishes. Treat it as you would any program that you have not written yourself.

The tools below are listed as their authors describe them. A tool whose link goes to Discord is published only as an attachment to a thread in the **show-and-tell** channel of the [twinBASIC Discord server](https://discord.gg/UaW9GgKKuE). Such a link needs a Discord account that has joined the server.

## Keeping twinBASIC up to date

A new version of twinBASIC is a zip file to download and unpack. These tools do that work.

| Tool | Author | What it does | Published as |
|---|---|---|---|
| [tbHelper](https://github.com/jdelano0310/tbHelper) | jdelano0310 | Updates twinBASIC to a newer version, or goes back to an earlier one. It shows the change log of the versions, which you can filter by the kind of change. | A twinBASIC project, with a built EXE in the repository's `Build` folder |
| [tbLoader](https://discord.com/channels/927638153546829845/1567925865059192944) | DTZ | Starts the newest twinBASIC on the machine. When a newer version exists, it offers to download and unpack that one first. It stays out of the way when there is nothing to update. Close every twinBASIC IDE before you update with it. | An EXE and its twinBASIC project, attached to the thread; the newest is at the thread's end |

## Moving code from VB6

| Tool | Author | What it does | Published as |
|---|---|---|---|
| [ClsToTwin](https://github.com/fafalone/ClsToTwin) | fafalone | Converts a folder of VB6 `.cls` files to `.twin` files, which **Add → Import** then brings into a project. It wraps each class in `Class` and `End Class`, and can add new class and interface identifiers. It keeps the folder structure or puts every file in one folder. | A twinBASIC project and an EXE on the **Releases** page |
| [LinebreakRepair](https://github.com/fafalone/LinebreakRepair) | fafalone | Repairs the VB6 files of a folder whose line ends have become LF alone, which happens to projects uploaded to GitHub with some settings. VB6 cannot read such a file. | A twinBASIC project, and 32-bit and 64-bit EXEs on the **Releases** page |
| [ReadTypelib](https://discord.com/channels/927638153546829845/1560715630460805261) | fafalone | Reads an ActiveX DLL or control and writes, for each class in it, the attributes that make a twinBASIC class binary compatible with it. It also prints the library's identifier, for the project's settings. | A twinBASIC project attached to the thread; it needs the WinDevLib package |

## Editing twinBASIC code in another editor

| Tool | Author | What it does | Published as |
|---|---|---|---|
| [twinBASIC for Notepad++](https://github.com/notepad-plus-plus/userDefinedLanguages/tree/master/UDLs) | sokinkeso | Syntax highlighting of twinBASIC code in Notepad++, with the keywords and operators that twinBASIC adds to VB6, for a light and for a dark theme. | `twinBASIC_by_sokinkeso.xml` and `twinBASIC_dark_by_sokinkeso.xml` in the Notepad++ collection of user defined languages |

To add the highlighting, download one of the two files. In Notepad++, choose **Language → User Defined Language → Define your language...**, then **Import**, and select the file. **twinBASIC** is then in the **Language** menu.

To share a tool, add it to this page: [Authoring](../../../Documentation/Development/Authoring) describes how to change a page of this documentation.
