---
title: UserControl Enhancements
parent: GUI Components
nav_order: 7
---

# UserControl Enhancements

The UserControl object now provides new features for better control handling.

## PreKeyEvents Property

The UserControl object now provides the new Boolean property `PreKeyEvents` that enables corresponding new events `PreKeyDown` and `PreKeyUp`. These allow handling special keys like tab, arrows, etc without OS or COM hooks (for example, based on the `IOleInPlaceActiveObject` interface).

These work with all child windows inside the UserControl, including ones created by `CreateWindowEx`.

## Access to Raw Message Data

You can access raw message data in the `PreKeyDown`/`PreKeyUp` event handlers with the new `PreKeyWParam`/`PreKeyLParam` and `PreKeyTargetHwnd` UserControl properties.
