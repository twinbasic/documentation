---
title: RegisterMessage
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/RegisterMessage
---
# RegisterMessage
{: .no_toc }

Subscribes a callback to a single Windows message type for a chosen window and descendant scope.

Syntax: *hook*.**RegisterMessage** *ParentHWND* **,** *Mode* **,** *MessageType* **,** *Callback*

*hook*
: *required* An [**IGetMessageHook**](./#igetmessagehook-interface) instance, typically returned by [**RuntimeCreateGetMessageHook**](RuntimeCreateGetMessageHook).

*ParentHWND*
: *required* **LongPtr**. The window the subscription anchors on.

*Mode*
: *required* [**EnumDescendantsModeFlags**](./#enumdescendantsmodeflags). The descendant scope: only the exact window, all descendants, or only direct children.

*MessageType*
: *required* **Integer**. The Windows `WM_*` message identifier to subscribe to. Each call subscribes to one type; call **RegisterMessage** repeatedly to listen for several.

*Callback*
: *required* [**GetMessageHookHelper.GetMessageHandler**](./#getmessagehandler). The function that receives matching messages. Pass `AddressOf` a function with the matching signature.

The subscription is recorded but does not start firing until [**Start**](Start) is called on the hook. Existing subscriptions are not disturbed by adding new ones.

### Example

```tb
Const WM_KEYDOWN = &H100
Const WM_CHAR = &H102

Sub HookKeyboard(ByVal h As IGetMessageHook)
    h.RegisterMessage Me.hWnd, AllDescendants, WM_KEYDOWN, AddressOf OnKeyDown
    h.RegisterMessage Me.hWnd, AllDescendants, WM_CHAR,    AddressOf OnChar
    h.Start
End Sub
```

### See Also

- [Start](Start) method
- [Stop](Stop) method
- [IGetMessageHook interface](./#igetmessagehook-interface)
- [GetMessageHookHelper module](./#getmessagehookhelper-module)
