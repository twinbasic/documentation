---
title: OleRequestPendingMsgText
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/OleRequestPendingMsgText
has_toc: false
---
# OleRequestPendingMsgText
{: .no_toc }

Gets or sets the body text of the dialog box displayed when an OLE request has been pending longer than the **OleRequestPendingTimeout** interval.

## Get

Returns the current body text of the OLE request-pending dialog box, as a **String**.

Syntax: *object*.**OleRequestPendingMsgText**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets the body text of the OLE request-pending dialog box.

Syntax: *object*.**OleRequestPendingMsgText** **=** *value*

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

*value*
: A **String** containing the message body to display in the dialog box. Setting this to an empty string restores the default system-provided text.

When an outbound OLE call to a server application does not complete within the number of milliseconds set by **OleRequestPendingTimeout**, a dialog box appears to inform the user that the server is busy. **OleRequestPendingMsgText** controls the body text of that dialog box. The companion property **OleRequestPendingMsgTitle** controls the title bar text.

> [!NOTE]
>
> **OleRequestPendingMsgText** is not yet implemented in twinBASIC. Reading the property always returns an empty string, and assignments have no effect.

### See Also

- [OleRequestPendingMsgTitle](OleRequestPendingMsgTitle) property
- [OleRequestPendingTimeout](OleRequestPendingTimeout) property
- [OleServerBusyMsgText](OleServerBusyMsgText) property
- [OleServerBusyTimeout](OleServerBusyTimeout) property
