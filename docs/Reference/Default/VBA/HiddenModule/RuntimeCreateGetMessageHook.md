---
title: RuntimeCreateGetMessageHook
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/RuntimeCreateGetMessageHook
---
# RuntimeCreateGetMessageHook
{: .no_toc }

Creates a fresh [**IGetMessageHook**](./#igetmessagehook-interface) for filtering Windows messages destined for a chosen window and (optionally) its descendants.

Syntax: **RuntimeCreateGetMessageHook()** **As IGetMessageHook**

The returned hook starts dormant. Subscribe a callback for one or more message types with [**RegisterMessage**](RegisterMessage), then call [**Start**](Start) to activate the subscriptions and [**Stop**](Stop) to remove them.

### Example

```tb
Const WM_LBUTTONDOWN = &H201

Sub HookClicks()
    Dim Hook As IGetMessageHook = RuntimeCreateGetMessageHook()
    Hook.RegisterMessage Me.hWnd, AllDescendants, _
                         WM_LBUTTONDOWN, AddressOf OnLButtonDown
    Hook.Start
End Sub
```

### See Also

- [IGetMessageHook interface](./#igetmessagehook-interface)
- [GetMessageHookHelper module](./#getmessagehookhelper-module)
