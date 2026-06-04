---
title: EXEName
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/EXEName
has_toc: false
---
# EXEName
{: .no_toc }

Returns the name of the running executable, without the path or file extension. Read-only.

Syntax: *object*.**EXEName**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

For a compiled executable named `MyProject.exe`, **EXEName** returns `"MyProject"`. When running inside the twinBASIC IDE, the value reflects the project name as configured in the project settings.

### Example

This example shows the executable name in a message box.

```tb
MsgBox "Running as: " & App.EXEName
```

### See Also

- [Path](Path) property
- [Title](Title) property
