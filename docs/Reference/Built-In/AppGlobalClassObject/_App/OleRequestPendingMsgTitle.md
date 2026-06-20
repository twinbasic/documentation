---
title: OleRequestPendingMsgTitle
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/OleRequestPendingMsgTitle
has_toc: false
---
# OleRequestPendingMsgTitle
{: .no_toc }

Gets or sets the title bar text of the dialog box displayed when an OLE request has been pending longer than the **OleRequestPendingTimeout** interval.

> [!NOTE]
>
> This property is not yet implemented in twinBASIC. Getting or setting it has no effect.

## Get

Returns a **String** containing the current title text for the OLE request-pending dialog box.

Syntax: *object*.**OleRequestPendingMsgTitle**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets the title bar text of the OLE request-pending dialog box.

Syntax: *object*.**OleRequestPendingMsgTitle** **=** *value*

*value*
: A **String** specifying the title to display in the dialog box title bar.

When an outbound OLE call to a server application does not complete within the number of milliseconds set by [OleRequestPendingTimeout](OleRequestPendingTimeout), a dialog box appears to inform the user that the server is busy. **OleRequestPendingMsgTitle** controls the title bar text of that dialog. The body text is controlled by [OleRequestPendingMsgText](OleRequestPendingMsgText).

### See Also

- [OleRequestPendingMsgText](OleRequestPendingMsgText) property
- [OleRequestPendingTimeout](OleRequestPendingTimeout) property
- [OleServerBusyMsgTitle](OleServerBusyMsgTitle) property
