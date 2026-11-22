---
title: ProjectExplorer
parent: tbIDE Package
permalink: /tB/Packages/tbIDE/ProjectExplorer
has_toc: false
---

# ProjectExplorer class
{: .no_toc }

The IDE's **Project Explorer** panel: the item selected in it, and a new file made through it. Reached through [**Host.ProjectExplorer**](Host#projectexplorer).

```tb check_build
Private WithEvents AddEntry As MenuEntry

Private Sub Host_OnProjectLoaded()
    Set AddEntry = Host.Menus.ProjectExplorerAddMenu.AddEntry("Add NOTES (.txt)")
End Sub

Private Sub AddEntry_Click()
    Dim path As String = Host.ProjectExplorer.AddFileUI("txt", "Notes", "")
    If Len(path) Then Host.ActiveEditors.Open "twinbasic:" & path
End Sub
```

The entry goes in the **Project Explorer**'s **Add** menu. It asks for a name, makes an empty `.txt` file, and opens it.

* TOC
{:toc}

## Properties

### SelectedItemPath
{: .no_toc }

The path of the file or the folder selected in the **Project Explorer**, as [**FileSystem.ResolvePath**](FileSystem#resolvepath) takes it: `"twinbasic:/MyProject/Sources/Module1.twin"`. **String**, read-only. With nothing selected, it is an empty string.

In a [**MenuEntry.BeforeShow**](MenuEntry#beforeshow) or [**Click**](MenuEntry#click) of the **Project Explorer**'s menus, it is the item that was right-clicked.

## Methods

### AddFileUI
{: .no_toc }

Makes a new file in the project, with a name the user types, and returns its path.

Syntax: *projectExplorer*.**AddFileUI**( *FileExt*, *SuggestedName*, *ContentString* ) **As String**

*FileExt*
: *required* The file's extension, without the dot: `"txt"`. **String**.

*SuggestedName*
: *required* The name that the box starts with. **String**. When the folder has a file of that name already, a number follows it: `Notes2`.

*ContentString*
: *required* What the new file holds, as text. **String**. An empty string makes an empty file.

**AddFileUI** shows the **Project Explorer**'s files, and a box for the new file's name in the tree, holding *SuggestedName* and the extension with the name selected. The user types the name and presses <kbd>Enter</kbd>, or clicks elsewhere; the extension is added if the name does not end with it. The call waits for the user.

The file goes into the folder selected in the **Project Explorer**, or into the folder of the selected file. When that folder is not `Sources` or a folder in it, the file goes into `Sources`.

**AddFileUI** returns the new file's path, `"/MyProject/Sources/Notes.txt"`, with no `twinbasic:` in front of it. Put `"twinbasic:"` in front of it for [**Editors.Open**](Editors#open) or [**FileSystem.ResolvePath**](FileSystem#resolvepath).

<!-- test: bug addfileui-cancel-no-error, bug addfileui-sources-prefix, lane addin:menus -->
> [!NOTE] BETA 1045
> When the user presses <kbd>Escape</kbd>, or leaves the name empty, or types a name that is not valid, **AddFileUI** returns an empty string and makes no file. It raises no error, though its description in the package says that it does. Test the result, as the example above does. A folder beside `Sources` whose name starts with `Sources`, such as `SourcesExtra`, is taken as inside it, and the file goes there.

## See Also

- [Host.ProjectExplorer](Host#projectexplorer) property
- [Menus.ProjectExplorerAddMenu](Menus#menus-that-open-from-a-panel) -- the **Add** menu
