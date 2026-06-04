---
title: PrevInstance
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/PrevInstance
has_toc: false
---
# PrevInstance
{: .no_toc }

Returns **True** if another instance of this executable was already running when the current instance started, or **False** if this is the only running instance. Read-only.

Syntax: *object*.**PrevInstance**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

Use **PrevInstance** to enforce a single-instance application. Check the value during startup --- typically in `Sub Main` or the first form's `Load` event --- and exit if it returns **True**.

The detection is based on the executable's file name and path, consistent with the Win32 `FindWindow` or mutex-based approaches used in classic VB6 projects.

### Example

This example prevents a second instance of the application from running.

```tb
Sub Main()
    If App.PrevInstance Then
        MsgBox "Another instance of " & App.EXEName & " is already running.", vbExclamation
        End
    End If
    ' ... rest of startup
End Sub
```

### See Also

- [EXEName](EXEName) property
- [IsInIDE](IsInIDE) property
