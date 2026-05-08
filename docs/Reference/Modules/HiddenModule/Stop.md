---
title: Stop (IGetMessageHook)
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/Stop
---
# Stop
{: .no_toc }

Deactivates every registered subscription on a message hook so that matching messages are no longer forwarded to their callbacks.

Syntax: *hook*.**Stop**

*hook*
: *required* An [**IGetMessageHook**](./#igetmessagehook-interface) instance.

Subscriptions remain registered after **Stop** — call [**Start**](Start) again to resume delivery without re-registering. Calling **Stop** on a hook that is already stopped has no effect.

> [!NOTE]
> This is the **Stop** method of the [**IGetMessageHook**](./#igetmessagehook-interface) interface. The unrelated [**Stop**](../../Core/Stop) statement is a language keyword that suspends execution and breaks into the debugger.

### See Also

- [Start](Start) method
- [RegisterMessage](RegisterMessage) method
- [Stop](../../Core/Stop) statement (the language keyword)
