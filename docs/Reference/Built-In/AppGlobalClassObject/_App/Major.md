---
title: Major
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/Major
has_toc: false
---
# Major
{: .no_toc }

Returns the major version number component of the project version, as configured in the project settings. Read-only.

Syntax: *object*.**Major**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**Major** returns the first component of the four-part version number (*Major*.*Minor*.*Revision*.*Build*) as set in the twinBASIC project settings. Together with [**Minor**](Minor), [**Revision**](Revision), and [**Build**](Build), it allows the running code to inspect its own version at runtime.

### Example

This example prints the full version string to the debug console.

```tb
Debug.Print "Version: " & App.Major & "." & App.Minor & "." & App.Revision & "." & App.Build
```

### See Also

- [Minor](Minor) property
- [Revision](Revision) property
- [Build](Build) property
- [EXEName](EXEName) property
