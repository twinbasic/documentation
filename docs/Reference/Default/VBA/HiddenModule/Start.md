---
title: Start
parent: (Default) Module
permalink: /tB/Modules/HiddenModule/Start
---
# Start
{: .no_toc }

Activates every registered subscription on a message hook so that matching messages start being forwarded to their callbacks.

Syntax: *hook*.**Start**

*hook*
: *required* An [**IGetMessageHook**](./#igetmessagehook-interface) instance whose subscriptions have been set up with [**RegisterMessage**](RegisterMessage).

Calling **Start** on a hook that is already started has no effect. Calling it on a hook with no subscriptions is harmless but accomplishes nothing --- register first, then start.

### See Also

- [RegisterMessage](RegisterMessage) method
- [Stop](Stop) method
- [IGetMessageHook interface](./#igetmessagehook-interface)
