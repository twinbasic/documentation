---
title: ModulePath
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/ModulePath
has_toc: false
---
# ModulePath
{: .no_toc }

Returns the full file-system path of the currently executing module. Read-only.

Syntax: *object*.**ModulePath**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**ModulePath** returns the full path of the binary module that is currently executing. In a compiled executable, this is the path to the executable or DLL. When running inside the twinBASIC IDE, the twinBASIC debugger DLL path is returned.

> [!NOTE]
>
> **ModulePath** is a twinBASIC-specific property with no equivalent in VBA or VB6.

### Example

This example prints the current module path to the debug console.

```tb
Debug.Print "Module path: " & App.ModulePath
```

### See Also

- [Path](Path) property
- [LastBuildPath](LastBuildPath) property
- [EXEName](EXEName) property
- [IsInIDE](IsInIDE) property
