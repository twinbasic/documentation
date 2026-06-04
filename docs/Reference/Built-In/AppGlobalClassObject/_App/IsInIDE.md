---
title: IsInIDE
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/IsInIDE
has_toc: false
---
# IsInIDE
{: .no_toc }

Returns **True** if the code is currently executing inside the twinBASIC IDE, or **False** if it is running as a compiled executable. Read-only.

Syntax: *object*.**IsInIDE**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

Use **IsInIDE** to branch between IDE-only debug behaviour and production behaviour without requiring a conditional compilation constant. Unlike `#If` directives, **IsInIDE** is evaluated at runtime, so the same compiled binary can detect its own run-time context.

### Example

This example skips a lengthy initialisation step when running under the IDE.

```tb
If App.IsInIDE Then
    Debug.Print "Skipping hardware initialisation in IDE."
Else
    InitialiseHardware
End If
```

### See Also

- [EXEName](EXEName) property
- [Path](Path) property
