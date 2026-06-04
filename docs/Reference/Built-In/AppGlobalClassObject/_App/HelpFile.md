---
title: HelpFile
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/HelpFile
has_toc: false
---
# HelpFile
{: .no_toc }

Gets or sets the path to the Help file associated with the application.

## Get

Returns a **String** containing the path to the application's Help file.

Syntax: *object*.**HelpFile**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

The value is the path set at design time in the project settings, or any path assigned at run time via the **Let** accessor. Returns an empty string if no Help file has been configured.

## Let

Sets the path to the application's Help file.

Syntax: *object*.**HelpFile** **=** *path*

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

*path*
: A **String** specifying the full or relative path to the Help file. Assign an empty string to clear the setting.

The assigned path is used by the runtime when a Help request is made, for example when the user presses F1 in a dialog. Setting this property at run time overrides the value configured in the project settings for the duration of the session.

### Example

This example assigns a Help file path at startup and then opens it on a specific topic.

```tb
Sub Main()
    App.HelpFile = App.Path & "\MyApp.chm"
End Sub
```

### See Also

- [Path](Path) property
- [Title](Title) property
- [EXEName](EXEName) property
