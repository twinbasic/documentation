---
title: OleServerBusyMsgText
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/OleServerBusyMsgText
has_toc: false
---
# OleServerBusyMsgText
{: .no_toc }

Gets or sets the body text of the dialog box displayed when an OLE server is busy and the **OleServerBusyTimeout** interval has elapsed.

## Get

Returns the current body text of the OLE server-busy dialog box, as a **String**.

Syntax: *object*.**OleServerBusyMsgText**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets the body text of the OLE server-busy dialog box.

Syntax: *object*.**OleServerBusyMsgText** **=** *value*

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

*value*
: A **String** containing the message body to display in the dialog box. Setting this to an empty string restores the default system-provided text.

When an outbound OLE call to a server application is rejected because the server is busy, and the number of milliseconds set by **OleServerBusyTimeout** has elapsed, a dialog box appears to inform the user. **OleServerBusyMsgText** controls the body text of that dialog box. The companion property **OleServerBusyMsgTitle** controls the title bar text.

> [!NOTE]
>
> **OleServerBusyMsgText** is not yet implemented in twinBASIC. Reading the property always returns an empty string, and assignments have no effect.

### See Also

- [OleServerBusyMsgTitle](OleServerBusyMsgTitle) property
- [OleServerBusyTimeout](OleServerBusyTimeout) property
- [OleServerBusyRaiseError](OleServerBusyRaiseError) property
- [OleRequestPendingMsgText](OleRequestPendingMsgText) property
