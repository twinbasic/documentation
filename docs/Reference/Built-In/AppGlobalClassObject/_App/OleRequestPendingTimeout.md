---
title: OleRequestPendingTimeout
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/OleRequestPendingTimeout
has_toc: false
---
# OleRequestPendingTimeout
{: .no_toc }

Gets or sets the number of milliseconds that can elapse before a pending OLE request dialog is displayed.

> [!NOTE]
>
> This property is not yet implemented in twinBASIC. Getting or setting it has no effect.

## Get

Returns a **Long** containing the current timeout value, in milliseconds.

Syntax: *object*.**OleRequestPendingTimeout**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets the timeout value, in milliseconds, that can elapse before the OLE request pending dialog is shown to the user.

Syntax: *object*.**OleRequestPendingTimeout** **=** *value*

*value*
: A **Long** specifying the timeout in milliseconds.

When an OLE automation call is made to a server and the server does not respond within the number of milliseconds specified by **OleRequestPendingTimeout**, a dialog box is displayed informing the user that the request is pending. The dialog can be customised using [OleRequestPendingMsgTitle](OleRequestPendingMsgTitle) and [OleRequestPendingMsgText](OleRequestPendingMsgText).

### See Also

- [OleRequestPendingMsgTitle](OleRequestPendingMsgTitle) property
- [OleRequestPendingMsgText](OleRequestPendingMsgText) property
- [OleServerBusyTimeout](OleServerBusyTimeout) property
