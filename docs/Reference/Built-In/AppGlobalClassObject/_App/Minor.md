---
title: Minor
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/Minor
has_toc: false
---
# Minor
{: .no_toc }

Returns the minor version number component of the project version, as configured in the project settings. Read-only.

Syntax: *object*.**Minor**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

**Minor** returns the second component of the four-part version number (*Major*.*Minor*.*Revision*.*Build*) as set in the twinBASIC project settings. Together with [**Major**](Major), [**Revision**](Revision), and [**Build**](Build), it allows the running code to inspect its own version at runtime.

### Example

This example prints the full version string to the debug console.

```tb
Debug.Print "Version: " & App.Major & "." & App.Minor & "." & App.Revision & "." & App.Build
```

### See Also

- [Major](Major) property
- [Revision](Revision) property
- [Build](Build) property
