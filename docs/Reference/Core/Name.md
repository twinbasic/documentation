---
title: Name
parent: Statements
permalink: /tB/Core/Name
---
# Name
{: .no_toc }

Renames a disk file, directory, or folder.

Syntax:
> **Name** *oldpathname* **As** *newpathname*

*oldpathname*
: String expression that specifies the existing file name and location; may include directory or folder, and drive.

*newpathname*
: String expression that specifies the new file name and location; may include directory or folder, and drive. The file name specified by *newpathname* can't already exist.

The **Name** statement renames a file and moves it to a different directory or folder, if necessary. **Name** can move a file across drives, but it can only rename an existing directory or folder when both *newpathname* and *oldpathname* are located on the same drive. **Name** cannot create a new file, directory, or folder.

Using **Name** on an open file produces an error. You must close an open file before renaming it. **Name** arguments cannot include multiple-character (`*`) and single-character (`?`) wildcards.

### Example

This example uses the **Name** statement to rename a file. For purposes of this example, assume that the directories or folders that are specified already exist.

```tb
Dim oldName, newName
oldName = "OLDFILE": newName = "NEWFILE" ' Define file names.
Name oldName As newName ' Rename file.

oldName = "C:\MYDIR\OLDFILE": newName = "C:\YOURDIR\NEWFILE"
Name oldName As newName ' Move and rename file.
```

### See Also

- [**Kill** statement](../Modules/FileSystem/Kill)
- [**FileCopy** procedure](../Modules/FileSystem/FileCopy)
- [**MkDir** statement](../Modules/FileSystem/MkDir)
- [**RmDir** statement](../Modules/FileSystem/RmDir)

{% include VBA-Attribution.md %}
