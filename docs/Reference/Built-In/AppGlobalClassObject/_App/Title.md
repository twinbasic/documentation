---
title: Title
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/Title
has_toc: false
---
# Title
{: .no_toc }

Returns or sets the application title shown in the Windows taskbar and task list.

## Get

Syntax: *object*.**Title**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

Returns the current application title as a **String**. The initial value is taken from the project settings at startup.

## Let

Syntax: *object*.**Title** **=** *value*

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

*value*
: A **String** specifying the new application title.

Assigning to **Title** updates the running process's description immediately. The new title appears in the Windows taskbar and in the task list (for example, in Task Manager) without restarting the application.

### Example

This example changes the application title to reflect the currently open document.

```tb
Dim fileName As String
fileName = "Report.xlsx"
App.Title = "MyApp -- " & fileName
```

### See Also

- [EXEName](EXEName) property
- [Path](Path) property
