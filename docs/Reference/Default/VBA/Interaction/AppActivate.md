---
title: AppActivate
parent: Interaction Module
permalink: /tB/Modules/Interaction/AppActivate
redirect_from:
-  /tB/Core/AppActivate
vba_attribution: true
---
# AppActivate
{: .no_toc }

Activates an application window.

Syntax:
- **AppActivate** *title* [ **,** *wait* ]
  
  *title*
  : *required* A string expression specifying the title in the title bar of the application window to activate.
  
  *wait*
  : *optional* A Boolean value specifying whether the calling application has the focus before activating another. If **False** (default), the specified application is immediately activated, even if the calling application does not have the focus. If **True**, the calling application waits until it has the focus, then activates the specified application.
  
- **AppActivate** *taskId* [ **,** *wait* ]
  
  *taskId*
  : *required* The task ID returned by the [**Shell**](Shell) function can be used in place of *title* to activate an application.

The **AppActivate** statement changes the focus to the named application or window but does not affect whether it is maximized or minimized. Focus moves from the activated application window when the user takes some action to change the focus or close the window. Use the [**Shell**](Shell) function to start an application and set the window style.

In determining which application to activate, *title* is compared to the title string of each running application. If there is no exact match, any application whose title string begins with *title* is activated. If there is more than one instance of the application named by *title*, one instance is arbitrarily activated.

### Example

This example illustrates various uses of the **AppActivate** statement to activate an application window. [**Shell**](Shell) needs a path it can pass straight to `CreateProcess`: it does not search the registry's *App Paths* key, so a bare `"WINWORD.EXE"` fails even though Office registers it there. The paths below assume a Click-to-Run installation of Office 16 --- an MSI installation has no `root` folder, and the version segment tracks the Office release.
<!-- On the Macintosh, the default drive name is "HD" and portions of the pathname are separated by colons instead of backslashes. -->

```tb check_build
Dim MyAppID As Double, ReturnValue As Double

' Activate by window title. No path is involved.
AppActivate "Microsoft Word"

' ProgramW6432 is the 64-bit Program Files folder even in a 32-bit build,
' which is where a 64-bit Office lives. Environ$("ProgramFiles") would
' return the "(x86)" tree instead.
Dim Office As String
Office = Environ$("ProgramW6432") & "\Microsoft Office\root\Office16\"

' AppActivate can also use the return value of the Shell function.
MyAppID = Shell(Office & "WINWORD.EXE", vbNormalFocus)
AppActivate MyAppID

ReturnValue = Shell(Office & "EXCEL.EXE", vbNormalFocus)
AppActivate ReturnValue
```

### See Also

- [SendKeys](SendKeys) statement
- [Shell](Shell) function