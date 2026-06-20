---
title: OleServerBusyTimeout
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/OleServerBusyTimeout
has_toc: false
---
# OleServerBusyTimeout
{: .no_toc }

Gets or sets the number of milliseconds that can elapse before the OLE server busy dialog is displayed.

> [!NOTE]
>
> This property is not yet implemented in twinBASIC. Getting or setting it has no effect.

## Get

Returns a **Long** containing the current timeout value, in milliseconds.

Syntax: *object*.**OleServerBusyTimeout**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets the timeout value, in milliseconds, that can elapse before the OLE server busy dialog is shown to the user.

Syntax: *object*.**OleServerBusyTimeout** **=** *value*

*value*
: A **Long** specifying the timeout in milliseconds.

When an OLE automation call is made to a server that is busy and cannot accept the request, the application waits for the number of milliseconds specified by **OleServerBusyTimeout** before displaying a dialog box to the user. The title and body text of that dialog are controlled by [OleServerBusyMsgTitle](OleServerBusyMsgTitle) and [OleServerBusyMsgText](OleServerBusyMsgText). Whether a runtime error is raised instead of showing the dialog is controlled by [OleServerBusyRaiseError](OleServerBusyRaiseError).

### See Also

- [OleServerBusyMsgTitle](OleServerBusyMsgTitle) property
- [OleServerBusyMsgText](OleServerBusyMsgText) property
- [OleServerBusyRaiseError](OleServerBusyRaiseError) property
- [OleRequestPendingTimeout](OleRequestPendingTimeout) property
