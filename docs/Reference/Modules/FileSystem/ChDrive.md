---
title: ChDrive
parent: FileSystem Module
permalink: /tB/Modules/FileSystem/ChDrive
redirect_from:
-  /tB/Core/ChDrive
---
# ChDrive
{: .no_toc }

Changes the current drive.

Syntax: **ChDrive** *drive*

drive

: A string expression that specifies an  existing drive. If you supply a zero-length string (""), the current drive  doesn't change. If the *drive* argument is a multiple-character string,  **ChDrive** uses only the first letter.

### See Also

- [ChDir](ChDir), [MkDir](MkDir), and [RmDir](RmDir) statements
- [CurDir](CurDir) function

### Example

This example uses the **ChDrive** statement to change the current drive. 

```vb
ChDrive "D"   ' Make "D" the current drive.
```

{% include VBA-Attribution.md %}