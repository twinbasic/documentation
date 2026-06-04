---
title: Path
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/Path
has_toc: false
---
# Path
{: .no_toc }

Returns the directory that contains the running executable, without a trailing path separator. Read-only.

Syntax: *object*.**Path**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**Path** returns the parent directory of the executable or DLL as a **String**. The returned string does not include a trailing backslash. For example, if the executable is located at `C:\MyApps\MyProject.exe`, **Path** returns `"C:\MyApps"`.

When running inside the twinBASIC IDE, **Path** returns the directory containing the `.twinproj` project file.

### Example

This example constructs a full path to a data file located in the same directory as the executable.

```tb
Dim dataFile As String
dataFile = App.Path & "\data.json"
Debug.Print "Data file: " & dataFile
```

### See Also

- [EXEName](EXEName) property
- [ModulePath](ModulePath) property
- [LastBuildPath](LastBuildPath) property
