---
title: LastBuildPath
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/LastBuildPath
has_toc: false
---
# LastBuildPath
{: .no_toc }

Returns the full path to the output file produced by the most recent build. Read-only.

Syntax: *object*.**LastBuildPath**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**LastBuildPath** returns the complete file-system path, including the file name and extension, of the executable or DLL most recently compiled from this project. When no build has been performed in the current IDE session, the property returns an empty string.

> [!NOTE]
>
> **LastBuildPath** is a twinBASIC-specific property with no equivalent in VBA or VB6. It is only meaningful during IDE-hosted execution; in a compiled executable it returns the path of that executable.

### Example

This example prints the last build path to the debug console.

```tb
Debug.Print "Last build: " & App.LastBuildPath
```

### See Also

- [Path](Path) property
- [ModulePath](ModulePath) property
- [EXEName](EXEName) property
