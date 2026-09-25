---
title: File
parent: Menu
grand_parent: IDE
nav_order: 1
permalink: /tB/IDE/Project/Menu/File
---

# File Menu

![The File menu open below the menu bar. New Project with CTRL+N, Open Project with CTRL+O, Open Recent, and Exit with ALT+F4 are available; Close Project, Save Project, Save Project As, Export Project with CTRL+E, Save Current Document, Build and Clean are all greyed out.](Images/Menu_File.png)

- New Project... <kbd>CTRL</kbd> + <kbd>N</kbd>
- Open Project... <kbd>CTRL</kbd> + <kbd>O</kbd>
- Open Recent...
- Close Project

---
- Save Project <kbd>CTRL</kbd> + <kbd>S</kbd>
- Save Project As...

---
- Export Project... <kbd>CTRL</kbd> + <kbd>E</kbd>
- Save Current Document

---
- Build
- Clean

---
- Exit <kbd>ALT</kbd> + <kbd>F4</kbd>

## Export Project

Writes the open project out to a folder as separate files, instead of the single `.twinproj` file. The folder gets the project's `Settings` file, its `Sources`, `Resources` and other folders, and a `Packages` folder with the full source of every package the project references. For a small project that uses the **VB** package, the export held 477 files: two of the project's own, and 475 under `Packages`. <kbd>CTRL</kbd> + <kbd>E</kbd> runs the same command.

**Before it writes anything, the command deletes everything already in the target folder.** It does not ask first, and the deleted files do not go to the Recycle Bin. Files that have nothing to do with the project are deleted too: hidden files, a `.git` folder, anything else there. A directory junction inside the folder is followed, and the files in the folder it points to are deleted as well.

> [!WARNING]
> Point **Export Project** only at a folder that holds nothing but an earlier export of the same project. Never point it at a folder that holds anything else, at the top folder of a Git repository, or at the folder that holds the `.twinproj` file.

### Where it writes

- **With [*Export Path*](../Settings#export-path) set**, the command exports there straight away, with no dialog.
- **With no *Export Path***, it opens a *Browse For Folder* dialog, which starts in the folder that holds the `.twinproj`. The export goes into a subfolder of the chosen folder named after the project, and it is that subfolder that is emptied. For a project named `MyApp`, choosing `C:\Work` exports into `C:\Work\MyApp\`. If the project itself is kept in `C:\Work\MyApp\`, choosing `C:\Work` empties the project's own folder.

With [*Export After Save*](../Settings#export-after-save) set, every save runs the export again, into *Export Path*, and empties that folder again.

### When a file cannot be deleted

A read-only file stops the export part-way. Everything before it in alphabetical order is already deleted by then, everything after it is left, and nothing is written. No message appears. The only record is in the [Debug Console](../DebugConsole):

```text
[EXPORT]  DELETE FAILED: \\?\C:\Work\MyApp\notes.txt
[EXPORT]  ERROR: unable to clean the output folder
[EXPORT] export failed.
```

Git makes the files in `.git\objects` read-only. When the target is the top folder of a repository, the command deletes `.git\config`, `HEAD`, `index`, `hooks` and `info`, then stops at the first object file. Git no longer recognises what is left as a repository.

### Exporting into the project's own folder

When the target is the folder that holds the `.twinproj`, the command deletes the `.twinproj` file too. The project then exists only in the open IDE, until **Save Project** (<kbd>CTRL</kbd> + <kbd>S</kbd>) writes the file back. For this reason the Project Settings dialog refuses `${SourcePath}` on its own as the *Export Path*, but it accepts the same folder written out in full.

### Packing the export back into a project

The `Packages` folder holds the compiler packages as well. For a project with the default references they are **VB**, **VBA**, **VBRUN** and the package behind the **App** object, in folders named `VB`, `VBA`, `VBRUN` and `AppGlobalClassProject`. Every other compiler package the project references gets a folder too, named after the package's own project, which is not always the name the reference uses: the WebView2 sample references `WebView2Package` and `WindowsControlsPackage`, and its export has folders named `WebView2Package` and `VB`, because `WindowsControlsPackage` is the VB package. The project's `Settings` file marks each compiler package's reference `"isCompilerPackage": true`; nothing inside the package's own folder does.

A `.twinproj` file that the IDE saved does not hold the compiler packages, and the `export` command of the tB executable does not write them. A package the project embeds is different: one added from TWINSERV or from a TWINPACK file is embedded by default (see [Linked Packages](../../../../Features/Packages/Linked)), is part of the saved `.twinproj`, and has a folder under `Packages` too.

**Delete the compiler packages' folders before packing the export back into a project.** The IDE's own way to pack it is **Import from folder...** in the [New Project](../New#import-from-folder) dialog, which opens the project unsaved; the first save asks for a file name. The import/export script's `import` packs it as well. Both pack every folder under `Packages` into the project, so the compiler packages become a copy inside it. Rebuilt by **Import from folder** with them, the project was 4,222,833 bytes, against 4,207 bytes without them and 2,956 bytes for the project as the IDE saved it. Both rebuilt projects open with no errors, and the script's project is the same 4.2 MB.

The compiler does not use that copy. A function added to the copy of **VBA**, in `Packages\VBA\Sources\Math.twin`, is an unrecognized symbol (TB5079) to the code that calls it. But every later export writes the copy back into `Packages`: the added function is there again after each save, and the Debug Console reports `[EXPORT] COMPLETED (139 folders, 954 files)`, where the original project's export reported `(72 folders, 479 files)`. So after an IDE update, the export still holds the package source of the IDE that first exported the project, while the project compiles against the packages of the IDE in use.

The tB executable's `import` cannot pack a folder while any folder remains under `Packages\`. It stops at the first one, writes nothing, and exits with code `999` --- see [Where the two differ](../../../../Features/Packages/Import-Export-Tool#where-the-two-differ). With the compiler packages' folders deleted, it packs the export of a project that embeds no package. [Keeping a project in Git from the IDE](../../../../Features/Packages/Import-Export-Tool#keeping-a-project-in-git-from-the-ide) keeps them out of the repository from the start.

### What the Debug Console shows

Each export writes a first line, `[EXPORT] exporting current project to "…"`, and a last line: `[EXPORT] COMPLETED (72 folders, 478 files)`, or the failure lines above. With [*Export Verbose*](../Settings#export-verbose) set, it also writes a line for each file and folder it deletes, `[EXPORT]  DELETED: …`, and for each file it writes, `[EXPORT]  DONE: …`.

The `export` command of the tB executable and of the import/export script deletes nothing. See [What both programs do](../../../../Features/Packages/Import-Export-Tool#what-both-programs-do).

## Build

Compiles the project into the file that the [*Build Output Path*](../Settings#build-output-path) setting names. The project templates set it to `${SourcePath}\Build\${ProjectName}_${Architecture}.${FileExtension}`, a file in a `Build` folder beside the `.twinproj`. `${Architecture}` is `win32` or `win64`, as chosen in the [build configuration](../Toolbar#build-configuration) box on the toolbar.
