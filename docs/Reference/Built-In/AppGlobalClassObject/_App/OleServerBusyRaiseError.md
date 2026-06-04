---
title: OleServerBusyRaiseError
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/OleServerBusyRaiseError
has_toc: false
---
# OleServerBusyRaiseError
{: .no_toc }

Gets or sets whether a runtime error is raised instead of displaying a dialog when an OLE server is busy.

> [!NOTE]
>
> This property is not yet implemented in twinBASIC. Getting or setting it has no effect.

## Get

Returns a **Boolean** indicating whether a runtime error is raised when an OLE server busy condition occurs.

Syntax: *object*.**OleServerBusyRaiseError**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets whether a runtime error is raised when an OLE server busy condition occurs.

Syntax: *object*.**OleServerBusyRaiseError** **=** *value*

*value*
: A **Boolean** specifying the error-raising behaviour. When **True**, a runtime error is raised instead of displaying the OLE server busy dialog. When **False** (the default), the dialog is displayed.

When an OLE automation call is made to a server and the server does not respond within the number of milliseconds specified by [OleServerBusyTimeout](OleServerBusyTimeout), the runtime normally displays a dialog informing the user. Setting **OleServerBusyRaiseError** to **True** suppresses that dialog and instead raises a trappable runtime error, allowing the application to handle the condition programmatically.

### See Also

- [OleServerBusyTimeout](OleServerBusyTimeout) property
- [OleServerBusyMsgTitle](OleServerBusyMsgTitle) property
- [OleServerBusyMsgText](OleServerBusyMsgText) property
- [OleRequestPendingTimeout](OleRequestPendingTimeout) property
