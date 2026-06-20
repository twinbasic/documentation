---
title: Build
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/Build
has_toc: false
---
# Build
{: .no_toc }

Returns the build number component of the project version, as configured in the project settings. Read-only.

Syntax: *object*.**Build**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**Build** returns the fourth component of the four-part version number (*Major*.*Minor*.*Revision*.*Build*) as set in the twinBASIC project settings. Together with [**Major**](Major), [**Minor**](Minor), and [**Revision**](Revision), it allows the running code to inspect its own version at runtime.

> [!NOTE]
>
> **Build** is a twinBASIC-specific property with no equivalent in VBA or VB6.

### Example

This example prints the full version string to the debug console.

```tb
Debug.Print "Version: " & App.Major & "." & App.Minor & "." & App.Revision & "." & App.Build
```

### See Also

- [Major](Major) property
- [Minor](Minor) property
- [Revision](Revision) property
- [EXEName](EXEName) property
