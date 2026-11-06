---
title: Saving
parent: When something goes wrong
grand_parent: IDE
nav_order: 2
permalink: /tB/IDE/Troubleshooting/Saving
index:
  - save fails
  - save project failed
  - recover unsaved work
  - project state
---

# Saving

This page describes what the IDE does when a save cannot write, what it keeps of your work outside the project's file, and what it does not keep. [Saving and exporting](../Projects/Saving-and-Exporting) describes the commands.

## A save that fails
{: #a-save-that-fails }

When the compiler cannot write the project file, the IDE shows an alert, a plain dialog with one **OK** button. It reads:

> save project failed, result code 2, GetLastErr: ERROR_ACCESS_DENIED
>
> Check that the file path is accessible and writable, and that you have the necessary permissions to write to it.

The result code and the Windows error change with the cause:

| Cause | The alert gives |
|---|---|
| The file is read-only, for **Save** or for **Save As** over it | `ERROR_ACCESS_DENIED` |
| Another program holds the file open with no sharing | `ERROR_SHARING_VIOLATION` |
| **Save As** into a folder that does not exist | `ERROR_PATH_NOT_FOUND` |
| The disk is full | `ERROR_DISK_FULL` |
| Any other error | its number |

The alert is the only sign. The IDE writes no line to the **DEBUG CONSOLE**, and shows no other box. The project stays open and stays marked as changed, with its dot in the title bar, and the file on disk is as it was. Nothing is lost. Choose **OK**, remove the cause (clear the read-only flag, close the other program, make the folder or free space), and save again. If you cannot, use **File → Save Project As...** with a path that works.

The same alert comes from **Save Project As** and from the saves that other commands make. [Other commands that save](../Projects/Saving-and-Exporting#other-commands-that-save) lists them.

### A failed Close

<!-- test: bug failed-save-drops-close -->
> [!NOTE] BETA 1034
> When you choose **Save** in the question that **Close Project** asks, and the save fails, the alert opens and the close is dropped. The project stays open and changed. Fix the cause, and choose **Close Project** again. The same holds for **Exit** and for the close box of the window.

### A failed Save As
{: #a-failed-save-as }

<!-- test: bug failed-save-as-moves-project -->
> [!NOTE] BETA 1034
> A **Save Project As** whose save fails still makes the new path the project's path. After the alert, the title bar names the new file, which does not exist, and a plain **Save** goes to that path. While the folder is missing, **Save** fails again; once the folder exists, **Save** writes the project there and leaves the original file as it was. To save to the original again, use **Save Project As...** with its path. Check the title bar after any alert about a save.

### When the compiler does not answer

A save that gets no answer from the compiler ends in a time-out box instead of the alert, after 10 or after 20 seconds. [When the compiler does not answer](Compiler-Services#when-the-compiler-does-not-answer) lists the boxes.

## No autosave and no recovery
{: #no-autosave-and-no-recovery index="auto save; backup project; recover unsaved changes" }

The IDE does not save by itself, and it keeps no backup of your edits and no recovery file. If the IDE ends, whether by a crash, by a power failure or because you ended it in the Task Manager, the edits since your last save are gone. The IDE offers nothing when you open the project again. [Save often](../Code/Editor#save-often) says it for the editor.

These protect your work:

- The question that **Close Project**, **Exit** and the window's close box ask when the project has changes: **You've made changes to this project.  Save now?**
- **Restart the compiler**, which starts from the IDE's memory and keeps unsaved edits. See [What a restart keeps and loses](Compiler-Services#what-a-restart-keeps-and-loses).
- **Safe Mode**, which lets you read and edit the project's files and save them when the compiler's services are not working. See [Safe Mode](Compiler-Services#safe-mode).

When the compiler will not come back, the editors stay open. Copy the text you need into another program before you end the IDE. [A linked package's missing file](Compiler-Services#a-linked-packages-missing-file) describes the one way into the editors when the IDE is stuck on **Please wait...**.

## A project's state, and where it lives
{: #a-projects-state-and-where-it-lives }

Apart from its files, the IDE remembers how you left the project: the open editors with their carets and folds, the selected tab, the bookmarks, the watches, the history of the console and of the find boxes, and the layout of some panels. This is the project's *state*. The IDE saves it every five seconds, and not with the project. For a project that has a file, it is a value in the registry, one for each project path, under `ProjectState` beside the IDE's settings. [Where the IDE keeps its settings](../Customising/#where-the-ide-keeps-its-settings) lists the keys.

- **Delete the project's value**, and the project opens with no tabs, no bookmarks and the caret at the first line. The project itself is not touched.
- **<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>M</kbd>** writes the state into the project too. The floating message says **Saved project meta state to file.** A hidden entry, `.meta`, joins the project's root. The Project Explorer does not draw it, and the project becomes changed. After the next save, the `.meta` entry is in the `.twinproj` file, and a project that opens with no state in the registry, for example on another PC, gets its tabs, bookmark and caret from it. The command is on no menu.
- **A project with no file** has no value in the registry, and its state is kept in the project as `.meta`.
- **`.meta` does not survive the [Import / Export tool](../../../Features/Packages/Import-Export-Tool)**: the export leaves it out, so a project that is exported and packed again loses it.

## See Also

- [Saving and exporting](../Projects/Saving-and-Exporting) -- Save, Save As, Close Project and Export Project
- [Compiler services](Compiler-Services) -- Restart the compiler and Safe Mode
- [Editor](../Code/Editor#save-often) -- save often
- [Customising the IDE](../Customising/) -- where the IDE keeps its settings
