---
title: DoEvents
parent: Interaction Module
permalink: /tB/Modules/Interaction/DoEvents
redirect_from:
-  /tB/Core/DoEvents
---
# DoEvents
{: .no_toc }

Yields execution so the operating system can dispatch pending window messages and other events.

Syntax: **DoEvents()**

Returns an **Integer** indicating the number of open forms in the application; returns 0 in hosts that do not maintain a forms collection.

**DoEvents** passes control to the operating system. Control is returned to the caller after the operating system has finished processing the events in its queue and after any keystrokes pending in the [**SendKeys**](SendKeys) queue have been delivered.

**DoEvents** is most useful for simple things like keeping a UI responsive during a tight loop, or letting the user cancel a long-running operation. For genuinely long-running work, prefer a timer or a background worker (e.g. an out-of-process ActiveX EXE) so the operating system handles the multitasking.

> [!NOTE]
> Whenever you yield the processor inside an event procedure, make sure that procedure cannot be re-entered from a different code path before the original call returns; otherwise the program may behave unpredictably. Likewise, avoid **DoEvents** when other applications might interact with your procedure in unforeseen ways during the time you have yielded control.

### Example

This example yields to the operating system once every 1000 iterations of a loop.

```tb
Dim I As Long, OpenForms As Long
For I = 1 To 150000
    If I Mod 1000 = 0 Then
        OpenForms = DoEvents()
    End If
Next I
```

### See Also

- [SendKeys](SendKeys) statement

{% include VBA-Attribution.md %}
