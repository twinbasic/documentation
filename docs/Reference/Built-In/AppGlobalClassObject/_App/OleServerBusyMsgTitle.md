---
title: OleServerBusyMsgTitle
parent: _App
grand_parent: AppGlobalClassObject Package
permalink: /tB/Packages/AppGlobalClassObject/_App/OleServerBusyMsgTitle
has_toc: false
---
# OleServerBusyMsgTitle
{: .no_toc }

Gets or sets the title of the dialog box displayed when an OLE server is busy.

> [!NOTE]
>
> This property is not yet implemented in twinBASIC. Getting or setting it has no effect.

## Get

Returns a **String** containing the current title text for the OLE server busy dialog.

Syntax: *object*.**OleServerBusyMsgTitle**

*object*
: *required* An object expression that evaluates to an **_App** object. In practice this is the global **App** object.

## Let

Sets the title text for the dialog box displayed when an OLE server is busy.

Syntax: *object*.**OleServerBusyMsgTitle** **=** *value*

*value*
: A **String** specifying the title for the OLE server busy dialog.

When an OLE automation call is made to a server that is busy and cannot accept the request within the period specified by [OleServerBusyTimeout](OleServerBusyTimeout), a dialog box may be shown to the user. **OleServerBusyMsgTitle** controls the title bar text of that dialog. The body text of the dialog is controlled by [OleServerBusyMsgText](OleServerBusyMsgText).

### See Also

- [OleServerBusyMsgText](OleServerBusyMsgText) property
- [OleServerBusyTimeout](OleServerBusyTimeout) property
- [OleServerBusyRaiseError](OleServerBusyRaiseError) property
- [OleRequestPendingMsgTitle](OleRequestPendingMsgTitle) property
