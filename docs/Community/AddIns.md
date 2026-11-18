---
title: Community Add Ins
parent: Community
nav_order: 1
permalink: /Community/Add-Ins
redirect_from:
  - /tB/IDE/AddIns/Community
---

# Community add-ins

Community add-ins are the ones that twinBASIC users write and share, as distinct from [Global Search](../tB/IDE/AddIns/GlobalSearch), which ships with the IDE, and the [Help add-in](../tB/IDE/AddIns/Help). Programs that are not add-ins, such as one that installs a new version of twinBASIC, are on the [Community tools](Tools) page.

> [!WARNING]
> An add-in is a compiled DLL that runs inside the IDE, with your rights. Treat it as you would any program that you have not written yourself.

The add-ins below are listed as their authors describe them. Each is published as compiled DLLs. [Add Ins](../tB/IDE/AddIns/) says where the DLLs go. The **Builds** column says which of the two architecture folders the add-in has a DLL for: an add-in with a 32-bit build only does not load while the project's build target is win64.

## Add-ins by sokinkeso

These add-ins are written by [sokinkeso](https://github.com/sokinkeso), and each has a repository of its own on GitHub. The DLLs are in a zip file on the **Releases** page of the repository.

| Add-in | What it does | Latest release | Builds |
|---|---|---|---|
| [AutoSave](https://github.com/sokinkeso/AutoSaveAddin) | Saves the project at an interval that you choose, in seconds or minutes, and only when the project has changed. It can ask before each save, and can save before the project runs. A toolbar button turns it on and off, and a double-click on the button opens its settings. | 3.1.5.0, July 2025 | 32-bit and 64-bit |
| [CopyPasteEx](https://github.com/sokinkeso/CopyPasteEx-Addin-for-twinBASIC) | Copies files of the Project Explorer from one twinBASIC IDE and pastes them into another, through the clipboard. It asks before it overwrites a file. It does not copy folders, hidden items, packages or references. | 0.9.4, May 2025 | 32-bit |
| [External Tools](https://github.com/sokinkeso/ExternalTools-Addin-for-twinBasic) | Starts other programs from a panel in the IDE: a hex editor, a console window, a version control tool. Each tool has a name, a path, parameters and a working directory, and can run as administrator. | 1.2.0.0, April 2024 | 32-bit and 64-bit |
| [MsgBox Builder](https://github.com/sokinkeso/MsgBox-Builder-Addin-for-twinBasic) | Writes a `MsgBox` call from a dialog in which you choose the title, the message, the icon, the buttons and the default button. It can also write the `Select Case` or `If` block that handles the answer. It shows a preview and copies the code to the clipboard. | 1.1.6, April 2025 | 32-bit and 64-bit |
| [String Converter](https://github.com/sokinkeso/String-Converter-Addin-for-twinBasic) | Finds the string literals in the code and replaces each with a concatenation of `ChrW$` calls, so that the text cannot be found in the built file with a hex editor. It also converts such an expression back to a literal. | 2.2.0.0, April 2024 | 32-bit and 64-bit |
| [TabOrder](https://github.com/sokinkeso/TabOrder-Addin-for-twinBASIC) | Sets the tab order of the controls on a form or a user control. You move the controls up and down in a list, click them on the form in the order you want, or let the add-in order them by position. | 0.9.54, May 2025 | not stated |
| [Usercontrol Builder](https://github.com/sokinkeso/Usercontrol-Builder-for-TwinBASIC) | A wizard that writes the properties, methods and events of a user control, after the ActiveX Control Interface Wizard of VB6. You choose the members, map them to members of the controls inside the user control, and the wizard inserts the code at the top of the user control's source. | 3.2.0.2, April 2024 | 32-bit and 64-bit |

## Add-ins posted on Discord

These add-ins are published only as attachments to a thread in the **show-and-tell** channel of the [twinBASIC Discord server](https://discord.gg/UaW9GgKKuE). Each link opens the thread, which needs a Discord account that has joined the server.

| Add-in | Author | What it does | Posted | Builds |
|---|---|---|---|---|
| [BeautifiedCode](https://discord.com/channels/927638153546829845/1414250283852107856) | Frank-S. | Indents the code, and has a colour picker that writes a colour value into the code. The author calls it early work, after the VB6 add-in MZ-Tools. The thread also has the add-in's project. | September 2025 | 32-bit; the author says that the 64-bit DLL does not work |
| [Comments](https://discord.com/channels/927638153546829845/1202747679361343679) | sokinkeso | Adds a **Comment** and an **Uncomment** button to the toolbar. **Comment** makes each selected line a comment, and with <kbd>Ctrl</kbd> held it makes one comment of the whole selection, which may be part of a line. **Uncomment** removes the comment that the caret is in. | February 2024 | 32-bit and 64-bit |
| [tbSplitScreen](https://discord.com/channels/927638153546829845/1522162642700206146) | woeoio2 | Shows the active file a second time, read-only, in a tool window beside the editor. It can follow the editor as you change to another file. Its highlighting is that of VB6, so it does not colour a `/* */` comment. | 1.0.1, July 2026 | not stated |
| [VB6 to twinBASIC clipboard](https://discord.com/channels/927638153546829845/1333920083914788946) | sokinkeso | Converts the controls that you copy from a form in the VB6 IDE, so that you can paste them on a twinBASIC form without importing the VB6 project. The author calls it experimental. | 0.2.17.0, January 2025 | 32-bit |

To share an add-in, add it to this page: [Authoring](../Documentation/Development/Authoring) describes how to change a page of this documentation.

To write one, start from Sample 10, the card **twinBASIC IDE Addin** in the **Samples** section of the **New / Open Project** dialog. See [Samples](../tB/IDE/Starting/Samples) and the [tbIDE package](../tB/Packages/tbIDE/).
